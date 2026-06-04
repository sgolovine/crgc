#!/usr/bin/env node
import { confirm, intro, log, note, outro, select } from "@clack/prompts";
import { gitConfigOptions } from "./options/index.js";
import { cancelIfNeeded } from "./utils/cancel.js";
import { getProjectGitConfigPath, writeConfigEntries } from "./utils/git-config.js";
import type { GitConfigEntry } from "./types.js";

type MenuAction = string | "finish";

async function main(): Promise<void> {
  const configPath = getProjectGitConfigPath();

  intro("create-gitconfig");
  log.info(`Writing project settings to ${configPath}`);

  while (true) {
    const selected = cancelIfNeeded(
      await select<MenuAction>({
        message: "What would you like to configure?",
        options: [
          ...gitConfigOptions.map((option) => ({
            value: option.id,
            label: option.label,
            hint: option.hint
          })),
          {
            value: "finish",
            label: "Finish",
            hint: "Stop configuring this .gitconfig."
          }
        ]
      })
    );

    if (selected === "finish") {
      outro("Done.");
      return;
    }

    const option = gitConfigOptions.find((candidate) => candidate.id === selected);

    if (option === undefined) {
      throw new Error(`Unknown option: ${selected}`);
    }

    const result = await option.configure();

    if (result === undefined || result.entries.length === 0) {
      log.warn("No settings selected.");
      continue;
    }

    explainEntries(result.entries);

    const writeResult = await writeConfigEntries(configPath, result.entries, async (entry, currentValue) => {
      return cancelIfNeeded(
        await confirm({
          message: `${entry.key} is already set to "${currentValue}". Replace it with "${entry.value}"?`,
          initialValue: true
        })
      );
    });

    if (writeResult.written.length > 0) {
      log.success(`${result.summary} Wrote ${writeResult.written.length} setting(s).`);
    }

    if (writeResult.skipped.length > 0) {
      log.warn(`Skipped ${writeResult.skipped.length} existing setting(s).`);
    }
  }
}

function explainEntries(entries: GitConfigEntry[]): void {
  const body = entries
    .map((entry) => `${entry.key} = ${entry.value}\n${entry.description}`)
    .join("\n\n");

  note(body, "Settings");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(message);
  process.exit(1);
});
