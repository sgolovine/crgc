import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAvailableManagedGitConfigPath,
  getConfigValue,
  getGitdirCondition,
  getHomeGitConfigPath,
  getProjectPostfix,
  listManagedGitConfigs,
  removeManagedGitConfig,
  resolveProjectDirectory,
  updateManagedGitConfigLocation,
  writeConfigEntries,
  writeManagedInclude
} from "../src/utils/git-config.js";

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

  it("merges global settings into a root gitconfig with existing includes", async () => {
    await writeManagedInclude(configPath, "~/Projects/company_a/", ".gitconfig.company_a");

    await writeConfigEntries(
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

    await expect(getConfigValue(configPath, "includeIf.gitdir:~/Projects/company_a/.path")).resolves.toBe(
      ".gitconfig.company_a"
    );
    await expect(getConfigValue(configPath, "fetch.prune")).resolves.toBe("true");
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

describe("managed gitconfigs", () => {
  it("derives the postfix from the final project directory name", () => {
    expect(getProjectPostfix("/foo/bar/baz/bat")).toBe("bat");
    expect(getProjectPostfix("/foo/bar/baz/bat/")).toBe("bat");
  });

  it("expands home-relative project directories", () => {
    expect(resolveProjectDirectory("~/Projects/example", "/home/ada")).toBe("/home/ada/Projects/example");
  });

  it("formats gitdir conditions with a home prefix and trailing slash", () => {
    expect(getGitdirCondition(join(tempDir, "Projects", "company_a"), tempDir)).toBe("~/Projects/company_a/");
  });

  it("increments the config filename when the desired file is taken", async () => {
    await writeFile(join(tempDir, ".gitconfig.company_a"), "");
    await writeFile(join(tempDir, ".gitconfig.company_a_1"), "");

    await expect(getAvailableManagedGitConfigPath("company_a", tempDir)).resolves.toBe(
      join(tempDir, ".gitconfig.company_a_2")
    );
  });

  it("tracks includeIf entries in the home gitconfig", async () => {
    const homeConfigPath = getHomeGitConfigPath(tempDir);

    await writeManagedInclude(homeConfigPath, "~/Projects/company_a/", ".gitconfig.company_a");

    await expect(getConfigValue(homeConfigPath, "includeIf.gitdir:~/Projects/company_a/.path")).resolves.toBe(
      ".gitconfig.company_a"
    );
    await expect(listManagedGitConfigs(homeConfigPath)).resolves.toEqual([
      {
        gitdir: "~/Projects/company_a/",
        includePath: ".gitconfig.company_a",
        configPath: join(tempDir, ".gitconfig.company_a"),
        label: "company_a"
      }
    ]);

    await expect(readFile(homeConfigPath, "utf8")).resolves.toBe(`# [start] autogenerated by crgc
#
[includeIf "gitdir:~/Projects/company_a/"]
\tpath = .gitconfig.company_a
#
# [end] autogenerated by crgc
`);
  });

  it("adds new includeIf entries inside the managed block without moving existing includes", async () => {
    const homeConfigPath = getHomeGitConfigPath(tempDir);

    await writeFile(
      homeConfigPath,
      `[includeIf "gitdir:~/Projects/existing/"]
\tpath = .gitconfig.existing
`
    );

    await writeManagedInclude(homeConfigPath, "~/Projects/company_a/", ".gitconfig.company_a");

    await expect(readFile(homeConfigPath, "utf8")).resolves.toBe(`[includeIf "gitdir:~/Projects/existing/"]
\tpath = .gitconfig.existing

# [start] autogenerated by crgc
#
[includeIf "gitdir:~/Projects/company_a/"]
\tpath = .gitconfig.company_a
#
# [end] autogenerated by crgc
`);
  });

  it("keeps subsequent includeIf entries inside the existing managed block", async () => {
    const homeConfigPath = getHomeGitConfigPath(tempDir);

    await writeManagedInclude(homeConfigPath, "~/Projects/company_a/", ".gitconfig.company_a");
    await writeManagedInclude(homeConfigPath, "~/Projects/company_b/", ".gitconfig.company_b");

    await expect(readFile(homeConfigPath, "utf8")).resolves.toBe(`# [start] autogenerated by crgc
#
[includeIf "gitdir:~/Projects/company_a/"]
\tpath = .gitconfig.company_a
[includeIf "gitdir:~/Projects/company_b/"]
\tpath = .gitconfig.company_b
#
# [end] autogenerated by crgc
`);
  });

  it("removes tracked includeIf entries and deletes the managed gitconfig", async () => {
    const homeConfigPath = getHomeGitConfigPath(tempDir);
    const managedConfigPath = join(tempDir, ".gitconfig.company_a");

    await writeFile(managedConfigPath, "[user]\n\tname = Ada\n");
    await writeManagedInclude(homeConfigPath, "~/Projects/company_a/", ".gitconfig.company_a");
    const [config] = await listManagedGitConfigs(homeConfigPath);

    await removeManagedGitConfig(homeConfigPath, config);

    await expect(listManagedGitConfigs(homeConfigPath)).resolves.toEqual([]);
    await expect(readFile(managedConfigPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(homeConfigPath, "utf8")).resolves.toBe("");
  });

  it("updates a tracked project directory without deleting the managed gitconfig", async () => {
    const homeConfigPath = getHomeGitConfigPath(tempDir);
    const managedConfigPath = join(tempDir, ".gitconfig.company_a");

    await writeFile(managedConfigPath, "[user]\n\tname = Ada\n");
    await writeManagedInclude(homeConfigPath, "~/Projects/company_a/", ".gitconfig.company_a");
    const [config] = await listManagedGitConfigs(homeConfigPath);

    await updateManagedGitConfigLocation(homeConfigPath, config, "~/Projects/company_b/");

    await expect(
      getConfigValue(homeConfigPath, "includeIf.gitdir:~/Projects/company_a/.path")
    ).resolves.toBeUndefined();
    await expect(getConfigValue(homeConfigPath, "includeIf.gitdir:~/Projects/company_b/.path")).resolves.toBe(
      ".gitconfig.company_a"
    );
    await expect(readFile(managedConfigPath, "utf8")).resolves.toContain("name = Ada");
  });
});
