# RuneBook Ambient Agent Mode - "Zero to Hero" Demo

This walkthrough demonstrates RuneBook's Ambient Agent Mode from setup to analysis, showing how it captures terminal commands, analyzes failures, and provides intelligent suggestions.

## Prerequisites

- Node.js 20.x or higher
- RuneBook installed (or development environment)
- Nix installed (for demo commands that will fail)
- Terminal access

## Demo Overview

This demo will:
1. Enable Ambient Agent Mode
2. Run a few failing Nix commands
3. Show RuneBook capturing the events
4. Display analysis results and suggestions
5. Show how to inspect and manage stored data

## Step 1: Enable Ambient Agent Mode

First, enable the agent:

```bash
npm run agent enable
npm run agent status
```

You should see:
```
=== Ambient Agent Status ===

Enabled: Yes
Capture Events: Yes
Analyze Patterns: Yes
Suggest Improvements: Yes
Storage Path: Memory (in-memory)
...
```

## Step 2: Run Failing Commands

Now let's run some commands that will fail. These are common Nix development errors:

### Command 1: Missing Attribute Error

```bash
nix build .#cursor
```

This will likely fail with an error like:
```
error: attribute 'cursor' missing
```

### Command 2: Flake-Parts Template Path Error

```bash
nix flake init -t flake-parts#devShells
```

This might fail with:
```
error: path '/nix/store/.../devShells' does not exist
```

### Command 3: Build Environment Font Conflict

```bash
nix build .#packages.x86_64-linux.default
```

This might fail with font-related errors in buildEnv.

## Step 3: View Captured Events

Check what RuneBook captured:

```bash
npm run agent events 10
```

You should see output like:
```
=== Recent Events (3) ===

✗ [2024-12-27 10:30:15] nix build .#cursor
   Duration: 2.34s, Exit Code: 1
   CWD: /home/user/projects/myproject

✗ [2024-12-27 10:30:20] nix flake init -t flake-parts#devShells
   Duration: 1.89s, Exit Code: 1
   CWD: /home/user/projects/myproject

✗ [2024-12-27 10:30:25] nix build .#packages.x86_64-linux.default
   Duration: 15.67s, Exit Code: 1
   CWD: /home/user/projects/myproject
```

## Step 4: Analyze Last Failure

Analyze the most recent failure:

```bash
npm run analyze last
```

You should see detailed analysis:

```
=== Analysis Results ===

Command: nix build .#cursor
Exit Code: 1
Status: completed
CWD: /home/user/projects/myproject

Stderr:
error: attribute 'cursor' missing
...

=== Suggestions (2) ===

[NixErrorAnalyzer] Missing Attribute "cursor" (confidence: 90%)
  The attribute "cursor" is missing from your flake outputs or packages.
  
  Check your flake.nix file and ensure the attribute exists:
  
  outputs = { self, nixpkgs, ... }: {
    packages.x86_64-linux.cursor = ...;
    # or
    packages.cursor = ...;
  };

[LocalSearchAnalyzer] Check flake.nix for available attributes (confidence: 75%)
  Your flake.nix might have similar attributes. Check the file for available options.
  
  grep -r "packages\|outputs" flake.nix
```

## Step 5: View All Suggestions

See all current suggestions:

```bash
npm run agent suggestions
```

Output:
```
=== Suggestions ===

[high] Missing Attribute "cursor"
  The attribute "cursor" is missing from your flake outputs.
  Confidence: 90%

[medium] Check flake.nix for available attributes
  Your flake.nix might have similar attributes.
  Confidence: 75%

[low] Consider using nix search for available packages
  Use 'nix search' to find available packages.
  Confidence: 60%
```

## Step 6: Inspect Memory Storage

If using PluresDB, inspect the cognitive memory:

```bash
npm run memory inspect
```

Output:
```
=== RuneBook Cognitive Memory ===

Sessions: 1
Recent Errors: 3
Active Suggestions: 3

=== Recent Sessions ===
  abc12345... - bash (started: 12/27/2024, 10:30:00 AM)

=== Recent Errors ===
  [high] exit_code - error: attribute 'cursor' missing
  [high] exit_code - path '/nix/store/.../devShells' does not exist
  [medium] exit_code - font conflict in buildEnv

=== Top Suggestions ===
  [high] Missing Attribute "cursor" - The attribute "cursor" is missing...
  [medium] Check flake.nix for available attributes - Your flake.nix might...
  [low] Consider using nix search - Use 'nix search' to find...
```

## Step 7: View Agent Statistics

Check overall agent statistics:

```bash
npm run agent status
```

Output:
```
=== Ambient Agent Status ===

Enabled: Yes
Capture Events: Yes
Analyze Patterns: Yes
Suggest Improvements: Yes
Storage Path: Memory (in-memory)
Max Events: Unlimited
Retention Days: 30

=== Statistics ===
Total Events: 3
Unique Commands: 3
Average Success Rate: 0.0%
Total Duration: 20.0s
```

## Step 8: Observer Mode (Optional)

For more detailed event capture, enable the observer:

```bash
npm run observer enable
npm run observer status
```

Then tail events in real-time:

```bash
npm run observer events tail
```

In another terminal, run a command:
```bash
nix build .#test
```

You'll see events stream in:
```
[2024-12-27T10:35:00.000Z] command_start   nix build .#test
  CWD: /home/user/projects/myproject
[2024-12-27T10:35:02.000Z] stdout_chunk     [0] building...
[2024-12-27T10:35:05.000Z] exit_status      exitCode: 1, success: false
```

## Step 9: Clean Up Data

Clear old events (optional):

```bash
# Clear events older than 7 days
npm run agent clear 7

# Or clear all events older than 30 days (default)
npm run agent clear
```

## Troubleshooting

### Agent not capturing events

1. Check if agent is enabled:
   ```bash
   npm run agent status
   ```

2. Verify configuration:
   ```bash
   cat ~/.runebook/agent-config.json
   ```

3. Ensure `captureEvents: true` in config

### No suggestions appearing

1. Run some commands first (agent needs data to analyze)
2. Check for failures:
   ```bash
   npm run agent events 20
   ```
3. Run analysis:
   ```bash
   npm run analyze last
   ```

### PluresDB not available

If you see "PluresDB server not available":

1. Check if PluresDB is running:
   ```bash
   curl http://localhost:34567/health
   ```

2. Start PluresDB:
   ```bash
   pluresdb --port 34567
   ```

3. Or use in-memory storage (default):
   - The agent works fine with in-memory storage
   - Data will be lost on restart, but it's fine for testing

### Analysis not working

1. Ensure observer is enabled:
   ```bash
   npm run observer status
   ```

2. Check that commands are being captured:
   ```bash
   npm run observer events 10
   ```

3. Verify analysis service is initialized (check logs)

## Next Steps

- **Read the documentation**: See [README.md](../README.md) for full feature list
- **Explore analysis ladder**: See [ANALYSIS_LADDER.md](../ANALYSIS_LADDER.md) for analysis details
- **Check architecture**: See [ARCHITECTURE.md](../ARCHITECTURE.md) for technical details
- **Review memory schema**: See [MEMORY.md](../MEMORY.md) for storage details

## Demo Script

For an automated version of this demo, run:

```bash
bash scripts/demo.sh
```

