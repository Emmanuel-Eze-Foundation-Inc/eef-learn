export type StudioMode = "chat" | "map" | "document";

export function isStudioMode(value: string | null | undefined): value is StudioMode {
  return value === "chat" || value === "map" || value === "document";
}
