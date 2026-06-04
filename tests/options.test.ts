import { describe, expect, it } from "vitest";
import { buildAliasEntries } from "../src/options/aliases.js";
import { buildCommitSigningEntries } from "../src/options/commit-signing.js";
import { buildCoreLineEndingEntries } from "../src/options/core-line-endings.js";
import { buildFetchPruneEntries } from "../src/options/fetch-prune.js";
import { buildInitDefaultBranchEntries } from "../src/options/init-default-branch.js";
import { buildMergeConflictStyleEntries } from "../src/options/merge-conflict-style.js";
import { buildPullStrategyEntries } from "../src/options/pull-strategy.js";
import { buildPushAutoSetupRemoteEntries } from "../src/options/push-auto-setup-remote.js";
import { buildRerereEntries } from "../src/options/rerere.js";
import { buildUserIdentityEntries } from "../src/options/user-identity.js";

describe("git config option builders", () => {
  it("builds user identity entries", () => {
    expect(buildUserIdentityEntries("Ada Lovelace", "ada@example.com")).toEqual([
      expect.objectContaining({ key: "user.name", value: "Ada Lovelace" }),
      expect.objectContaining({ key: "user.email", value: "ada@example.com" })
    ]);
  });

  it("builds init.defaultBranch", () => {
    expect(buildInitDefaultBranchEntries("main")).toEqual([
      expect.objectContaining({ key: "init.defaultBranch", value: "main" })
    ]);
  });

  it("builds pull.rebase strategies", () => {
    expect(buildPullStrategyEntries("merge")).toEqual([
      expect.objectContaining({ key: "pull.rebase", value: "false" })
    ]);
    expect(buildPullStrategyEntries("rebase")).toEqual([
      expect.objectContaining({ key: "pull.rebase", value: "true" })
    ]);
    expect(buildPullStrategyEntries("rebase-merges")).toEqual([
      expect.objectContaining({ key: "pull.rebase", value: "merges" })
    ]);
    expect(buildPullStrategyEntries("interactive")).toEqual([
      expect.objectContaining({ key: "pull.rebase", value: "interactive" })
    ]);
  });

  it("builds push.autoSetupRemote", () => {
    expect(buildPushAutoSetupRemoteEntries(true)).toEqual([
      expect.objectContaining({ key: "push.autoSetupRemote", value: "true" })
    ]);
  });

  it("builds fetch.prune", () => {
    expect(buildFetchPruneEntries(true)).toEqual([expect.objectContaining({ key: "fetch.prune", value: "true" })]);
  });

  it("builds rerere.enabled", () => {
    expect(buildRerereEntries(true)).toEqual([expect.objectContaining({ key: "rerere.enabled", value: "true" })]);
  });

  it("builds core line-ending presets", () => {
    expect(buildCoreLineEndingEntries("mac-linux")).toEqual([
      expect.objectContaining({ key: "core.autocrlf", value: "input" }),
      expect.objectContaining({ key: "core.eol", value: "lf" })
    ]);

    expect(buildCoreLineEndingEntries("windows")).toEqual([
      expect.objectContaining({ key: "core.autocrlf", value: "true" }),
      expect.objectContaining({ key: "core.eol", value: "crlf" })
    ]);

    expect(buildCoreLineEndingEntries("preserve")).toEqual([
      expect.objectContaining({ key: "core.autocrlf", value: "false" })
    ]);
  });

  it("builds merge.conflictStyle", () => {
    expect(buildMergeConflictStyleEntries("zdiff3")).toEqual([
      expect.objectContaining({ key: "merge.conflictStyle", value: "zdiff3" })
    ]);
  });

  it("builds commit signing entries", () => {
    expect(buildCommitSigningEntries(true, "~/.ssh/id_ed25519.pub", "ssh")).toEqual([
      expect.objectContaining({ key: "commit.gpgSign", value: "true" }),
      expect.objectContaining({ key: "user.signingKey", value: "~/.ssh/id_ed25519.pub" }),
      expect.objectContaining({ key: "gpg.format", value: "ssh" })
    ]);

    expect(buildCommitSigningEntries(false)).toEqual([
      expect.objectContaining({ key: "commit.gpgSign", value: "false" })
    ]);
  });

  it("builds selected aliases", () => {
    expect(buildAliasEntries(["st", "lg"])).toEqual([
      expect.objectContaining({ key: "alias.st", value: "status --short --branch" }),
      expect.objectContaining({ key: "alias.lg", value: "log --graph --decorate --oneline --all" })
    ]);
  });
});
