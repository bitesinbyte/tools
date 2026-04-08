import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
  useTheme,
} from '@mui/material';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

interface ModelEntry {
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput: number;
  knowledgeCutoff: string;
}

const MODELS: ModelEntry[] = [
  // OpenAI
  { name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000, maxOutput: 16384, knowledgeCutoff: 'Oct 2023' },
  { name: 'GPT-4o Mini', provider: 'OpenAI', contextWindow: 128000, maxOutput: 16384, knowledgeCutoff: 'Oct 2023' },
  { name: 'GPT-4 Turbo', provider: 'OpenAI', contextWindow: 128000, maxOutput: 4096, knowledgeCutoff: 'Dec 2023' },
  { name: 'GPT-4', provider: 'OpenAI', contextWindow: 8192, maxOutput: 8192, knowledgeCutoff: 'Sep 2021' },
  { name: 'o1', provider: 'OpenAI', contextWindow: 200000, maxOutput: 100000, knowledgeCutoff: 'Oct 2023' },
  { name: 'o1-mini', provider: 'OpenAI', contextWindow: 128000, maxOutput: 65536, knowledgeCutoff: 'Oct 2023' },
  { name: 'o3', provider: 'OpenAI', contextWindow: 200000, maxOutput: 100000, knowledgeCutoff: 'Oct 2023' },
  { name: 'o3-mini', provider: 'OpenAI', contextWindow: 200000, maxOutput: 100000, knowledgeCutoff: 'Oct 2023' },
  { name: 'o4-mini', provider: 'OpenAI', contextWindow: 200000, maxOutput: 100000, knowledgeCutoff: 'Oct 2023' },
  // Anthropic
  { name: 'Claude 4 Opus', provider: 'Anthropic', contextWindow: 200000, maxOutput: 32000, knowledgeCutoff: 'Mar 2025' },
  { name: 'Claude 4 Sonnet', provider: 'Anthropic', contextWindow: 200000, maxOutput: 64000, knowledgeCutoff: 'Mar 2025' },
  { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextWindow: 200000, maxOutput: 8192, knowledgeCutoff: 'Apr 2024' },
  { name: 'Claude 3.5 Haiku', provider: 'Anthropic', contextWindow: 200000, maxOutput: 8192, knowledgeCutoff: 'Jul 2024' },
  { name: 'Claude 3 Opus', provider: 'Anthropic', contextWindow: 200000, maxOutput: 4096, knowledgeCutoff: 'Aug 2023' },
  // Google
  { name: 'Gemini 2.5 Pro', provider: 'Google', contextWindow: 1000000, maxOutput: 65536, knowledgeCutoff: 'Jan 2025' },
  { name: 'Gemini 2.0 Flash', provider: 'Google', contextWindow: 1000000, maxOutput: 8192, knowledgeCutoff: 'Jun 2024' },
  { name: 'Gemini 1.5 Pro', provider: 'Google', contextWindow: 2000000, maxOutput: 8192, knowledgeCutoff: 'Nov 2023' },
  { name: 'Gemini 1.5 Flash', provider: 'Google', contextWindow: 1000000, maxOutput: 8192, knowledgeCutoff: 'Nov 2023' },
  // Meta
  { name: 'Llama 3.1 405B', provider: 'Meta', contextWindow: 128000, maxOutput: 4096, knowledgeCutoff: 'Dec 2023' },
  { name: 'Llama 3.1 70B', provider: 'Meta', contextWindow: 128000, maxOutput: 4096, knowledgeCutoff: 'Dec 2023' },
  { name: 'Llama 3.3 70B', provider: 'Meta', contextWindow: 128000, maxOutput: 4096, knowledgeCutoff: 'Dec 2023' },
  // Mistral
  { name: 'Mistral Large', provider: 'Mistral', contextWindow: 128000, maxOutput: 4096, knowledgeCutoff: 'Nov 2024' },
  { name: 'Mistral Medium', provider: 'Mistral', contextWindow: 32000, maxOutput: 4096, knowledgeCutoff: 'Dec 2023' },
  { name: 'Mixtral 8x22B', provider: 'Mistral', contextWindow: 64000, maxOutput: 4096, knowledgeCutoff: 'Apr 2024' },
  // DeepSeek
  { name: 'DeepSeek V3', provider: 'DeepSeek', contextWindow: 128000, maxOutput: 8192, knowledgeCutoff: 'Dec 2024' },
  { name: 'DeepSeek R1', provider: 'DeepSeek', contextWindow: 128000, maxOutput: 8192, knowledgeCutoff: 'Dec 2024' },
];

