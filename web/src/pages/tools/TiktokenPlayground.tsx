import { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, readFileAsText } from '../../utils/file';

// ---------------------------------------------------------------------------
// Encoding / model configuration
// ---------------------------------------------------------------------------

interface EncodingInfo {
  name: string;
  encoding: string;
  description: string;
  inputPricePer1k: number;  // USD per 1K tokens (input)
  outputPricePer1k: number;
}

const ENCODINGS: Record<string, EncodingInfo> = {
  'gpt-4o': {
    name: 'GPT-4o',
    encoding: 'o200k_base',
    description: 'Used by GPT-4o and GPT-4o-mini',
    inputPricePer1k: 0.005,
    outputPricePer1k: 0.015,
  },
  'gpt-4': {
    name: 'GPT-4 / GPT-3.5',
    encoding: 'cl100k_base',
    description: 'Used by GPT-4, GPT-4 Turbo, GPT-3.5 Turbo',
    inputPricePer1k: 0.03,
    outputPricePer1k: 0.06,
  },
  'gpt-3': {
    name: 'GPT-3 (davinci)',
    encoding: 'p50k_base',
    description: 'Used by text-davinci-003, Codex',
    inputPricePer1k: 0.02,
    outputPricePer1k: 0.02,
  },
  'gpt-2': {
    name: 'GPT-2',
    encoding: 'r50k_base',
    description: 'Original GPT-2 BPE encoding',
    inputPricePer1k: 0,
    outputPricePer1k: 0,
  },
};

// ---------------------------------------------------------------------------
// Simplified BPE-like tokenizer
// ---------------------------------------------------------------------------

// Common multi-character tokens that a BPE tokenizer would merge
const COMMON_TOKENS: string[] = [
  // common words / subwords kept as single tokens
  'the', 'ing', 'tion', 'ment', 'ness', 'able', 'ible', 'ous', 'ive',
  'ful', 'less', 'ence', 'ance', 'ally', 'ize', 'ise', 'ated', 'ting',
  'ness', 'ship', 'ward', 'wise', 'like', 'self',
  'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'with', 'have', 'this', 'that',
  'from', 'they', 'been', 'said', 'each', 'which', 'their', 'will',
  'other', 'about', 'many', 'then', 'them', 'would', 'make', 'like',
  'time', 'very', 'when', 'come', 'could', 'more', 'also', 'back',
  'after', 'only', 'some', 'than', 'into', 'just', 'should', 'know',
  // programming
  'function', 'return', 'const', 'import', 'export', 'class', 'interface',
  'async', 'await', 'throw', 'catch', 'while', 'break', 'continue',
  'default', 'switch', 'case', 'true', 'false', 'null', 'undefined',
  'typeof', 'instanceof', 'void', 'new', 'delete', 'try', 'finally',
  'extends', 'implements', 'static', 'public', 'private', 'protected',
  '===', '!==', '&&', '||', '=>', '...', '/**', '*/', '//', '/*',
  '<=', '>=', '!=', '==', '++', '--', '+=', '-=', '*=', '/=',
  // whitespace patterns
  '    ', '  ',
];

// Build a set for O(1) lookup of common tokens (lowercased for matching)
const COMMON_SET = new Set(COMMON_TOKENS.map((t) => t.toLowerCase()));

/**
 * Simplified BPE-like tokenizer.
 *
 * Approach:
 * 1. Use a regex (inspired by the GPT tokenizer pattern) to split text into
 *    coarse segments: words, whitespace runs, punctuation clusters, numbers.
 * 2. For each segment, attempt greedy matching against common BPE subword
 *    tokens, falling back to single characters for unrecognised content.
 * 3. Encoding-specific tweaks (r50k splits more aggressively on punctuation,
 *    o200k keeps longer merges).
 */
