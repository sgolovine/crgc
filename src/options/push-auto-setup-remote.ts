import { confirm } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export function buildPushAutoSetupRemoteEntries(enabled: boolean): GitConfigEntry[] {
  return [
    {
      key: "push.autoSetupRemote",
      value: String(enabled),
      description: "Automatically creates upstream tracking when pushing a new local branch."
    }
  ];
}

export const pushAutoSetupRemoteOption: GitConfigOption = {
  id: "push-auto-setup-remote",
  label: "Push upstream setup",
  hint: "Let first push of a new branch set its upstream remote.",
  async configure(): Promise<OptionResult> {
    const enabled = cancelIfNeeded(
      await confirm({
        message: "Should Git set upstream tracking automatically on first push?",
        initialValue: true
      })
    );

    return {
      entries: buildPushAutoSetupRemoteEntries(enabled),
      summary: "Configured automatic upstream setup for pushes."
    };
  }
};
