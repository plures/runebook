import yaml from 'js-yaml';
import type { Canvas } from '../types/canvas';

/** Synchronously parse and validate canvas YAML content. */
export function parseCanvasFromYAML(yamlContent: string): Canvas {
  const data = yaml.load(yamlContent) as unknown;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid canvas YAML: root must be a non-null object');
  }
  const { id, name, description, nodes, connections, version } = data as Record<
    string,
    unknown
  >;
  if (!id || !name || typeof id !== 'string' || typeof name !== 'string') {
    throw new Error(
      'Invalid canvas YAML: "id" and "name" must be non-empty strings',
    );
  }
  if (!Array.isArray(nodes) || !Array.isArray(connections)) {
    throw new Error(
      'Invalid canvas YAML: "nodes" and "connections" must be arrays',
    );
  }

  // Shallow element validation: catch obviously malformed nodes/connections early.
  const validTypes = new Set([
    'text',
    'terminal',
    'input',
    'display',
    'transform',
  ]);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i] as Record<string, unknown>;
    if (!n || typeof n !== 'object') {
      throw new Error(`Invalid canvas YAML: nodes[${i}] must be an object`);
    }
    if (typeof n['id'] !== 'string' || !n['id']) {
      throw new Error(
        `Invalid canvas YAML: nodes[${i}].id must be a non-empty string`,
      );
    }
    if (!validTypes.has(n['type'] as string)) {
      throw new Error(
        `Invalid canvas YAML: nodes[${i}].type must be text|terminal|input|display|transform`,
      );
    }
    const pos = n['position'] as Record<string, unknown> | undefined;
    if (!pos || typeof pos['x'] !== 'number' || typeof pos['y'] !== 'number') {
      throw new Error(
        `Invalid canvas YAML: nodes[${i}].position must have numeric x and y`,
      );
    }
  }
  for (let i = 0; i < connections.length; i++) {
    const c = connections[i] as Record<string, unknown>;
    if (!c || typeof c !== 'object') {
      throw new Error(
        `Invalid canvas YAML: connections[${i}] must be an object`,
      );
    }
    for (const key of ['from', 'to', 'fromPort', 'toPort'] as const) {
      if (typeof c[key] !== 'string' || !c[key]) {
        throw new Error(
          `Invalid canvas YAML: connections[${i}].${key} must be a non-empty string`,
        );
      }
    }
  }

  return {
    id: id as string,
    name: name as string,
    description: (description as string) || '',
    nodes: nodes as Canvas['nodes'],
    connections: connections as Canvas['connections'],
    version: (version as string) || '1.0.0',
  };
}

export async function loadCanvasFromYAML(yamlContent: string): Promise<Canvas> {
  try {
    return parseCanvasFromYAML(yamlContent);
  } catch (error) {
    console.error('Error parsing canvas YAML:', error);
    throw error;
  }
}

export function saveCanvasToYAML(canvas: Canvas): string {
  try {
    return yaml.dump(canvas, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  } catch (error) {
    console.error('Error serializing canvas to YAML:', error);
    throw error;
  }
}

export async function loadCanvasFromFile(filePath: string): Promise<Canvas> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load canvas file: ${response.statusText}`);
    }
    const yamlContent = await response.text();
    return loadCanvasFromYAML(yamlContent);
  } catch (error) {
    console.error('Error loading canvas file:', error);
    throw error;
  }
}
