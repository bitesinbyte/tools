import { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, readFileAsText } from '../../utils/file';

// ---------------------------------------------------------------------------
// JSONPath engine (pure TypeScript, no external libs)
// ---------------------------------------------------------------------------

interface PathResult {
  path: string;
  value: unknown;
}

type Selector =
  | { type: 'child'; key: string; wildcard: boolean }
  | { type: 'index'; index: number }
  | { type: 'slice'; start?: number; end?: number; step: number };

type PathToken = Selector | { type: 'recursive'; key: string; wildcard: boolean };

function parseQuotedKey(value: string): string {
  if (value.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'string') return parsed;
    } catch {
      // Use the common error below.
    }
    throw new Error('Invalid quoted property in JSONPath');
  }
  let result = '';
  for (let i = 1; i < value.length - 1; i++) {
    if (value[i] !== '\\') {
      if (value[i] === "'" || value.charCodeAt(i) < 0x20) {
        throw new Error('Invalid quoted property in JSONPath');
      }
      result += value[i];
      continue;
    }
    i++;
    if (i >= value.length - 1) throw new Error('Invalid escape in quoted property');
    const escaped = value[i];
    const escapes: Record<string, string> = {
      "'": "'",
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    };
    if (escaped === 'u') {
      const hex = value.slice(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('Invalid Unicode escape in quoted property');
      result += String.fromCharCode(parseInt(hex, 16));
      i += 4;
    } else if (Object.prototype.hasOwnProperty.call(escapes, escaped)) {
      result += escapes[escaped];
    } else {
      throw new Error('Invalid escape in quoted property');
    }
  }
  return result;
}

function parseBracketSelector(inner: string): Selector {
  const value = inner.trim();
  if (value === '*') return { type: 'child', key: '*', wildcard: true };
  if (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return { type: 'child', key: parseQuotedKey(value), wildcard: false };
  }
  if (/^-?\d+$/.test(value)) {
    return { type: 'index', index: Number(value) };
  }
  const slice = value.match(/^(-?\d*)\s*:\s*(-?\d*)(?:\s*:\s*(-?\d+))?$/);
  if (slice) {
    const step = slice[3] === undefined ? 1 : Number(slice[3]);
    if (step === 0) throw new Error('JSONPath slice step cannot be zero');
    return {
      type: 'slice',
      start: slice[1] === '' ? undefined : Number(slice[1]),
      end: slice[2] === '' ? undefined : Number(slice[2]),
      step,
    };
  }
  throw new Error('Unsupported or malformed bracket selector');
}

function parseJsonPath(expr: string): PathToken[] {
  if (!expr.startsWith('$')) throw new Error('JSONPath must start with $');
  const tokens: PathToken[] = [];
  let i = 1;

  while (i < expr.length) {
    let recursive = false;
    if (expr[i] === '.') {
      recursive = expr[i + 1] === '.';
      i += recursive ? 2 : 1;
      if (i >= expr.length) throw new Error('JSONPath is missing a selector after "."');
      if (expr[i] !== '[') {
        const start = i;
        while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') i++;
        const key = expr.slice(start, i);
        if (!key || /\s/.test(key)) throw new Error('Invalid dot-notation property');
        tokens.push(
          recursive
            ? { type: 'recursive', key, wildcard: key === '*' }
            : { type: 'child', key, wildcard: key === '*' },
        );
        continue;
      }
    } else if (expr[i] !== '[') {
      throw new Error(`Unexpected character "${expr[i]}" at position ${i + 1}`);
    }

    const bracketStart = i;
    i++;
    let quote = '';
    let escaped = false;
    while (i < expr.length) {
      const character = expr[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ']') {
        break;
      }
      i++;
    }
    if (i >= expr.length || expr[i] !== ']') {
      throw new Error(`Unclosed bracket starting at position ${bracketStart + 1}`);
    }
    const selector = parseBracketSelector(expr.slice(bracketStart + 1, i));
    i++;
    if (recursive) {
      if (selector.type !== 'child') throw new Error('Recursive descent requires a property or wildcard');
      tokens.push({ type: 'recursive', key: selector.key, wildcard: selector.wildcard });
    } else {
      tokens.push(selector);
    }
  }
  return tokens;
}

function propertyPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function resolveSelector(selector: Selector, current: unknown, currentPath: string): PathResult[] {
  if (selector.type === 'index') {
    if (!Array.isArray(current)) return [];
    const index = selector.index < 0 ? current.length + selector.index : selector.index;
    return index >= 0 && index < current.length
      ? [{ path: `${currentPath}[${index}]`, value: current[index] }]
      : [];
  }

  if (selector.type === 'slice') {
    if (!Array.isArray(current)) return [];
    const length = current.length;
    const { step } = selector;
    let start = selector.start ?? (step > 0 ? 0 : length - 1);
    let end = selector.end ?? (step > 0 ? length : -1);
    if (selector.start !== undefined && start < 0) start += length;
    if (selector.end !== undefined && end < 0) end += length;
    if (step > 0) {
      start = Math.max(0, Math.min(start, length));
      end = Math.max(0, Math.min(end, length));
    } else {
      start = Math.max(-1, Math.min(start, length - 1));
      end = Math.max(-1, Math.min(end, length - 1));
    }
    const matches: PathResult[] = [];
    for (let index = start; step > 0 ? index < end : index > end; index += step) {
      matches.push({ path: `${currentPath}[${index}]`, value: current[index] });
    }
    return matches;
  }

  if (current === null || typeof current !== 'object') return [];
  if (selector.wildcard) {
    if (Array.isArray(current)) {
      return current.map((value, index) => ({ path: `${currentPath}[${index}]`, value }));
    }
    return Object.entries(current).map(([key, value]) => ({
      path: propertyPath(currentPath, key),
      value,
    }));
  }
  if (!Object.prototype.hasOwnProperty.call(current, selector.key)) return [];
  return [{
    path: propertyPath(currentPath, selector.key),
    value: (current as Record<string, unknown>)[selector.key],
  }];
}

function descendants(value: unknown, path: string): PathResult[] {
  const results: PathResult[] = [];
  const pending: PathResult[] = [{ path, value }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    results.push(current);
    if (current.value === null || typeof current.value !== 'object') continue;
    const children = Array.isArray(current.value)
      ? current.value.map((child, index) => ({ path: `${current.path}[${index}]`, value: child }))
      : Object.entries(current.value).map(([key, child]) => ({
          path: propertyPath(current.path, key),
          value: child,
        }));
    pending.push(...children.reverse());
  }
  return results;
}

function evaluateJsonPath(data: unknown, expr: string): PathResult[] {
  const tokens = parseJsonPath(expr.trim());
  let results: PathResult[] = [{ path: '$', value: data }];

  for (const token of tokens) {
    const nextResults: PathResult[] = [];
    if (token.type === 'recursive') {
      for (const result of results) {
        for (const descendant of descendants(result.value, result.path)) {
          nextResults.push(...resolveSelector(
            { type: 'child', key: token.key, wildcard: token.wildcard },
            descendant.value,
            descendant.path,
          ));
        }
      }
    } else {
      for (const result of results) {
        nextResults.push(...resolveSelector(token, result.value, result.path));
      }
    }
    results = nextResults;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: '$.store.book[*].author', expr: '$.store.book[*].author' },
  { label: '$..price', expr: '$..price' },
  { label: '$.store.book[0].title', expr: '$.store.book[0].title' },
  { label: '$.store.book[0:2]', expr: '$.store.book[0:2]' },
  { label: '$..book[*]', expr: '$..book[*]' },
  { label: '$.store.*', expr: '$.store.*' },
];

