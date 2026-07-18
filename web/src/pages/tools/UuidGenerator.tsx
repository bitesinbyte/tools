import { useState, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  Button,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

type UuidVersion = 'v4' | 'v7';

function generateUUIDv4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function generateUUIDv7(): string {
  const timestamp = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let time = timestamp;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function downloadText(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [uppercase, setUppercase] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const generate = useCallback(() => {
    try {
      const gen = version === 'v4' ? generateUUIDv4 : generateUUIDv7;
      const safeCount = Math.max(1, Math.min(500, Math.trunc(count)));
      const results = Array.from({ length: safeCount }, () => gen());
      setUuids(uppercase ? results.map((uuid) => uuid.toUpperCase()) : results);
    } catch {
      setUuids([]);
      enqueueSnackbar('Secure UUID generation is unavailable in this browser', { variant: 'error' });
    }
  }, [version, count, uppercase, enqueueSnackbar]);

  const handleCopyAll = async () => {
    const ok = await copyToClipboard(uuids.join('\n'));
    enqueueSnackbar(ok ? 'Copied all UUIDs' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleCopyOne = async (uuid: string) => {
    const ok = await copyToClipboard(uuid);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleDownload = () => {
    try {
      downloadText('uuids.txt', uuids.join('\n'));
    } catch {
      enqueueSnackbar('Failed to download UUIDs', { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="UUID Generator - BitesInByte Tools"
        description="Generate UUIDs v4 and v7 with bulk generation support. Free online UUID generator."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>UUID Generator</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate UUIDs in v4 (random) or v7 (time-ordered) format.
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
            value={version}
            exclusive
            onChange={(_, v) => {
              if (v) {
                setVersion(v);
                setUuids([]);
              }
            }}
            size="small"
            aria-label="UUID version"
          >
            <ToggleButton value="v4">UUID v4</ToggleButton>
            <ToggleButton value="v7">UUID v7</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Count"
            type="number"
            size="small"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(500, Math.trunc(Number(e.target.value) || 1))))}
            sx={{ width: 100 }}
            slotProps={{ input: { inputProps: { min: 1, max: 500 } } }}
          />

          <ToggleButtonGroup
            value={uppercase ? 'upper' : 'lower'}
            exclusive
            onChange={(_, v) => {
              if (v) {
                const nextUppercase = v === 'upper';
                setUppercase(nextUppercase);
                setUuids((current) => current.map((uuid) => (
                  nextUppercase ? uuid.toUpperCase() : uuid.toLowerCase()
                )));
              }
            }}
            size="small"
            aria-label="UUID letter case"
          >
            <ToggleButton value="lower">lowercase</ToggleButton>
            <ToggleButton value="upper">UPPERCASE</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="contained" startIcon={<RefreshIcon />} onClick={generate}>
            Generate
          </Button>
        </Box>

        {uuids.length > 0 && (
          <Chip
            label={`${uuids.length} UUID${uuids.length > 1 ? 's' : ''} generated`}
            color="success"
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Results */}
        {uuids.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', mb: 1, gap: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Results
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyAll}>
                Copy All
              </Button>
              <Button size="small" onClick={handleDownload}>
                Download
              </Button>
              <Tooltip title="Clear">
                <IconButton size="small" onClick={() => setUuids([])} aria-label="Clear UUIDs">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {uuids.map((uuid, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1,
                    borderBottom: i < uuids.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      fontWeight: 600,
                      minWidth: 28,
                    }}
                  >
                    {i + 1}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.875rem',
                      flex: 1,
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {uuid}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyOne(uuid)}
                      aria-label={`Copy UUID ${i + 1}`}
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
