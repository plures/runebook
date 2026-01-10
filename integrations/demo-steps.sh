#!/bin/bash
# Manual demo steps for RuneBook suggestion rendering
# This script demonstrates the UX surfaces for suggestions

set -e

echo "=== RuneBook Suggestion Rendering Demo ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Enable the agent${NC}"
echo "Command: runebook agent enable"
runebook agent enable
echo ""

echo -e "${BLUE}Step 2: Check initial status${NC}"
echo "Command: runebook suggest status"
runebook suggest status
echo ""

echo -e "${BLUE}Step 3: Simulate some commands (these would normally be captured)${NC}"
echo "Note: In a real scenario, commands would be executed and captured automatically"
echo "For demo purposes, we'll manually trigger some analysis"
echo ""

echo -e "${BLUE}Step 4: Show top suggestion${NC}"
echo "Command: runebook suggest top"
runebook suggest top
echo ""

echo -e "${BLUE}Step 5: Show suggestions for last command${NC}"
echo "Command: runebook suggest last"
runebook suggest last
echo ""

echo -e "${BLUE}Step 6: Check status again${NC}"
echo "Command: runebook suggest status"
runebook suggest status
echo ""

echo -e "${GREEN}=== Integration Examples ===${NC}"
echo ""
echo -e "${YELLOW}Tmux Integration:${NC}"
echo "Add to ~/.tmux.conf:"
echo "  set -g status-right '#(bash ~/.runebook/integrations/tmux-status.sh)'"
echo ""

echo -e "${YELLOW}WezTerm Integration:${NC}"
echo "Add to ~/.config/wezterm/wezterm.lua:"
echo "  See integrations/wezterm-status-simple.lua for example code"
echo ""

echo -e "${YELLOW}Vim/Neovim Integration:${NC}"
echo "Place integrations/vim-runebook.vim in ~/.vim/plugin/ or ~/.config/nvim/plugin/"
echo "Use :RunebookSuggestion command to show suggestions"
echo ""

echo -e "${GREEN}Demo complete!${NC}"

