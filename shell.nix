# Development shell for RuneBook
# Usage: nix-shell

{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    rustc
    cargo
    pkg-config
    openssl
    webkitgtk
    librsvg
    tauri-cli
  ];

  shellHook = ''
    echo "RuneBook Development Environment"
    echo "Node.js: $(node --version)"
    echo "Rust: $(rustc --version)"
    echo ""
    echo "Available commands:"
    echo "  npm install    - Install dependencies"
    echo "  npm run dev    - Start development server"
    echo "  npm run build  - Build the application"
    echo "  npm test       - Run tests"
    echo "  npm run agent  - Run agent CLI"
  '';
}

