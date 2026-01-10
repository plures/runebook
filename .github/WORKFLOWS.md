# CI/CD Workflows Documentation

This document describes the automated CI/CD workflows for RuneBook, including version bumping, building, and publishing to multiple package registries.

## Overview

RuneBook uses GitHub Actions to automate:
- **Version bumping** following semantic versioning
- **Building** desktop applications for Windows, macOS, and Linux
- **Publishing** to multiple package registries:
  - GitHub Releases (with platform-specific binaries)
  - npm registry
  - GitHub Packages (npm)
  - Windows Package Manager (winget)
  - NixOS (via flake, nixpkgs PR in progress)

## Workflows

### 1. Version Bump (`version-bump.yml`)

**Purpose**: Automatically bump the project version across all manifests following semantic versioning.

**Trigger**: Manual workflow dispatch

**Inputs**:
- `version_type`: The type of version bump (patch, minor, or major)

**What it does**:
1. Bumps version in `package.json` using npm version
2. Updates version in `src-tauri/Cargo.toml`
3. Updates version in `src-tauri/tauri.conf.json`
4. Updates `Cargo.lock` and `package-lock.json`
5. Commits all changes with message `chore: bump version to X.Y.Z`
6. Creates a git tag `vX.Y.Z`
7. Pushes changes and tag to main branch
8. Creates a draft GitHub Release

**How to use**:
1. Go to Actions tab in GitHub
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. Click "Run workflow" button

**Example**:
- Current version: `0.2.0`
- Choose `patch` → New version: `0.2.1`
- Choose `minor` → New version: `0.3.0`
- Choose `major` → New version: `1.0.0`

### 2. Build and Publish Release (`publish-release.yml`)

**Purpose**: Build platform-specific binaries and publish to all supported registries.

**Trigger**: 
- Automatically when a GitHub Release is published
- Manual workflow dispatch

**What it does**:

#### Build Job (`build-tauri`)
Builds RuneBook for multiple platforms in parallel:
- **macOS**: Both Apple Silicon (aarch64) and Intel (x86_64)
- **Linux**: Ubuntu 22.04 (amd64)
- **Windows**: Windows latest (x64)

Each build:
1. Installs platform-specific dependencies
2. Builds the Tauri application
3. Creates installers (.dmg, .AppImage, .msi, etc.)
4. Uploads artifacts to the GitHub Release automatically via tauri-action

#### Publish to npm (`publish-npm`)
- Publishes `@plures/runebook` to npm registry
- Requires: `NPM_TOKEN` secret configured in repository settings
- Runs after successful build
- Only on published releases

#### Publish to GitHub Packages (`publish-github-packages`)
- Publishes `@plures/runebook` to GitHub Packages npm registry
- Uses `GITHUB_TOKEN` (automatically provided)
- Runs after successful build
- Only on published releases

#### Publish to winget (`winget-publish`)
- Submits package to Windows Package Manager (winget)
- Requires: `WINGET_GITHUB_TOKEN` secret configured
- Automatically detects `.msi` installer from release
- Only on published releases

#### Build Nix packages (`nixos-publish`)
- Builds Nix packages for `runebook` and `runebook-agent`
- Creates build artifacts for NixOS distribution
- Note: NixOS package submission to nixpkgs requires manual PR submission
- Users can use the flake directly: `nix run github:plures/runebook`
- Only on published releases

**How to use**:

**Option 1: Publish via Version Bump (Recommended)**
1. Run the Version Bump workflow (see above)
2. This creates a draft release
3. Go to Releases in GitHub
4. Edit the draft release
5. Add release notes describing changes
6. Click "Publish release"
7. The Build and Publish workflow will automatically trigger

**Option 2: Manual Trigger**
1. Go to Actions tab in GitHub
2. Select "Build and Publish Release" workflow
3. Click "Run workflow"
4. Select the branch
5. Click "Run workflow" button

## Setup Requirements

### Required Secrets

To enable full automation, configure these secrets in your GitHub repository settings:

1. **NPM_TOKEN**
   - Create an npm access token with publish permissions
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm token

2. **WINGET_GITHUB_TOKEN** (Optional, for Windows Package Manager)
   - Personal Access Token with `public_repo` scope
   - Used to submit to winget-pkgs repository
   - Name: `WINGET_GITHUB_TOKEN`
   - Value: Your GitHub PAT

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need to be configured.

### Repository Settings

Ensure the following repository settings are configured:

1. **Actions Permissions**
   - Settings → Actions → General
   - Allow GitHub Actions to create and approve pull requests: ✓

2. **Workflow Permissions**
   - Settings → Actions → General → Workflow permissions
   - Read and write permissions: ✓
   - Allow GitHub Actions to create and approve pull requests: ✓

## Semantic Versioning

RuneBook follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.X.0): New features, backwards-compatible
- **PATCH** (0.0.X): Bug fixes, backwards-compatible

### Version Synchronization

The version is maintained in multiple files and automatically synchronized:

- `package.json` → Primary source of truth
- `src-tauri/Cargo.toml` → Rust package version
- `src-tauri/tauri.conf.json` → Tauri app version

All files are kept in sync by the version bump workflow.

## Release Process

### Complete Release Workflow

1. **Development**
   - Make changes on feature branch
   - Create PR and merge to main

