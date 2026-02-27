import yaml from 'js-yaml';
import type { Canvas } from '../types/canvas';

/** Synchronously parse and validate canvas YAML content. */
export function parseCanvasFromYAML(yamlContent: string): Canvas {
  const data = yaml.load(yamlContent) as unknown;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid canvas YAML: root must be a non-null object');
  }
  const { id, name, description, nodes, connections, version } = data as Record<string, unknown>;
  if (!id || !name || typeof id !== 'string' || typeof name !== 'string') {
    throw new Error('Invalid canvas YAML: "id" and "name" must be non-empty strings');
  }
  if (!Array.isArray(nodes) || !Array.isArray(connections)) {
    throw new Error('Invalid canvas YAML: "nodes" and "connections" must be arrays');
  }
  return {
    id: id as string,
    name: name as string,
    description: (description as string) || '',
    nodes: nodes as Canvas['nodes'],
    connections: connections as Canvas['connections'],
    version: (version as string) || '1.0.0'
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
      noRefs: true
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