function tokenize(text: string, encoding: string): string[] {
  if (!text) return [];

  // GPT-style pre-tokenization regex:
  //  - contractions / possessives
  //  - letter sequences
  //  - digit sequences
  //  - punctuation runs
  //  - whitespace runs
  const pat =
    /(?:'s|'t|'re|'ve|'m|'ll|'d)|[A-Za-z\u00C0-\u024F]+|\d+|[^\s\w]+|\s+/g;

  const coarseTokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pat.exec(text)) !== null) {
    coarseTokens.push(m[0]);
  }

  // Greedy subword splitting of each coarse token
  const tokens: string[] = [];

  for (const seg of coarseTokens) {
    // Pure whitespace -> keep as single token (BPE encodes leading spaces)
    if (/^\s+$/.test(seg)) {
      if (encoding === 'r50k_base' || encoding === 'p50k_base') {
        // Older encodings tend to split each space individually
        for (const ch of seg) tokens.push(ch);
      } else {
        // cl100k / o200k merge whitespace runs
        tokens.push(seg);
      }
      continue;
    }

    // Punctuation-only runs
    if (/^[^\s\w]+$/.test(seg)) {
      // Try known multi-char operators
      let i = 0;
      while (i < seg.length) {
        let matched = false;
        for (let len = Math.min(3, seg.length - i); len > 1; len--) {
          const sub = seg.slice(i, i + len);
          if (COMMON_SET.has(sub)) {
            tokens.push(sub);
            i += len;
            matched = true;
            break;
          }
        }
        if (!matched) {
          tokens.push(seg[i]);
          i++;
        }
      }
      continue;
    }

    // Words / digits: greedy longest-match against common subwords
    const lower = seg.toLowerCase();

    // If the whole segment is a known common token, keep it
    if (COMMON_SET.has(lower)) {
      tokens.push(seg);
      continue;
    }

    // Try to split into known subwords greedily
    let i = 0;
    while (i < seg.length) {
      let bestLen = 1;
      const maxCheck = Math.min(12, seg.length - i);
      for (let len = maxCheck; len > 1; len--) {
        const sub = seg.slice(i, i + len).toLowerCase();
        if (COMMON_SET.has(sub)) {
          bestLen = len;
          break;
        }
      }

      // Encoding-specific: older encodings split more aggressively
      if (encoding === 'r50k_base' && bestLen === 1 && seg.length > 6) {
        // r50k breaks long unknown words into 2-3 char fragments
        const fragLen = Math.min(3, seg.length - i);
        tokens.push(seg.slice(i, i + fragLen));
        i += fragLen;
      } else {
        tokens.push(seg.slice(i, i + bestLen));
        i += bestLen;
      }
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Alternating token highlight colours
// ---------------------------------------------------------------------------

const TOKEN_COLORS_LIGHT = [
  'rgba(107, 64, 216, 0.16)',
  'rgba(104, 222, 122, 0.22)',
  'rgba(244, 172, 54, 0.20)',
  'rgba(239, 65, 70, 0.16)',
  'rgba(39, 181, 234, 0.18)',
  'rgba(145, 120, 210, 0.16)',
];

const TOKEN_COLORS_DARK = [
  'rgba(107, 64, 216, 0.35)',
  'rgba(104, 222, 122, 0.28)',
  'rgba(244, 172, 54, 0.30)',
  'rgba(239, 65, 70, 0.28)',
  'rgba(39, 181, 234, 0.30)',
  'rgba(145, 120, 210, 0.30)',
];

// ---------------------------------------------------------------------------
// Preset examples
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'Hello World', text: 'Hello world! This is a simple test.' },
  {
    label: 'Code Snippet',
    text: `export async function fetchData(url: string): Promise<Response> {\n  const response = await fetch(url, {\n    method: 'GET',\n    headers: { 'Content-Type': 'application/json' },\n  });\n  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);\n  return response.json();\n}`,
  },
  {
    label: 'Special Characters',
    text: 'Price: $49.99 — 20% off! Email: user@example.com & visit https://example.com/path?q=hello&lang=en#section',
  },
  {
    label: 'Emoji Text',
    text: 'Hello! 👋 I love coding 💻 and coffee ☕. The weather is great today 🌞🌈. Let\'s celebrate 🎉🎊!',
  },
  {
    label: 'Multilingual',
    text: 'Hello! こんにちは Bonjour 你好 مرحبا Hola Привет 안녕하세요 Γεια σας Olá',
  },
  {
    label: 'Paragraph',
    text: 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet at least once. It has been used as a typing test since the late 19th century. Interestingly, the sentence is only 35 characters long if you exclude spaces and punctuation.',
  },
];

