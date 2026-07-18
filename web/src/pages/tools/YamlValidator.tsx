import { useState, useEffect, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  Button,
  Stack,
  Typography,
  Grid,
  CircularProgress,
  Box,
  Alert,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ErrorOutlineIcon from '@mui/icons-material/Error';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import AjvDraft04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import type { AnySchemaObject } from 'ajv';

interface SchemaEntry {
  name: string;
  description?: string;
  url: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function toJsonSchemaValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('YAML contains a non-finite number that JSON Schema cannot validate reliably');
  }
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error('YAML contains a value type that JSON Schema cannot represent safely');
  }
  if (seen.has(value)) throw new Error('YAML contains a circular reference');
  seen.add(value);
  const converted = Array.isArray(value)
    ? value.map((entry) => toJsonSchemaValue(entry, seen))
    : Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, toJsonSchemaValue(entry, seen)]),
      );
  seen.delete(value);
  return converted;
}

export default function YamlValidator() {
  const [schemas, setSchemas] = useState<SchemaEntry[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<SchemaEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [yamlValue, setYamlValue] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const validationId = useRef(0);
  const validationAbort = useRef<AbortController | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    fetch('https://www.schemastore.org/api/json/catalog.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Schema catalog request failed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const candidates = Array.isArray(data?.schemas) ? data.schemas : [];
        const validSchemas = candidates.filter(
          (s: SchemaEntry) => typeof s?.name === 'string'
            && typeof s?.url === 'string'
            && isHttpUrl(s.url),
        );
        setSchemas(validSchemas);
      })
      .catch((err) => {
        if (active && err instanceof Error && err.name !== 'AbortError') {
          enqueueSnackbar('Failed to load schema catalog', { variant: 'error' });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [enqueueSnackbar]);

  // Reset validation when inputs change
  useEffect(() => {
    validationId.current += 1;
    validationAbort.current?.abort();
    validationAbort.current = null;
    setValidating(false);
    setValidationResult(null);
    return () => validationAbort.current?.abort();
  }, [yamlValue, selectedSchema]);

  const handleValidate = async () => {
    if (!selectedSchema) {
      enqueueSnackbar('Please select a schema first', { variant: 'warning' });
      return;
    }
    if (!yamlValue.trim()) {
      enqueueSnackbar('Please enter YAML content', { variant: 'warning' });
      return;
    }
    const currentValidationId = validationId.current + 1;
    validationId.current = currentValidationId;
    validationAbort.current?.abort();
    const controller = new AbortController();
    validationAbort.current = controller;
    setValidating(true);
    setValidationResult(null);
    try {
      const parsedYaml = yaml.load(yamlValue.replace(/^\uFEFF/, ''));
      if (parsedYaml === undefined) {
        throw new Error('YAML document does not contain a value');
      }
      const jsonObj = toJsonSchemaValue(parsedYaml);

      const fetchSchema = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
        }
        const schema: unknown = await response.json();
        if (typeof schema === 'boolean') {
          return schema ? {} : { not: {} };
        }
        if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
          throw new Error('Schema response is not a JSON Schema object');
        }
        return schema as Record<string, unknown>;
      };

      const schemaRes = await fetch(selectedSchema.url, { signal: controller.signal });
      if (!schemaRes.ok) {
        throw new Error(`Failed to fetch schema: ${schemaRes.status} ${schemaRes.statusText}`);
      }
      const schemaJson: unknown = await schemaRes.json();
      if (
        typeof schemaJson !== 'boolean'
        && (typeof schemaJson !== 'object' || schemaJson === null || Array.isArray(schemaJson))
      ) {
        throw new Error('Schema response is not a JSON Schema object');
      }
      const schemaVersion = typeof schemaJson === 'object' && schemaJson !== null
        ? (schemaJson as Record<string, unknown>).$schema
        : undefined;
      const isDraft04 = typeof schemaVersion === 'string' && /draft-0?4/i.test(schemaVersion);
      const options = {
        allErrors: true,
        strict: false,
        loadSchema: fetchSchema,
      };
      const ajv = isDraft04
        ? new AjvDraft04(options)
        : typeof schemaVersion === 'string' && schemaVersion.includes('2020-12')
          ? new Ajv2020(options)
          : typeof schemaVersion === 'string' && schemaVersion.includes('2019-09')
            ? new Ajv2019(options)
            : new Ajv(options);
      addFormats(ajv);
      let rootSchema = schemaJson;
      if (typeof schemaJson === 'object' && schemaJson !== null) {
        const idKeyword = isDraft04 ? 'id' : '$id';
        const declaredId = (schemaJson as Record<string, unknown>)[idKeyword];
        let resolvedId = selectedSchema.url;
        if (typeof declaredId === 'string') {
          try {
            resolvedId = new URL(declaredId, selectedSchema.url).href;
          } catch {
            throw new Error(`Schema contains an invalid ${idKeyword}`);
          }
        }
        rootSchema = { ...schemaJson, [idKeyword]: resolvedId };
      }
      const validate = typeof rootSchema === 'boolean'
        ? ajv.compile(rootSchema)
        : await ajv.compileAsync(rootSchema as AnySchemaObject);
      const valid = validate(jsonObj);
      if (currentValidationId !== validationId.current) return;
      if (valid) {
        setValidationResult({ valid: true });
      } else {
        const errors = validate.errors?.map(
          (e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
        ) ?? ['Validation failed without error details'];
        setValidationResult({ valid: false, errors });
      }
    } catch (e) {
      if (currentValidationId !== validationId.current) return;
      if (e instanceof Error && e.name === 'AbortError') return;
      setValidationResult({
        valid: false,
        errors: [e instanceof Error ? e.message : 'Validation failed'],
      });
    } finally {
      if (currentValidationId === validationId.current) {
        validationAbort.current = null;
        setValidating(false);
      }
    }
  };

  return (
    <>
      <PageHead
        title="YAML Schema Validator - BitesInByte Tools"
        description="Validate YAML documents against JSON Schema definitions from schemastore.org."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>YAML Schema Validator</Typography>
          <Typography variant="body2" color="text.secondary">
            Select a schema from schemastore.org and validate your YAML against it.
          </Typography>
        </Box>

        {/* Controls */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Autocomplete
                options={schemas}
                getOptionLabel={(o) => o.name}
                value={selectedSchema}
                onChange={(_, v) => setSelectedSchema(v)}
                loading={loading}
                size="small"
                renderInput={(params) => {
                  const { input: inputSlotProps, htmlInput: htmlInputSlotProps, inputLabel: inputLabelSlotProps } = params.slotProps;
                  return (
                    <TextField
                      {...params}
                      label="Select Schema"
                      placeholder="Search schemas..."
                      slotProps={{
                        input: {
                          ...inputSlotProps,
                          endAdornment: (
                            <>
                              {loading ? <CircularProgress size={20} /> : null}
                              {inputSlotProps?.endAdornment}
                            </>
                          ),
                        },
                        htmlInput: htmlInputSlotProps,
                        inputLabel: inputLabelSlotProps,
                      }}
                    />
                  );
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                disabled={!selectedSchema}
                onClick={() => {
                  if (!selectedSchema) return;
                  const opened = window.open(selectedSchema.url, '_blank', 'noopener,noreferrer');
                  if (opened) opened.opener = null;
                }}
              >
                View Schema
              </Button>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={validating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                onClick={handleValidate}
                disabled={validating || !selectedSchema || !yamlValue.trim()}
              >
                Validate
              </Button>
            </Grid>
          </Grid>

          {selectedSchema?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontSize: '0.8125rem' }}>
              {selectedSchema.description}
            </Typography>
          )}
        </Box>

        {/* Validation result */}
        {validationResult && (
          <>
            {validationResult.valid ? (
              <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                variant="outlined"
              >
                YAML is valid against the selected schema.
              </Alert>
            ) : (
              <Box>
                <Alert severity="error" icon={<ErrorOutlineIcon />} variant="outlined" sx={{ mb: 1.5 }}>
                  Validation failed with {validationResult.errors?.length ?? 0} error(s)
                </Alert>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    border: 1,
                    borderColor: 'error.main',
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  {validationResult.errors?.map((err, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        py: 0.5,
                      }}
                    >
                      <Chip label={i + 1} size="small" color="error" sx={{ minWidth: 28, height: 22, fontSize: '0.6875rem' }} />
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          color: 'text.secondary',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {err}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        <CodeEditor value={yamlValue} onChange={setYamlValue} language="yaml" height={480} />
      </Stack>
    </>
  );
}