2. **Version Bump**
   - Run "Version Bump" workflow
   - Choose appropriate version type (patch/minor/major)
   - Workflow creates draft release with new version

3. **Release Preparation**
   - Go to GitHub Releases
   - Edit the draft release
   - Update CHANGELOG.md with version details
   - Add release notes describing changes

4. **Publish**
   - Click "Publish release"
   - Build and Publish workflow automatically:
     - Builds for all platforms
     - Uploads installers to release
     - Publishes to npm
     - Publishes to GitHub Packages
     - Submits to winget

5. **Verification**
   - Check GitHub Release has all platform binaries
   - Verify npm package: `npm view @plures/runebook`
   - Verify GitHub Packages: Check Packages section
   - Check winget submission (if configured)

## Package Distribution

### npm Registry

**Package**: `@plures/runebook`

**Install**:
```bash
npm install @plures/runebook
```

**View**:
```bash
npm view @plures/runebook
```

### GitHub Packages

**Package**: `@plures/runebook`

**Install**:
```bash
# Configure npm to use GitHub Packages
npm config set @plures:registry https://npm.pkg.github.com

# Install
npm install @plures/runebook
```

### GitHub Releases

**Download**: Visit [Releases](https://github.com/plures/runebook/releases)

**Available formats**:
- **macOS**: `.dmg` (Intel and Apple Silicon)
- **Linux**: `.AppImage`, `.deb`
- **Windows**: `.msi`, `.exe`

### Windows Package Manager (winget)

**Package**: `Plures.RuneBook`

**Install**:
```powershell
winget install Plures.RuneBook
```

**Upgrade**:
```powershell
winget upgrade Plures.RuneBook
```

### NixOS / Nix Flakes

**Using the flake directly**:
```bash
# Run the application
nix run github:plures/runebook

# Run the agent CLI
nix run github:plures/runebook#runebook-agent -- agent status

# Build packages
nix build github:plures/runebook#runebook
nix build github:plures/runebook#runebook-agent
```

**Adding to your flake**:
```nix
{
  inputs = {
    runebook.url = "github:plures/runebook";
  };

  outputs = { self, nixpkgs, runebook }: {
    # Use runebook.packages.runebook or runebook.packages.runebook-agent
  };
}
```

**NixOS Module**:
```nix
{
  imports = [ runebook.nixosModules.default ];
  
  services.runebook-agent = {
    enable = true;
    captureEvents = true;
  };
}
```

**Note**: A PR to add RuneBook to nixpkgs is in progress. Once merged, you'll be able to install via:
```bash
nix-env -iA nixpkgs.runebook
# or in configuration.nix:
environment.systemPackages = [ pkgs.runebook ];
```

## Troubleshooting

### Build Failures

**Issue**: All build jobs fail with "invalid action version" or similar error

**Solution**:
1. Verify the tauri-action version is valid (should be `@v0.5` or specific version like `@v0.5.12`)
2. Check [tauri-action releases](https://github.com/tauri-apps/tauri-action/releases) for latest versions
3. Avoid using generic version tags like `@v0` without a minor version

**Issue**: Tauri build fails on specific platform

**Solution**:
1. Check the Actions logs for detailed error messages
2. Ensure all dependencies are properly installed
3. Verify Tauri configuration in `src-tauri/tauri.conf.json`
4. Test build locally: `npm run tauri build`

### Publishing Failures

**Issue**: npm publish fails with authentication error

**Solution**:
1. Verify `NPM_TOKEN` secret is configured
2. Ensure token has publish permissions
3. Check token hasn't expired
4. Verify package name `@plures/runebook` is available

**Issue**: GitHub Packages publish fails

**Solution**:
1. Check workflow permissions (write access needed)
2. Ensure `package.json` has correct `publishConfig`
3. Verify repository name matches package scope

**Issue**: winget publish fails

**Solution**:
1. Verify `WINGET_GITHUB_TOKEN` is configured
2. Ensure `.msi` installer is built
3. Check winget-releaser action logs
4. Verify package identifier `Plures.RuneBook`

### Version Conflicts

**Issue**: Version mismatch between files

**Solution**:
Always use the Version Bump workflow to update versions. Manual version changes can cause inconsistencies.

To fix manually:
1. Update `package.json` version
2. Run: `npm install` to update `package-lock.json`
3. Update `src-tauri/Cargo.toml` version
4. Run: `cd src-tauri && cargo update -p runebook`
5. Update `src-tauri/tauri.conf.json` version

## Manual Publishing

If you need to publish manually without GitHub Actions:

### npm
```bash
# Login to npm
npm login

# Publish
npm publish
```

### GitHub Packages
```bash
# Login to GitHub Packages
npm login --registry=https://npm.pkg.github.com

# Publish
npm publish --registry=https://npm.pkg.github.com
```

## Continuous Improvement

This workflow can be enhanced with:

- [ ] Automated changelog generation from commit messages
- [ ] Pre-release builds for beta testing
- [ ] Automated testing before release
- [ ] Release candidate process
- [ ] Homebrew formula updates (macOS)
- [ ] AUR package updates (Arch Linux)
- [ ] Snap/Flatpak distribution (Linux)

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Tauri Action](https://github.com/tauri-apps/tauri-action)
- [npm Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [GitHub Packages](https://docs.github.com/en/packages)
- [winget Documentation](https://learn.microsoft.com/en-us/windows/package-manager/)
