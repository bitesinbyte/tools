import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

interface UrlParts {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: [string, string][];
}

function parseUrl(input: string): UrlParts | null {
  try {
    const url = new URL(input);
    return {
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
      params: Array.from(url.searchParams.entries()),
    };
  } catch {
    return null;
  }
}

export default function UrlParser() {
  const [input, setInput] = useState('https://example.com:8080/path/to/page?name=John&age=30&tags=a&tags=b#section-1');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const parsed = useMemo(() => parseUrl(input), [input]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const parts = parsed
    ? [
        { label: 'Origin', value: parsed.origin },
        { label: 'Protocol', value: parsed.protocol },
        { label: 'Hostname', value: parsed.hostname },
        { label: 'Port', value: parsed.port || '(default)' },
        { label: 'Username', value: parsed.username || '(none)' },
        { label: 'Password', value: parsed.password || '(none)' },
        { label: 'Pathname', value: parsed.pathname },
        { label: 'Search', value: parsed.search || '(none)' },
        { label: 'Hash', value: parsed.hash || '(none)' },
      ]
    : [];

  return (
    <>
      <PageHead
        title="URL Parser - BitesInByte Tools"
        description="Parse and breakdown URL components including protocol, host, path, query params, and hash. Free online URL parser."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>URL Parser</Typography>
          <Typography variant="body2" color="text.secondary">
            Parse URLs into their component parts: protocol, host, path, query parameters, and fragment.
          </Typography>
        </Box>

        {/* Input */}
        <TextField
          label="URL"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://example.com/path?key=value#hash"
          error={!!input.trim() && !parsed}
          helperText={input.trim() && !parsed ? 'Invalid URL' : undefined}
          slotProps={{
            input: {
              endAdornment: (
                <>
                  <Tooltip title="Paste">
                    <IconButton size="small" onClick={handlePaste}>
                      <ContentPasteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {input && (
                    <Tooltip title="Clear">
                      <IconButton size="small" onClick={() => setInput('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ),
              sx: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.875rem',
              },
            },
          }}
        />

        {parsed && (
          <Chip label="Valid URL" color="success" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        {/* Components */}
        {parsed && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              URL Components
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              {parts.map((part, i) => (
                <Box
                  key={part.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < parts.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', minWidth: 80 }}>
                    {part.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {part.value}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={() => handleCopy(part.value)} sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Query Parameters */}
        {parsed && parsed.params.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Query Parameters ({parsed.params.length})
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              {parsed.params.map(([key, value], i) => (
                <Box
                  key={`${key}-${i}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < parsed.params.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      minWidth: 100,
                    }}
                  >
                    {key}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {value}
                  </Typography>
                  <Tooltip title="Copy value">
                    <IconButton size="small" onClick={() => handleCopy(value)} sx={{ color: 'text.secondary' }}>
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
