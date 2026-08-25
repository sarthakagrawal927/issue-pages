export interface CursorPayload {
  v: 1;
  sort: string | number;
  id: number;
}

export function encodeCursor(sort: string | number, id: number): string {
  return btoa(JSON.stringify({ v: 1, sort, id } satisfies CursorPayload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function decodeCursor(value: string | undefined): CursorPayload | null {
  if (!value || value.length > 256) return null;
  try {
    const padded = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const parsed: unknown = JSON.parse(atob(padded));
    if (!isCursorPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    (typeof candidate.sort === "string" || typeof candidate.sort === "number") &&
    Number.isSafeInteger(candidate.id) &&
    (candidate.id as number) > 0
  );
}
