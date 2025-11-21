# Integration Plans

## PluresDB Integration

PluresDB will provide persistent storage for canvas definitions, node states, and user data.

### Planned Features

- **Canvas Storage**: Save and load canvas configurations from the database
- **Node State Persistence**: Store terminal outputs and node values
- **History Tracking**: Version control for canvas changes
- **Search**: Full-text search across canvas definitions and node content

### Implementation Notes

PluresDB integration will be added in a future iteration. The current YAML-based system provides a foundation for understanding the data model.

## MCP (Model Context Protocol) Integration

MCP will enable AI assistance within RuneBook workflows.

### Planned Features

- **AI Transform Nodes**: Process data using LLM capabilities
- **Natural Language Commands**: Create and modify canvas elements via text
- **Code Generation**: Generate terminal commands and scripts
- **Data Analysis**: Analyze terminal outputs and suggest insights
- **Autocomplete**: Suggest next nodes based on workflow context

### Use Cases

1. **Command Suggestion**: "Show me disk usage" → generates `du -sh` terminal node
2. **Data Transformation**: Transform JSON output to different formats
3. **Error Analysis**: Analyze error messages and suggest fixes
4. **Workflow Optimization**: Suggest improvements to canvas layouts

### Integration Approach

1. Add MCP client to Tauri backend
2. Create MCP server connector nodes
3. Implement prompt templates for common operations
4. Add AI suggestion UI components

## Sudolang Support

Sudolang will provide a natural language interface for creating and manipulating canvas workflows.

### Planned Features

- **Natural Language Node Creation**: "Create a terminal that lists files"
- **Flow Description**: Describe entire workflows in prose
- **Dynamic Scripting**: Write Sudolang scripts that generate canvas configurations
- **Interactive Refinement**: Conversational workflow building

### Example Sudolang Workflow

```sudolang
Create a workflow that:
1. Gets the current date
2. Lists all files in the current directory
3. Counts the number of files
4. Displays all information in separate panels

Connect the outputs appropriately.
```

This would automatically generate:
- A terminal node running `date`
- A terminal node running `ls`
- A terminal node running `ls | wc -l`
- Three display nodes showing the outputs
- Connections between all nodes

### Implementation Notes

Sudolang integration will require:
1. Parser for Sudolang syntax
2. Code generator that creates canvas YAML
3. Interpreter for dynamic execution
4. REPL-style interface for interactive development

## Transform Nodes

Transform nodes will enable data processing between nodes.

### Types of Transforms

1. **Map**: Transform each item in a collection
2. **Filter**: Select items matching criteria
3. **Reduce**: Aggregate data into a single value
4. **Parse**: Convert between formats (JSON, CSV, XML)
5. **Sudolang**: Custom transformations using natural language

### Example

```
Terminal (ls -l) → Transform (parse file listing) → Display (table view)
```

## Future Integration Priorities

1. **Phase 1**: Transform nodes with JavaScript
2. **Phase 2**: PluresDB for persistence
3. **Phase 3**: MCP for AI assistance
4. **Phase 4**: Sudolang for natural language workflows

## Contributing

If you'd like to contribute to any of these integrations, please see the main README for contribution guidelines.
