import { useState, useEffect } from 'react';
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

interface SchemaEntry {
  name: string;
  description?: string;
  url: string;
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('https://www.schemastore.org/api/json/catalog.json', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const validSchemas = (data.schemas ?? []).filter(
          (s: SchemaEntry) => s.name && s.url,
        );
        setSchemas(validSchemas);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          enqueueSnackbar('Failed to load schema catalog', { variant: 'error' });
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [enqueueSnackbar]);

  // Reset validation when inputs change
  useEffect(() => {
    setValidationResult(null);
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
    setValidating(true);
    setValidationResult(null);
    try {
      const jsonObj = yaml.load(yamlValue);
      const schemaRes = await fetch(selectedSchema.url);
      if (!schemaRes.ok) {
        setValidationResult({
          valid: false,
          errors: [`Failed to fetch schema: ${schemaRes.status} ${schemaRes.statusText}. The schema URL may be unavailable.`],
        });
        return;
      }
      let schemaJson;
      try {
        schemaJson = await schemaRes.json();
      } catch {
        setValidationResult({
          valid: false,
          errors: ['Failed to parse schema response as JSON. The schema URL may not return valid JSON.'],
        });
        return;
      }
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(schemaJson);
      const valid = validate(jsonObj);
      if (valid) {
        setValidationResult({ valid: true });
      } else {
        const errors = validate.errors?.map(
          (e) => `${e.instancePath || '/'} ${e.message}`,
        ) ?? [];
        setValidationResult({ valid: false, errors });
      }
    } catch (e) {
      setValidationResult({
        valid: false,
        errors: [(e as Error).message],
      });
    } finally {
      setValidating(false);
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
                onClick={() => selectedSchema && window.open(selectedSchema.url, '_blank')}
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
                disabled={validating}
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
