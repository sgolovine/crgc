import type { GitConfigOption } from "../types.js";
import { aliasesOption } from "./aliases.js";
import { commitSigningOption } from "./commit-signing.js";
import { coreLineEndingsOption } from "./core-line-endings.js";
import { fetchPruneOption } from "./fetch-prune.js";
import { initDefaultBranchOption } from "./init-default-branch.js";
import { mergeConflictStyleOption } from "./merge-conflict-style.js";
import { pullStrategyOption } from "./pull-strategy.js";
import { pushAutoSetupRemoteOption } from "./push-auto-setup-remote.js";
import { rerereOption } from "./rerere.js";
import { userIdentityOption } from "./user-identity.js";

export const gitConfigOptions: GitConfigOption[] = [
  userIdentityOption,
  initDefaultBranchOption,
  pullStrategyOption,
  pushAutoSetupRemoteOption,
  fetchPruneOption,
  rerereOption,
  coreLineEndingsOption,
  mergeConflictStyleOption,
  commitSigningOption,
  aliasesOption
];
