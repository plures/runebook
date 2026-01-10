# NixOS Support for RuneBook

RuneBook is fully integrated with NixOS and Nix Flakes for reproducible builds and development.

## Quick Start

### Development Environment

Enter the development shell:

```bash
nix develop
```

This provides:
- Node.js 20
- Rust toolchain (stable, with rustfmt and clippy)
- Tauri CLI
- All system dependencies (webkitgtk, librsvg, etc.)
- TypeScript, Vitest, and other dev tools

### Building Packages

Build the Tauri application:

```bash
nix build .#runebook
```

Build the headless agent CLI:

```bash
nix build .#runebook-agent
```

### Running Applications

Run the Tauri app:

```bash
nix run .#runebook
```

Run the agent CLI:

```bash
nix run .#runebook-agent -- agent status
nix run .#runebook-agent -- observer enable
```

## Package Outputs

The flake provides the following outputs:

- `packages.runebook` - The Tauri desktop application
- `packages.runebook-agent` - Headless CLI agent wrapper
- `devShells.default` - Development environment with all tools
- `apps.runebook` - App launcher for the Tauri app
- `apps.runebook-agent` - App launcher for the agent CLI
- `nixosModules.default` - NixOS module for systemd service

View all outputs:

```bash
nix flake show
```

## NixOS Module

The flake includes a NixOS module for running `runebook-agent` as a systemd user service.

### Basic Configuration

Add to your `configuration.nix`:

```nix
{
  imports = [
    /path/to/runebook/nixos-module.nix
  ];

  services.runebook-agent = {
    enable = true;
    captureEvents = true;
    analyzePatterns = true;
    suggestImprovements = true;
    dataDir = "/var/lib/runebook-agent/data";
    maxEvents = 10000;
    retentionDays = 30;
  };
}
```

### Using the Flake Module

If using flakes in your NixOS configuration:

```nix
{
  inputs.runebook.url = "github:plures/runebook";

  outputs = { self, nixpkgs, runebook }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      modules = [
        runebook.nixosModules.default
        {
          services.runebook-agent = {
            enable = true;
            captureEvents = true;
            # ... other options
          };
        }
      ];
    };
  };
}
```

### Configuration Options

- `enable` - Enable the runebook-agent service (default: `false`)
- `captureEvents` - Enable event capture (default: `true`)
- `analyzePatterns` - Enable pattern analysis (default: `true`)
- `suggestImprovements` - Enable suggestion generation (default: `true`)
- `dataDir` - Data directory for agent storage (default: `/var/lib/runebook-agent/data`)
- `maxEvents` - Maximum number of events to store (default: `10000`)
- `retentionDays` - Number of days to retain events (default: `30`)
- `openaiApiKey` - OpenAI API key (default: `null`)

**⚠️ Security Warning**: Setting `openaiApiKey` in the NixOS configuration will store it in the Nix store. Prefer using environment variables, agenix, or sops-nix instead.

### Secure Secret Management

#### Using Environment Variables

Set secrets via systemd environment files:

```nix
{
  services.runebook-agent = {
    enable = true;
    # Don't set openaiApiKey here
  };

  systemd.user.services.runebook-agent = {
    serviceConfig.EnvironmentFile = "/etc/runebook/secrets.env";
  };
}
```

Create `/etc/runebook/secrets.env`:

```bash
OPENAI_API_KEY=sk-...
```

#### Using agenix

