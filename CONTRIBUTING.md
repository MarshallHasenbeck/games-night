# Contributing

Standards for commits, branches and versions in this repository. The goal is a
history that a reviewer can read top to bottom and understand without asking.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <summary>

<optional body: why the change was made>

<optional footer: BREAKING CHANGE, issue links>
```

| Type | Use for |
|---|---|
| `feat` | A new user-facing capability |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting only, no logic change |
| `refactor` | Restructuring without changing behavior |
| `perf` | A performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance that fits nowhere else |
| `revert` | Undoing an earlier commit |

Rules:

- Summary is imperative ("add", not "added"), 72 characters or fewer, no trailing period.
- One logical change per commit. If the summary needs "and", split it.
- The body explains **why**. The diff already shows what.
- Breaking changes: add `!` after the type and a `BREAKING CHANGE:` footer.
- Never commit work that is knowingly broken to a shared branch.

A `commit-msg` hook checks the format locally. Hooks are not shared through git,
so after cloning, copy it in once:

```sh
cp scripts/commit-msg .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
```

Bypass in a genuine emergency with `git commit --no-verify`.

## Branches

Name branches by purpose: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
Prefer fast-forward merges so history stays linear. Rebase your own unshared
branches if needed. Never rewrite history that others have pulled.

## Versions and tags

Releases follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR**: breaking change
- **MINOR**: new backward-compatible feature (`feat`)
- **PATCH**: backward-compatible fix (`fix`)

Versions below `1.0.0` mean the project is still unstable.

Tag each release on the exact commit that shipped, with an annotated tag:

```sh
git tag -a v1.2.0 <commit> -m "Short description of the release"
```

Only tag a commit once it is confirmed as the one that was released. Never tag
from a guess.
