#!/bin/bash
# RuneBook tmux status line integration
# Add this to your ~/.tmux.conf:
#   set -g status-right '#(bash ~/.runebook/integrations/tmux-status.sh)'

RUNebook_CLI="${RUNebook_CLI:-runebook}"
STATUS_FILE="$HOME/.runebook/agent-status.json"

if [ ! -f "$STATUS_FILE" ]; then
  echo ""
  exit 0
fi

# Read status from JSON file
STATUS=$(cat "$STATUS_FILE" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
SUGGESTION_COUNT=$(cat "$STATUS_FILE" 2>/dev/null | grep -o '"suggestionCount":[0-9]*' | cut -d':' -f2)
HIGH_PRIORITY=$(cat "$STATUS_FILE" 2>/dev/null | grep -o '"highPriorityCount":[0-9]*' | cut -d':' -f2)

if [ -z "$STATUS" ]; then
  echo ""
  exit 0
fi

case "$STATUS" in
  "idle")
    SYMBOL="●"
    COLOR="#[fg=green]"
    ;;
  "analyzing")
    SYMBOL="⟳"
    COLOR="#[fg=yellow]"
    ;;
  "issues_found")
    SYMBOL="⚠"
    COLOR="#[fg=red]"
    if [ -n "$HIGH_PRIORITY" ] && [ "$HIGH_PRIORITY" -gt 0 ]; then
      TEXT="${HIGH_PRIORITY}"
    fi
    ;;
  *)
    echo ""
    exit 0
    ;;
esac

if [ -z "$TEXT" ]; then
  TEXT=""
fi

echo "${COLOR}${SYMBOL}${TEXT}#[fg=default]"

