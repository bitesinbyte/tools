import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

export default function TimestampConverter() {
  const [unixInput, setUnixInput] = useState('');
  const [isoInput, setIsoInput] = useState('');
  const [now, setNow] = useState(Date.now());
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = useCallback(async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  }, [enqueueSnackbar]);

  // Unix -> dates
  const unixResult = useMemo(() => {
    if (!unixInput.trim()) return null;
    const num = Number(unixInput.trim());
    if (isNaN(num)) return { error: 'Invalid number' };
    // Auto-detect seconds vs milliseconds
    const ms = num > 1e12 ? num : num * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return { error: 'Invalid timestamp' };
    return {
      date,
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      relative: getRelativeTime(date),
    };
  }, [unixInput]);

  // ISO -> unix
  const isoResult = useMemo(() => {
    if (!isoInput.trim()) return null;
    const date = new Date(isoInput.trim());
    if (isNaN(date.getTime())) return { error: 'Invalid date string' };
    return {
      date,
      unix: Math.floor(date.getTime() / 1000),
      unixMs: date.getTime(),
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      relative: getRelativeTime(date),
    };
  }, [isoInput]);

  function getRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const abs = Math.abs(diff);
    const future = diff < 0;
    if (abs < 60000) return future ? 'in a few seconds' : 'a few seconds ago';
    if (abs < 3600000) {
      const mins = Math.floor(abs / 60000);
      return future ? `in ${mins} minute${mins > 1 ? 's' : ''}` : `${mins} minute${mins > 1 ? 's' : ''} ago`;
    }
    if (abs < 86400000) {
      const hrs = Math.floor(abs / 3600000);
      return future ? `in ${hrs} hour${hrs > 1 ? 's' : ''}` : `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(abs / 86400000);
    return future ? `in ${days} day${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
  }

  const currentDate = new Date(now);

  return (
    <>
      <PageHead
        title="Timestamp Converter - BitesInByte Tools"
        description="Convert between Unix timestamps, ISO 8601, and human-readable dates. Free online timestamp converter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Timestamp Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert between Unix timestamps, ISO 8601, and human-readable date formats.
          </Typography>
        </Box>

        {/* Current time */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Time
          </Typography>
          <Grid container spacing={2}>
            {[
              { label: 'Unix (s)', value: Math.floor(now / 1000).toString() },
              { label: 'Unix (ms)', value: now.toString() },
              { label: 'ISO 8601', value: currentDate.toISOString() },
              { label: 'Local', value: currentDate.toLocaleString() },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={() => handleCopy(item.value)} sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Grid container spacing={2}>
          {/* Unix to Date */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Unix Timestamp to Date</Typography>
                <Button
                  size="small"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => setUnixInput(Math.floor(Date.now() / 1000).toString())}
                >
                  Now
                </Button>
              </Box>
              <Box sx={{ p: 2 }}>
                <TextField
                  label="Unix Timestamp"
                  fullWidth
                  value={unixInput}
                  onChange={(e) => setUnixInput(e.target.value)}
                  placeholder="e.g., 1700000000 or 1700000000000"
                  size="small"
                  error={!!unixResult && 'error' in unixResult}
                  helperText={unixResult && 'error' in unixResult ? unixResult.error : 'Seconds or milliseconds'}
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.875rem',
                      },
                    },
                  }}
                />
                {unixResult && !('error' in unixResult) && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {[
                      { label: 'ISO 8601', value: unixResult.iso },
                      { label: 'UTC', value: unixResult.utc },
                      { label: 'Local', value: unixResult.local },
                      { label: 'Relative', value: unixResult.relative },
                    ].map((item) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
                          {item.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.8125rem',
                            flex: 1,
                          }}
                        >
                          {item.value}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => handleCopy(item.value)} sx={{ color: 'text.secondary' }}>
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Date to Unix */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Date to Unix Timestamp</Typography>
                <Button
                  size="small"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => setIsoInput(new Date().toISOString())}
                >
                  Now
                </Button>
              </Box>
              <Box sx={{ p: 2 }}>
                <TextField
                  label="Date String"
                  fullWidth
                  value={isoInput}
                  onChange={(e) => setIsoInput(e.target.value)}
                  placeholder="e.g., 2024-01-15T12:00:00Z"
                  size="small"
                  error={!!isoResult && 'error' in isoResult}
                  helperText={isoResult && 'error' in isoResult ? isoResult.error : 'ISO 8601 or any parseable date'}
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.875rem',
                      },
                    },
                  }}
                />
                {isoResult && !('error' in isoResult) && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {[
                      { label: 'Unix (s)', value: isoResult.unix.toString() },
                      { label: 'Unix (ms)', value: isoResult.unixMs.toString() },
                      { label: 'ISO 8601', value: isoResult.iso },
                      { label: 'Local', value: isoResult.local },
                      { label: 'Relative', value: isoResult.relative },
                    ].map((item) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
                          {item.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.8125rem',
                            flex: 1,
                          }}
                        >
                          {item.value}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => handleCopy(item.value)} sx={{ color: 'text.secondary' }}>
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Quick reference */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Common Timestamps
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              { label: 'Y2K', value: '946684800' },
              { label: 'Unix Epoch', value: '0' },
              { label: 'Max 32-bit', value: '2147483647' },
            ].map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                size="small"
                variant="outlined"
                onClick={() => setUnixInput(p.value)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
