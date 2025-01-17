export interface Model {
  name: string;
  id: string;
  inputSchema: ModelParameter[];
  outputSchema: ModelParameter[];
}

export interface ModelParameter {
  key: string;
  type: ModelParameterType;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[];  // For enum-like parameters
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: unknown) => boolean;
  };
}

export type ModelParameterType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'enum'
  | 'image'  // Special type for image data
  | 'file'   // Special type for file uploads
  | 'json';  // For structured JSON data

export interface Image {
  url: string;
  width: number;
  height: number;
  content_type: string;
  [key: string]: unknown;  // Allows additional image properties
}

// Helper type for runtime parameter values
export interface ModelParameterValue {
  key: string;
  value: unknown;
}