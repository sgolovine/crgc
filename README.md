# create-gitconfig

Interactive project `.gitconfig` generator.

```sh
npx create-gitconfig
```

The CLI opens a selectable menu of Git settings, explains each setting before writing it, and writes to `.gitconfig` in the directory where the command is run. Existing settings are detected with `git config --file`; when a key already exists, the CLI asks before replacing it.

## Options

- User identity: `user.name`, `user.email`
- Default branch: `init.defaultBranch`
- Pull strategy: `pull.rebase`
- Push upstream setup: `push.autoSetupRemote`
- Fetch pruning: `fetch.prune`
- Reuse conflict resolutions: `rerere.enabled`
- Line endings: `core.autocrlf`, `core.eol`
- Conflict markers: `merge.conflictStyle`
- Commit signing: `commit.gpgSign`, `user.signingKey`, `gpg.format`
- Common aliases: `alias.st`, `alias.co`, `alias.br`, `alias.ci`, `alias.lg`

## Development

This project uses pnpm and configures `minimumReleaseAge: 10080` in `pnpm-workspace.yaml`, which requires package versions to be at least seven days old before installation.

```sh
pnpm install
pnpm test
pnpm build
```

Git config behavior follows the official Git documentation for `git config`: <https://git-scm.com/docs/git-config>.
