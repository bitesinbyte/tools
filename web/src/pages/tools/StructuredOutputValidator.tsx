import { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, readFileAsText } from '../../utils/file';

// ---------------------------------------------------------------------------
// JSON Schema validation engine (pure TypeScript, draft-07 subset)
// ---------------------------------------------------------------------------

interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  maxProperties?: number;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  not?: JsonSchema;
  default?: unknown;
  description?: string;
  title?: string;
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
  [key: string]: unknown;
};

function getType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

function resolveRef(schema: JsonSchema, rootSchema: JsonSchema): JsonSchema {
  if (!schema.$ref) return schema;
  const ref = schema.$ref;
  if (ref.startsWith('#/definitions/')) {
    const defName = ref.slice('#/definitions/'.length);
    const resolved = rootSchema.definitions?.[defName];
    if (resolved) return resolved;
  }
  return schema;
}

function validateValue(
  value: unknown,
  schema: JsonSchema,
  path: string,
  rootSchema: JsonSchema,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const resolved = resolveRef(schema, rootSchema);

  // --- const ---
  if ('const' in resolved) {
    if (!deepEqual(value, resolved.const)) {
      errors.push({
        path,
        message: `Expected constant value ${JSON.stringify(resolved.const)}, got ${JSON.stringify(value)}`,
        keyword: 'const',
      });
    }
    return errors;
  }

  // --- enum ---
  if (resolved.enum) {
    if (!resolved.enum.some((e) => deepEqual(value, e))) {
      errors.push({
        path,
        message: `Value ${JSON.stringify(value)} is not one of the allowed values: ${resolved.enum.map((e) => JSON.stringify(e)).join(', ')}`,
        keyword: 'enum',
      });
    }
    return errors;
  }

  // --- anyOf ---
  if (resolved.anyOf) {
    const anyValid = resolved.anyOf.some(
      (sub) => validateValue(value, sub, path, rootSchema).length === 0,
    );
    if (!anyValid) {
      errors.push({
        path,
        message: `Value does not match any of the expected schemas (anyOf)`,
        keyword: 'anyOf',
      });
    }
    return errors;
  }

  // --- oneOf ---
  if (resolved.oneOf) {
    const matchCount = resolved.oneOf.filter(
      (sub) => validateValue(value, sub, path, rootSchema).length === 0,
    ).length;
    if (matchCount !== 1) {
      errors.push({
        path,
        message: matchCount === 0
          ? `Value does not match any of the expected schemas (oneOf)`
          : `Value matches ${matchCount} schemas but should match exactly one (oneOf)`,
        keyword: 'oneOf',
      });
    }
    return errors;
  }

  // --- allOf ---
  if (resolved.allOf) {
    for (const sub of resolved.allOf) {
      errors.push(...validateValue(value, sub, path, rootSchema));
    }
    // Continue with remaining checks if any
    if (errors.length > 0 && !resolved.type && !resolved.properties) return errors;
  }

  // --- not ---
  if (resolved.not) {
    const notErrors = validateValue(value, resolved.not, path, rootSchema);
    if (notErrors.length === 0) {
      errors.push({
        path,
        message: `Value should NOT match the schema defined in "not"`,
        keyword: 'not',
      });
    }
  }

  // --- type check ---
  if (resolved.type) {
    const actualType = getType(value);
    const allowedTypes = Array.isArray(resolved.type) ? resolved.type : [resolved.type];

    // Handle "integer" as a special case of "number"
    const typeMatches = allowedTypes.some((t) => {
      if (t === 'integer') return typeof value === 'number' && Number.isInteger(value);
      return actualType === t;
    });

    if (!typeMatches) {
      errors.push({
        path,
        message: `Expected type "${allowedTypes.join(' | ')}", got "${actualType}"`,
        keyword: 'type',
      });
      return errors; // No point checking further if type is wrong
    }
  }

  // --- string checks ---
  if (typeof value === 'string') {
    if (resolved.minLength !== undefined && value.length < resolved.minLength) {
      errors.push({
        path,
        message: `String length ${value.length} is less than minimum ${resolved.minLength}`,
        keyword: 'minLength',
      });
    }
    if (resolved.maxLength !== undefined && value.length > resolved.maxLength) {
      errors.push({
        path,
        message: `String length ${value.length} exceeds maximum ${resolved.maxLength}`,
        keyword: 'maxLength',
      });
    }
    if (resolved.pattern) {
      try {
        const re = new RegExp(resolved.pattern);
        if (!re.test(value)) {
          errors.push({
            path,
            message: `String does not match pattern "${resolved.pattern}"`,
            keyword: 'pattern',
          });
        }
      } catch {
        errors.push({
          path,
          message: `Invalid regex pattern "${resolved.pattern}"`,
          keyword: 'pattern',
        });
      }
    }
  }

  // --- number checks ---
  if (typeof value === 'number') {
    if (resolved.minimum !== undefined && value < resolved.minimum) {
      errors.push({
        path,
        message: `Value ${value} is less than minimum ${resolved.minimum}`,
        keyword: 'minimum',
      });
    }
    if (resolved.maximum !== undefined && value > resolved.maximum) {
      errors.push({
        path,
        message: `Value ${value} exceeds maximum ${resolved.maximum}`,
        keyword: 'maximum',
      });
    }
    if (resolved.exclusiveMinimum !== undefined && value <= resolved.exclusiveMinimum) {
      errors.push({
        path,
        message: `Value ${value} must be greater than ${resolved.exclusiveMinimum}`,
        keyword: 'exclusiveMinimum',
      });
    }
    if (resolved.exclusiveMaximum !== undefined && value >= resolved.exclusiveMaximum) {
      errors.push({
        path,
        message: `Value ${value} must be less than ${resolved.exclusiveMaximum}`,
        keyword: 'exclusiveMaximum',
      });
    }
  }

  // --- array checks ---
  if (Array.isArray(value)) {
    if (resolved.minItems !== undefined && value.length < resolved.minItems) {
      errors.push({
        path,
        message: `Array has ${value.length} items, minimum is ${resolved.minItems}`,
        keyword: 'minItems',
      });
    }
    if (resolved.maxItems !== undefined && value.length > resolved.maxItems) {
      errors.push({
        path,
        message: `Array has ${value.length} items, maximum is ${resolved.maxItems}`,
        keyword: 'maxItems',
      });
    }
    if (resolved.items) {
      if (Array.isArray(resolved.items)) {
        // Tuple validation
        resolved.items.forEach((itemSchema, i) => {
          if (i < value.length) {
            errors.push(...validateValue(value[i], itemSchema, `${path}[${i}]`, rootSchema));
          }
        });
      } else {
        // All items match a single schema
        value.forEach((item, i) => {
          errors.push(...validateValue(item, resolved.items as JsonSchema, `${path}[${i}]`, rootSchema));
        });
      }
    }
  }

  // --- object checks ---
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const objKeys = Object.keys(obj);

    if (resolved.minProperties !== undefined && objKeys.length < resolved.minProperties) {
      errors.push({
        path,
        message: `Object has ${objKeys.length} properties, minimum is ${resolved.minProperties}`,
        keyword: 'minProperties',
      });
    }
    if (resolved.maxProperties !== undefined && objKeys.length > resolved.maxProperties) {
      errors.push({
        path,
        message: `Object has ${objKeys.length} properties, maximum is ${resolved.maxProperties}`,
        keyword: 'maxProperties',
      });
    }

    // Required properties
    if (resolved.required) {
      for (const req of resolved.required) {
        if (!(req in obj)) {
          errors.push({
            path: path ? `${path}.${req}` : req,
            message: `Missing required property "${req}"`,
            keyword: 'required',
          });
        }
      }
    }

    // Property validation
    if (resolved.properties) {
      for (const [key, propSchema] of Object.entries(resolved.properties)) {
        if (key in obj) {
          const propPath = path ? `${path}.${key}` : key;
          errors.push(...validateValue(obj[key], propSchema, propPath, rootSchema));
        }
      }
    }

    // Additional properties
    if (resolved.additionalProperties !== undefined && resolved.properties) {
      const definedKeys = new Set(Object.keys(resolved.properties));
      const extraKeys = objKeys.filter((k) => !definedKeys.has(k));

      if (resolved.additionalProperties === false && extraKeys.length > 0) {
        for (const key of extraKeys) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: `Unexpected additional property "${key}"`,
            keyword: 'additionalProperties',
          });
        }
      } else if (typeof resolved.additionalProperties === 'object' && resolved.additionalProperties !== null) {
        for (const key of extraKeys) {
          const propPath = path ? `${path}.${key}` : key;
          errors.push(
            ...validateValue(obj[key], resolved.additionalProperties as JsonSchema, propPath, rootSchema),
          );
        }
      }
    }
  }

  return errors;
}

