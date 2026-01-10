# RuneBook Integration Guide

This directory contains integration snippets for displaying RuneBook suggestions in various terminal environments.

## Overview

All integrations read from the same shared suggestion store located at `~/.runebook/suggestions.json` and status file at `~/.runebook/agent-status.json`. This ensures consistency across all surfaces.

## CLI Commands

### Basic Usage

```bash
# Show current agent status
runebook suggest status

# Show top suggestion
runebook suggest top

# Show suggestions for last command
runebook suggest last
```

## Tmux Integration

### Setup

1. Copy `tmux-status.sh` to your home directory:
   ```bash
   mkdir -p ~/.runebook/integrations
   cp integrations/tmux-status.sh ~/.runebook/integrations/
   chmod +x ~/.runebook/integrations/tmux-status.sh
   ```

2. Add to your `~/.tmux.conf`:
   ```tmux
   set -g status-right '#(bash ~/.runebook/integrations/tmux-status.sh)'
   ```

3. Reload tmux config:
   ```bash
   tmux source-file ~/.tmux.conf
   ```

### Status Indicators

- `●` (green) - Agent idle
- `⟳` (yellow) - Agent analyzing
- `⚠` (red) - Issues found (shows count)

## WezTerm Integration

### Setup

1. Copy the integration file to your WezTerm config directory:
   ```bash
   mkdir -p ~/.config/wezterm
   cp integrations/wezterm-status-simple.lua ~/.config/wezterm/
   ```

2. Add to your `~/.config/wezterm/wezterm.lua`:
   ```lua
   wezterm.on('update-right-status', function(window, pane)
     local status_file = wezterm.home_dir .. '/.runebook/agent-status.json'
     local file = io.open(status_file, 'r')
     if not file then
       window:set_right_status('')
       return
     end
     
     local content = file:read('*all')
     file:close()
     
     -- Simple JSON parsing (for status field only)
     local status = content:match('"status"%s*:%s*"([^"]*)"')
     local high_priority = content:match('"highPriorityCount"%s*:%s*([0-9]+)')
     
     local symbol = ''
     local color = ''
     local text = ''
     
     if status == 'idle' then
       symbol = '●'
       color = '#00ff00'
     elseif status == 'analyzing' then
       symbol = '⟳'
       color = '#ffff00'
     elseif status == 'issues_found' then
       symbol = '⚠'
       color = '#ff0000'
       if high_priority then
         text = high_priority
       end
     end
     
     if symbol ~= '' then
       window:set_right_status(wezterm.format({
         { Foreground = { Color = color } },
         { Text = symbol .. text },
         { Foreground = { Color = '#ffffff' } },
         { Text = ' ' },
       }))
     else
       window:set_right_status('')
     end
   end)
   ```

3. Restart WezTerm

## Vim/Neovim Integration

### Vim Setup

1. Copy the plugin file:
   ```bash
   mkdir -p ~/.vim/plugin
   cp integrations/vim-runebook.vim ~/.vim/plugin/
   ```

2. Use the command:
   ```
   :RunebookSuggestion
   ```

### Neovim Setup (Lua)

1. Copy the plugin file:
   ```bash
   mkdir -p ~/.config/nvim/lua
   cp integrations/nvim-runebook.lua ~/.config/nvim/lua/runebook.lua
   ```

2. Or place in plugin directory:
   ```bash
   mkdir -p ~/.config/nvim/plugin
   cp integrations/nvim-runebook.lua ~/.config/nvim/plugin/runebook.lua
   ```

3. Use the command:
   ```
   :RunebookSuggestion
   ```

### Optional: Auto-display in Virtual Text (Neovim)

Uncomment the autocmd in `nvim-runebook.lua` to automatically display suggestions in virtual text.

## Status File Format

The status file (`~/.runebook/agent-status.json`) contains:

```json
{
  "status": "idle" | "analyzing" | "issues_found",
  "lastCommand": "command-name",
  "lastCommandTimestamp": 1234567890,
  "suggestionCount": 5,
  "highPriorityCount": 2,
  "lastUpdated": 1234567890
}
```

## Suggestions File Format

The suggestions file (`~/.runebook/suggestions.json`) contains:

```json
{
  "suggestions": [
    {
      "id": "suggestion-id",
      "type": "warning" | "command" | "optimization" | "shortcut" | "tip",
      "priority": "low" | "medium" | "high",
      "title": "Suggestion Title",
      "description": "Detailed description",
      "command": "optional-command",
      "args": ["arg1", "arg2"],
      "timestamp": 1234567890
    }
  ],
  "lastUpdated": 1234567890
}
```

## Testing

Run the demo script to see all features:

```bash
./integrations/demo-steps.sh
```

## Requirements

- All integrations work over SSH (no GUI dependencies)
- No system notifications (passive display only)
- All surfaces read from the same shared store
- Works in headless environments

## Troubleshooting

### Status not updating

1. Check that the agent is enabled:
   ```bash
   runebook agent status
   ```

2. Verify the status file exists:
   ```bash
   cat ~/.runebook/agent-status.json
   ```

3. Check file permissions:
   ```bash
   ls -la ~/.runebook/
   ```

### Tmux status not showing

1. Verify the script is executable:
   ```bash
   chmod +x ~/.runebook/integrations/tmux-status.sh
   ```

2. Test the script directly:
   ```bash
   ~/.runebook/integrations/tmux-status.sh
   ```

3. Check tmux config syntax:
   ```bash
   tmux show-options -g status-right
   ```

### WezTerm status not showing

1. Check WezTerm logs for errors
2. Verify the status file exists and is readable
3. Test JSON parsing manually

