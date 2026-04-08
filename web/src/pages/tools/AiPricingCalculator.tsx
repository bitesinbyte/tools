import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  TextField,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  alpha,
  useTheme,
} from '@mui/material';
import PageHead from '../../components/PageHead';

interface ModelPricing {
  name: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  maxContext: number;
}

const MODELS: ModelPricing[] = [
  { name: 'GPT-4o', provider: 'OpenAI', inputPer1M: 2.50, outputPer1M: 10.00, maxContext: 128000 },
  { name: 'GPT-4o Mini', provider: 'OpenAI', inputPer1M: 0.15, outputPer1M: 0.60, maxContext: 128000 },
  { name: 'GPT-4 Turbo', provider: 'OpenAI', inputPer1M: 10.00, outputPer1M: 30.00, maxContext: 128000 },
  { name: 'GPT-4', provider: 'OpenAI', inputPer1M: 30.00, outputPer1M: 60.00, maxContext: 8192 },
  { name: 'GPT-3.5 Turbo', provider: 'OpenAI', inputPer1M: 0.50, outputPer1M: 1.50, maxContext: 16385 },
  { name: 'o1', provider: 'OpenAI', inputPer1M: 15.00, outputPer1M: 60.00, maxContext: 200000 },
  { name: 'o3-mini', provider: 'OpenAI', inputPer1M: 1.10, outputPer1M: 4.40, maxContext: 200000 },
  { name: 'Claude 4 Opus', provider: 'Anthropic', inputPer1M: 15.00, outputPer1M: 75.00, maxContext: 200000 },
  { name: 'Claude 4 Sonnet', provider: 'Anthropic', inputPer1M: 3.00, outputPer1M: 15.00, maxContext: 200000 },
  { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPer1M: 3.00, outputPer1M: 15.00, maxContext: 200000 },
  { name: 'Claude 3.5 Haiku', provider: 'Anthropic', inputPer1M: 0.80, outputPer1M: 4.00, maxContext: 200000 },
  { name: 'Claude 3 Haiku', provider: 'Anthropic', inputPer1M: 0.25, outputPer1M: 1.25, maxContext: 200000 },
  { name: 'Gemini 2.5 Pro', provider: 'Google', inputPer1M: 1.25, outputPer1M: 10.00, maxContext: 1000000 },
  { name: 'Gemini 2.0 Flash', provider: 'Google', inputPer1M: 0.10, outputPer1M: 0.40, maxContext: 1000000 },
  { name: 'Gemini 1.5 Pro', provider: 'Google', inputPer1M: 1.25, outputPer1M: 5.00, maxContext: 2000000 },
  { name: 'DeepSeek V3', provider: 'DeepSeek', inputPer1M: 0.27, outputPer1M: 1.10, maxContext: 131072 },
  { name: 'DeepSeek R1', provider: 'DeepSeek', inputPer1M: 0.55, outputPer1M: 2.19, maxContext: 131072 },
  { name: 'Llama 3.1 405B', provider: 'Meta (via API)', inputPer1M: 3.00, outputPer1M: 3.00, maxContext: 131072 },
  { name: 'Llama 3.1 70B', provider: 'Meta (via API)', inputPer1M: 0.80, outputPer1M: 0.80, maxContext: 131072 },
  { name: 'Mistral Large', provider: 'Mistral', inputPer1M: 2.00, outputPer1M: 6.00, maxContext: 128000 },
];

