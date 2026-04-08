import { useState, useCallback } from 'react';
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
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Variable {
  name: string;
  value: string;
}

const DEFAULT_MESSAGES: Message[] = [
  {
    id: crypto.randomUUID(),
    role: 'system',
    content: 'You are a helpful assistant that specializes in {{topic}}. Always respond in {{language}}.',
  },
  {
    id: crypto.randomUUID(),
    role: 'user',
    content: 'Explain {{concept}} to me like I\'m a {{level}} developer.',
  },
];

const DEFAULT_VARS: Variable[] = [
  { name: 'topic', value: 'web development' },
  { name: 'language', value: 'English' },
  { name: 'concept', value: 'closures in JavaScript' },
  { name: 'level', value: 'junior' },
];

const ROLE_COLORS: Record<string, string> = {
  system: '#ef4444',
  user: '#3b82f6',
  assistant: '#22c55e',
};

function renderTemplate(content: string, vars: Variable[]): string {
  let result = content;
  for (const v of vars) {
    result = result.replaceAll(`{{${v.name}}}`, v.value);
  }
  return result;
}

function extractVariables(messages: Message[]): string[] {
  const all = messages.map((m) => m.content).join(' ');
  const matches = all.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export default function PromptTemplateEditor() {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [variables, setVariables] = useState<Variable[]>(DEFAULT_VARS);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const detectedVars = extractVariables(messages);
  const missingVars = detectedVars.filter((v) => !variables.find((vr) => vr.name === v));

  const addMessage = (role: Message['role']) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content: '' }]);
  };

  const updateMessage = (id: string, field: 'role' | 'content', value: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const addVariable = useCallback((name = '') => {
    setVariables((prev) => [...prev, { name, value: '' }]);
  }, []);

  const updateVariable = (index: number, field: 'name' | 'value', value: string) => {
    setVariables((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const rendered = messages.map((m) => ({
    role: m.role,
    content: renderTemplate(m.content, variables),
  }));

  const handleCopyJson = async () => {
    const ok = await copyToClipboard(JSON.stringify(rendered, null, 2));
    enqueueSnackbar(ok ? 'Copied JSON' : 'Failed', { variant: ok ? 'success' : 'error' });
  };

  const handleExport = () => {
    const data = { messages: messages.map(({ role, content }) => ({ role, content })), variables };
    downloadFile('prompt-template.json', JSON.stringify(data, null, 2), 'application/json');
  };

  return (
    <>
      <PageHead
        title="Prompt Template Editor - BitesInByte Tools"
        description="Design and edit system/user/assistant prompt templates with variables. Free online prompt editor."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Prompt Template Editor</Typography>
          <Typography variant="body2" color="text.secondary">
            {'Design prompt templates with {{variables}}. Preview the rendered output in real time.'}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Messages editor */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                  Messages ({messages.length})
                </Typography>
                <Button size="small" onClick={() => addMessage('system')}>+ System</Button>
                <Button size="small" onClick={() => addMessage('user')}>+ User</Button>
                <Button size="small" onClick={() => addMessage('assistant')}>+ Assistant</Button>
              </Box>

              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    borderLeft: 3,
                    borderLeftColor: ROLE_COLORS[msg.role],
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 0.75,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                    }}
                  >
                    <select
                      value={msg.role}
                      onChange={(e) => updateMessage(msg.id, 'role', e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: ROLE_COLORS[msg.role],
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="system">System</option>
                      <option value="user">User</option>
                      <option value="assistant">Assistant</option>
                    </select>
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => removeMessage(msg.id)} sx={{ color: 'text.secondary' }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    value={msg.content}
                    onChange={(e) => updateMessage(msg.id, 'content', e.target.value)}
                    placeholder={`Enter ${msg.role} message...`}
                    variant="standard"
                    slotProps={{
                      input: {
                        disableUnderline: true,
                        sx: {
                          px: 2,
                          py: 1,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.8125rem',
                        },
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Grid>

          {/* Variables panel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                  Variables ({variables.length})
                </Typography>
                <Tooltip title="Add variable">
                  <IconButton size="small" onClick={() => addVariable()}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {missingVars.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {missingVars.map((v) => (
                    <Chip
                      key={v}
                      label={`+ ${v}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      onClick={() => addVariable(v)}
                      sx={{ cursor: 'pointer', fontSize: '0.6875rem' }}
                    />
                  ))}
                </Box>
              )}

              {variables.map((v, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={v.name}
                    onChange={(e) => updateVariable(i, 'name', e.target.value)}
                    placeholder="name"
                    sx={{ width: 120 }}
                    slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
                  />
                  <TextField
                    size="small"
                    value={v.value}
                    onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    placeholder="value"
                    fullWidth
                    slotProps={{ input: { sx: { fontSize: '0.8125rem' } } }}
                  />
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => removeVariable(i)}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyJson}>
                  Copy JSON
                </Button>
                <Button size="small" variant="outlined" onClick={handleExport}>
                  Export Template
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<ClearIcon />} onClick={() => { setMessages([]); setVariables([]); }}>
                  Clear All
                </Button>
              </Box>

              {/* Preview */}
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rendered Preview
                </Typography>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 400, overflow: 'auto' }}>
                  {rendered.map((msg, i) => (
                    <Box
                      key={i}
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderBottom: i < rendered.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02) },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: ROLE_COLORS[msg.role],
                          mb: 0.5,
                        }}
                      >
                        {msg.role}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                      >
                        {msg.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
