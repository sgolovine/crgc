import { select } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export type MergeConflictStyle = "merge" | "diff3" | "zdiff3";

export function buildMergeConflictStyleEntries(style: MergeConflictStyle): GitConfigEntry[] {
  return [
    {
      key: "merge.conflictStyle",
      value: style,
      description: "Controls how much context Git writes into conflicted files during merges."
    }
  ];
}

export const mergeConflictStyleOption: GitConfigOption = {
  id: "merge-conflict-style",
  label: "Conflict markers",
  hint: "Choose how much context Git shows inside conflicted files.",
  async configure(): Promise<OptionResult> {
    const style = cancelIfNeeded(
      await select<MergeConflictStyle>({
        message: "What conflict marker style should Git use?",
        options: [
          { value: "zdiff3", label: "zdiff3", hint: "Shows base context with reduced duplicate lines." },
          { value: "diff3", label: "diff3", hint: "Shows your side, base version, and their side." },
          { value: "merge", label: "merge", hint: "Shows only your side and their side." }
        ]
      })
    );

    return {
      entries: buildMergeConflictStyleEntries(style),
      summary: "Configured merge conflict marker style."
    };
  }
};