function validate(schema: JsonSchema, data: unknown): ValidationError[] {
  return validateValue(data, schema, '$', schema);
}

// ---------------------------------------------------------------------------
// Sample JSON generator from schema
// ---------------------------------------------------------------------------

function generateSample(schema: JsonSchema, rootSchema: JsonSchema, depth = 0): unknown {
  if (depth > 10) return null;
  const resolved = resolveRef(schema, rootSchema);

  if ('const' in resolved) return resolved.const;
  if (resolved.enum && resolved.enum.length > 0) return resolved.enum[0];
  if ('default' in resolved) return resolved.default;

  if (resolved.anyOf && resolved.anyOf.length > 0) {
    return generateSample(resolved.anyOf[0], rootSchema, depth + 1);
  }
  if (resolved.oneOf && resolved.oneOf.length > 0) {
    return generateSample(resolved.oneOf[0], rootSchema, depth + 1);
  }

  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  switch (type) {
    case 'string': {
      if (resolved.pattern) return '<pattern>';
      if (resolved.minLength) return 'a'.repeat(resolved.minLength);
      return 'string';
    }
    case 'number':
      return resolved.minimum ?? resolved.exclusiveMinimum != null ? (resolved.exclusiveMinimum! + 1) : 0;
    case 'integer':
      return resolved.minimum ?? resolved.exclusiveMinimum != null ? Math.ceil(resolved.exclusiveMinimum! + 1) : 0;
    case 'boolean':
      return true;
    case 'null':
      return null;
    case 'array': {
      const count = resolved.minItems ?? 1;
      if (resolved.items) {
        if (Array.isArray(resolved.items)) {
          return resolved.items.map((s) => generateSample(s, rootSchema, depth + 1));
        }
        return Array.from({ length: count }, () =>
          generateSample(resolved.items as JsonSchema, rootSchema, depth + 1),
        );
      }
      return [];
    }
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (resolved.properties) {
        for (const [key, propSchema] of Object.entries(resolved.properties)) {
          obj[key] = generateSample(propSchema, rootSchema, depth + 1);
        }
      }
      return obj;
    }
    default: {
      // No type specified, infer from properties/items
      if (resolved.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(resolved.properties)) {
          obj[key] = generateSample(propSchema, rootSchema, depth + 1);
        }
        return obj;
      }
      if (resolved.items) {
        const count = resolved.minItems ?? 1;
        if (Array.isArray(resolved.items)) {
          return resolved.items.map((s) => generateSample(s, rootSchema, depth + 1));
        }
        return Array.from({ length: count }, () =>
          generateSample(resolved.items as JsonSchema, rootSchema, depth + 1),
        );
      }
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Schema templates
// ---------------------------------------------------------------------------

const SCHEMA_TEMPLATES: { label: string; schema: JsonSchema }[] = [
  {
    label: 'Simple Object',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0, maximum: 150 },
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      },
      required: ['name', 'age', 'email'],
      additionalProperties: false,
    },
  },
  {
    label: 'API Response',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['success', 'error'] },
        data: { type: 'object' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'integer' },
            message: { type: 'string' },
          },
          required: ['code', 'message'],
        },
        metadata: {
          type: 'object',
          properties: {
            request_id: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
      required: ['status'],
    },
  },
  {
    label: 'Function Call',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        arguments: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            count: { type: 'integer', minimum: 1 },
          },
          required: ['location'],
        },
      },
      required: ['name', 'arguments'],
      additionalProperties: false,
    },
  },
  {
    label: 'Chat Completion',
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['assistant', 'user', 'system', 'tool'] },
        content: { type: ['string', 'null'] },
        tool_calls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { const: 'function' },
              function: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  arguments: { type: 'string' },
                },
                required: ['name', 'arguments'],
              },
            },
            required: ['id', 'type', 'function'],
          },
        },
      },
      required: ['role'],
    },
  },
  {
    label: 'Array of Objects',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
          name: { type: 'string', minLength: 1 },
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
          active: { type: 'boolean' },
        },
        required: ['id', 'name'],
        additionalProperties: false,
      },
      minItems: 1,
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StructuredOutputValidator() {
  const [schemaInput, setSchemaInput] = useState(
    JSON.stringify(SCHEMA_TEMPLATES[0].schema, null, 2),
  );
  const [outputInput, setOutputInput] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Parse schema and output, validate in real time
  const { schemaError, outputError, validationErrors, isValid, schema } = useMemo(() => {
    const result = {
      schemaError: '',
      outputError: '',
      validationErrors: [] as ValidationError[],
      isValid: false,
      schema: null as JsonSchema | null,
    };

    if (!schemaInput.trim()) return result;
    let parsedSchema: JsonSchema;
    try {
      parsedSchema = JSON.parse(schemaInput);
      result.schema = parsedSchema;
    } catch (e) {
      result.schemaError = (e as Error).message;
      return result;
    }

    if (!outputInput.trim()) return result;
    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(outputInput);
    } catch (e) {
      result.outputError = (e as Error).message;
      return result;
    }

    const errors = validate(parsedSchema, parsedOutput);
    result.validationErrors = errors;
    result.isValid = errors.length === 0;
    return result;
  }, [schemaInput, outputInput]);

  const handlePasteSchema = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSchemaInput(text);
    } catch {
      enqueueSnackbar('Failed to paste from clipboard', { variant: 'error' });
    }
  };

  const handlePasteOutput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOutputInput(text);
    } catch {
      enqueueSnackbar('Failed to paste from clipboard', { variant: 'error' });
    }
  };

  const handleCopySchema = async () => {
    const ok = await copyToClipboard(schemaInput);
    enqueueSnackbar(ok ? 'Copied schema' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleCopyOutput = async () => {
    const ok = await copyToClipboard(outputInput);
    enqueueSnackbar(ok ? 'Copied output' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleUploadSchema = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        setSchemaInput(text);
        enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to read file', { variant: 'error' });
      }
      e.target.value = '';
    },
    [enqueueSnackbar],
  );

  const handleUploadOutput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        setOutputInput(text);
        enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to read file', { variant: 'error' });
      }
      e.target.value = '';
    },
    [enqueueSnackbar],
  );

  const handleGenerateSample = () => {
    if (!schema) {
      enqueueSnackbar('Enter a valid JSON Schema first', { variant: 'warning' });
      return;
    }
    try {
      const sample = generateSample(schema, schema);
      setOutputInput(JSON.stringify(sample, null, 2));
      enqueueSnackbar('Generated sample output', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to generate sample', { variant: 'error' });
    }
  };

  const handleLoadTemplate = (tmpl: typeof SCHEMA_TEMPLATES[number]) => {
    setSchemaInput(JSON.stringify(tmpl.schema, null, 2));
    setOutputInput('');
  };

  const errorsByKeyword = useMemo(() => {
    const grouped: Record<string, ValidationError[]> = {};
    for (const err of validationErrors) {
      if (!grouped[err.keyword]) grouped[err.keyword] = [];
      grouped[err.keyword].push(err);
    }
    return grouped;
  }, [validationErrors]);

  const keywordColor = (keyword: string): 'error' | 'warning' | 'default' => {
    if (['required', 'type', 'additionalProperties'].includes(keyword)) return 'error';
    if (['enum', 'const', 'oneOf', 'anyOf'].includes(keyword)) return 'warning';
    return 'default';
  };

  const hasOutput = outputInput.trim().length > 0;
  const hasSchema = schemaInput.trim().length > 0;
  const showValidation = hasSchema && hasOutput && !schemaError && !outputError;

  return (
    <>
      <PageHead
        title="Structured Output Validator - BitesInByte Tools"
        description="Validate LLM JSON output against a JSON Schema. Real-time validation with detailed error paths, type checking, and schema templates."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Structured Output Validator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Validate JSON output against a JSON Schema with real-time feedback, detailed error
            paths, and preset templates.
          </Typography>
        </Box>

        {/* Schema templates */}
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              mb: 1,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Schema Templates
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {SCHEMA_TEMPLATES.map((tmpl) => (
              <Chip
                key={tmpl.label}
                label={tmpl.label}
                size="small"
                variant="outlined"
                onClick={() => handleLoadTemplate(tmpl)}
                sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Validation status */}
        {showValidation && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {isValid ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="Valid - Output matches schema"
                size="small"
                color="success"
                variant="outlined"
              />
            ) : (
              <>
                <Chip
                  icon={<ErrorIcon />}
                  label={`Invalid - ${validationErrors.length} error${validationErrors.length !== 1 ? 's' : ''}`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
                {Object.entries(errorsByKeyword).map(([keyword, errs]) => (
                  <Chip
                    key={keyword}
                    label={`${keyword} (${errs.length})`}
                    size="small"
                    color={keywordColor(keyword)}
                    variant="outlined"
                    sx={{ fontSize: '0.6875rem', fontFamily: 'monospace' }}
                  />
                ))}
              </>
            )}
          </Box>
        )}

        {/* Parse errors */}
        {schemaError && hasSchema && (
          <Chip
            icon={<ErrorIcon />}
            label={`Invalid Schema JSON: ${schemaError}`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}
        {outputError && hasOutput && (
          <Chip
            icon={<ErrorIcon />}
            label={`Invalid Output JSON: ${outputError}`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}

        {/* Editor panels */}
        <Grid container spacing={2}>
          {/* Schema editor */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: 1,
                borderColor: schemaError && hasSchema ? 'error.main' : 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>
                  JSON Schema
                </Typography>
                <Tooltip title="Paste from clipboard">
                  <IconButton size="small" onClick={handlePasteSchema} sx={{ color: 'text.secondary' }}>
                    <ContentPasteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy schema">
                  <IconButton size="small" onClick={handleCopySchema} disabled={!hasSchema} sx={{ color: 'text.secondary' }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Upload JSON file">
                  <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
                    <FileUploadIcon sx={{ fontSize: 16 }} />
                    <input type="file" hidden accept=".json,.txt" onChange={handleUploadSchema} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear">
                  <IconButton
                    size="small"
                    onClick={() => setSchemaInput('')}
                    disabled={!hasSchema}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="textarea"
                value={schemaInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSchemaInput(e.target.value)}
                placeholder='{\n  "type": "object",\n  "properties": { ... },\n  "required": [ ... ]\n}'
                spellCheck={false}
                sx={{
                  width: '100%',
                  minHeight: 320,
                  resize: 'vertical',
                  border: 'none',
                  outline: 'none',
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  boxSizing: 'border-box',
                }}
              />
            </Box>
          </Grid>

          {/* Output editor */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: 1,
                borderColor: outputError && hasOutput
                  ? 'error.main'
                  : showValidation && !isValid
                    ? 'error.main'
                    : showValidation && isValid
                      ? 'success.main'
                      : 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>
                  JSON Output
                </Typography>
                <Tooltip title="Generate sample from schema">
                  <IconButton
                    size="small"
                    onClick={handleGenerateSample}
                    disabled={!schema}
                    sx={{ color: 'text.secondary' }}
                  >
                    <AutoFixHighIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Paste from clipboard">
                  <IconButton size="small" onClick={handlePasteOutput} sx={{ color: 'text.secondary' }}>
                    <ContentPasteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy output">
                  <IconButton size="small" onClick={handleCopyOutput} disabled={!hasOutput} sx={{ color: 'text.secondary' }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Upload JSON file">
                  <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
                    <FileUploadIcon sx={{ fontSize: 16 }} />
                    <input type="file" hidden accept=".json,.txt" onChange={handleUploadOutput} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear">
                  <IconButton
                    size="small"
                    onClick={() => setOutputInput('')}
                    disabled={!hasOutput}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="textarea"
                value={outputInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutputInput(e.target.value)}
                placeholder='Paste the LLM JSON output here...'
                spellCheck={false}
                sx={{
                  width: '100%',
                  minHeight: 320,
                  resize: 'vertical',
                  border: 'none',
                  outline: 'none',
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  boxSizing: 'border-box',
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Generate sample button */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleGenerateSample}
            disabled={!schema}
          >
            Generate Sample Output
          </Button>
        </Box>

        {/* Validation errors list */}
        {showValidation && !isValid && validationErrors.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                mb: 1,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Validation Errors
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'error.main',
                borderRadius: 2,
              }}
            >
              {validationErrors.map((err, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < validationErrors.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Chip
                    label={i + 1}
                    size="small"
                    color="error"
                    sx={{ minWidth: 28, height: 22, fontSize: '0.6875rem' }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {err.message}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                      <Typography
                        sx={{
                          fontSize: '0.6875rem',
                          color: 'text.secondary',
                          fontFamily: 'monospace',
                        }}
                      >
                        {err.path}
                      </Typography>
                      <Chip
                        label={err.keyword}
                        size="small"
                        variant="outlined"
                        color={keywordColor(err.keyword)}
                        sx={{ height: 18, fontSize: '0.625rem', fontFamily: 'monospace' }}
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Success state detail */}
        {showValidation && isValid && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'success.main',
              bgcolor: isDark ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.success.main, 0.04),
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.875rem' }}>
              The JSON output is valid and conforms to the provided schema.
            </Typography>
          </Box>
        )}
      </Stack>
    </>
  );
}
