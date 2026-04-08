import { useState, useEffect, useRef } from 'react';
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
  const [input, setInput] = useState('https://tools.bitesinbyte.com');
  const [size, setSize] = useState(256);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (!input.trim()) {
      setDataUrl('');
      setError('');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(
      canvas,
      input,
      {
        width: size,
        margin: 2,
        color: {
          dark: isDark ? '#ffffff' : '#000000',
          light: isDark ? '#18181b' : '#ffffff',
        },
      },
      (err) => {
        if (err) {
          setError(err.message);
          setDataUrl('');
        } else {
          setError('');
          setDataUrl(canvas.toDataURL('image/png'));
        }
      }
    );
  }, [input, size, isDark]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'qrcode.png';
    link.click();
  };

  const handleCopyDataUrl = async () => {
    const ok = await copyToClipboard(dataUrl);
    enqueueSnackbar(ok ? 'Copied data URL' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="QR Code Generator - BitesInByte Tools"
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
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text or URL..."
                error={!!error}
                helperText={error}
                slotProps={{
                  input: {
                    endAdornment: input ? (
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => setInput('')}>
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
                  onChange={(_, v) => setSize(v as number)}
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

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  disabled={!dataUrl}
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyDataUrl}
                  disabled={!dataUrl}
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
              <canvas
                ref={canvasRef}
                style={{
                  display: input.trim() ? 'block' : 'none',
                  borderRadius: 8,
                }}
              />
              {!input.trim() && (
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
