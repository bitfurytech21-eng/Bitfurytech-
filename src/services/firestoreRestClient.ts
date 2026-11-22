import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };

export interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

export interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

interface RunQueryRow {
  document?: FirestoreDocument;
  readTime?: string;
}

export const VALID_DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function firestoreRootPath(): string {
  return `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
}

export function firestoreBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/${firestoreRootPath()}`;
}

export function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function decodeValue(val?: FirestoreValue): unknown {
  if (!val) return undefined;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    return (val.arrayValue?.values ?? []).map((item) => decodeValue(item));
  }
  if ("mapValue" in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields ?? {})) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return undefined;
}

export function decodeDocument(
  doc: FirestoreDocument
): Record<string, unknown> & { id: string; _updateTime?: string } {
  const id = doc.name.split("/").pop() || "";
  const out: Record<string, unknown> & { id: string; _updateTime?: string } = {
    id,
    _updateTime: doc.updateTime,
  };
  for (const [key, val] of Object.entries(doc.fields ?? {})) {
    out[key] = decodeValue(val);
  }
  if (!out.createdAt && doc.createTime) {
    out.createdAt = doc.createTime;
  }
  if (!out.updatedAt && doc.updateTime) {
    out.updatedAt = doc.updateTime;
  }
  return out;
}

export function encodeValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((v) => encodeValue(v)) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFields(
  obj: Record<string, unknown>
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeValue(v);
    }
  }
  return fields;
}

export async function getFirestoreDoc(
  collection: string,
  docId: string,
  rawToken: string
): Promise<(Record<string, unknown> & { id: string; _updateTime?: string }) | null> {
  if (!VALID_DOC_ID_REGEX.test(docId)) {
    return null;
  }
  const url = `${firestoreBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${rawToken}` },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firestore read ${collection}/${docId} failed (${res.status}): ${txt}`);
  }
  const doc = (await res.json()) as FirestoreDocument;
  return decodeDocument(doc);
}

export async function runFirestoreQuery(
  collectionId: string,
  structuredWhere: Record<string, unknown> | null,
  rawToken?: string
): Promise<Array<Record<string, unknown> & { id: string; _updateTime?: string }>> {
  const url = `${firestoreBaseUrl()}:runQuery${
    rawToken ? "" : `?key=${encodeURIComponent(firebaseConfig.apiKey)}`
  }`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (rawToken) {
    headers.Authorization = `Bearer ${rawToken}`;
  }

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
  };
  if (structuredWhere) {
    structuredQuery.where = structuredWhere;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ structuredQuery }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firestore query ${collectionId} failed (${res.status}): ${txt}`);
  }

  const rows = (await res.json()) as RunQueryRow[];
  return rows
    .filter((r): r is { document: FirestoreDocument } => Boolean(r.document))
    .map((r) => decodeDocument(r.document));
}

export interface CommitWriteOp {
  collection: string;
  docId: string;
  fields: Record<string, unknown>;
  serverTimestamps?: string[];
  /** Pass `exists: false` for create, or `updateTime` string for optimistic concurrency */
  precondition?: { exists?: boolean; updateTime?: string };
}

export async function commitFirestoreWrites(
  ops: CommitWriteOp[],
  rawToken: string
): Promise<void> {
  const root = firestoreRootPath();
  const writes = ops.map((op) => {
    const write: Record<string, unknown> = {
      update: {
        name: `${root}/${op.collection}/${op.docId}`,
        fields: encodeFields(op.fields),
      },
    };
    if (op.serverTimestamps && op.serverTimestamps.length > 0) {
      write.updateTransforms = op.serverTimestamps.map((fieldPath) => ({
        fieldPath,
        setToServerValue: "REQUEST_TIME",
      }));
    }
    if (op.precondition) {
      write.currentDocument = op.precondition;
    }
    return write;
  });

  const url = `${firestoreBaseUrl()}:commit`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rawToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Firestore commit failed (${res.status}): ${txt}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
}

export async function patchFirestoreFields(
  collection: string,
  docId: string,
  fields: Record<string, unknown>,
  rawToken: string,
  updateMaskFields: string[],
  timestampFields: string[] = ["updatedAt"]
): Promise<void> {
  const root = firestoreRootPath();
  const existingDoc = await getFirestoreDoc(collection, docId, rawToken);
  if (!existingDoc) {
    throw new Error(`Document ${collection}/${docId} does not exist.`);
  }

  // Merge updated fields onto existing scalar fields so full-document rules validate cleanly
  const merged: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(existingDoc)) {
    if (k === "id" || k === "_updateTime" || timestampFields.includes(k)) continue;
    merged[k] = v;
  }
  for (const key of updateMaskFields) {
    if (key in fields) {
      merged[key] = fields[key];
    }
  }
  // Preserve createdAt as timestamp value if present
  const writes: Array<Record<string, unknown>> = [
    {
      update: {
        name: `${root}/${collection}/${docId}`,
        fields: encodeFields({
          ...merged,
        }),
      },
      updateTransforms: timestampFields.map((fieldPath) => ({
        fieldPath,
        setToServerValue: "REQUEST_TIME",
      })),
      currentDocument: existingDoc._updateTime
        ? { updateTime: existingDoc._updateTime }
        : { exists: true },
    },
  ];

  // Note: restore exact timestampValue for createdAt if it was decoded as ISO string
  if (typeof existingDoc.createdAt === "string") {
    ((writes[0].update as Record<string, unknown>).fields as Record<string, FirestoreValue>).createdAt = {
      timestampValue: existingDoc.createdAt,
    };
  }

  const res = await fetch(`${firestoreBaseUrl()}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rawToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firestore update ${collection}/${docId} failed (${res.status}): ${txt}`);
  }
}

export async function deleteFirestoreDoc(
  collection: string,
  docId: string,
  rawToken: string
): Promise<void> {
  if (!VALID_DOC_ID_REGEX.test(docId)) {
    throw new Error("Invalid document identifier.");
  }
  const url = `${firestoreBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${rawToken}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firestore delete ${collection}/${docId} failed (${res.status}): ${txt}`);
  }
}

export async function safeAuxCommit(
  op: CommitWriteOp,
  rawToken: string
): Promise<boolean> {
  try {
    await commitFirestoreWrites([op], rawToken);
    return true;
  } catch {
    return false;
  }
}
