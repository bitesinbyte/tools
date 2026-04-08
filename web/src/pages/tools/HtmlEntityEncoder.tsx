import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

type Mode = 'encode' | 'decode';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '\u00A0': '&nbsp;',
  '\u00A9': '&copy;',
  '\u00AE': '&reg;',
  '\u2122': '&trade;',
  '\u2013': '&ndash;',
  '\u2014': '&mdash;',
  '\u2018': '&lsquo;',
  '\u2019': '&rsquo;',
  '\u201C': '&ldquo;',
  '\u201D': '&rdquo;',
  '\u2026': '&hellip;',
};

function encodeHtmlEntities(text: string): string {
  let result = '';
  for (const char of text) {
    if (HTML_ENTITIES[char]) {
      result += HTML_ENTITIES[char];
    } else if (char.charCodeAt(0) > 127) {
      result += `&#${char.charCodeAt(0)};`;
    } else {
      result += char;
    }
  }
  return result;
}

function decodeHtmlEntities(text: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

export default function HtmlEntityEncoder() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const convert = useCallback((text: string, currentMode: Mode) => {
    if (!text.trim()) {
      setOutput('');
      setError('');
      return;
    }
    try {
      setOutput(currentMode === 'encode' ? encodeHtmlEntities(text) : decodeHtmlEntities(text));
      setError('');
    } catch (e) {
      setOutput('');
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    convert(input, mode);
  }, [input, mode, convert]);

  const handleSwap = () => {
    setInput(output);
    setMode((prev) => (prev === 'encode' ? 'decode' : 'encode'));
  };

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
        title="HTML Entity Encoder - BitesInByte Tools"
        description="Encode and decode HTML entities. Convert special characters to HTML entities and back. Free online tool."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>HTML Entity Encoder</Typography>
          <Typography variant="body2" color="text.secondary">
            Encode special characters to HTML entities or decode entities back to characters.
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
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
          >
            <ToggleButton value="encode">Encode</ToggleButton>
            <ToggleButton value="decode">Decode</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Chip label={error} color="error" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Input</Typography>
                <Tooltip title="Paste">
                  <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
                    <ContentPasteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear">
                  <IconButton size="small" onClick={() => setInput('')} disabled={!input} sx={{ color: 'text.secondary' }}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                multiline
                rows={14}
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'encode' ? 'Type text with special characters...' : 'Paste HTML entities here...'}
                variant="standard"
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: {
                      px: 2,
                      py: 1.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                    },
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Tooltip title="Swap input and output">
                <span>
                  <IconButton
                    onClick={handleSwap}
                    disabled={!output}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      p: 1.5,
                      color: 'text.secondary',
                      '&:hover': { borderColor: 'text.secondary' },
                    }}
                  >
                    <SwapHorizIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Grid>

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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Result</Typography>
                <Tooltip title="Copy result">
                  <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                multiline
                rows={14}
                fullWidth
                value={output}
                slotProps={{
                  input: {
                    readOnly: true,
                    disableUnderline: true,
                    sx: {
                      px: 2,
                      py: 1.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                    },
                  },
                }}
                variant="standard"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Reference */}
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
            Common HTML Entities
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(HTML_ENTITIES).slice(0, 12).map(([char, entity]) => (
              <Chip
                key={entity}
                label={`${entity} = ${char === ' ' ? '(space)' : char}`}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
