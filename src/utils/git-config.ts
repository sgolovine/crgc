import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnFile } from "./process.js";
import type { GitConfigEntry } from "../types.js";

export type ExistingConfigEntry = {
  key: string;
  value: string;
};

export type WriteConfigResult = {
  path: string;
  written: GitConfigEntry[];
  skipped: GitConfigEntry[];
};

export function getProjectGitConfigPath(cwd = process.cwd()): string {
  return join(cwd, ".gitconfig");
}

export async function ensureGitConfigFile(configPath: string): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });

  try {
    await stat(configPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await spawnFile("git", ["config", "--file", configPath, "--add", "create-gitconfig.initialized", "true"]);
      await spawnFile("git", ["config", "--file", configPath, "--unset", "create-gitconfig.initialized"]);
      return;
    }

    throw error;
  }
}

export async function getConfigValue(configPath: string, key: string): Promise<string | undefined> {
  const result = await spawnFile("git", ["config", "--file", configPath, "--get", key], {
    rejectOnError: false
  });

  if (result.exitCode === 0) {
    return result.stdout.trimEnd();
  }

  if (result.exitCode === 1) {
    return undefined;
  }

  throw new Error(result.stderr.trim() || `Unable to read ${key} from ${configPath}.`);
}

export async function hasConfigValue(configPath: string, key: string): Promise<boolean> {
  return (await getConfigValue(configPath, key)) !== undefined;
}

export async function writeConfigEntries(
  configPath: string,
  entries: GitConfigEntry[],
  shouldReplace: (entry: GitConfigEntry, currentValue: string) => Promise<boolean>
): Promise<WriteConfigResult> {
  await ensureGitConfigFile(configPath);

  const written: GitConfigEntry[] = [];
  const skipped: GitConfigEntry[] = [];

  for (const entry of entries) {
    const currentValue = await getConfigValue(configPath, entry.key);

    if (currentValue !== undefined) {
      const replace = await shouldReplace(entry, currentValue);

      if (!replace) {
        skipped.push(entry);
        continue;
      }

      await spawnFile("git", ["config", "--file", configPath, "--replace-all", entry.key, entry.value]);
    } else {
      await spawnFile("git", ["config", "--file", configPath, "--add", entry.key, entry.value]);
    }

    written.push(entry);
  }

  return {
    path: configPath,
    written,
    skipped
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
