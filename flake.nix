{
  description = "RuneBook - A reactive, canvas-native computing environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        # Rust toolchain (stable)
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rustfmt" "clippy" ];
        };

        # Node.js
        nodejs = pkgs.nodejs_20;

        # Build the frontend (SvelteKit)
        frontend = pkgs.buildNpmPackage {
          pname = "runebook-frontend";
          version = "0.2.0";
          src = ./.;
          
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; # Update after first build
          
          nativeBuildInputs = [
            nodejs
            pkgs.python3
          ];

          buildPhase = ''
            export HOME=$(mktemp -d)
            npm run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r build $out/
          '';
        };

        # Build the Rust backend (Tauri)
        runebook = pkgs.stdenv.mkDerivation {
          pname = "runebook";
          version = "0.2.0";
          src = ./.;

          nativeBuildInputs = [
            rustToolchain
            nodejs
            pkgs.pkg-config
            pkgs.openssl
            pkgs.webkitgtk
            pkgs.librsvg
            pkgs.tauri-cli
            pkgs.appimagekit
            pkgs.bubblewrap
            pkgs.glib
            pkgs.gtk3
            pkgs.libayatana-appindicator
            pkgs.libsoup
            pkgs.wrapGAppsHook
          ];

          buildInputs = [
            pkgs.webkitgtk
            pkgs.librsvg
            pkgs.glib
            pkgs.gtk3
            pkgs.libayatana-appindicator
            pkgs.libsoup
          ];

          preBuild = ''
            export HOME=$(mktemp -d)
            export CARGO_HOME=$HOME/.cargo
            export NPM_CONFIG_CACHE=$HOME/.npm
            export NPM_CONFIG_PREFIX=$HOME/.npm-global
            
            # Copy frontend build to expected location (Tauri expects it at ../build)
            mkdir -p build
            cp -r ${frontend}/build/* build/ || true
            
            # Also copy to src-tauri expected location for Tauri build
            mkdir -p src-tauri/../build
            cp -r ${frontend}/build/* src-tauri/../build/ || true
            
            # Set up Rust environment
            export RUST_BACKTRACE=1
            export TAURI_DIST_DIR="../build"
          '';

          buildPhase = ''
            cd src-tauri
            
            # Set environment for Tauri build
            export TAURI_PRIVATE_KEY=""
            export TAURI_KEY_PASSWORD=""
            
            # Build with cargo (Tauri will embed the frontend)
            # Note: For a full Tauri bundle, you'd use `tauri build`, but that's
            # complex in Nix. This builds the binary which can be run directly.
            cargo build --release --bin runebook
            
            # If binary name differs, check what was built
            if [ ! -f target/release/runebook ]; then
              # Try to find the actual binary name
              BINARY=$(find target/release -maxdepth 1 -type f -executable | head -1)
              if [ -n "$BINARY" ]; then
                cp "$BINARY" target/release/runebook
              fi
            fi
          '';

          installPhase = ''
            mkdir -p $out/bin
            mkdir -p $out/share/applications
            mkdir -p $out/share/icons/hicolor
            
            # Install the binary (Tauri creates a binary with the package name)
            BINARY_PATH=""
            if [ -f src-tauri/target/release/runebook ]; then
              BINARY_PATH="src-tauri/target/release/runebook"
            elif [ -f target/release/runebook ]; then
              BINARY_PATH="target/release/runebook"
            else
              # Search for the binary
              FOUND=$(find . -path "*/target/release/runebook" -type f -executable | head -1)
              if [ -n "$FOUND" ]; then
                BINARY_PATH="$FOUND"
              else
                echo "Error: Binary not found. Available files:"
                find . -path "*/target/release/*" -type f | head -10 || true
                exit 1
              fi
            fi
            
            install -Dm755 "$BINARY_PATH" $out/bin/runebook
          '';
          
          # wrapGAppsHook will automatically wrap binaries in $out/bin
          # with the necessary GTK/WebKit environment variables

          # Don't include secrets in the derivation
          dontFixup = false;
        };

        # Headless CLI agent wrapper
        runebook-agent = pkgs.writeShellApplication {
          name = "runebook-agent";
          runtimeInputs = [ nodejs ];
          text = ''
            exec ${nodejs}/bin/node ${./src/cli/index.ts} "$@"
          '';
        };

        # Build the CLI as a standalone Node.js package
        runebook-agent-pkg = pkgs.buildNpmPackage {
          pname = "runebook-agent";
          version = "0.2.0";
          src = ./.;
          
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; # Update after first build
          
          nativeBuildInputs = [
            nodejs
            pkgs.nodePackages.typescript
            pkgs.nodePackages.tsx
          ];

          # Don't build the frontend, just install deps
          buildPhase = ''
            export HOME=$(mktemp -d)
            # Install dependencies only (no build)
            npm install --offline --no-audit --no-fund
          '';

          installPhase = ''
            mkdir -p $out/bin
            mkdir -p $out/lib/node_modules/runebook-agent
            
            # Copy package files and source
            cp -r package.json package-lock.json $out/lib/node_modules/runebook-agent/
            cp -r src $out/lib/node_modules/runebook-agent/
            cp -r node_modules $out/lib/node_modules/runebook-agent/
            
            # Create wrapper script that uses tsx to run TypeScript directly
            # Note: tsx is included in node_modules, so we can use it directly
            cat > $out/bin/runebook-agent <<EOF
            #!${pkgs.runtimeShell}
            export NODE_PATH=$out/lib/node_modules/runebook-agent/node_modules
            exec ${nodejs}/bin/node $out/lib/node_modules/runebook-agent/node_modules/.bin/tsx $out/lib/node_modules/runebook-agent/src/cli/index.ts "\$@"
            EOF
            chmod +x $out/bin/runebook-agent
          '';
        };

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            rustToolchain
            pkgs.pkg-config
            pkgs.openssl
            pkgs.webkitgtk
            pkgs.librsvg
            pkgs.tauri-cli
            pkgs.glib
            pkgs.gtk3
            pkgs.libayatana-appindicator
            pkgs.libsoup
            pkgs.nodePackages.typescript
            pkgs.nodePackages.vitest
            pkgs.nodePackages.tsx
            # Optional: pre-commit hooks
            pkgs.pre-commit
            pkgs.nixpkgs-fmt
            pkgs.rustfmt
          ];

          shellHook = ''
            echo "RuneBook Development Environment"
            echo "Node.js: $(node --version)"
            echo "Rust: $(rustc --version)"
            echo "Cargo: $(cargo --version)"
            echo ""
            echo "Available commands:"
            echo "  npm install    - Install dependencies"
            echo "  npm run dev    - Start development server"
            echo "  npm run build  - Build the application"
            echo "  npm test       - Run tests"
            echo "  npm run agent  - Run agent CLI"
            echo ""
            echo "Nix commands:"
            echo "  nix build .#runebook        - Build the Tauri app"
            echo "  nix build .#runebook-agent  - Build the headless agent"
            echo "  nix run .#runebook-agent -- <command>  - Run agent CLI"
            echo ""
            echo "⚠️  Note: OpenAI keys and other secrets must be provided"
            echo "   via environment variables at runtime, never in Nix store."
          '';
        };

        packages = {
          default = runebook;
          runebook = runebook;
          runebook-agent = runebook-agent-pkg;
        };

        apps = {
          default = {
            type = "app";
            program = "${runebook}/bin/runebook";
          };
          runebook = {
            type = "app";
            program = "${runebook}/bin/runebook";
          };
          "runebook-agent" = {
            type = "app";
            program = "${runebook-agent-pkg}/bin/runebook-agent";
          };
        };

        # NixOS module (separate file)
        nixosModules.default = ./nixos-module.nix;
      }
    );
}
