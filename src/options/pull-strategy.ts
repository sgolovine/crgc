import { select } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export type PullStrategy = "merge" | "rebase" | "rebase-merges" | "interactive";

export function buildPullStrategyEntries(strategy: PullStrategy): GitConfigEntry[] {
  const values: Record<PullStrategy, string> = {
    merge: "false",
    rebase: "true",
    "rebase-merges": "merges",
    interactive: "interactive"
  };

  return [
    {
      key: "pull.rebase",
      value: values[strategy],
      description: "Controls whether `git pull` merges fetched commits or rebases local commits."
    }
  ];
}

export const pullStrategyOption: GitConfigOption = {
  id: "pull-strategy",
  label: "Pull strategy",
  hint: "Decide whether `git pull` should merge or rebase by default.",
  async configure(): Promise<OptionResult> {
    const strategy = cancelIfNeeded(
      await select<PullStrategy>({
        message: "How should `git pull` reconcile local and remote commits?",
        options: [
          { value: "rebase", label: "Rebase", hint: "Replay local commits on top of fetched commits." },
          { value: "merge", label: "Merge", hint: "Create a merge commit when histories diverge." },
          { value: "rebase-merges", label: "Rebase with merges", hint: "Replay local commits while preserving merge commits." },
          { value: "interactive", label: "Interactive rebase", hint: "Open an interactive rebase flow during pull." }
        ]
      })
    );

    return {
      entries: buildPullStrategyEntries(strategy),
      summary: "Configured the default pull strategy."
    };
  }
};
