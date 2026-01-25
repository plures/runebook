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
          config = {
            # TODO: Migrate to libsoup 3 or newer webkitgtk version
            # libsoup 2.74.3 is EOL with known CVEs but required by webkitgtk_4_1
            permittedInsecurePackages = [
              "libsoup-2.74.3"
            ];
          };
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
          
          npmDepsHash = "sha256-S2tAn2QEmj5ry9COmE/dxJEAjlxiugazvN9WxE/IyNE=";
          
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
        runebook = pkgs.rustPlatform.buildRustPackage {
          pname = "runebook";
          version = "0.2.0";
          
          # Point src directly to src-tauri directory
          src = ./src-tauri;

          # Use Cargo.lock from the source
          cargoLock = {
            lockFile = ./src-tauri/Cargo.lock;
          };
          
          nativeBuildInputs = [
            nodejs
            pkgs.pkg-config
            pkgs.wrapGAppsHook3
          ];

          buildInputs = [
            pkgs.openssl
            pkgs.webkitgtk_4_1
            pkgs.librsvg
            pkgs.glib
            pkgs.gtk3
            pkgs.libayatana-appindicator
            pkgs.libsoup_2_4
          ];

          preBuild = ''
            # Copy frontend build to expected location (Tauri expects it at ../build)
            mkdir -p ../build
            cp -r ${frontend}/build/* ../build/ || true
            
            # Set up Rust environment
            export RUST_BACKTRACE=1
            export TAURI_DIST_DIR="../build"
            export TAURI_PRIVATE_KEY=""
            export TAURI_KEY_PASSWORD=""
          '';

          # Don't run tests during build
          doCheck = false;

          postInstall = ''
            # wrapGAppsHook3 will handle wrapping for GTK/WebKit
            mkdir -p $out/share/applications
            mkdir -p $out/share/icons/hicolor
          '';
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
            pkgs.webkitgtk_4_1
            pkgs.librsvg
            pkgs.glib
            pkgs.gtk3
            pkgs.libayatana-appindicator
            pkgs.libsoup_2_4
            pkgs.nodePackages.typescript
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
