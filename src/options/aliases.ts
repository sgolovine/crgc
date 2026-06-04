import { multiselect } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export type AliasPreset = "st" | "co" | "br" | "ci" | "lg";

const aliasValues: Record<AliasPreset, GitConfigEntry> = {
  st: {
    key: "alias.st",
    value: "status --short --branch",
    description: "Adds `git st` for a compact status view with branch information."
  },
  co: {
    key: "alias.co",
    value: "checkout",
    description: "Adds `git co` as a shorter checkout command."
  },
  br: {
    key: "alias.br",
    value: "branch",
    description: "Adds `git br` as a shorter branch command."
  },
  ci: {
    key: "alias.ci",
    value: "commit",
    description: "Adds `git ci` as a shorter commit command."
  },
  lg: {
    key: "alias.lg",
    value: "log --graph --decorate --oneline --all",
    description: "Adds `git lg` for a compact graph of all branches."
  }
};

export function buildAliasEntries(aliases: AliasPreset[]): GitConfigEntry[] {
  return aliases.map((alias) => aliasValues[alias]);
}

export const aliasesOption: GitConfigOption = {
  id: "aliases",
  label: "Common aliases",
  hint: "Add short commands for frequent Git workflows.",
  async configure(): Promise<OptionResult> {
    const aliases = cancelIfNeeded(
      await multiselect<AliasPreset>({
        message: "Which aliases should be added?",
        required: true,
        options: [
          { value: "st", label: "st", hint: "status --short --branch" },
          { value: "co", label: "co", hint: "checkout" },
          { value: "br", label: "br", hint: "branch" },
          { value: "ci", label: "ci", hint: "commit" },
          { value: "lg", label: "lg", hint: "log --graph --decorate --oneline --all" }
        ]
      })
    );

    return {
      entries: buildAliasEntries(aliases),
      summary: "Configured selected Git aliases."
    };
  }
};
