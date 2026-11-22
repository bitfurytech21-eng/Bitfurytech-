import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { validateUsername } from "../lib/username";
import { validateAllocation } from "../trading/tradingPage";

export interface UserAccount {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  country: string;
  phone: string;
  walletBalance: number;
  totalProfit: number;
  bonus: number;
  referralBonus: number;
  totalDeposit: number;
  preferredRail: "USDT (TRC20)" | "Bitcoin (BTC)" | "Ethereum (ETH)" | "Bank Wire";
  emailAlerts: boolean;
  twoFactorEnabled: boolean;
  role: "investor" | "admin";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  userEmail: string;
  type: "Deposit" | "Withdrawal" | "Investment" | "Profit" | "Referral";
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: "Pending" | "Completed" | "Rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InvestmentAllocation {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  category: "crypto" | "stock" | "estate";
  amount: number;
  dailyRatePct: number;
  durationDays: number;
  status: "Active" | "Completed";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface NotificationMessage {
  id: string;
  userId: string;
  category: "Security" | "Settlement" | "Yield" | "Announcement";
  title: string;
  body: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface PropertyOffering {
  id: string;
  title: string;
  location: string;
  assetType: string;
  targetYieldPct: number;
  minEntry: number;
  valuation: number;
  occupancyPct: number;
  status: "Open" | "Fully Subscribed";
  published?: boolean;
  image: string;
  summary: string;
  supportingDocUrl?: string;
  supportingDocName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function formatTimestamp(ts?: Timestamp): string {
  if (!ts || typeof ts.toDate !== "function") {
    return "Pending sync";
  }
  return ts.toDate().toISOString().slice(0, 10);
}

async function lookupClaimedUsernameForUid(uid: string): Promise<string | undefined> {
  try {
    const q = query(collection(db, "usernames"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    const raw = String(snap.docs[0].data()?.username ?? snap.docs[0].id ?? "");
    const check = validateUsername(raw);
    return check.valid ? check.normalized : undefined;
  } catch {
    return undefined;
  }
}

export async function ensureUserAccount(
  uid: string,
  email: string,
  displayName: string,
  preferredUsername?: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    const validatedPreferred = preferredUsername
      ? validateUsername(preferredUsername)
      : null;
    let resolvedUsername =
      validatedPreferred && validatedPreferred.valid
        ? validatedPreferred.normalized
        : undefined;

    if (!resolvedUsername) {
      resolvedUsername = await lookupClaimedUsernameForUid(uid);
    }

    if (!snap.exists()) {
      const baseDoc = {
        uid,
        email: email.slice(0, 200),
        displayName: (displayName || email.split("@")[0] || "Investor").slice(0, 120),
        country: "",
        phone: "",
        walletBalance: 0,
        totalProfit: 0,
        bonus: 0,
        referralBonus: 0,
        totalDeposit: 0,
        preferredRail: "USDT (TRC20)",
        emailAlerts: true,
        twoFactorEnabled: false,
        role: "investor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (resolvedUsername) {
        try {
          await setDoc(ref, { ...baseDoc, username: resolvedUsername });
        } catch (writeErr) {
          const code =
            typeof writeErr === "object" && writeErr !== null && "code" in writeErr
              ? String((writeErr as { code?: unknown }).code)
              : "";
          if (code === "permission-denied") {
            console.warn(
              "Firestore rejected optional username field (deploy updated firestore.rules to Firebase Console). Creating base user record."
            );
            await setDoc(ref, baseDoc);
          } else {
            throw writeErr;
          }
        }
      } else {
        await setDoc(ref, baseDoc);
      }
    } else if (resolvedUsername && !snap.data()?.username) {
      await updateDoc(ref, {
        username: resolvedUsername,
        updatedAt: serverTimestamp(),
      }).catch(() => undefined);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (account: UserAccount | null) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserAccount) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function updateUserProfileFields(
  uid: string,
  patch: Partial<
    Pick<
      UserAccount,
      "displayName" | "country" | "phone" | "preferredRail" | "emailAlerts" | "twoFactorEnabled"
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserTransactions(
  uid: string,
  onData: (items: TransactionRecord[]) => void
): () => void {
  const path = "transactions";
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TransactionRecord, "id">),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserInvestments(
  uid: string,
  onData: (items: InvestmentAllocation[]) => void
): () => void {
  const path = "investments";
  const q = query(
    collection(db, "investments"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<InvestmentAllocation, "id">),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationMessage[]) => void
): () => void {
  const path = "notifications";
  const q = query(
    collection(db, "notifications"),
    where("userId", "in", [uid, "all"]),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<NotificationMessage, "id">),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitDepositRequest(
  uid: string,
  email: string,
  amount: number,
  method: string,
  referenceInput: string
): Promise<string> {
  const txId = makeDocId("tx");
  const path = `transactions/${txId}`;
  const refCode = referenceInput.trim().slice(0, 64) || `DEP-${Date.now().toString().slice(-6)}`;
  try {
    await setDoc(doc(db, "transactions", txId), {
      userId: uid,
      userEmail: email.slice(0, 200),
      type: "Deposit",
      method: method.slice(0, 100),
      amount,
      destination: "BitfuryTech Custody Desk",
      reference: refCode,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return refCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitWithdrawalRequest(
  uid: string,
  email: string,
  amount: number,
  method: string,
  destination: string
): Promise<string> {
  const txId = makeDocId("tx");
  const refCode = `WDR-${Date.now().toString().slice(-6)}`;
  const path = `transactions/${txId}`;
  try {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, "users", uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Account record not found.");
      }
      const currentBalance = Number(userSnap.data().walletBalance ?? 0);
      if (amount > currentBalance) {
        throw new Error("Insufficient available wallet balance.");
      }
      tx.update(userRef, {
        walletBalance: currentBalance - amount,
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, "transactions", txId), {
        userId: uid,
        userEmail: email.slice(0, 200),
        type: "Withdrawal",
        method: method.slice(0, 100),
        amount,
        destination: destination.trim().slice(0, 200),
        reference: refCode,
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    return refCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createInvestmentAllocation(
  uid: string,
  email: string,
  planId: string,
  amount: number
): Promise<void> {
  const invId = makeDocId("inv");
  const txId = makeDocId("tx");
  const path = `investments/${invId}`;

  try {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, "users", uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Account record not found.");
      }
      const currentBalance = Number(userSnap.data().walletBalance ?? 0);
      const validation = validateAllocation(planId, amount, currentBalance);
      if (!validation.valid || !validation.mandate) {
        throw new Error(validation.error || "Invalid allocation request.");
      }
      const m = validation.mandate;

      tx.update(userRef, {
        walletBalance: currentBalance - amount,
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, "investments", invId), {
        userId: uid,
        planId: m.id,
        planName: m.name,
        category: m.category,
        amount,
        dailyRatePct: m.dailyRatePct,
        durationDays: m.durationDays,
        status: "Active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, "transactions", txId), {
        userId: uid,
        userEmail: email.slice(0, 200),
        type: "Investment",
        method: `${m.categoryLabel} - ${m.name}`,
        amount,
        destination: m.id,
        reference: `INV-${Date.now().toString().slice(-6)}`,
        status: "Completed",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeProperties(
  onData: (items: PropertyOffering[]) => void
): () => void {
  const path = "properties";
  const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PropertyOffering, "id">),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function submitContactInquiry(
  name: string,
  email: string,
  topic: string,
  message: string
): Promise<void> {
  const inqId = makeDocId("inq");
  const path = `inquiries/${inqId}`;
  try {
    await setDoc(doc(db, "inquiries", inqId), {
      name: name.trim().slice(0, 120),
      email: email.trim().slice(0, 200),
      topic: topic.trim().slice(0, 120),
      message: message.trim().slice(0, 1500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Admin Firestore Helpers ---

export function subscribeAllUsers(onData: (items: UserAccount[]) => void): () => void {
  const path = "users";
  return onSnapshot(
    collection(db, "users"),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as UserAccount));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllTransactions(
  onData: (items: TransactionRecord[]) => void
): () => void {
  const path = "transactions";
  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TransactionRecord, "id">),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function resolvePendingTransaction(
  txRecord: TransactionRecord,
  decision: "Completed" | "Rejected"
): Promise<void> {
  const path = `transactions/${txRecord.id}`;
  try {
    await runTransaction(db, async (tx) => {
      const txRef = doc(db, "transactions", txRecord.id);
      const userRef = doc(db, "users", txRecord.userId);
      const userSnap = await tx.get(userRef);

      tx.update(txRef, {
        status: decision,
        updatedAt: serverTimestamp(),
      });

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserAccount;
        if (txRecord.type === "Deposit" && decision === "Completed") {
          tx.update(userRef, {
            walletBalance: userData.walletBalance + txRecord.amount,
            totalDeposit: userData.totalDeposit + txRecord.amount,
            updatedAt: serverTimestamp(),
          });
        } else if (txRecord.type === "Withdrawal" && decision === "Rejected") {
          tx.update(userRef, {
            walletBalance: userData.walletBalance + txRecord.amount,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertProperty(
  propertyId: string | null,
  payload: Omit<PropertyOffering, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const id = propertyId || makeDocId("prop");
  const path = `properties/${id}`;
  try {
    if (propertyId) {
      await updateDoc(doc(db, "properties", id), {
        title: payload.title.slice(0, 140),
        location: payload.location.slice(0, 140),
        assetType: payload.assetType.slice(0, 80),
        targetYieldPct: payload.targetYieldPct,
        minEntry: payload.minEntry,
        valuation: payload.valuation,
        occupancyPct: payload.occupancyPct,
        status: payload.status,
        image: payload.image.slice(0, 200),
        summary: payload.summary.slice(0, 600),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, "properties", id), {
        title: payload.title.slice(0, 140),
        location: payload.location.slice(0, 140),
        assetType: payload.assetType.slice(0, 80),
        targetYieldPct: payload.targetYieldPct,
        minEntry: payload.minEntry,
        valuation: payload.valuation,
        occupancyPct: payload.occupancyPct,
        status: payload.status,
        image: payload.image.slice(0, 200),
        summary: payload.summary.slice(0, 600),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePropertyOffering(propertyId: string): Promise<void> {
  const path = `properties/${propertyId}`;
  try {
    await deleteDoc(doc(db, "properties", propertyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function sendPlatformBroadcast(title: string, body: string): Promise<void> {
  const notifId = makeDocId("not");
  const path = `notifications/${notifId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "notifications", notifId), {
      userId: "all",
      category: "Announcement",
      title: title.trim().slice(0, 140),
      body: body.trim().slice(0, 600),
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
