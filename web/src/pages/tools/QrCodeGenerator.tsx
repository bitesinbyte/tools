import { useState, useEffect } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Button,
  Slider,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
  Grid,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';
import QRCode from 'qrcode';

export default function QrCodeGenerator() {
  const [input, setInput] = useState('https://tools.lamplitlabs.com');
  const [size, setSize] = useState(256);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (!input.trim()) return;
    let cancelled = false;
    QRCode.toDataURL(input, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Failed to generate QR code');
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [input, size]);

  const handleInputChange = (value: string) => {
    setInput(value);
    setDataUrl('');
    setError('');
    setIsGenerating(!!value.trim());
  };

  const handleSizeChange = (value: number) => {
    setSize(value);
    setDataUrl('');
    setError('');
    setIsGenerating(!!input.trim());
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyDataUrl = async () => {
    const ok = await copyToClipboard(dataUrl);
    enqueueSnackbar(ok ? 'Copied data URL' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="QR Code Generator - Lamplit Labs Tools"
        description="Generate QR codes from text or URLs with customizable size. Free online QR code generator."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>QR Code Generator</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate QR codes from text or URLs. Download as PNG.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <TextField
                label="Content"
                fullWidth
                multiline
                rows={4}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter text or URL..."
                error={!!error}
                helperText={error}
                slotProps={{
                  input: {
                    endAdornment: input ? (
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => handleInputChange('')} aria-label="Clear QR content">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : undefined,
                    sx: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />

              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Size: {size}px
                </Typography>
                <Slider
                  value={size}
                  onChange={(_, v) => handleSizeChange(v as number)}
                  aria-label="QR code size"
                  min={128}
                  max={512}
                  step={32}
                  valueLabelDisplay="auto"
                />
              </Box>

              {input.trim() && !error && (
                <Chip
                  label={`${input.length} characters`}
                  variant="outlined"
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  disabled={!dataUrl || isGenerating}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyDataUrl}
                  disabled={!dataUrl || isGenerating}
                >
                  Copy Data URL
                </Button>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 3,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                minHeight: 300,
              }}
            >
              {dataUrl && (
                <img
                  src={dataUrl}
                  alt="Generated QR code"
                  width={size}
                  height={size}
                  style={{
                    display: 'block',
                    borderRadius: 8,
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              )}
              {isGenerating && (
                <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Generating QR code…
                </Typography>
              )}
              {!input.trim() && !isGenerating && (
                <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  Enter text to generate a QR code
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
