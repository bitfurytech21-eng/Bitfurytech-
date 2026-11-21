export const DIRTY_DOZEN_SECURITY_CASES = [
  { id: 1, name: "Self-Minted Wallet Balance on Signup", path: "/users/{uid}", expected: "PERMISSION_DENIED" },
  { id: 2, name: "Privilege Escalation on Create (role=admin)", path: "/users/{uid}", expected: "PERMISSION_DENIED" },
  { id: 3, name: "Privilege Escalation on Update (role tamper)", path: "/users/{uid}", expected: "PERMISSION_DENIED" },
  { id: 4, name: "Balance Inflation Attack by Non-Admin", path: "/users/{uid}", expected: "PERMISSION_DENIED" },
  { id: 5, name: "Cross-User PII Read", path: "/users/{otherUid}", expected: "PERMISSION_DENIED" },
  { id: 6, name: "Blanket User Enumeration", path: "/users", expected: "PERMISSION_DENIED" },
  { id: 7, name: "Forged Transaction Ownership", path: "/transactions/{id}", expected: "PERMISSION_DENIED" },
  { id: 8, name: "Fake Completed Deposit", path: "/transactions/{id}", expected: "PERMISSION_DENIED" },
  { id: 9, name: "Terminal State Replay", path: "/transactions/{id}", expected: "PERMISSION_DENIED" },
  { id: 10, name: "Server Timestamp Spoofing", path: "/investments/{id}", expected: "PERMISSION_DENIED" },
  { id: 11, name: "Oversized Document ID Poisoning", path: "/transactions/{longId}", expected: "PERMISSION_DENIED" },
  { id: 12, name: "Unauthorized Property Catalog Mutation", path: "/properties/{id}", expected: "PERMISSION_DENIED" },
] as const;
