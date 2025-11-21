import yaml from 'js-yaml';
import type { Canvas } from '../types/canvas';

export async function loadCanvasFromYAML(yamlContent: string): Promise<Canvas> {
  try {
    const data = yaml.load(yamlContent) as any;
    
    // Validate required fields
    if (!data.id || !data.name || !data.nodes || !data.connections) {
      throw new Error('Invalid canvas YAML: missing required fields');
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      nodes: data.nodes || [],
      connections: data.connections || [],
      version: data.version || '1.0.0'
    };
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
