" RuneBook Vim/Neovim plugin
" Minimal plugin to display last suggestion
" Place this file in ~/.vim/plugin/ or ~/.config/nvim/plugin/

if exists('g:loaded_runebook')
  finish
endif
let g:loaded_runebook = 1

let s:status_file = expand('~/.runebook/agent-status.json')
let s:suggestions_file = expand('~/.runebook/suggestions.json')

" Get top suggestion
function! s:GetTopSuggestion()
  if !filereadable(s:suggestions_file)
    return ''
  endif
  
  try
    let content = readfile(s:suggestions_file)
    let json_str = join(content, '')
    " Simple JSON parsing for suggestions array
    " This is a minimal implementation - for production, use a proper JSON parser
    let suggestions = matchstr(json_str, '"suggestions"\s*:\s*\[.*\]')
    if empty(suggestions)
      return ''
    endif
    
    " Extract first suggestion title (simplified)
    let title = matchstr(suggestions, '"title"\s*:\s*"\([^"]*\)"', 0, 1)
    let priority = matchstr(suggestions, '"priority"\s*:\s*"\([^"]*\)"', 0, 1)
    
    if empty(title)
      return ''
    endif
    
    let symbol = priority ==# 'high' ? '⚠' : priority ==# 'medium' ? '▲' : '•'
    return symbol . ' ' . title
  catch
    return ''
  endtry
endfunction

" Display suggestion in command line
function! RunebookShowSuggestion()
  let suggestion = s:GetTopSuggestion()
  if empty(suggestion)
    echo 'No suggestions available'
  else
    echo suggestion
  endif
endfunction

" Command to show suggestion
command! RunebookSuggestion call RunebookShowSuggestion()

" Optional: Show suggestion in virtual text (Neovim only)
if has('nvim')
  function! s:UpdateVirtualText()
    if !exists('b:runebook_ns')
      let b:runebook_ns = nvim_create_namespace('runebook')
    endif
    
    " Clear existing virtual text
    call nvim_buf_clear_namespace(0, b:runebook_ns, 0, -1)
    
    let suggestion = s:GetTopSuggestion()
    if !empty(suggestion)
      " Show at end of first line
      call nvim_buf_set_virtual_text(0, b:runebook_ns, 0, [[suggestion, 'Comment']], {})
    endif
  endfunction
  
  " Auto-update on buffer enter (optional)
  " autocmd BufEnter * call s:UpdateVirtualText()
endif

