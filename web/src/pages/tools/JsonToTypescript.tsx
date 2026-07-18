import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  TextField,
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

type JsonObject = Record<string, unknown>;

const RESERVED_TYPE_NAMES = new Set([
  'any', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface',
  'let', 'new', 'null', 'number', 'package', 'private', 'protected', 'public', 'return',
  'static', 'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type',
  'typeof', 'undefined', 'unknown', 'var', 'void', 'while', 'with', 'yield',
]);

function sanitizeTypeName(value: string, fallback = 'Type'): string {
  const words = value.trim().split(/[^A-Za-z0-9_$]+/).filter(Boolean);
  let result = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('') || fallback;
  if (!/^[A-Za-z_$]/.test(result)) result = `T${result}`;
  if (RESERVED_TYPE_NAMES.has(result.toLowerCase())) result = `${result}Type`;
  return result;
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

class TypeScriptGenerator {
  private declarations: string[] = [];
  private usedNames = new Map<string, number>();

  generate(value: unknown, requestedRootName: string): string {
    const rootName = this.reserveName(sanitizeTypeName(requestedRootName || 'Root', 'Root'));
    if (isJsonObject(value)) {
      this.createObjectType([value], rootName, true);
    } else {
      const type = Array.isArray(value)
        ? this.inferArrayType(value, `${rootName}Item`)
        : this.inferType([value], `${rootName}Value`);
      this.declarations.push(`export type ${rootName} = ${type};`);
    }
    return this.declarations.join('\n\n');
  }

  private reserveName(preferredName: string): string {
    const baseName = sanitizeTypeName(preferredName);
    const count = this.usedNames.get(baseName) ?? 0;
    this.usedNames.set(baseName, count + 1);
    return count === 0 ? baseName : `${baseName}${count + 1}`;
  }

  private createObjectType(objects: JsonObject[], preferredName: string, nameIsReserved = false): string {
    const name = nameIsReserved ? preferredName : this.reserveName(preferredName);
    const keys = Array.from(new Set(objects.flatMap((object) => Object.keys(object))));
    const properties = keys.map((key) => {
      const values = objects
        .filter((object) => Object.prototype.hasOwnProperty.call(object, key))
        .map((object) => object[key]);
      const optional = values.length < objects.length;
      const propertyName = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      const type = this.inferType(values, sanitizeTypeName(key, 'Value'));
      return `  ${propertyName}${optional ? '?' : ''}: ${type};`;
    });
    this.declarations.push([
      `export interface ${name} {`,
      ...properties,
      '}',
    ].join('\n'));
    return name;
  }

  private inferType(values: unknown[], preferredName: string): string {
    const types: string[] = [];
    const addType = (type: string) => {
      if (!types.includes(type)) types.push(type);
    };

    const objects = values.filter(isJsonObject);
    if (objects.length > 0) addType(this.createObjectType(objects, preferredName));

    const arrays = values.filter(Array.isArray);
    if (arrays.length > 0) {
      addType(this.inferArrayType(arrays.flat(), `${preferredName}Item`));
    }

    values.forEach((value) => {
      if (value === null) addType('null');
      else if (typeof value === 'string') addType('string');
      else if (typeof value === 'number') addType('number');
      else if (typeof value === 'boolean') addType('boolean');
    });

    return types.length > 0 ? types.join(' | ') : 'unknown';
  }

  private inferArrayType(values: unknown[], preferredItemName: string): string {
    if (values.length === 0) return 'unknown[]';
    const itemType = this.inferType(values, preferredItemName);
    return itemType.includes(' | ') ? `(${itemType})[]` : `${itemType}[]`;
  }
}

function jsonToTs(json: unknown, name: string): string {
  return new TypeScriptGenerator().generate(json, name);
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
      const parsed = JSON.parse(input.replace(/^\uFEFF/, ''));
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

  const handleDownload = () => {
    try {
      downloadFile('types.ts', output, 'text/plain');
      enqueueSnackbar('File downloaded', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to download file', { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="JSON to TypeScript - Lamplit Labs Tools"
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
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              label="Root type name"
              size="small"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              sx={{ width: { xs: '100%', sm: 180 } }}
              slotProps={{
                htmlInput: {
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.8125rem',
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste JSON">
            <IconButton aria-label="Paste JSON" size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton aria-label="Clear JSON input" size="small" onClick={() => setInput('')} disabled={!input} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Chip
            label={`JSON Error: ${error}`}
            color="error"
            variant="outlined"
            size="small"
            sx={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          />
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
                <IconButton aria-label="Copy TypeScript output" size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  aria-label="Download TypeScript output"
                  onClick={handleDownload}
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
