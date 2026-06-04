import { confirm } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export function buildFetchPruneEntries(enabled: boolean): GitConfigEntry[] {
  return [
    {
      key: "fetch.prune",
      value: String(enabled),
      description: "Removes stale remote-tracking branches during fetch when branches were deleted upstream."
    }
  ];
}

export const fetchPruneOption: GitConfigOption = {
  id: "fetch-prune",
  label: "Fetch pruning",
  hint: "Clean up deleted remote branches during fetch.",
  async configure(): Promise<OptionResult> {
    const enabled = cancelIfNeeded(
      await confirm({
        message: "Should `git fetch` prune stale remote-tracking branches?",
        initialValue: true
      })
    );

    return {
      entries: buildFetchPruneEntries(enabled),
      summary: "Configured fetch pruning."
    };
  }
};
