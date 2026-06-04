import { text } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export function buildUserIdentityEntries(name: string, email: string): GitConfigEntry[] {
  return [
    {
      key: "user.name",
      value: name,
      description: "Name Git records as the author and committer for new commits in this project."
    },
    {
      key: "user.email",
      value: email,
      description: "Email Git records as the author and committer for new commits in this project."
    }
  ];
}

export const userIdentityOption: GitConfigOption = {
  id: "user-identity",
  label: "User identity",
  hint: "Set the commit author name and email for this project.",
  async configure(): Promise<OptionResult> {
    const name = cancelIfNeeded(
      await text({
        message: "What name should Git use for commits in this project?",
        placeholder: "Ada Lovelace",
        validate(value) {
          if ((value ?? "").trim().length === 0) {
            return "Enter the name Git should record on commits.";
          }
        }
      })
    );

    const email = cancelIfNeeded(
      await text({
        message: "What email should Git use for commits in this project?",
        placeholder: "ada@example.com",
        validate(value) {
          if ((value ?? "").trim().length === 0) {
            return "Enter the email Git should record on commits.";
          }
        }
      })
    );

    return {
      entries: buildUserIdentityEntries(name.trim(), email.trim()),
      summary: "Configured project-specific commit identity."
    };
  }
};
