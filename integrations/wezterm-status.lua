-- RuneBook WezTerm right-status integration
-- Add this to your ~/.config/wezterm/wezterm.lua:
--   local runebook_status = require('integrations/wezterm-status')
--   config.set_wezterm_config(runebook_status)

local wezterm = require 'wezterm'
local json = require 'json'

local function get_agent_status()
  local status_file = wezterm.home_dir .. '/.runebook/agent-status.json'
  local file = io.open(status_file, 'r')
  
  if not file then
    return nil
  end
  
  local content = file:read('*all')
  file:close()
  
  local ok, data = pcall(json.decode, content)
  if not ok then
    return nil
  end
  
  return data
end

local function format_status(status_data)
  if not status_data then
    return ''
  end
  
  local status = status_data.status or 'idle'
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
    local high_priority = status_data.highPriorityCount or 0
    if high_priority > 0 then
      text = tostring(high_priority)
    end
  end
  
  if symbol == '' then
    return ''
  end
  
  return wezterm.format({
    { Foreground = { Color = color } },
    { Text = symbol .. text },
    { Foreground = { Color = '#ffffff' } },
    { Text = ' ' },
  })
end

wezterm.on('update-right-status', function(window, pane)
  local status_data = get_agent_status()
  local status_text = format_status(status_data)
  
  window:set_right_status(status_text)
end)

return {
  get_agent_status = get_agent_status,
  format_status = format_status,
}