const PROVIDERS = ['All', 'OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'DeepSeek'] as const;

type SortKey = 'contextWindow' | 'name' | 'provider';

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#d97706',
  Google: '#4285f4',
  Meta: '#0668E1',
  Mistral: '#ff7000',
  DeepSeek: '#5b6ee1',
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

function tokensToPages(tokens: number): { words: number; pages: number } {
  // ~0.75 words per token, ~500 words per page (standard book page)
  const words = Math.round(tokens * 0.75);
  const pages = Math.round(words / 500);
  return { words, pages };
}

export default function ModelContextWindow() {
  const [provider, setProvider] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('contextWindow');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const filtered = useMemo(() => {
    let list = MODELS;
    if (provider !== 'All') {
      list = list.filter((m) => m.provider === provider);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'contextWindow') return b.contextWindow - a.contextWindow;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.provider.localeCompare(b.provider) || b.contextWindow - a.contextWindow;
    });
    return sorted;
  }, [provider, search, sortBy]);

  const maxContext = useMemo(() => Math.max(...MODELS.map((m) => m.contextWindow)), []);

  const handleRowClick = async (model: ModelEntry) => {
    const details = [
      model.name,
      `Provider: ${model.provider}`,
      `Context Window: ${formatTokens(model.contextWindow)} tokens (${model.contextWindow.toLocaleString()})`,
      `Max Output: ${formatTokens(model.maxOutput)} tokens (${model.maxOutput.toLocaleString()})`,
      `Knowledge Cutoff: ${model.knowledgeCutoff}`,
    ].join('\n');
    const ok = await copyToClipboard(details);
    enqueueSnackbar(ok ? `Copied ${model.name} details` : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  // Token-to-pages converter
  const converterTokens = useMemo(() => {
    const examples = [8192, 32000, 128000, 200000, 1000000, 2000000];
    return examples.map((t) => {
      const { words, pages } = tokensToPages(t);
      return { tokens: t, words, pages };
    });
  }, []);

  return (
    <>
      <PageHead
        title="Model Context Window Comparison - BitesInByte Tools"
        description="Compare context window sizes across GPT-4, Claude, Gemini, Llama, Mistral, and DeepSeek. Visual bar chart of LLM context lengths."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Model Context Window Comparison</Typography>
          <Typography variant="body2" color="text.secondary">
            Compare context window sizes across major LLM providers. Click any row to copy model details.
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Provider</InputLabel>
            <Select value={provider} label="Provider" onChange={(e) => setProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value as SortKey)}>
              <MenuItem value="contextWindow">Context Window</MenuItem>
              <MenuItem value="name">Model Name</MenuItem>
              <MenuItem value="provider">Provider</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {filtered.length} model{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Provider legend */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(PROVIDER_COLORS).map(([name, color]) => (
            <Chip
              key={name}
              label={name}
              size="small"
              variant={provider === name ? 'filled' : 'outlined'}
              onClick={() => setProvider(provider === name ? 'All' : name)}
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderColor: color,
                color: provider === name ? '#fff' : color,
                bgcolor: provider === name ? color : 'transparent',
                '&:hover': { bgcolor: alpha(color, 0.15) },
              }}
            />
          ))}
        </Box>

        {/* Chart */}
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', width: 180, flexShrink: 0 }}>
              MODEL
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', width: 80, flexShrink: 0 }}>
              PROVIDER
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', width: 90, flexShrink: 0, textAlign: 'right' }}>
              CONTEXT
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', width: 90, flexShrink: 0, textAlign: 'right' }}>
              MAX OUTPUT
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', flex: 1, pl: 2 }}>
              RELATIVE SIZE
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', width: 80, flexShrink: 0, textAlign: 'right' }}>
              CUTOFF
            </Typography>
          </Box>

          {/* Rows */}
          {filtered.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>No models match your filters.</Typography>
            </Box>
          )}

          {filtered.map((model, i) => {
            const barPct = (model.contextWindow / maxContext) * 100;
            const color = PROVIDER_COLORS[model.provider] || theme.palette.primary.main;

            return (
              <Box
                key={`${model.provider}-${model.name}`}
                onClick={() => handleRowClick(model)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  borderBottom: i < filtered.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.03),
                  },
                }}
              >
                {/* Model name */}
                <Box sx={{ width: 180, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.3 }}>
                    {model.name}
                  </Typography>
                </Box>

                {/* Provider */}
                <Box sx={{ width: 80, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color, fontWeight: 600 }}>
                    {model.provider}
                  </Typography>
                </Box>

                {/* Context window */}
                <Typography
                  sx={{
                    width: 90,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  {formatTokens(model.contextWindow)}
                </Typography>

                {/* Max output */}
                <Typography
                  sx={{
                    width: 90,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                >
                  {formatTokens(model.maxOutput)}
                </Typography>

                {/* Bar */}
                <Box sx={{ flex: 1, pl: 2 }}>
                  <Box
                    sx={{
                      height: 18,
                      borderRadius: 1,
                      bgcolor: isDark ? alpha('#fff', 0.06) : alpha('#000', 0.04),
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${barPct}%`,
                        borderRadius: 1,
                        bgcolor: alpha(color, isDark ? 0.5 : 0.6),
                        minWidth: barPct > 0 ? 4 : 0,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>
                </Box>

                {/* Knowledge cutoff */}
                <Typography
                  sx={{
                    width: 80,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontSize: '0.6875rem',
                    color: 'text.secondary',
                    fontFamily: 'monospace',
                  }}
                >
                  {model.knowledgeCutoff}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Tokens to Pages converter */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tokens to Pages Reference
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {converterTokens.map((item) => (
              <Box
                key={item.tokens}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  textAlign: 'center',
                  '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02) },
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700 }}>
                  {formatTokens(item.tokens)} tokens
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.25 }}>
                  {'\u2248'} {formatTokens(item.words)} words {'\u2248'} {item.pages.toLocaleString()} pages
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
