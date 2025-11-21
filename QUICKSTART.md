# Quick Start Guide

## Installation

1. **Install prerequisites:**
   - Node.js 20.x or higher
   - Rust 1.70 or higher
   - Platform-specific dependencies (see main README)

2. **Clone and install:**
   ```bash
   git clone https://github.com/plures/runebook.git
   cd runebook
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

## Your First Canvas

When RuneBook starts, you'll see:
- A **dark canvas** (the main workspace)
- A **toolbar** on the left with buttons to add nodes
- An empty workspace ready for nodes

### Creating a Simple Workflow

1. **Add a Terminal Node:**
   - Click "⚡ Terminal" in the toolbar
   - A terminal node appears on the canvas
   - The default command is `echo Hello, RuneBook!`

2. **Add a Display Node:**
   - Click "📊 Display" in the toolbar
   - A display node appears on the canvas
   - This will show the output from the terminal

3. **Run the Terminal:**
   - Click the "▶ Run" button on the terminal node
   - You'll see the output appear in the terminal node's output area

4. **Try an Input Node:**
   - Click "📝 Input" in the toolbar
   - An input node appears with a text field
   - Type something and see it update in real-time

### Moving Nodes

- Click and drag any node to reposition it on the canvas
- Nodes can be placed anywhere on the infinite canvas

### Loading Examples

1. Click "📂 Load Example" in the toolbar
2. The hello-world example will load with:
   - A terminal that runs `echo`
   - An input widget
   - Two display panels showing outputs

### Saving Your Work

1. Create your canvas layout
2. Click "💾 Save" in the toolbar
3. A YAML file downloads with your canvas definition

## Common Terminal Commands

Here are some useful commands to try in terminal nodes:

```bash
# Show current date
date

# List files
ls -la

# Show current directory
pwd

# Echo with variables
echo "Current user: $USER"

# Count files
ls | wc -l

# Show system info
uname -a
```

## Input Node Types

RuneBook supports several input types:

- **Text**: Free-form text input
- **Number**: Numeric values with optional min/max/step
- **Checkbox**: Boolean true/false toggle
- **Slider**: Visual range selector

## Display Types

Display nodes can show data in different formats:

- **Text**: Plain text display
- **JSON**: Formatted JSON with syntax highlighting
- **Table**: Tabular data (for arrays of objects)

## Next Steps

- Explore the example canvases in `/static/examples/`
- Read the full documentation in README.md
- Check INTEGRATIONS.md for upcoming features
- Experiment with different terminal commands
- Create custom workflows for your tasks

## Tips

- Use the terminal's "Clear" button to reset output
- Drag nodes to organize your workspace
- Save frequently to preserve your work
- Terminal nodes can use environment variables
- Multiple display nodes can show the same data

## Troubleshooting

**Terminal commands don't execute:**
- Check that the command is in your system PATH
- Verify command syntax is correct
- Check terminal output for error messages

**Can't see node output:**
- Ensure the terminal node has run successfully
- Check for errors in the terminal node
- Try the "Clear" button and run again

**Load Example doesn't work:**
- Ensure the examples directory exists: `/static/examples/`
- Check browser console for error messages
- Verify YAML files are properly formatted

## keyboard Shortcuts (Coming Soon)

Future versions will include:
- Ctrl/Cmd + S: Save canvas
- Ctrl/Cmd + O: Load canvas
- Delete: Remove selected node
- Ctrl/Cmd + Z: Undo
- Ctrl/Cmd + Y: Redo

## Learn More

- [Full README](README.md) - Complete documentation
- [Integration Plans](INTEGRATIONS.md) - Future features
- [Tauri Documentation](https://tauri.app/) - Desktop app framework
- [Svelte 5 Guide](https://svelte.dev/) - UI framework
