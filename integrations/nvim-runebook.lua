-- RuneBook Neovim plugin (Lua version)
-- Place this file in ~/.config/nvim/lua/runebook.lua or ~/.config/nvim/plugin/runebook.lua

local M = {}

local status_file = vim.fn.expand('~/.runebook/agent-status.json')
local suggestions_file = vim.fn.expand('~/.runebook/suggestions.json')

-- Simple JSON parser for reading status (minimal implementation)
local function read_json_file(filepath)
  local file = io.open(filepath, 'r')
  if not file then
    return nil
  end
  
  local content = file:read('*all')
  file:close()
  
  -- Use vim.json if available (Neovim 0.10+)
  if vim.json then
    local ok, data = pcall(vim.json.decode, content)
    if ok then
      return data
    end
  end
  
  -- Fallback: simple parsing for status field
  local status = content:match('"status"%s*:%s*"([^"]*)"')
  local high_priority = content:match('"highPriorityCount"%s*:%s*([0-9]+)')
  local suggestion_count = content:match('"suggestionCount"%s*:%s*([0-9]+)')
  
  if status then
    return {
      status = status,
      highPriorityCount = high_priority and tonumber(high_priority) or 0,
      suggestionCount = suggestion_count and tonumber(suggestion_count) or 0,
    }
  end
  
  return nil
end

-- Get top suggestion
function M.get_top_suggestion()
  local file = io.open(suggestions_file, 'r')
  if not file then
    return nil
  end
  
  local content = file:read('*all')
  file:close()
  
  -- Use vim.json if available
  if vim.json then
    local ok, data = pcall(vim.json.decode, content)
    if ok and data.suggestions and #data.suggestions > 0 then
      -- Sort by priority and return top
      table.sort(data.suggestions, function(a, b)
        local priority_order = { high = 3, medium = 2, low = 1 }
        local a_prio = priority_order[a.priority] or 0
        local b_prio = priority_order[b.priority] or 0
        if a_prio ~= b_prio then
          return a_prio > b_prio
        end
        return a.timestamp > b.timestamp
      end)
      return data.suggestions[1]
    end
  end
  
  -- Fallback: simple extraction
  local title = content:match('"title"%s*:%s*"([^"]*)"')
  local priority = content:match('"priority"%s*:%s*"([^"]*)"')
  
  if title then
    return {
      title = title,
      priority = priority or 'low',
    }
  end
  
  return nil
end

-- Show suggestion in command line
function M.show_suggestion()
  local suggestion = M.get_top_suggestion()
  if not suggestion then
    vim.notify('No suggestions available', vim.log.levels.INFO)
    return
  end
  
  local symbol = suggestion.priority == 'high' and '⚠' 
              or suggestion.priority == 'medium' and '▲' 
              or '•'
  
  local text = string.format('%s %s', symbol, suggestion.title)
  if suggestion.description then
    text = text .. '\n' .. suggestion.description
  end
  
  vim.notify(text, vim.log.levels.INFO, { title = 'RuneBook Suggestion' })
end

-- Display in virtual text (optional)
function M.update_virtual_text()
  if not vim.api.nvim_buf_is_valid(0) then
    return
  end
  
  local ns = vim.api.nvim_create_namespace('runebook')
  vim.api.nvim_buf_clear_namespace(0, ns, 0, -1)
  
  local suggestion = M.get_top_suggestion()
  if suggestion then
    local symbol = suggestion.priority == 'high' and '⚠' 
                or suggestion.priority == 'medium' and '▲' 
                or '•'
    local text = string.format('%s %s', symbol, suggestion.title)
    
    -- Show at end of first line
    vim.api.nvim_buf_set_extmark(0, ns, 0, -1, {
      virt_text = {{ text, 'Comment' }},
      virt_text_pos = 'eol',
    })
  end
end

-- Create command
vim.api.nvim_create_user_command('RunebookSuggestion', M.show_suggestion, {
  desc = 'Show RuneBook suggestion',
})

-- Optional: Auto-update virtual text on buffer enter
-- vim.api.nvim_create_autocmd('BufEnter', {
--   callback = M.update_virtual_text,
-- })

return M

