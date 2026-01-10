# Quick Start Guide for CI/CD Workflows

This guide provides a quick overview of the automated CI/CD workflows for RuneBook maintainers.

## Quick Links

- **Full Documentation**: [.github/WORKFLOWS.md](./.github/WORKFLOWS.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Release Checklist**: [.github/ISSUE_TEMPLATE/release-checklist.md](./.github/ISSUE_TEMPLATE/release-checklist.md)

## Making a Release

### 1. Prepare for Release

```bash
# Ensure all changes are merged to main
git checkout main
git pull origin main

# Verify versions are synchronized
npm run version:check
```

### 2. Bump Version

1. Go to [GitHub Actions](https://github.com/plures/runebook/actions)
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Choose version type:
   - **patch**: Bug fixes (0.2.0 → 0.2.1)
   - **minor**: New features (0.2.0 → 0.3.0)
   - **major**: Breaking changes (0.2.0 → 1.0.0)
5. Click "Run workflow" button

The workflow will:
- Update version in all files
- Commit changes
- Create git tag
- Create draft GitHub Release

### 3. Finalize Release

1. Go to [Releases](https://github.com/plures/runebook/releases)
2. Find the draft release
3. Edit the release notes
4. Update CHANGELOG.md if needed
5. Click "Publish release"

This will trigger the Build and Publish workflow that:
- Builds for all platforms (macOS Intel/Apple Silicon, Linux, Windows)
- Uploads binaries to GitHub Release automatically
- Publishes to npm registry
- Publishes to GitHub Packages
- Submits to winget (if configured)
- Builds Nix packages for NixOS distribution

### 4. Verify Release

```bash
# Check npm package
npm view @plures/runebook

# Check GitHub Packages
# Visit: https://github.com/plures/runebook/packages

# Check GitHub Release (verify binaries are uploaded)
# Visit: https://github.com/plures/runebook/releases

# Verify Nix packages (if nixos-publish job ran)
# Check workflow artifacts for nix-packages
```

## Setup (First Time Only)

### Configure Repository Secrets

1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - **NPM_TOKEN**: Create at npmjs.com → Access Tokens
   - **WINGET_GITHUB_TOKEN**: GitHub PAT with `public_repo` scope (optional)

### Enable Workflow Permissions

1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"
3. Click "Save"

## Common Tasks

### Check Version Synchronization

```bash
npm run version:check
```

### Manual Build Test

```bash
# Frontend
npm run build

# Full Tauri build
npm run tauri build
```

### View Workflow Runs

```bash
# Using GitHub CLI
gh run list --workflow=version-bump.yml
gh run list --workflow=publish-release.yml

# View details
gh run view <run-id>
```

## Troubleshooting

### Workflow Fails

1. Check workflow logs in Actions tab
2. Look for error messages in red
3. Common issues:
   - Missing secrets (NPM_TOKEN)
   - Permission issues (workflow permissions)
   - Build errors (check build logs)

### Version Mismatch

If versions get out of sync:

```bash
# Fix manually
# 1. Update package.json version
# 2. Run: npm install
# 3. Update src-tauri/Cargo.toml version
# 4. Run: cd src-tauri && cargo update -p runebook
# 5. Update src-tauri/tauri.conf.json version
# 6. Verify: npm run version:check
```

Or use the Version Bump workflow to re-sync.

### npm Publish Fails

1. Verify NPM_TOKEN is configured
2. Check token hasn't expired
3. Ensure package name `@plures/runebook` is available
4. Verify you have permissions to publish to `@plures` scope

## Package Distribution

After release, users can install RuneBook via:

**npm**:
```bash
npm install -g @plures/runebook
```

**GitHub Packages**:
```bash
npm config set @plures:registry https://npm.pkg.github.com
npm install -g @plures/runebook
```

**winget** (Windows):
```powershell
winget install Plures.RuneBook
```

**NixOS / Nix Flakes**:
```bash
# Direct flake usage
nix run github:plures/runebook

# Or add to your flake inputs
# runebook.url = "github:plures/runebook";
```

**Direct Download**: 
- Visit [GitHub Releases](https://github.com/plures/runebook/releases)
- Download platform-specific installers (.dmg, .AppImage, .msi, .exe)

## Need Help?

- Read the [full documentation](./.github/WORKFLOWS.md)
- Check the [troubleshooting guide](./.github/WORKFLOWS.md#troubleshooting)
- Open an issue if you need assistance
