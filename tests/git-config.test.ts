import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfigValue, writeConfigEntries } from "../src/utils/git-config.js";

let tempDir: string;
let configPath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "create-gitconfig-"));
  configPath = join(tempDir, ".gitconfig");
});

afterEach(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

describe("writeConfigEntries", () => {
  it("creates a .gitconfig and appends new entries", async () => {
    const result = await writeConfigEntries(
      configPath,
      [
        {
          key: "fetch.prune",
          value: "true",
          description: "Remove stale remote-tracking branches."
        }
      ],
      async () => true
    );

    expect(result.written).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    await expect(getConfigValue(configPath, "fetch.prune")).resolves.toBe("true");
  });

  it("preserves unrelated options when adding new settings", async () => {
    await writeFile(
      configPath,
      `[core]
\teditor = vim
`
    );

    await writeConfigEntries(
      configPath,
      [
        {
          key: "user.name",
          value: "Ada Lovelace",
          description: "Commit author name."
        }
      ],
      async () => true
    );

    const file = await readFile(configPath, "utf8");

    expect(file).toContain("editor = vim");
    await expect(getConfigValue(configPath, "core.editor")).resolves.toBe("vim");
    await expect(getConfigValue(configPath, "user.name")).resolves.toBe("Ada Lovelace");
  });

  it("skips existing settings when replacement is declined", async () => {
    await writeFile(
      configPath,
      `[user]
\tname = Existing User
`
    );

    const result = await writeConfigEntries(
      configPath,
      [
        {
          key: "user.name",
          value: "Ada Lovelace",
          description: "Commit author name."
        }
      ],
      async () => false
    );

    expect(result.written).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    await expect(getConfigValue(configPath, "user.name")).resolves.toBe("Existing User");
  });

  it("replaces existing settings when replacement is accepted", async () => {
    await writeFile(
      configPath,
      `[user]
\tname = Existing User
`
    );

    const result = await writeConfigEntries(
      configPath,
      [
        {
          key: "user.name",
          value: "Ada Lovelace",
          description: "Commit author name."
        }
      ],
      async () => true
    );

    expect(result.written).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    await expect(getConfigValue(configPath, "user.name")).resolves.toBe("Ada Lovelace");
  });
});