const SAMPLE_JSON = JSON.stringify(
  {
    store: {
      book: [
        { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
        { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
        { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', price: 8.99 },
        { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', price: 22.99 },
      ],
      bicycle: { color: 'red', price: 19.95 },
    },
  },
  null,
  2,
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JsonPathEvaluator() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [pathExpr, setPathExpr] = useState('$.store.book[*].author');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Parse JSON & evaluate path reactively
  const { results, parseError, pathError } = useMemo(() => {
    if (!jsonInput.trim()) return { results: [] as PathResult[], parseError: '', pathError: '' };

    let data: unknown;
    try {
      data = JSON.parse(jsonInput.replace(/^\uFEFF/, ''));
    } catch (e) {
      return { results: [] as PathResult[], parseError: (e as Error).message, pathError: '' };
    }

    if (!pathExpr.trim()) return { results: [] as PathResult[], parseError: '', pathError: '' };

    try {
      const res = evaluateJsonPath(data, pathExpr);
      return { results: res, parseError: '', pathError: '' };
    } catch (e) {
      return { results: [] as PathResult[], parseError: '', pathError: (e as Error).message };
    }
  }, [jsonInput, pathExpr]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
    } catch {
      enqueueSnackbar('Failed to paste from clipboard', { variant: 'error' });
    }
  };

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        setJsonInput(text);
        enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to read file', { variant: 'error' });
      }
      e.target.value = '';
    },
    [enqueueSnackbar],
  );

  const handleCopyResults = async () => {
    const text = JSON.stringify(results.map((r) => r.value), null, 2);
    const ok = await copyToClipboard(text);
    enqueueSnackbar(ok ? 'Copied results' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const formatValue = (v: unknown): string => {
    return JSON.stringify(v);
  };

  return (
    <>
      <PageHead
        title="JSONPath Evaluator - BitesInByte Tools"
        description="Evaluate JSONPath expressions against JSON data with live results, recursive descent, wildcards, and array slicing. Free online JSONPath tester."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>JSONPath Evaluator</Typography>
          <Typography variant="body2" color="text.secondary">
            Evaluate JSONPath expressions against JSON data with live results.
          </Typography>
        </Box>

        {/* JSON input area */}
        <Box
          sx={{
            border: 1,
            borderColor: parseError ? 'error.main' : 'divider',
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>JSON Input</Typography>
            <Tooltip title="Paste from clipboard">
              <IconButton aria-label="Paste JSON from clipboard" size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
                <ContentPasteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload JSON file">
              <IconButton aria-label="Upload JSON file" size="small" component="label" sx={{ color: 'text.secondary' }}>
                <FileUploadIcon sx={{ fontSize: 16 }} />
                <input type="file" hidden accept=".json,.txt" onChange={handleUpload} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton aria-label="Clear JSON input" size="small" onClick={() => setJsonInput('')} disabled={!jsonInput} sx={{ color: 'text.secondary' }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            component="textarea"
            aria-label="JSON input"
            value={jsonInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)}
            placeholder="Paste or type JSON here..."
            spellCheck={false}
            sx={{
              width: '100%',
              minHeight: 220,
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

        {/* JSON validity status */}
        {jsonInput.trim() && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {parseError ? (
              <Chip
                icon={<ErrorIcon />}
                label={`Invalid JSON: ${parseError}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
              />
            ) : (
              <Chip
                icon={<CheckCircleIcon />}
                label="Valid JSON"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* JSONPath expression input */}
        <TextField
          label="JSONPath Expression"
          fullWidth
          value={pathExpr}
          onChange={(e) => setPathExpr(e.target.value)}
          placeholder="e.g. $.store.book[*].author"
          error={!!pathError}
          helperText={pathError}
          slotProps={{
            input: {
              endAdornment: pathExpr ? (
                <Tooltip title="Clear">
                  <IconButton aria-label="Clear JSONPath expression" size="small" onClick={() => setPathExpr('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : undefined,
              sx: {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            },
          }}
        />

        {/* Preset expressions */}
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
            Example Expressions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                size="small"
                variant="outlined"
                onClick={() => setPathExpr(p.expr)}
                sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Match count & copy */}
        {pathExpr && jsonInput.trim() && !parseError && !pathError && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${results.length} match${results.length !== 1 ? 'es' : ''} found`}
              color={results.length > 0 ? 'success' : 'default'}
              variant="outlined"
              size="small"
            />
            {results.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyResults}
              >
                Copy Results
              </Button>
            )}
          </Box>
        )}

        {/* Results list */}
        {results.length > 0 && (
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
              Results
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {results.map((r, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < results.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography
                    sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, minWidth: 28 }}
                  >
                    {i + 1}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {formatValue(r.value)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                      {r.path}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy value">
                    <IconButton
                      size="small"
                      aria-label={`Copy result ${i + 1}`}
                      onClick={async () => {
                        const ok = await copyToClipboard(formatValue(r.value));
                        enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
                      }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </>
  );
}
