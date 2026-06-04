import { confirm } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export function buildRerereEntries(enabled: boolean): GitConfigEntry[] {
  return [
    {
      key: "rerere.enabled",
      value: String(enabled),
      description: "Records resolved conflicts so Git can reuse the same resolution if the conflict appears again."
    }
  ];
}

export const rerereOption: GitConfigOption = {
  id: "rerere",
  label: "Reuse conflict resolutions",
  hint: "Teach Git to remember how you resolved repeated conflicts.",
  async configure(): Promise<OptionResult> {
    const enabled = cancelIfNeeded(
      await confirm({
        message: "Should Git remember and reuse repeated conflict resolutions?",
        initialValue: true
      })
    );

    return {
      entries: buildRerereEntries(enabled),
      summary: "Configured reusable conflict resolutions."
    };
  }
};
