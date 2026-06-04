#!/usr/bin/env node
import { basename, dirname } from "node:path";
import { confirm, intro, log, note, outro, path as pathPrompt, select } from "@clack/prompts";
import { gitConfigOptions } from "./options/index.js";
import type { GitConfigEntry } from "./types.js";
import { cancelIfNeeded } from "./utils/cancel.js";
import type { ManagedGitConfig } from "./utils/git-config.js";
import {
  getAvailableManagedGitConfigPath,
  getGitdirCondition,
  getHomeGitConfigPath,
  getProjectPostfix,
  listManagedGitConfigs,
  removeManagedGitConfig,
  resolveProjectDirectory,
  updateManagedGitConfigLocation,
  writeConfigEntries,
  writeManagedInclude
} from "./utils/git-config.js";

type MainMenuAction = string | "create" | "global" | "finish";
type ManageAction = "edit" | "move" | "delete" | "back";
type ConfigureAction = string | "finish";

async function main(): Promise<void> {
  const homeConfigPath = getHomeGitConfigPath();

  intro("create-gitconfig");
  log.info(`Tracking project gitconfigs in ${homeConfigPath}`);

  while (true) {
    const configs = await listManagedGitConfigs(homeConfigPath);
    const selected = cancelIfNeeded(
      await select<MainMenuAction>({
        message: "Which gitconfig would you like to use?",
        options: [
          ...configs.map((config) => ({
            value: config.configPath,
            label: config.label,
            hint: `${config.gitdir} -> ${config.includePath}`
          })),
          {
            value: "create",
            label: "Create new gitconfig",
            hint: "Create a home gitconfig and link it to a project directory."
          },
          {
            value: "global",
            label: "Update global settings",
            hint: `Write shared settings directly to ${homeConfigPath}.`
          },
          {
            value: "finish",
            label: "Finish",
            hint: "Close the CLI."
          }
        ]
      })
    );

    if (selected === "finish") {
      outro("Done.");
      return;
    }

    if (selected === "create") {
      await createGitConfig(homeConfigPath, configs);
      continue;
    }

    if (selected === "global") {
      await configureGitConfig(homeConfigPath, "global");
      continue;
    }

    const config = configs.find((candidate) => candidate.configPath === selected);

    if (config === undefined) {
      throw new Error(`Unknown gitconfig: ${selected}`);
    }

    await manageGitConfig(homeConfigPath, config);
  }
}

async function createGitConfig(homeConfigPath: string, existingConfigs?: ManagedGitConfig[]): Promise<void> {
  const trackedConfigs = existingConfigs ?? (await listManagedGitConfigs(homeConfigPath));
  const projectDir = resolveProjectDirectory(
    cancelIfNeeded(
      await pathPrompt({
        message: "Which project directory should use this gitconfig?",
        directory: true,
        initialValue: process.cwd()
      })
    )
  );
  const gitdir = getGitdirCondition(projectDir, dirname(homeConfigPath));
  const existing = trackedConfigs.find((config) => config.gitdir === gitdir);

  if (existing !== undefined) {
    log.warn(`${gitdir} is already tracked by ${existing.includePath}.`);
    await configureGitConfig(existing.configPath, "project");
    return;
  }

  const postfix = getProjectPostfix(projectDir);
  const configPath = await getAvailableManagedGitConfigPath(postfix, dirname(homeConfigPath));
  const includePath = basename(configPath);

  await writeManagedInclude(homeConfigPath, gitdir, includePath);
  log.success(`Created ${includePath} for ${gitdir}.`);

  await configureGitConfig(configPath, "project");
}

async function manageGitConfig(homeConfigPath: string, config: ManagedGitConfig): Promise<void> {
  const selected = cancelIfNeeded(
    await select<ManageAction>({
      message: `Manage ${config.label}`,
      options: [
        {
          value: "edit",
          label: "Edit",
          hint: `Update settings in ${config.includePath}.`
        },
        {
          value: "move",
          label: "Update location",
          hint: `Point ${config.includePath} at a different project directory.`
        },
        {
          value: "delete",
          label: "Delete",
          hint: "Remove the includeIf entry and delete the gitconfig file."
        },
        {
          value: "back",
          label: "Back",
          hint: "Return to the gitconfig list."
        }
      ]
    })
  );

  if (selected === "back") {
    return;
  }

  if (selected === "edit") {
    await configureGitConfig(config.configPath, "project");
    return;
  }

  if (selected === "move") {
    await updateGitConfigLocation(homeConfigPath, config);
    return;
  }

  const shouldDelete = cancelIfNeeded(
    await confirm({
      message: `Delete ${config.includePath} and remove ${config.gitdir} from ${homeConfigPath}?`,
      initialValue: false
    })
  );

  if (!shouldDelete) {
    log.warn("Delete cancelled.");
    return;
  }

  await removeManagedGitConfig(homeConfigPath, config);
  log.success(`Deleted ${config.includePath}.`);
}

async function updateGitConfigLocation(homeConfigPath: string, config: ManagedGitConfig): Promise<void> {
  const configs = await listManagedGitConfigs(homeConfigPath);
  const projectDir = resolveProjectDirectory(
    cancelIfNeeded(
      await pathPrompt({
        message: `Which project directory should use ${config.includePath}?`,
        directory: true,
        initialValue: process.cwd()
      })
    )
  );
  const gitdir = getGitdirCondition(projectDir, dirname(homeConfigPath));
  const existing = configs.find((candidate) => candidate.gitdir === gitdir);

  if (existing !== undefined && existing.configPath !== config.configPath) {
    log.warn(`${gitdir} is already tracked by ${existing.includePath}.`);
    return;
  }

  await updateManagedGitConfigLocation(homeConfigPath, config, gitdir);
  log.success(`Updated ${config.includePath}: ${config.gitdir} -> ${gitdir}.`);
}

async function configureGitConfig(configPath: string, scope: "global" | "project"): Promise<void> {
  log.info(`Writing ${scope} settings to ${configPath}`);

  while (true) {
    const selected = cancelIfNeeded(
      await select<ConfigureAction>({
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
            hint: "Stop configuring this gitconfig."
          }
        ]
      })
    );

    if (selected === "finish") {
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
  const body = entries.map((entry) => `${entry.key} = ${entry.value}\n${entry.description}`).join("\n\n");

  note(body, "Settings");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(message);
  process.exit(1);
});
