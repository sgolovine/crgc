import { cancel, isCancel } from "@clack/prompts";

export function cancelIfNeeded<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("No changes written.");
    process.exit(0);
  }

  return value as T;
}
