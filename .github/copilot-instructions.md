# Copilot Instructions

## Organization Standards

You are working in the **plures** organization. Before making changes, understand our standards.

### Source of Truth

- **Development guide:** https://github.com/plures/development-guide
  - `standards/` — commit conventions, CI/CD, PR workflow, repo setup, code style
  - `practices/` — copilot delegation, merge sweeps, local-first development
  - `lessons-learned/` — past mistakes to avoid

### Key Standards (DO NOT SKIP)

**Conventional Commits** — all commit messages MUST follow:

```
<type>[optional scope]: <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`
Breaking changes: add `!` after type or `BREAKING CHANGE:` in footer.

**PR Titles** — use conventional commit format (they become the squash commit message).

**Squash merge** — always. Clean single commit on `main`.

**Tests required** — all new features need tests. All bug fixes need a failing test first.

### Release Pipeline

We use a **reusable release workflow** from `plures/.github`:

```yaml
# .github/workflows/release.yml — should exist in this repo
name: Release
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      bump:
        type: choice
        options: [patch, minor, major]
jobs:
  release:
    uses: plures/.github/.github/workflows/release-reusable.yml@main
    with:
      bump: ${{ inputs.bump || '' }}
    secrets: inherit
```

The pipeline auto-detects project type and publishes to:

- **GitHub Packages** (`@plures/*`) — always (uses `GITHUB_TOKEN`)
- **npm** (npmjs.com) — if `NPM_TOKEN` secret exists
- **Cargo** (crates.io) — if `Cargo.toml` and `CARGO_REGISTRY_TOKEN`

Version bumps are automatic from conventional commits. Do NOT manually bump versions.

### What NOT to Do

- Do NOT add `eslint-disable` — fix the underlying issue
- Do NOT create sub-PRs that depend on other PRs
- Do NOT touch files outside the requested scope
- Do NOT manually bump version numbers
- Do NOT skip tests or add `skip` annotations to make CI pass