export default function AiPricingCalculator() {
  const [selectedModel, setSelectedModel] = useState(0);
  const [inputTokens, setInputTokens] = useState(1000);
  const [outputTokens, setOutputTokens] = useState(500);
  const [requestsPerDay, setRequestsPerDay] = useState(100);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const model = MODELS[selectedModel];

  const costs = useMemo(() => {
    const inputCost = (inputTokens / 1_000_000) * model.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * model.outputPer1M;
    const perRequest = inputCost + outputCost;
    const daily = perRequest * requestsPerDay;
    const monthly = daily * 30;
    const yearly = daily * 365;
    return { inputCost, outputCost, perRequest, daily, monthly, yearly };
  }, [inputTokens, outputTokens, requestsPerDay, model]);

  const fmt = (n: number) => n < 0.01 ? `$${n.toFixed(6)}` : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;

  return (
    <>
      <PageHead
        title="AI Pricing Calculator - BitesInByte Tools"
        description="Calculate API costs for GPT-4, Claude, Gemini, Llama and more. Estimate daily, monthly, and yearly spend."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>AI Pricing Calculator</Typography>
          <Typography variant="body2" color="text.secondary">
            Estimate API costs across popular LLM providers. Prices are approximate and may change.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Config panel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Model</InputLabel>
                <Select value={selectedModel} label="Model" onChange={(e) => setSelectedModel(Number(e.target.value))}>
                  {MODELS.map((m, i) => (
                    <MenuItem key={i} value={i}>
                      {m.name} ({m.provider})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Model Pricing
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem' }}>
                  Input: <strong>${model.inputPer1M.toFixed(2)}</strong> / 1M tokens
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem' }}>
                  Output: <strong>${model.outputPer1M.toFixed(2)}</strong> / 1M tokens
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem' }}>
                  Context: <strong>{model.maxContext.toLocaleString()}</strong> tokens
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                  Input Tokens per Request: {inputTokens.toLocaleString()}
                </Typography>
                <Slider
                  value={inputTokens}
                  onChange={(_, v) => setInputTokens(v as number)}
                  min={100}
                  max={100000}
                  step={100}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => v.toLocaleString()}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                  Output Tokens per Request: {outputTokens.toLocaleString()}
                </Typography>
                <Slider
                  value={outputTokens}
                  onChange={(_, v) => setOutputTokens(v as number)}
                  min={50}
                  max={50000}
                  step={50}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => v.toLocaleString()}
                />
              </Box>

              <TextField
                label="Requests per Day"
                type="number"
                size="small"
                fullWidth
                value={requestsPerDay}
                onChange={(e) => setRequestsPerDay(Math.max(1, Number(e.target.value) || 1))}
              />
            </Stack>
          </Grid>

          {/* Results panel */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1.5}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cost Breakdown
              </Typography>

              {[
                { label: 'Input Cost / Request', value: fmt(costs.inputCost) },
                { label: 'Output Cost / Request', value: fmt(costs.outputCost) },
                { label: 'Total Cost / Request', value: fmt(costs.perRequest), highlight: true },
                { label: `Daily (${requestsPerDay} requests)`, value: fmt(costs.daily) },
                { label: 'Monthly (30 days)', value: fmt(costs.monthly), highlight: true },
                { label: 'Yearly (365 days)', value: fmt(costs.yearly) },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: item.highlight ? 'primary.main' : 'divider',
                    bgcolor: item.highlight
                      ? (isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04))
                      : undefined,
                  }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{item.label}</Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: item.highlight ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}

              {/* Comparison table */}
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Comparison (same usage)
                </Typography>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  {MODELS.filter((_, i) => i !== selectedModel).slice(0, 5).map((m, i, arr) => {
                    const mCost = ((inputTokens / 1_000_000) * m.inputPer1M + (outputTokens / 1_000_000) * m.outputPer1M) * requestsPerDay * 30;
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2,
                          py: 1,
                          borderBottom: i < arr.length - 1 ? 1 : 0,
                          borderColor: 'divider',
                          '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02) },
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{m.name}</Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{m.provider}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                            {fmt(mCost)}/mo
                          </Typography>
                          <Chip
                            label={mCost < costs.monthly ? `${((1 - mCost / costs.monthly) * 100).toFixed(0)}% cheaper` : mCost > costs.monthly ? `${(((mCost / costs.monthly) - 1) * 100).toFixed(0)}% more` : 'same'}
                            size="small"
                            color={mCost < costs.monthly ? 'success' : mCost > costs.monthly ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.625rem', height: 20 }}
                          />
                        </Box>
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