// ---------------------------------------------------------------------------
// Helper: byte length of a string (UTF-8)
// ---------------------------------------------------------------------------

function byteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TiktokenPlayground() {
  const [text, setText] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [fileName, setFileName] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const encodingInfo = ENCODINGS[model];
  const tokenColors = isDark ? TOKEN_COLORS_DARK : TOKEN_COLORS_LIGHT;

  const tokens = useMemo(
    () => tokenize(text, encodingInfo.encoding),
    [text, encodingInfo.encoding],
  );

  const stats = useMemo(() => {
    const tokenCount = tokens.length;
    const charCount = text.length;
    const avgCharsPerToken = tokenCount > 0 ? (charCount / tokenCount).toFixed(2) : '0';
    const inputCost =
      encodingInfo.inputPricePer1k > 0
        ? ((tokenCount / 1000) * encodingInfo.inputPricePer1k).toFixed(6)
        : 'N/A';
    const outputCost =
      encodingInfo.outputPricePer1k > 0
        ? ((tokenCount / 1000) * encodingInfo.outputPricePer1k).toFixed(6)
        : 'N/A';
    return { tokenCount, charCount, avgCharsPerToken, inputCost, outputCost };
  }, [tokens, text, encodingInfo]);

  // -- handlers --

  const handlePaste = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      setFileName('');
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const t = await readFileAsText(file);
      setText(t);
      setFileName(file.name);
      e.target.value = '';
    },
    [],
  );

  const handleClear = useCallback(() => {
    setText('');
    setFileName('');
  }, []);

  // -- stat cards --

  const statItems = [
    { label: 'Tokens', value: stats.tokenCount.toLocaleString(), highlight: true },
    { label: 'Characters', value: stats.charCount.toLocaleString() },
    { label: 'Avg Chars / Token', value: stats.avgCharsPerToken },
    { label: 'Input Cost (USD)', value: stats.inputCost === 'N/A' ? 'N/A' : `$${stats.inputCost}` },
    { label: 'Output Cost (USD)', value: stats.outputCost === 'N/A' ? 'N/A' : `$${stats.outputCost}` },
  ];

  return (
    <>
      <PageHead
        title="Tiktoken BPE Tokenization Playground - BitesInByte Tools"
        description="Visualize how text is tokenized by GPT-4, GPT-3.5, and GPT-2 BPE encodings. See token boundaries, counts, and estimated costs."
      />
      <Stack spacing={2.5}>
        {/* Header */}
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Tiktoken / BPE Tokenization Playground
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize token boundaries for different OpenAI encodings. Uses a simplified BPE-like
            tokenizer to approximate real tokenization behaviour.
          </Typography>
        </Box>

        {/* Controls bar */}
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
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Model / Encoding</InputLabel>
            <Select
              value={model}
              label="Model / Encoding"
              onChange={(e) => setModel(e.target.value)}
            >
              {Object.entries(ENCODINGS).map(([key, info]) => (
                <MenuItem key={key} value={key}>
                  {info.name} — {info.encoding}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {encodingInfo.description}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste from clipboard">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload text file">
            <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
              <UploadFileIcon fontSize="small" />
              <input type="file" hidden accept=".txt,.md,.json,.csv,.xml,.html,.js,.ts,.py,.rs,.go,.java,.c,.cpp,.rb,.yml,.yaml,.toml" onChange={handleFile} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton
              size="small"
              onClick={handleClear}
              disabled={!text}
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Preset examples */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
            Examples:
          </Typography>
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="small"
              variant="outlined"
              onClick={() => {
                setText(p.text);
                setFileName('');
              }}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.25,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                },
              }}
            >
              {p.label}
            </Button>
          ))}
        </Box>

        {fileName && (
          <Chip
            label={`File: ${fileName}`}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Stats grid */}
        <Grid container spacing={1.5}>
          {statItems.map((item) => (
            <Grid key={item.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: item.highlight ? 'primary.main' : 'divider',
                  textAlign: 'center',
                  bgcolor: item.highlight
                    ? isDark
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.primary.main, 0.04)
                    : undefined,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: item.highlight ? 'primary.main' : 'text.primary',
                  }}
                >
                  {item.value}
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Main content: input + token visualization + token list */}
        <Grid container spacing={2}>
          {/* Text input */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
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
                  Input Text
                </Typography>
                <Tooltip title="Copy text">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      const ok = await copyToClipboard(text);
                      enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', {
                        variant: ok ? 'success' : 'error',
                      });
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFileName('');
                }}
                placeholder="Paste or type text to tokenize..."
                rows={18}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 350,
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  padding: '12px 16px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  backgroundColor: 'transparent',
                  color: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </Box>
          </Grid>

          {/* Token visualization + list */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              {/* Token visualization */}
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
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
                    Token Visualization
                  </Typography>
                  <Tooltip title="Copy token count">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        const ok = await copyToClipboard(stats.tokenCount.toString());
                        enqueueSnackbar(ok ? 'Copied token count' : 'Failed', {
                          variant: ok ? 'success' : 'error',
                        });
                      }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    minHeight: 100,
                    maxHeight: 260,
                    overflow: 'auto',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {tokens.length === 0 && (
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      Enter text to see token boundaries
                    </Typography>
                  )}
                  {tokens.map((token, i) => (
                    <Tooltip
                      key={i}
                      title={`Token ${i}: "${token.replace(/ /g, '␣').replace(/\n/g, '↵').replace(/\t/g, '⇥')}" (${byteLength(token)} bytes)`}
                      arrow
                      placement="top"
                    >
                      <span
                        style={{
                          backgroundColor: tokenColors[i % tokenColors.length],
                          borderRadius: 3,
                          padding: '1px 0',
                          cursor: 'default',
                        }}
                      >
                        {token}
                      </span>
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              {/* Token list */}
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
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
                    Token List ({tokens.length})
                  </Typography>
                  <Tooltip title="Copy token list as JSON">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        const data = tokens.map((t, i) => ({
                          index: i,
                          token: t,
                          bytes: byteLength(t),
                        }));
                        const ok = await copyToClipboard(JSON.stringify(data, null, 2));
                        enqueueSnackbar(ok ? 'Copied token list' : 'Failed', {
                          variant: ok ? 'success' : 'error',
                        });
                      }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                  {tokens.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        No tokens yet
                      </Typography>
                    </Box>
                  )}
                  {tokens.map((token, i) => {
                    const display = token
                      .replace(/ /g, '␣')
                      .replace(/\n/g, '↵')
                      .replace(/\t/g, '⇥');
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 2,
                          py: 0.75,
                          borderBottom: i < tokens.length - 1 ? 1 : 0,
                          borderColor: 'divider',
                          '&:hover': {
                            bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.6875rem',
                            color: 'text.secondary',
                            minWidth: 32,
                            textAlign: 'right',
                          }}
                        >
                          {i}
                        </Typography>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: tokenColors[i % tokenColors.length],
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.8125rem',
                            whiteSpace: 'pre',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {display}
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.6875rem',
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {byteLength(token)}B
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
