const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

export function isMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID_REGEX.test(value.trim());
}

export function normalizeMongoId(value: unknown): string | null {
  if (typeof value === "string") {
    const id = value.trim();
    return isMongoObjectId(id) ? id : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const rec = value as Record<string, unknown>;
  const candidate = typeof rec._id === "string" ? rec._id : typeof rec.id === "string" ? rec.id : "";
  const id = candidate.trim();
  return isMongoObjectId(id) ? id : null;
}
