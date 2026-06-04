import { confirm, select, text } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export type SigningFormat = "openpgp" | "ssh" | "x509";

export function buildCommitSigningEntries(
  enabled: boolean,
  signingKey?: string,
  format?: SigningFormat
): GitConfigEntry[] {
  const entries: GitConfigEntry[] = [
    {
      key: "commit.gpgSign",
      value: String(enabled),
      description: "Signs commits by default when Git creates them."
    }
  ];

  if (enabled && signingKey !== undefined && signingKey.trim().length > 0) {
    entries.push({
      key: "user.signingKey",
      value: signingKey.trim(),
      description: "Key Git uses when signing commits for this project."
    });
  }

  if (enabled && format !== undefined) {
    entries.push({
      key: "gpg.format",
      value: format,
      description: "Signing backend Git uses for commit signatures."
    });
  }

  return entries;
}

export const commitSigningOption: GitConfigOption = {
  id: "commit-signing",
  label: "Commit signing",
  hint: "Turn on signed commits and set the signing key format.",
  async configure(): Promise<OptionResult> {
    const enabled = cancelIfNeeded(
      await confirm({
        message: "Should Git sign commits by default in this project?",
        initialValue: true
      })
    );

    if (!enabled) {
      return {
        entries: buildCommitSigningEntries(false),
        summary: "Disabled commit signing by default."
      };
    }

    const format = cancelIfNeeded(
      await select<SigningFormat>({
        message: "Which signing format should Git use?",
        options: [
          { value: "ssh", label: "SSH", hint: "Use an SSH key for commit signatures." },
          { value: "openpgp", label: "OpenPGP", hint: "Use a GPG/OpenPGP key." },
          { value: "x509", label: "X.509", hint: "Use an X.509 certificate." }
        ]
      })
    );

    const signingKey = cancelIfNeeded(
      await text({
        message: "Which signing key should Git use?",
        placeholder: format === "ssh" ? "~/.ssh/id_ed25519.pub" : "KEYID",
        validate(value) {
          if ((value ?? "").trim().length === 0) {
            return "Enter a signing key or key path.";
          }
        }
      })
    );

    return {
      entries: buildCommitSigningEntries(true, signingKey, format),
      summary: "Configured signed commits."
    };
  }
};
