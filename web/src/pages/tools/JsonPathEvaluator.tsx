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

/** Tokenise a JSONPath expression into segments. */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  if (expr[i] !== '$') return tokens;
  tokens.push('$');
  i++;

  while (i < expr.length) {
    // Recursive descent
    if (expr[i] === '.' && expr[i + 1] === '.') {
      tokens.push('..');
      i += 2;
      continue;
    }
    // Dot child
    if (expr[i] === '.') {
      i++;
      let name = '';
      while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') {
        name += expr[i];
        i++;
      }
      if (name) tokens.push(name);
      continue;
    }
    // Bracket notation
    if (expr[i] === '[') {
      i++;
      let inner = '';
      let depth = 1;
      while (i < expr.length && depth > 0) {
        if (expr[i] === '[') depth++;
        else if (expr[i] === ']') { depth--; if (depth === 0) break; }
        inner += expr[i];
        i++;
      }
      i++; // skip closing ]
      tokens.push(`[${inner}]`);
      continue;
    }
    // Skip unexpected characters
    i++;
  }
  return tokens;
}

/** Resolve a single token against a value, returning matched (path, value) pairs. */
function resolveToken(
  token: string,
  current: unknown,
  currentPath: string,
): PathResult[] {
  if (current === null || current === undefined || typeof current !== 'object') return [];

  // Wildcard [*]
  if (token === '[*]') {
    if (Array.isArray(current)) {
      return current.map((v, idx) => ({ path: `${currentPath}[${idx}]`, value: v }));
    }
    return Object.keys(current).map((key) => ({
      path: `${currentPath}['${key}']`,
      value: (current as Record<string, unknown>)[key],
    }));
  }

  // Array slice [start:end]
  const sliceMatch = token.match(/^\[(-?\d*):(-?\d*)\]$/);
  if (sliceMatch && Array.isArray(current)) {
    const len = current.length;
    let start = sliceMatch[1] === '' ? 0 : parseInt(sliceMatch[1], 10);
    let end = sliceMatch[2] === '' ? len : parseInt(sliceMatch[2], 10);
    if (start < 0) start = Math.max(0, len + start);
    if (end < 0) end = Math.max(0, len + end);
    start = Math.max(0, Math.min(start, len));
    end = Math.max(0, Math.min(end, len));
    const results: PathResult[] = [];
    for (let idx = start; idx < end; idx++) {
      results.push({ path: `${currentPath}[${idx}]`, value: current[idx] });
    }
    return results;
  }

  // Numeric index [n]
  const indexMatch = token.match(/^\[(\d+)\]$/);
  if (indexMatch && Array.isArray(current)) {
    const idx = parseInt(indexMatch[1], 10);
    if (idx < current.length) {
      return [{ path: `${currentPath}[${idx}]`, value: current[idx] }];
    }
    return [];
  }

  // Bracket property access ['prop'] or ["prop"]
  const propMatch = token.match(/^\[['"](.+)['"]\]$/);
  if (propMatch) {
    const key = propMatch[1];
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      return [{ path: `${currentPath}['${key}']`, value: (current as Record<string, unknown>)[key] }];
    }
    return [];
  }

  // Dot-notation property (plain name)
  if (!token.startsWith('[') && !token.startsWith('.')) {
    if (Object.prototype.hasOwnProperty.call(current, token)) {
      return [{ path: `${currentPath}.${token}`, value: (current as Record<string, unknown>)[token] }];
    }
    return [];
  }

  return [];
}

/** Recursively gather all descendant (path, value) pairs. */
function descendants(value: unknown, path: string): PathResult[] {
  const results: PathResult[] = [{ path, value }];
  if (value !== null && value !== undefined && typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((v, idx) => {
        results.push(...descendants(v, `${path}[${idx}]`));
      });
    } else {
      Object.keys(value).forEach((key) => {
        results.push(...descendants((value as Record<string, unknown>)[key], `${path}['${key}']`));
      });
    }
  }
  return results;
}

/** Evaluate a JSONPath expression against parsed JSON data. */
function evaluateJsonPath(data: unknown, expr: string): PathResult[] {
  const tokens = tokenize(expr.trim());
  if (tokens.length === 0 || tokens[0] !== '$') {
    throw new Error('JSONPath must start with $');
  }

  let results: PathResult[] = [{ path: '$', value: data }];

  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '..') {
      // Recursive descent: gather all descendants, then apply the next token
      const allDescendants: PathResult[] = [];
      for (const r of results) {
        allDescendants.push(...descendants(r.value, r.path));
      }

      i++;
      if (i < tokens.length) {
        const nextToken = tokens[i];
        const nextResults: PathResult[] = [];
        for (const d of allDescendants) {
          // Try to match the next token as a property name directly on each descendant
          nextResults.push(...resolveToken(nextToken, d.value, d.path));
        }
        results = nextResults;
      } else {
        // .. at end means all descendants
        results = allDescendants;
      }
    } else {
      const nextResults: PathResult[] = [];
      for (const r of results) {
        nextResults.push(...resolveToken(token, r.value, r.path));
      }
      results = nextResults;
    }

    i++;
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
  { label: '$.store.*', expr: '$.store[*]' },
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
      data = JSON.parse(jsonInput);
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
    if (typeof v === 'string') return `"${v}"`;
    if (v === null) return 'null';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
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
              <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
                <ContentPasteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload JSON file">
              <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
                <FileUploadIcon sx={{ fontSize: 16 }} />
                <input type="file" hidden accept=".json,.txt" onChange={handleUpload} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton size="small" onClick={() => setJsonInput('')} disabled={!jsonInput} sx={{ color: 'text.secondary' }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            component="textarea"
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
                  <IconButton size="small" onClick={() => setPathExpr('')}>
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
