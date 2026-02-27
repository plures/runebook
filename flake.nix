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
          
          npmDepsHash = "sha256-porXoDHVolmvIZM7/kZ/4ck/ezgrzTd8kZaAKGwPTjs=";
