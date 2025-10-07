import yaml from 'js-yaml';
import { validateTemplate } from './template-compiler';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate template composition YAML structure and content
 */
export function validateCompositionYAML(yamlContent: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Parse YAML
    const data = yaml.load(yamlContent) as any;

    // Validate metadata
    validateMetadata(data, errors);

    // Validate flow structure
    validateFlowStructure(data, errors, warnings);

    // Validate node types and connections
    validateNodes(data, errors, warnings);

    // Validate edges
    validateEdges(data, errors, warnings);

    // Validate compiled template if present
    if (data.compiled_template) {
      validateCompiledTemplate(data.compiled_template, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      field: 'yaml',
      message: `YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });

    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Validate template fragment YAML structure and content
 */
export function validateFragmentYAML(yamlContent: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    const data = yaml.load(yamlContent) as any;

    // Validate metadata
    validateMetadata(data, errors);

    // Validate variables
    if (data.variables) {
      validateVariables(data.variables, errors, warnings);
    }

    // Validate content
    if (!data.content || typeof data.content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Template content is required and must be a string',
        severity: 'error',
      });
    } else {
      // Validate Jinja2 syntax
      const templateValidation = validateTemplate(data.content);
      if (!templateValidation.valid) {
        templateValidation.errors.forEach((err) => {
          errors.push({
            field: 'content',
            message: `Template syntax error: ${err}`,
            severity: 'error',
          });
        });
      }
    }

    // Validate category
    const validCategories = [
      'header',
      'validation',
      'transformation',
      'error_handling',
      'logging',
      'footer',
      'initialization',
      'cleanup',
      'custom',
    ];

    if (data.metadata?.category && !validCategories.includes(data.metadata.category)) {
      errors.push({
        field: 'metadata.category',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      field: 'yaml',
      message: `YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });

    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Validate metadata structure
 */
function validateMetadata(data: any, errors: ValidationError[]): void {
  if (!data.metadata) {
    errors.push({
      field: 'metadata',
      message: 'Metadata section is required',
      severity: 'error',
    });
    return;
  }

  const required = ['id', 'name', 'version'];
  required.forEach((field) => {
    if (!data.metadata[field]) {
      errors.push({
        field: `metadata.${field}`,
        message: `${field} is required in metadata`,
        severity: 'error',
      });
    }
  });

  // Validate UUID format for id
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (data.metadata.id && !uuidRegex.test(data.metadata.id)) {
    errors.push({
      field: 'metadata.id',
      message: 'ID must be a valid UUID v4',
      severity: 'error',
    });
  }

  // Validate semver format for version
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
  if (data.metadata.version && !semverRegex.test(data.metadata.version)) {
    errors.push({
      field: 'metadata.version',
      message: 'Version must follow semantic versioning (e.g., 1.0.0)',
      severity: 'error',
    });
  }

  // Validate language
  const validLanguages = ['sql', 'python', 'scala'];
  if (data.metadata.language && !validLanguages.includes(data.metadata.language)) {
    errors.push({
      field: 'metadata.language',
      message: `Language must be one of: ${validLanguages.join(', ')}`,
      severity: 'error',
    });
  }
}

/**
 * Validate flow structure
 */
function validateFlowStructure(
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.flow) {
    errors.push({
      field: 'flow',
      message: 'Flow section is required for compositions',
      severity: 'error',
    });
    return;
  }

  if (!data.flow.nodes || !Array.isArray(data.flow.nodes)) {
    errors.push({
      field: 'flow.nodes',
      message: 'Nodes must be an array',
      severity: 'error',
    });
  }

  if (!data.flow.edges || !Array.isArray(data.flow.edges)) {
    errors.push({
      field: 'flow.edges',
      message: 'Edges must be an array',
      severity: 'error',
    });
  }

  // Check for start and end nodes
  const nodes = data.flow.nodes || [];
  const hasStart = nodes.some((n: any) => n.type === 'start');
  const hasEnd = nodes.some((n: any) => n.type === 'end');

  if (!hasStart) {
    warnings.push({
      field: 'flow.nodes',
      message: 'Flow should have a start node',
      severity: 'warning',
    });
  }

  if (!hasEnd) {
    warnings.push({
      field: 'flow.nodes',
      message: 'Flow should have an end node',
      severity: 'warning',
    });
  }
}

/**
 * Validate nodes
 */
