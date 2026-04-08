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
import { copyToClipboard, downloadFile } from '../../utils/file';

type UuidVersion = 'v4' | 'v7';

function generateUUIDv4(): string {
  return crypto.randomUUID();
}

function generateUUIDv7(): string {
  const timestamp = Date.now();
  const timeHex = timestamp.toString(16).padStart(12, '0');
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  const raw =
    timeHex.slice(0, 8) +
    timeHex.slice(8, 12) +
    '7' +
    hex.slice(0, 3) +
    ((parseInt(hex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) +
    hex.slice(4, 7) +
    hex.slice(7, 19);
  return (
    raw.slice(0, 8) +
    '-' +
    raw.slice(8, 12) +
    '-' +
    raw.slice(12, 16) +
    '-' +
    raw.slice(16, 20) +
    '-' +
    raw.slice(20, 32)
  );
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
    const gen = version === 'v4' ? generateUUIDv4 : generateUUIDv7;
    const results = Array.from({ length: Math.min(count, 500) }, () => gen());
    setUuids(uppercase ? results.map((u) => u.toUpperCase()) : results);
  }, [version, count, uppercase]);

  const handleCopyAll = async () => {
    const ok = await copyToClipboard(uuids.join('\n'));
    enqueueSnackbar(ok ? 'Copied all UUIDs' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleCopyOne = async (uuid: string) => {
    const ok = await copyToClipboard(uuid);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleDownload = () => {
    downloadFile('uuids.txt', uuids.join('\n'), 'text/plain');
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
            onChange={(_, v) => v && setVersion(v)}
            size="small"
          >
            <ToggleButton value="v4">UUID v4</ToggleButton>
            <ToggleButton value="v7">UUID v7</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Count"
            type="number"
            size="small"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            sx={{ width: 100 }}
            slotProps={{ input: { inputProps: { min: 1, max: 500 } } }}
          />

          <ToggleButtonGroup
            value={uppercase ? 'upper' : 'lower'}
            exclusive
            onChange={(_, v) => v && setUppercase(v === 'upper')}
            size="small"
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
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
                <IconButton size="small" onClick={() => setUuids([])}>
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
                    }}
                  >
                    {uuid}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={() => handleCopyOne(uuid)} sx={{ color: 'text.secondary' }}>
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
