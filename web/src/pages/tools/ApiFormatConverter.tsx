import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Tabs,
  Tab,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';
import { CodeEditor } from '../../components/CodeEditor';

const SAMPLE_OPENAI = `{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}`;

const FORMATS = ['OpenAI', 'Anthropic', 'Google Gemini', 'Ollama'] as const;
type Format = (typeof FORMATS)[number];

interface ChatMessage {
  role: string;
  content: string;
}

function parseOpenAI(json: Record<string, unknown>): { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number } {
  const messages = ((json.messages as ChatMessage[]) || []).map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
  return {
    messages,
    model: (json.model as string) || 'gpt-4o',
    temperature: (json.temperature as number) ?? 0.7,
    maxTokens: (json.max_tokens as number) || 1024,
  };
}

function parseAnthropic(json: Record<string, unknown>): { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number } {
  const messages = ((json.messages as ChatMessage[]) || []).map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
  const system = json.system as string;
  if (system) messages.unshift({ role: 'system', content: system });
  return {
    messages,
    model: (json.model as string) || 'claude-3.5-sonnet',
    temperature: (json.temperature as number) ?? 0.7,
    maxTokens: (json.max_tokens as number) || 1024,
  };
}

function parseGemini(json: Record<string, unknown>): { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number } {
  const contents = (json.contents as Array<{ role: string; parts: Array<{ text: string }> }>) || [];
  const messages = contents.map((c) => ({
    role: c.role === 'model' ? 'assistant' : c.role,
    content: c.parts?.map((p) => p.text).join('\n') || '',
  }));
  const sysInst = json.systemInstruction as { parts?: Array<{ text: string }> };
  if (sysInst?.parts) messages.unshift({ role: 'system', content: sysInst.parts.map((p) => p.text).join('\n') });
  const genConfig = (json.generationConfig as Record<string, unknown>) || {};
  return {
    messages,
    model: 'gemini-2.5-pro',
    temperature: (genConfig.temperature as number) ?? 0.7,
    maxTokens: (genConfig.maxOutputTokens as number) || 1024,
  };
}

function parseOllama(json: Record<string, unknown>): { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number } {
  const messages = ((json.messages as ChatMessage[]) || []).map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }));
  const opts = (json.options as Record<string, unknown>) || {};
  return {
    messages,
    model: (json.model as string) || 'llama3.1',
    temperature: (opts.temperature as number) ?? 0.7,
    maxTokens: (opts.num_predict as number) || 1024,
  };
}

function toOpenAI(data: { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number }): string {
  return JSON.stringify({
    model: data.model,
    messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: data.temperature,
    max_tokens: data.maxTokens,
  }, null, 2);
}

function toAnthropic(data: { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number }): string {
  const system = data.messages.find((m) => m.role === 'system')?.content;
  const msgs = data.messages.filter((m) => m.role !== 'system');
  const result: Record<string, unknown> = {
    model: data.model.includes('claude') ? data.model : 'claude-3.5-sonnet-20241022',
    max_tokens: data.maxTokens,
    temperature: data.temperature,
  };
  if (system) result.system = system;
  result.messages = msgs.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  return JSON.stringify(result, null, 2);
}

function toGemini(data: { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number }): string {
  const system = data.messages.find((m) => m.role === 'system')?.content;
  const msgs = data.messages.filter((m) => m.role !== 'system');
  const result: Record<string, unknown> = {};
  if (system) result.systemInstruction = { parts: [{ text: system }] };
  result.contents = msgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  result.generationConfig = { temperature: data.temperature, maxOutputTokens: data.maxTokens };
  return JSON.stringify(result, null, 2);
}

function toOllama(data: { messages: ChatMessage[]; model: string; temperature: number; maxTokens: number }): string {
  return JSON.stringify({
    model: data.model.includes('llama') || data.model.includes('mistral') ? data.model : 'llama3.1',
    messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
    options: { temperature: data.temperature, num_predict: data.maxTokens },
  }, null, 2);
}

const PARSERS: Record<Format, (json: Record<string, unknown>) => ReturnType<typeof parseOpenAI>> = {
  'OpenAI': parseOpenAI,
  'Anthropic': parseAnthropic,
  'Google Gemini': parseGemini,
  'Ollama': parseOllama,
};

const SERIALIZERS: Record<Format, (data: ReturnType<typeof parseOpenAI>) => string> = {
  'OpenAI': toOpenAI,
  'Anthropic': toAnthropic,
  'Google Gemini': toGemini,
  'Ollama': toOllama,
};

export default function ApiFormatConverter() {
  const [input, setInput] = useState(SAMPLE_OPENAI);
  const [fromFormat, setFromFormat] = useState(0);
  const [toFormat, setToFormat] = useState(1);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      const json = JSON.parse(input);
      const parsed = PARSERS[FORMATS[fromFormat]](json);
      const result = SERIALIZERS[FORMATS[toFormat]](parsed);
      return { output: result, error: '' };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, fromFormat, toFormat]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied' : 'Failed', { variant: ok ? 'success' : 'error' });
  };

  const handleSwap = () => {
    if (output) {
      setInput(output);
      const tmp = fromFormat;
      setFromFormat(toFormat);
      setToFormat(tmp);
    }
  };

  return (
    <>
      <PageHead
        title="AI API Format Converter - BitesInByte Tools"
        description="Convert between OpenAI, Anthropic, Google Gemini, and Ollama API formats."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>AI API Format Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert chat completion requests between OpenAI, Anthropic, Google Gemini, and Ollama formats.
          </Typography>
        </Box>

        {/* Format selectors */}
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
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>From</Typography>
            <Tabs value={fromFormat} onChange={(_, v) => setFromFormat(v)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0 } }}>
              {FORMATS.map((f) => <Tab key={f} label={f} />)}
            </Tabs>
          </Box>

          <Tooltip title="Swap">
            <IconButton onClick={handleSwap} disabled={!output} sx={{ border: 1, borderColor: 'divider' }}>
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>

          <Box>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>To</Typography>
            <Tabs value={toFormat} onChange={(_, v) => setToFormat(v)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0 } }}>
              {FORMATS.map((f) => <Tab key={f} label={f} />)}
            </Tabs>
          </Box>
        </Box>

        {error && <Chip label={error} color="error" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {FORMATS[fromFormat]} Input
            </Typography>
            <CodeEditor value={input} onChange={(v) => setInput(v)} language="json" height={450} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                {FORMATS[toFormat]} Output
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CodeEditor value={output} language="json" readOnly height={450} />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
