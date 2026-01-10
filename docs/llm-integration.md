# LLM/MCP Integration

RuneBook supports optional model-backed reasoning via LLM providers or MCP (Model Context Protocol). This feature is **disabled by default** and must be explicitly enabled in configuration.

## Overview

The LLM integration provides intelligent suggestions for command failures by analyzing:
- Command context (command, args, working directory)
- Error output (stderr, stdout)
- Previous commands
- Repository metadata

All LLM analysis is **suggestion-only** - it never executes commands automatically.

## Safety Features

### Context Sanitization
Before sending context to an LLM, RuneBook automatically redacts:
- API keys and tokens (GitHub tokens, OpenAI keys, AWS keys, etc.)
- Environment variables containing secrets
- Private keys
- JWT tokens
- Long alphanumeric strings that look like tokens

### User Review
By default, the sanitized context is shown to the user before sending to the LLM. This can be disabled in configuration, but is recommended for privacy.

### Caching (Optional)
Responses can be cached to reduce API calls and costs. Cache TTL is configurable.

### Never Auto-Execute
LLM suggestions are **never executed automatically**. They are only displayed as suggestions that the user can review and apply manually.

## Configuration

### Basic Configuration

Add LLM configuration to your observer config file (`~/.runebook/observer-config.json`):

```json
{
  "enabled": true,
  "redactSecrets": true,
  "llm": {
    "type": "ollama",
    "enabled": true,
    "ollama": {
      "model": "llama3.2",
      "baseUrl": "http://localhost:11434"
    },
    "safety": {
      "requireUserReview": true,
      "cacheEnabled": false,
      "cacheTtl": 3600
    }
  }
}
```

### Provider Types

#### Ollama (Local)
Runs models locally via Ollama. No API keys required.

```json
{
  "llm": {
    "type": "ollama",
    "enabled": true,
    "ollama": {
      "model": "llama3.2",
      "baseUrl": "http://localhost:11434"
    }
  }
}
```

**Requirements:**
- Ollama installed and running (`ollama serve`)
- Model pulled (`ollama pull llama3.2`)

#### OpenAI
Uses OpenAI API. Requires API key.

```json
{
  "llm": {
    "type": "openai",
    "enabled": true,
    "openai": {
      "model": "gpt-4o-mini",
      "apiKey": "${OPENAI_API_KEY}"
    }
  }
}
```

**Requirements:**
- `OPENAI_API_KEY` environment variable set
- Or provide `apiKey` in config (less secure)

#### Mock (Testing)
Returns deterministic responses for testing.

```json
{
  "llm": {
    "type": "mock",
    "enabled": true
  }
}
```

#### MCP (Future)
MCP provider support is planned but not yet implemented.

### Safety Configuration

```json
{
  "safety": {
    "requireUserReview": true,    // Show context before sending (default: true)
    "maxContextLength": 8000,      // Truncate if too long (default: 8000 tokens)
    "cacheEnabled": false,        // Cache responses (default: false)
    "cacheTtl": 3600              // Cache TTL in seconds (default: 3600)
  }
}
```

## CLI Commands

### Check LLM Status

```bash
runebook llm status
```

Shows:
- Provider type and availability
- Configuration settings
- Safety settings
- Provider-specific configuration

## Privacy Considerations

### What Data is Sent

When LLM analysis is enabled, the following data may be sent to the LLM provider:
- Command and arguments (sanitized)
- Working directory
- Error output (stderr, sanitized)
- Standard output (stdout, sanitized)
- Previous commands (last 3-5)
- Repository metadata (type, language, relevant files)

### What is NOT Sent

- Full environment variables (only sanitized summary)
- Secrets, tokens, API keys (redacted)
- Full file contents (only metadata)
- Personal information (if present in commands, may be included)

### Data Retention

- **Ollama (Local)**: Data never leaves your machine
- **OpenAI**: Data is sent to OpenAI's API. Check OpenAI's privacy policy for data retention.
- **Mock**: No external calls, only for testing

### Recommendations

1. **Use Ollama for maximum privacy** - All processing happens locally
2. **Enable user review** - Review context before sending
3. **Review sanitization** - Check what was redacted before sending
4. **Disable if sensitive** - If working with highly sensitive data, disable LLM analysis

## MCP Tool Contract

The LLM integration uses a standardized contract for communication:

### Input

```typescript
{
  contextWindow: {
    command: string;
    args: string[];
    cwd: string;
    env: Record<string, string>; // Sanitized
    exitCode: number;
    stdout: string; // Sanitized
    stderr: string; // Sanitized
    previousCommands: Array<{...}>;
  };
  errorSummary: {
    command: string;
    args: string[];
    exitCode: number;
    stderr: string;
    stdout: string;
    cwd: string;
    timestamp: number;
  };
  repoMetadata: {
    root?: string;
    type?: 'git' | 'hg' | 'svn' | 'none';
    files?: string[];
    language?: string;
    framework?: string;
  };
}
```

### Output

```typescript
{
  suggestions: Array<{
    title: string;
    description: string;
    actionableSnippet?: string;
    confidence: number; // 0.0 to 1.0
    type: 'command' | 'optimization' | 'shortcut' | 'warning' | 'tip';
    priority: 'low' | 'medium' | 'high';
  }>;
  provenance: {
    provider: string;
    model?: string;
    timestamp: number;
    tokensUsed?: number;
  };
}
```

## Troubleshooting

### Ollama Not Available

```
Error: Ollama provider is not available
```

**Solution:**
1. Make sure Ollama is running: `ollama serve`
2. Check if the model is installed: `ollama list`
3. Pull the model if needed: `ollama pull llama3.2`
4. Verify base URL in config matches Ollama's port

### OpenAI API Key Missing

```
Error: OpenAI API key not found
```

**Solution:**
1. Set `OPENAI_API_KEY` environment variable: `export OPENAI_API_KEY=sk-...`
2. Or provide `apiKey` in config (less secure)

### Provider Not Responding

If the provider times out or fails:
1. Check network connectivity (for OpenAI)
2. Check provider logs (for Ollama)
3. Try disabling and re-enabling LLM analysis
4. Check `runebook llm status` for detailed error messages

## Examples

### Example: Nix Build Error

When a Nix build fails, the LLM analyzer receives:
- Command: `nix build`
- Error: Missing attribute "cursor"
- Repository: Nix flake with `flake.nix`

The LLM might suggest:
- Check if the attribute exists in the flake
- Verify the input source
- Check for typos in attribute names

### Example: Git Authentication Error

When Git authentication fails:
- Command: `git push`
- Error: Authentication failed
- Repository: Git repository

The LLM might suggest:
- Check if credentials are configured
- Verify SSH key or token
- Check GitHub rate limits

## Future Enhancements

- [ ] MCP protocol support
- [ ] Additional providers (Anthropic, local models)
- [ ] Fine-tuned models for specific error types
- [ ] Context window optimization
- [ ] Streaming responses
- [ ] Multi-model ensemble