If using [agenix](https://github.com/ryantm/agenix):

```nix
{
  age.secrets.runebook-openai = {
    file = ./secrets/runebook-openai.age;
    owner = "your-user";
  };

  systemd.user.services.runebook-agent = {
    serviceConfig.EnvironmentFile = config.age.secrets.runebook-openai.path;
  };
}
```

#### Using sops-nix

If using [sops-nix](https://github.com/Mic92/sops-nix):

```nix
{
  sops.secrets."runebook/openai_key" = {
    owner = "your-user";
    path = "/run/secrets/runebook-openai";
  };

  systemd.user.services.runebook-agent = {
    serviceConfig.EnvironmentFile = config.sops.secrets."runebook/openai_key".path;
  };
}
```

### Disabling the Service

To disable the service:

```nix
{
  services.runebook-agent.enable = false;
}
```

Or remove the service configuration entirely.

### Manual Service Management

If the service is enabled, manage it with systemd:

```bash
# Check status
systemctl --user status runebook-agent

# Start service
systemctl --user start runebook-agent

# Stop service
systemctl --user stop runebook-agent

# View logs
journalctl --user -u runebook-agent -f
```

## CI/CD

The project includes GitHub Actions workflows that:

- Run `nix flake check` to validate the flake
- Build packages on multiple platforms
- Run tests (Rust and TypeScript)
- Check formatting (rustfmt, TypeScript)

See `.github/workflows/ci.yml` for details.

## Reproducible Builds

All dependencies are pinned via Nix, ensuring reproducible builds:

- Rust toolchain version is fixed
- Node.js version is fixed
- System libraries are pinned to nixpkgs versions

To update dependencies, update the `nixpkgs` input in `flake.nix`:

```nix
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";  # or a specific commit
}
```

Then update the lock file:

```bash
nix flake update
```

## Troubleshooting

### Build Failures

If builds fail, check:

1. **Nix version**: Ensure you're using Nix 2.4+ with flakes enabled
2. **System dependencies**: The flake should handle these automatically
3. **Network access**: First build requires downloading dependencies

### Service Not Starting

If the systemd service fails to start:

1. Check logs: `journalctl --user -u runebook-agent -n 50`
2. Verify data directory permissions: `ls -la /var/lib/runebook-agent`
3. Check configuration: `cat /var/lib/runebook-agent/agent-config.json`

### Missing Dependencies

If you encounter missing dependencies:

1. Enter the dev shell: `nix develop`
2. All dependencies should be available automatically
3. If not, check `flake.nix` and add missing packages to `devShells.default.buildInputs`

## Development

### Adding New Dependencies

**Rust dependencies**: Add to `src-tauri/Cargo.toml` as usual.

**Node.js dependencies**: Add to `package.json` as usual, then update the `npmDepsHash` in `flake.nix`:

```bash
# After adding dependencies, get the new hash:
nix build .#runebook-frontend 2>&1 | grep "got:" | head -1
```

Or manually calculate:
```bash
nix-prefetch-url --unpack --type sha256 $(nix eval --raw .#runebook-frontend.src 2>/dev/null || echo "file://$(pwd)")
```

**System dependencies**: Add to `nativeBuildInputs` or `buildInputs` in `flake.nix`.

**Note**: The initial `npmDepsHash` in `flake.nix` is set to a placeholder. After the first successful build, Nix will provide the correct hash. You can then update it in the flake for faster subsequent builds.

### Pre-commit Hooks (Optional)

The dev shell includes `pre-commit` for optional git hooks. To enable:

```bash
nix develop
pre-commit install
```

## Examples

### Minimal NixOS Configuration

```nix
{
  imports = [ ./nixos-module.nix ];

  services.runebook-agent.enable = true;
}
```

### Full NixOS Configuration with Secrets

```nix
{
  imports = [ ./nixos-module.nix ];

  services.runebook-agent = {
    enable = true;
    captureEvents = true;
    analyzePatterns = true;
    suggestImprovements = true;
    dataDir = "/home/user/.local/share/runebook";
    maxEvents = 50000;
    retentionDays = 90;
  };

  # Use agenix for secrets
  age.secrets.runebook-openai = {
    file = ./secrets/openai.age;
    owner = "user";
  };

  systemd.user.services.runebook-agent = {
    serviceConfig.EnvironmentFile = config.age.secrets.runebook-openai.path;
  };
}
```

## Further Reading

- [Nix Flakes Documentation](https://nixos.wiki/wiki/Flakes)
- [NixOS Modules](https://nixos.wiki/wiki/NixOS_modules)
- [Tauri Prerequisites](https://tauri.app/guides/prerequisites/)
- [RuneBook Architecture](./ARCHITECTURE.md)