function validateNodes(
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const nodes = data.flow?.nodes || [];
  const validNodeTypes = ['start', 'end', 'fragment', 'condition', 'merge'];
  const nodeIds = new Set<string>();

  nodes.forEach((node: any, index: number) => {
    const prefix = `flow.nodes[${index}]`;

    // Check required fields
    if (!node.id) {
      errors.push({
        field: `${prefix}.id`,
        message: 'Node ID is required',
        severity: 'error',
      });
    } else {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        errors.push({
          field: `${prefix}.id`,
          message: `Duplicate node ID: ${node.id}`,
          severity: 'error',
        });
      }
      nodeIds.add(node.id);
    }

    if (!node.type) {
      errors.push({
        field: `${prefix}.type`,
        message: 'Node type is required',
        severity: 'error',
      });
    } else if (!validNodeTypes.includes(node.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Invalid node type: ${node.type}. Must be one of: ${validNodeTypes.join(', ')}`,
        severity: 'error',
      });
    }

    // Check position
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push({
        field: `${prefix}.position`,
        message: 'Node position must have numeric x and y coordinates',
        severity: 'error',
      });
    }

    // Fragment nodes should reference a fragment
    if (node.type === 'fragment' && !node.data?.fragment_id) {
      warnings.push({
        field: `${prefix}.data.fragment_id`,
        message: 'Fragment node should reference a fragment ID',
        severity: 'warning',
      });
    }

    // Condition nodes should have a condition
    if (node.type === 'condition' && !node.data?.condition) {
      warnings.push({
        field: `${prefix}.data.condition`,
        message: 'Condition node should have a condition expression',
        severity: 'warning',
      });
    }
  });
}

/**
 * Validate edges
 */
function validateEdges(
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const edges = data.flow?.edges || [];
  const nodes = data.flow?.nodes || [];
  const nodeIds = new Set(nodes.map((n: any) => n.id));
  const edgeIds = new Set<string>();

  edges.forEach((edge: any, index: number) => {
    const prefix = `flow.edges[${index}]`;

    // Check required fields
    if (!edge.id) {
      errors.push({
        field: `${prefix}.id`,
        message: 'Edge ID is required',
        severity: 'error',
      });
    } else {
      if (edgeIds.has(edge.id)) {
        errors.push({
          field: `${prefix}.id`,
          message: `Duplicate edge ID: ${edge.id}`,
          severity: 'error',
        });
      }
      edgeIds.add(edge.id);
    }

    if (!edge.source) {
      errors.push({
        field: `${prefix}.source`,
        message: 'Edge source is required',
        severity: 'error',
      });
    } else if (!nodeIds.has(edge.source)) {
      errors.push({
        field: `${prefix}.source`,
        message: `Edge source references non-existent node: ${edge.source}`,
        severity: 'error',
      });
    }

    if (!edge.target) {
      errors.push({
        field: `${prefix}.target`,
        message: 'Edge target is required',
        severity: 'error',
      });
    } else if (!nodeIds.has(edge.target)) {
      errors.push({
        field: `${prefix}.target`,
        message: `Edge target references non-existent node: ${edge.target}`,
        severity: 'error',
      });
    }
  });
}

/**
 * Validate variables
 */
function validateVariables(
  variables: any[],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const validTypes = ['string', 'number', 'boolean', 'array', 'object'];

  variables.forEach((variable: any, index: number) => {
    const prefix = `variables[${index}]`;

    if (!variable.name) {
      errors.push({
        field: `${prefix}.name`,
        message: 'Variable name is required',
        severity: 'error',
      });
    }

    if (variable.type && !validTypes.includes(variable.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Invalid variable type: ${variable.type}. Must be one of: ${validTypes.join(', ')}`,
        severity: 'error',
      });
    }

    if (variable.required === undefined) {
      warnings.push({
        field: `${prefix}.required`,
        message: 'Variable should specify if it is required',
        severity: 'warning',
      });
    }
  });
}

/**
 * Validate compiled template content
 */
function validateCompiledTemplate(
  template: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const validation = validateTemplate(template);

  if (!validation.valid) {
    validation.errors.forEach((err) => {
      errors.push({
        field: 'compiled_template',
        message: `Template error: ${err}`,
        severity: 'error',
      });
    });
  }

  // Check for security issues
  const securityChecks = [
    { pattern: /EXECUTE\s+IMMEDIATE/i, message: 'Dynamic SQL execution detected' },
    { pattern: /xp_cmdshell/i, message: 'Command execution attempt detected' },
    { pattern: /openrowset/i, message: 'File system access detected' },
    { pattern: /\beval\(/i, message: 'Code evaluation detected' },
  ];

  securityChecks.forEach(({ pattern, message }) => {
    if (pattern.test(template)) {
      errors.push({
        field: 'compiled_template',
        message: `Security violation: ${message}`,
        severity: 'error',
      });
    }
  });
}

/**
 * Auto-fix common YAML issues
 */
export function autoFixYAML(yamlContent: string): string {
  try {
    const data = yaml.load(yamlContent) as any;

    // Auto-fix missing fields
    if (!data.metadata) {
      data.metadata = {};
    }

    if (!data.metadata.version) {
      data.metadata.version = '1.0.0';
    }

    if (!data.metadata.is_system_template) {
      data.metadata.is_system_template = false;
    }

    // Return formatted YAML
    return yaml.dump(data, {
      indent: 2,
      lineWidth: 100,
      noRefs: true,
    });
  } catch (error) {
    // If parsing fails, return original
    return yamlContent;
  }
}
