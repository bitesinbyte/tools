import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Stack,
  Tabs,
  Tab,
  TextField,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Box,
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

function useCodec() {
  const base64 = {
    encode: (s: string) => btoa(unescape(encodeURIComponent(s))),
    decode: (s: string) => decodeURIComponent(escape(atob(s))),
  };

  const url = {
    encode: (s: string) => encodeURIComponent(s),
    decode: (s: string) => decodeURIComponent(s),
  };

  const html = {
    encode: (s: string) => {
      const el = document.createElement('div');
      el.textContent = s;
      return el.innerHTML;
    },
    decode: (s: string) => {
      const el = document.createElement('div');
      el.innerHTML = s;
      return el.textContent ?? '';
    },
  };

  const hash = {
    encode: async (s: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(s);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    },
    decode: () => {
      throw new Error('Hash functions are one-way and cannot be decoded');
    },
  };

  return { base64, url, html, hash };
}

const tabLabels = ['Base64', 'URL', 'HTML', 'SHA-256'] as const;
type TabKey = 'base64' | 'url' | 'html' | 'hash';
const tabKeys: TabKey[] = ['base64', 'url', 'html', 'hash'];

export default function EncodeDecode() {
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const codecs = useCodec();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isHashTab = tabKeys[tab] === 'hash';

  const convert = useCallback(
    async (text: string, currentMode: Mode, currentTab: number) => {
      if (!text.trim()) {
        setOutput('');
        setError('');
        return;
      }
      try {
        const codec = codecs[tabKeys[currentTab]];
        const result = currentMode === 'encode' ? await codec.encode(text) : codec.decode(text);
        setOutput(result);
        setError('');
      } catch (e) {
        setOutput('');
        setError((e as Error).message);
      }
    },
    // codecs is recreated every render but its functions are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Real-time conversion
  useEffect(() => {
    convert(input, mode, tab);
  }, [input, mode, tab, convert]);

  const handleTabChange = (_: unknown, newTab: number) => {
    setTab(newTab);
    // If switching to hash tab, force encode mode
    if (tabKeys[newTab] === 'hash') {
      setMode('encode');
    }
  };

  const handleSwap = () => {
    if (isHashTab) return;
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
        title="Encode / Decode - BitesInByte Tools"
        description="Encode and decode strings in Base64, URL, HTML, and SHA-256 formats. Free online encoder/decoder."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Encode / Decode</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time encoding and decoding. Results update as you type.
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
          <Tabs
            value={tab}
            onChange={handleTabChange}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0.5 },
            }}
          >
            {tabLabels.map((label) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            disabled={isHashTab}
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
                  <IconButton
                    size="small"
                    onClick={() => setInput('')}
                    disabled={!input}
                    sx={{ color: 'text.secondary' }}
                  >
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
                placeholder="Type or paste text here..."
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

          {/* Swap button */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Tooltip title={isHashTab ? 'Hash is one-way' : 'Swap input and output'}>
                <span>
                  <IconButton
                    onClick={handleSwap}
                    disabled={isHashTab || !output}
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
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    disabled={!output}
                    sx={{ color: 'text.secondary' }}
                  >
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
      </Stack>
    </>
  );
}
