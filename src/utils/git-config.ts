import { homedir } from "node:os";
import { mkdir, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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

export type ManagedGitConfig = {
  gitdir: string;
  includePath: string;
  configPath: string;
  label: string;
};

export function getProjectGitConfigPath(cwd = process.cwd()): string {
  return join(cwd, ".gitconfig");
}

export function getHomeGitConfigPath(homeDir = homedir()): string {
  return join(homeDir, ".gitconfig");
}

export function getProjectPostfix(projectDir: string): string {
  const postfix = basename(resolve(projectDir));

  if (postfix.length === 0 || postfix === sep) {
    throw new Error("Unable to derive a gitconfig name from the project directory.");
  }

  return postfix;
}

export function resolveProjectDirectory(projectDir: string, homeDir = homedir()): string {
  if (projectDir === "~") {
    return homeDir;
  }

  if (projectDir.startsWith("~/")) {
    return resolve(homeDir, projectDir.slice(2));
  }

  return resolve(projectDir);
}

export function getGitdirCondition(projectDir: string, homeDir = homedir()): string {
  const absoluteProjectDir = resolveProjectDirectory(projectDir, homeDir);
  const relativeToHome = relative(homeDir, absoluteProjectDir);
  const useHomePrefix =
    relativeToHome.length > 0 && !relativeToHome.startsWith("..") && !isAbsolute(relativeToHome);
  const gitdir = useHomePrefix ? `~/${toGitPath(relativeToHome)}` : toGitPath(absoluteProjectDir);

  return ensureTrailingSlash(gitdir);
}

export async function getAvailableManagedGitConfigPath(postfix: string, homeDir = homedir()): Promise<string> {
  let suffix = "";
  let index = 0;

  while (true) {
    const configPath = join(homeDir, `.gitconfig.${postfix}${suffix}`);

    if (!(await fileExists(configPath))) {
      return configPath;
    }

    index += 1;
    suffix = `_${index}`;
  }
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

export async function listManagedGitConfigs(homeConfigPath = getHomeGitConfigPath()): Promise<ManagedGitConfig[]> {
  const result = await spawnFile("git", ["config", "--file", homeConfigPath, "--get-regexp", "^includeIf\\..*\\.path$"], {
    rejectOnError: false
  });

  if (result.exitCode === 1) {
    return [];
  }

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `Unable to read includeIf entries from ${homeConfigPath}.`);
  }

  return result.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => parseManagedGitConfigLine(line, homeConfigPath))
    .filter((entry): entry is ManagedGitConfig => entry !== undefined);
}

export async function writeManagedInclude(
  homeConfigPath: string,
  gitdir: string,
  includePath: string
): Promise<void> {
  await ensureGitConfigFile(homeConfigPath);
  await spawnFile("git", [
    "config",
    "--file",
    homeConfigPath,
    "--replace-all",
    `includeIf.gitdir:${gitdir}.path`,
    includePath
  ]);
}

export async function removeManagedGitConfig(homeConfigPath: string, config: ManagedGitConfig): Promise<void> {
  await removeManagedInclude(homeConfigPath, config);
  await rm(config.configPath, { force: true });
}

export async function updateManagedGitConfigLocation(
  homeConfigPath: string,
  config: ManagedGitConfig,
  gitdir: string
): Promise<void> {
  if (config.gitdir === gitdir) {
    return;
  }

  await writeManagedInclude(homeConfigPath, gitdir, config.includePath);
  await removeManagedInclude(homeConfigPath, config);
}

async function removeManagedInclude(homeConfigPath: string, config: ManagedGitConfig): Promise<void> {
  const removeSection = await spawnFile("git", ["config", "--file", homeConfigPath, "--remove-section", `includeIf.gitdir:${config.gitdir}`], {
    rejectOnError: false
  });

  if (removeSection.exitCode !== 0 && removeSection.exitCode !== 1) {
    throw new Error(removeSection.stderr.trim() || `Unable to remove ${config.gitdir} from ${homeConfigPath}.`);
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function parseManagedGitConfigLine(line: string, homeConfigPath: string): ManagedGitConfig | undefined {
  const separatorIndex = line.search(/\s/);

  if (separatorIndex === -1) {
    return undefined;
  }

  const key = line.slice(0, separatorIndex);
  const includePath = line.slice(separatorIndex).trim();
  const match = /^includeif\.gitdir:(.+)\.path$/i.exec(key);

  if (match === null || !basename(includePath).startsWith(".gitconfig.")) {
    return undefined;
  }

  return {
    gitdir: match[1],
    includePath,
    configPath: resolveIncludePath(homeConfigPath, includePath),
    label: basename(includePath).replace(/^\.gitconfig\./, "")
  };
}

function resolveIncludePath(homeConfigPath: string, includePath: string): string {
  if (includePath === "~") {
    return homedir();
  }

  if (includePath.startsWith("~/")) {
    return join(homedir(), includePath.slice(2));
  }

  if (isAbsolute(includePath)) {
    return includePath;
  }

  return join(dirname(homeConfigPath), includePath);
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

function toGitPath(path: string): string {
  return path.split(sep).join("/");
}
