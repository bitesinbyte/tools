import { useState, useMemo } from 'react';
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

interface ModelInfo {
  name: string;
  tokensPerChar: number; // average ratio
  maxContext: number;
}

const MODELS: Record<string, ModelInfo> = {
  'gpt-4o': { name: 'GPT-4o', tokensPerChar: 0.25, maxContext: 128000 },
  'gpt-4o-mini': { name: 'GPT-4o Mini', tokensPerChar: 0.25, maxContext: 128000 },
  'gpt-4-turbo': { name: 'GPT-4 Turbo', tokensPerChar: 0.25, maxContext: 128000 },
  'gpt-4': { name: 'GPT-4', tokensPerChar: 0.25, maxContext: 8192 },
  'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', tokensPerChar: 0.25, maxContext: 16385 },
  'claude-4-opus': { name: 'Claude 4 Opus', tokensPerChar: 0.24, maxContext: 200000 },
  'claude-4-sonnet': { name: 'Claude 4 Sonnet', tokensPerChar: 0.24, maxContext: 200000 },
  'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', tokensPerChar: 0.24, maxContext: 200000 },
  'claude-3-haiku': { name: 'Claude 3 Haiku', tokensPerChar: 0.24, maxContext: 200000 },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', tokensPerChar: 0.25, maxContext: 1000000 },
  'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', tokensPerChar: 0.25, maxContext: 1000000 },
  'llama-3.1-405b': { name: 'Llama 3.1 405B', tokensPerChar: 0.27, maxContext: 131072 },
  'llama-3.1-70b': { name: 'Llama 3.1 70B', tokensPerChar: 0.27, maxContext: 131072 },
  'mistral-large': { name: 'Mistral Large', tokensPerChar: 0.26, maxContext: 128000 },
  'deepseek-v3': { name: 'DeepSeek V3', tokensPerChar: 0.26, maxContext: 131072 },
};

// More accurate estimation: count BPE-like tokens
function estimateTokens(text: string, tokensPerChar: number): number {
  if (!text) return 0;
  // Word-based estimation with adjustments
  const words = text.split(/\s+/).filter(Boolean);
  const wordTokens = words.reduce((sum, word) => {
    // Short common words ~1 token, longer words get split
    if (word.length <= 4) return sum + 1;
    if (word.length <= 8) return sum + 1.3;
    return sum + Math.ceil(word.length * tokensPerChar);
  }, 0);
  // Account for whitespace tokens and punctuation
  const punctuation = (text.match(/[^\w\s]/g) || []).length;
  return Math.max(1, Math.round(wordTokens + punctuation * 0.5));
}

export default function TokenCounter() {
  const [text, setText] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [fileName, setFileName] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const modelInfo = MODELS[model];

  const stats = useMemo(() => {
    const tokens = estimateTokens(text, modelInfo.tokensPerChar);
    const chars = text.length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text ? text.split('\n').length : 0;
    const pctContext = modelInfo.maxContext > 0 ? ((tokens / modelInfo.maxContext) * 100).toFixed(2) : '0';
    const remaining = Math.max(0, modelInfo.maxContext - tokens);
    return { tokens, chars, words, lines, pctContext, remaining };
  }, [text, modelInfo]);

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      setFileName('');
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const t = await readFileAsText(file);
    setText(t);
    setFileName(file.name);
    e.target.value = '';
  };

  const statItems = [
    { label: 'Estimated Tokens', value: stats.tokens.toLocaleString(), highlight: true },
    { label: 'Characters', value: stats.chars.toLocaleString() },
    { label: 'Words', value: stats.words.toLocaleString() },
    { label: 'Lines', value: stats.lines.toLocaleString() },
    { label: 'Context Used', value: `${stats.pctContext}%` },
    { label: 'Remaining Tokens', value: stats.remaining.toLocaleString() },
  ];

  return (
    <>
      <PageHead
        title="AI Token Counter - BitesInByte Tools"
        description="Count tokens for GPT-4, Claude, Gemini, Llama, and other LLMs. Estimate context window usage."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>AI Token Counter</Typography>
          <Typography variant="body2" color="text.secondary">
            Estimate token counts for popular LLMs. Tokens are approximated using word/character heuristics.
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Model</InputLabel>
            <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
              {Object.entries(MODELS).map(([key, m]) => (
                <MenuItem key={key} value={key}>
                  {m.name} ({m.maxContext.toLocaleString()} ctx)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload file">
            <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
              <UploadFileIcon fontSize="small" />
              <input type="file" hidden onChange={handleFile} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={() => { setText(''); setFileName(''); }} disabled={!text} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats grid */}
        <Grid container spacing={1.5}>
          {statItems.map((item) => (
            <Grid key={item.label} size={{ xs: 6, sm: 4, md: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: item.highlight ? 'primary.main' : 'divider',
                  textAlign: 'center',
                  bgcolor: item.highlight
                    ? (isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04))
                    : undefined,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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

        {/* Context window bar */}
        {text && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
                Context Window: {stats.tokens.toLocaleString()} / {modelInfo.maxContext.toLocaleString()} tokens
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
                {stats.pctContext}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.min(100, parseFloat(stats.pctContext))}%`,
                  borderRadius: 4,
                  bgcolor: parseFloat(stats.pctContext) > 90 ? 'error.main' : parseFloat(stats.pctContext) > 70 ? 'warning.main' : 'primary.main',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        )}

        {fileName && (
          <Chip label={`File: ${fileName}`} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        {/* Text input */}
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Input Text</Typography>
            <Tooltip title="Copy token count">
              <IconButton
                size="small"
                onClick={async () => {
                  const ok = await copyToClipboard(stats.tokens.toString());
                  enqueueSnackbar(ok ? 'Copied token count' : 'Failed', { variant: ok ? 'success' : 'error' });
                }}
                sx={{ color: 'text.secondary' }}
              >
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setFileName(''); }}
            placeholder="Paste or type your prompt, document, or code here..."
            rows={16}
            style={{
              width: '100%',
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
      </Stack>
    </>
  );
}
