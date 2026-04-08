import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';
import { CodeEditor } from '../../components/CodeEditor';

const SAMPLE_JSON = `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true,
  "age": 30,
  "tags": ["admin", "user"],
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "coordinates": {
      "lat": 39.7817,
      "lng": -89.6501
    }
  },
  "orders": [
    {
      "id": 101,
      "total": 59.99,
      "items": ["Widget A", "Widget B"],
      "date": "2024-01-15"
    },
    {
      "id": 102,
      "total": null,
      "items": [],
      "date": "2024-02-20"
    }
  ]
}`;

function jsonToTs(json: unknown, name: string, indent: number = 0): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];

  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `${pad}export type ${name} = unknown[];`;
    }
    // Analyze array items for union types
    const itemType = inferTypeFromValue(json[0], `${name}Item`, indent);
    if (typeof json[0] === 'object' && json[0] !== null && !Array.isArray(json[0])) {
      lines.push(jsonToTs(json[0], `${name}Item`, indent));
      lines.push('');
      lines.push(`${pad}export type ${name} = ${name}Item[];`);
    } else {
      lines.push(`${pad}export type ${name} = ${itemType}[];`);
    }
    return lines.join('\n');
  }

  if (typeof json === 'object' && json !== null) {
    const nestedInterfaces: string[] = [];
    lines.push(`${pad}export interface ${name} {`);

    for (const [key, value] of Object.entries(json)) {
      const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      const isNullable = value === null;

      if (isNullable) {
        lines.push(`${pad}  ${safeName}: unknown;`);
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const nestedName = capitalize(key) + 'Item';
          nestedInterfaces.push(jsonToTs(value[0], nestedName, indent));
          lines.push(`${pad}  ${safeName}: ${nestedName}[];`);
        } else if (value.length > 0) {
          lines.push(`${pad}  ${safeName}: ${inferTypeFromValue(value[0], key, indent)}[];`);
        } else {
          lines.push(`${pad}  ${safeName}: unknown[];`);
        }
      } else if (typeof value === 'object') {
        const nestedName = capitalize(key);
        nestedInterfaces.push(jsonToTs(value, nestedName, indent));
        lines.push(`${pad}  ${safeName}: ${nestedName};`);
      } else {
        lines.push(`${pad}  ${safeName}: ${inferTypeFromValue(value, key, indent)};`);
      }
    }

    lines.push(`${pad}}`);

    if (nestedInterfaces.length > 0) {
      return [...nestedInterfaces, '', ...lines].join('\n');
    }
    return lines.join('\n');
  }

  return `${pad}export type ${name} = ${typeof json};`;
}

function inferTypeFromValue(value: unknown, _name: string, _indent: number): string {
  if (value === null) return 'unknown';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'unknown[]';
  if (typeof value === 'object') return capitalize(_name);
  return 'unknown';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function JsonToTypescript() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [rootName, setRootName] = useState('Root');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      const parsed = JSON.parse(input);
      return { output: jsonToTs(parsed, rootName || 'Root'), error: '' };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, rootName]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="JSON to TypeScript - BitesInByte Tools"
        description="Convert JSON objects into TypeScript interfaces and types. Free online JSON to TypeScript converter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>JSON to TypeScript</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert JSON objects into TypeScript interfaces and types automatically.
          </Typography>
        </Box>

        {/* Controls */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Root name:</Typography>
            <input
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              style={{
                border: '1px solid',
                borderColor: 'inherit',
                borderRadius: 4,
                padding: '4px 8px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.8125rem',
                width: 120,
                backgroundColor: 'transparent',
                color: 'inherit',
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste JSON">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={() => setInput('')} disabled={!input} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Chip label={`JSON Error: ${error}`} color="error" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        {!error && output && (
          <Chip label="Valid JSON" color="success" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              JSON Input
            </Typography>
            <CodeEditor
              value={input}
              onChange={(v) => setInput(v)}
              language="json"
              height={450}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                TypeScript Output
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => downloadFile('types.ts', output, 'text/plain')}
                  disabled={!output}
                  sx={{ color: 'text.secondary' }}
                >
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CodeEditor
              value={output}
              language="typescript"
              readOnly
              height={450}
            />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
