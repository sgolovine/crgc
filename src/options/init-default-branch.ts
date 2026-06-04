import { select, text } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export function buildInitDefaultBranchEntries(branch: string): GitConfigEntry[] {
  return [
    {
      key: "init.defaultBranch",
      value: branch,
      description: "Branch name Git uses when a new repository is initialized."
    }
  ];
}

export const initDefaultBranchOption: GitConfigOption = {
  id: "init-default-branch",
  label: "Default branch",
  hint: "Choose the branch name Git uses for newly initialized repositories.",
  async configure(): Promise<OptionResult> {
    const selected = cancelIfNeeded(
      await select({
        message: "Which default branch name should new repositories use?",
        options: [
          { value: "main", label: "main", hint: "Modern default on many hosting providers." },
          { value: "master", label: "master", hint: "Legacy Git default." },
          { value: "develop", label: "develop", hint: "Common in Git Flow-style projects." },
          { value: "custom", label: "Custom", hint: "Use a project-specific branch name." }
        ]
      })
    );

    const branch =
      selected === "custom"
        ? cancelIfNeeded(
            await text({
              message: "What branch name should Git use by default?",
              placeholder: "trunk",
              validate(value) {
                if ((value ?? "").trim().length === 0) {
                  return "Enter a branch name.";
                }
              }
            })
          ).trim()
        : selected;

    return {
      entries: buildInitDefaultBranchEntries(branch),
      summary: `Configured ${branch} as the default branch name.`
    };
  }
};
