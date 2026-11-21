# BitfuryTech Firestore Security Specification

## Data Invariants
1. User accounts (`/users/{userId}`) are isolated strictly to their owning Firebase UID (`request.auth.uid == userId`) or verified platform admin (`bitfurytech21@gmail.com`).
2. Newly registered investors must initialize with zero balances (`walletBalance == 0`, `totalProfit == 0`, `bonus == 0`, `referralBonus == 0`, `totalDeposit == 0`) and `role == 'investor'`.
3. Non-admin users cannot escalate `role` or inflate their own `walletBalance`, `totalProfit`, `bonus`, `referralBonus`, or `totalDeposit`.
4. Transactions (`/transactions/{txId}`) cannot be created with `status == 'Completed'` by non-admin investors unless type is `'Investment'` (matching a debited allocation), and completed/rejected terminal transactions cannot be altered by non-admins.
5. List queries on PII or user-owned collections require `resource.data.userId == request.auth.uid` (or bootstrap admin JWT check) with zero `get()` or `exists()` calls inside `allow list`.
6. Document IDs are bounded to `<= 128` characters matching `^[a-zA-Z0-9_\-]+$`, and all strings enforce explicit `.size()` bounds.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Minted Wallet Balance on Signup**: `create /users/{uid}` with `walletBalance: 100000` -> DENIED (`walletBalance == 0` required).
2. **Privilege Escalation on Create**: `create /users/{uid}` with `role: "admin"` -> DENIED (`role == 'investor'` required).
3. **Privilege Escalation on Update (Ghost Field / Role Tamper)**: `update /users/{uid}` changing `role` to `"admin"` -> DENIED (`affectedKeys().hasOnly(...)` blocks `role`).
4. **Balance Inflation Attack**: `update /users/{uid}` setting `walletBalance` higher than existing value as non-admin -> DENIED.
5. **Cross-User PII Read**: `get /users/{otherUid}` by non-admin -> DENIED.
6. **Blanket User Enumeration**: `list /users` by non-admin -> DENIED.
7. **Forged Transaction Ownership**: `create /transactions/{id}` with `userId: otherUid` -> DENIED (`incoming().userId == request.auth.uid`).
8. **Fake Completed Deposit**: `create /transactions/{id}` with `type: "Deposit", status: "Completed"` by non-admin -> DENIED (`status == 'Pending'` required for Deposit/Withdrawal).
9. **Terminal State Replay**: `update /transactions/{id}` when `existing().status == "Completed"` by non-admin -> DENIED.
10. **Server Timestamp Spoofing**: `create /investments/{id}` with backdated `createdAt` (`!= request.time`) -> DENIED.
11. **Oversized Document ID Poisoning**: `create /transactions/<1500_char_id>` -> DENIED (`isValidId` rejects `> 128`).
12. **Unauthorized Property Catalog Mutation**: `create /properties/{id}` by non-admin -> DENIED.
