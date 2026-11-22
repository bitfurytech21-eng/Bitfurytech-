const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "bitfury",
  "bitfurytech",
  "security",
  "staff",
  "moderator",
  "helpdesk",
  "null",
  "undefined",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

export function validateUsername(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { valid: false, normalized, error: "Username is required." };
  }
  if (normalized.length < 3 || normalized.length > 30) {
    return {
      valid: false,
      normalized,
      error: "Username must be between 3 and 30 characters.",
    };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Username may only contain lowercase letters, numbers, and underscores (_).",
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: "This username is reserved. Please select another handle.",
    };
  }
  return { valid: true, normalized };
}
