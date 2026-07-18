import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';
import { CodeEditor } from '../../components/CodeEditor';

interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enumValues: string;
}

interface FunctionDef {
  name: string;
  description: string;
  parameters: Parameter[];
}

const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const DEFAULT_FUNCTION: FunctionDef = {
  name: 'get_weather',
  description: 'Get the current weather for a given location',
  parameters: [
    { name: 'location', type: 'string', description: 'The city and state, e.g. San Francisco, CA', required: true, enumValues: '' },
    { name: 'unit', type: 'string', description: 'Temperature unit', required: false, enumValues: 'celsius, fahrenheit' },
  ],
};

function buildSchema(func: FunctionDef): object {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of func.parameters) {
    const name = param.name.trim();
    if (!name || properties[name]) continue;
    const prop: Record<string, unknown> = {
      type: param.type,
    };
    if (param.description.trim()) prop.description = param.description.trim();
    if (param.enumValues.trim() && ['string', 'number', 'integer', 'boolean'].includes(param.type)) {
      const rawValues = param.enumValues.split(',').map((v) => v.trim()).filter(Boolean);
      if (param.type === 'number' || param.type === 'integer') {
        prop.enum = rawValues.map(Number).filter((value) => Number.isFinite(value) && (param.type !== 'integer' || Number.isInteger(value)));
      } else if (param.type === 'boolean') {
        prop.enum = rawValues.filter((value) => value === 'true' || value === 'false').map((value) => value === 'true');
      } else {
        prop.enum = rawValues;
      }
    }
    if (param.type === 'array') prop.items = {};
    if (param.type === 'object') prop.additionalProperties = true;
    properties[name] = prop;
    if (param.required) required.push(name);
  }

  return {
    type: 'function',
    function: {
      name: func.name.trim(),
      description: func.description.trim(),
      parameters: {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
      },
    },
  };
}

export default function FunctionCallBuilder() {
  const [func, setFunc] = useState<FunctionDef>(DEFAULT_FUNCTION);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const schema = useMemo(() => JSON.stringify(buildSchema(func), null, 2), [func]);
  const errors = useMemo(() => {
    const result: string[] = [];
    if (!/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(func.name.trim())) {
      result.push('Function name must be 1–64 characters and start with a letter or underscore.');
    }
    const names = func.parameters.map((param) => param.name.trim());
    if (names.some((name) => !name)) result.push('Every parameter needs a name.');
    if (new Set(names).size !== names.length) result.push('Parameter names must be unique.');
    for (const param of func.parameters) {
      if (!param.enumValues.trim()) continue;
      const values = param.enumValues.split(',').map((value) => value.trim()).filter(Boolean);
      if (['array', 'object'].includes(param.type)) result.push(`Enum is not supported for ${param.type} parameter "${param.name}".`);
      if ((param.type === 'number' || param.type === 'integer') && values.some((value) => !Number.isFinite(Number(value)) || (param.type === 'integer' && !Number.isInteger(Number(value))))) {
        result.push(`Enum values for "${param.name}" must be valid ${param.type}s.`);
      }
      if (param.type === 'boolean' && values.some((value) => value !== 'true' && value !== 'false')) {
        result.push(`Enum values for "${param.name}" must be true or false.`);
      }
    }
    return result;
  }, [func]);

  const updateParam = (index: number, field: keyof Parameter, value: string | boolean) => {
    setFunc((prev) => ({
      ...prev,
      parameters: prev.parameters.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const addParam = () => {
    setFunc((prev) => ({
      ...prev,
      parameters: [...prev.parameters, { name: '', type: 'string', description: '', required: false, enumValues: '' }],
    }));
  };

  const removeParam = (index: number) => {
    setFunc((prev) => ({ ...prev, parameters: prev.parameters.filter((_, i) => i !== index) }));
  };

  const handleCopy = async () => {
    if (errors.length) return;
    const ok = await copyToClipboard(schema);
    enqueueSnackbar(ok ? 'Copied schema' : 'Failed', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="Function Call Schema Builder - Lamplit Labs Tools"
        description="Build OpenAI function calling / tool JSON schemas visually. Free online schema builder."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Function Call Schema Builder</Typography>
          <Typography variant="body2" color="text.secondary">
            Visually build JSON schemas for OpenAI function calling / tool definitions.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Builder panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <TextField
                label="Function Name"
                size="small"
                fullWidth
                value={func.name}
                onChange={(e) => setFunc((prev) => ({ ...prev, name: e.target.value }))}
                slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.875rem' } } }}
                error={!/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(func.name.trim())}
              />
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={func.description}
                onChange={(e) => setFunc((prev) => ({ ...prev, description: e.target.value }))}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                  Parameters ({func.parameters.length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addParam}>Add</Button>
              </Box>

              {func.parameters.map((param, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      label="Name"
                      value={param.name}
                      onChange={(e) => updateParam(i, 'name', e.target.value)}
                      sx={{ flex: 1 }}
                      slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
                      error={!param.name.trim() || func.parameters.some((other, j) => j !== i && other.name.trim() === param.name.trim())}
                    />
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <InputLabel>Type</InputLabel>
                      <Select value={param.type} label="Type" onChange={(e) => updateParam(i, 'type', e.target.value)}>
                        {PARAM_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <Chip
                      label={param.required ? 'Required' : 'Optional'}
                      size="small"
                      color={param.required ? 'primary' : 'default'}
                      variant={param.required ? 'filled' : 'outlined'}
                      onClick={() => updateParam(i, 'required', !param.required)}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => removeParam(i)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <TextField
                    size="small"
                    label="Description"
                    value={param.description}
                    onChange={(e) => updateParam(i, 'description', e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Enum values (comma-separated)"
                    value={param.enumValues}
                    onChange={(e) => updateParam(i, 'enumValues', e.target.value)}
                    fullWidth
                    placeholder="e.g. celsius, fahrenheit"
                    slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
                    disabled={param.type === 'array' || param.type === 'object'}
                  />
                </Box>
              ))}
            </Stack>
          </Grid>

          {/* Schema output */}
          <Grid size={{ xs: 12, md: 6 }}>
            {errors.length > 0 && (
              <Chip
                color="error"
                variant="outlined"
                label={errors[0]}
                sx={{ mb: 1, maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal' } }}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                Generated Schema
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} disabled={errors.length > 0} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => downloadFile(`${func.name.trim() || 'function'}-schema.json`, schema, 'application/json')}
                  disabled={errors.length > 0}
                  sx={{ color: 'text.secondary' }}
                >
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CodeEditor value={schema} language="json" readOnly height={500} />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
