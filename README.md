<div align="center">
  <h1>CRGC - Create Git Config</h1>
  <p>A simple script to help you create project specific gitconfigs and update them easily.</p>


  <p>
    <a href="https://www.npmjs.com/package/@sunnygg/crgc">
      <img src="https://img.shields.io/npm/v/@sunnygg/crgc.svg" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/@sunnygg/crgc">
      <img src="https://img.shields.io/npm/dm/@sunnygg/crgc.svg" alt="npm downloads">
    </a>
    <a href="https://github.com/sgolovine/crgc/actions/workflows/ci.yml">
      <img src="https://github.com/sgolovine/crgc/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build Status">
    </a>
    <a href="https://www.npmjs.com/package/@sunnygg/crgc">
      <img src="https://img.shields.io/npm/l/@sunnygg/crgc.svg" alt="License">
    </a>
  </p>
</div>

## Demo

[![View demo recording](https://asciinema.org/a/1200543.svg)](https://asciinema.org/a/1200543)



## Install

```sh
npx @sunnygg/crgc
```

## How It Works

The CLI opens with the project gitconfigs tracked from your home `~/.gitconfig`. You can create a new project gitconfig, update global settings, or select an existing project gitconfig to edit, move, or delete.

Created gitconfigs are stored in your home directory with a postfix based on the final project directory name:

```text
/foo/bar/baz/bat -> ~/.gitconfig.bat
```

If that filename is already taken, the CLI appends a number, such as `.gitconfig.bat_1` or `.gitconfig.bat_2`.

The top-level `~/.gitconfig` tracks each project gitconfig with `includeIf`:

```gitconfig
[includeIf "gitdir:~/Projects/company_a/"]
  path = .gitconfig.company_a
[includeIf "gitdir:~/Projects/subdir/company_b/"]
  path = .gitconfig.company_b
```

If a tracked project directory moves or gets renamed, select its project gitconfig and choose **Update location**. The CLI rewrites the `includeIf` directory condition in `~/.gitconfig` while keeping the same managed gitconfig file and settings.

Global settings use the same selectable menu of Git settings as project gitconfigs. Choose **Update global settings** to write shared settings directly to the root `~/.gitconfig`; new settings are merged with existing global settings and managed `includeIf` entries.

When editing any gitconfig, the CLI explains each setting before writing it. Existing settings are detected with `git config --file`; when a key already exists, the CLI asks before replacing it.

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

## Roadmap

- Viewing the gitconfig while editing
- Better UI overall
