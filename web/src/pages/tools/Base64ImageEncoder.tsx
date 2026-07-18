import { useEffect, useState, useRef } from 'react';
import {
  Typography,
  Stack,
  Box,
  Button,
  Alert,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

function decodeImageBase64(value: string): { blob: Blob; mimeType: string } {
  const trimmed = value.trim();
  let mimeType = '';
  let payload = trimmed;

  if (trimmed.toLowerCase().startsWith('data:')) {
    const match = /^data:([^;,]+)(?:;[^,]*)*;base64,([\s\S]*)$/i.exec(trimmed);
    if (!match) throw new Error('Data URI must contain Base64-encoded image data');
    mimeType = match[1].toLowerCase();
    payload = match[2];
  }
  if (mimeType && !/^image\/[a-z0-9.+-]+$/i.test(mimeType)) {
    throw new Error('Only image data URIs are supported');
  }

  const compact = payload.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) {
    throw new Error('Invalid Base64 image data');
  }
  const unpadded = compact.replace(/=+$/, '');
  const binary = atob(unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  mimeType ||= detectImageMimeType(bytes);
  if (!mimeType) {
    throw new Error('Raw Base64 data must contain a recognizable image format');
  }
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

function detectImageMimeType(bytes: Uint8Array): string {
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (new TextDecoder().decode(bytes.subarray(0, 6)).match(/^GIF8[79]a$/)) return 'image/gif';
  if (
    new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'
  ) return 'image/webp';
  if (
    new TextDecoder().decode(bytes.subarray(4, 8)) === 'ftyp'
    && /^(?:avif|avis)$/.test(new TextDecoder().decode(bytes.subarray(8, 12)))
  ) return 'image/avif';
  if (startsWith(0x42, 0x4d)) return 'image/bmp';
  if (startsWith(0x00, 0x00, 0x01, 0x00)) return 'image/x-icon';
  const prefix = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (/^(?:<\?xml[\s\S]*?\?>\s*)?<svg(?:\s|>)/i.test(prefix)) return 'image/svg+xml';
  return '';
}

function extensionForMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
  };
  return extensions[mimeType] ?? 'img';
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Base64ImageEncoder() {
  const [tab, setTab] = useState(0); // 0 = Image to Base64, 1 = Base64 to Image
  const [base64Output, setBase64Output] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageInfo, setImageInfo] = useState('');
  const [decodedBlob, setDecodedBlob] = useState<Blob | null>(null);
  const [decodedMimeType, setDecodedMimeType] = useState('image/png');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReaderRef = useRef<FileReader | null>(null);
  const decodedUrlRef = useRef('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const clearDecodedUrl = () => {
    if (decodedUrlRef.current) {
      URL.revokeObjectURL(decodedUrlRef.current);
      decodedUrlRef.current = '';
    }
  };

  useEffect(() => () => {
    if (decodedUrlRef.current) URL.revokeObjectURL(decodedUrlRef.current);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please select an image file', { variant: 'error' });
      e.target.value = '';
      return;
    }
    setError('');
    setImageName(file.name);
    setImageInfo(`${file.type} | ${(file.size / 1024).toFixed(1)} KB`);
    fileReaderRef.current?.abort();
    const reader = new FileReader();
    fileReaderRef.current = reader;
    reader.onload = () => {
      if (fileReaderRef.current !== reader) return;
      const dataUrl = reader.result as string;
      setBase64Output(dataUrl);
      setImagePreview(dataUrl);
      fileReaderRef.current = null;
    };
    reader.onerror = () => {
      if (fileReaderRef.current !== reader) return;
      setBase64Output('');
      setImagePreview('');
      setImageName('');
      setImageInfo('');
      enqueueSnackbar('Failed to read image file', { variant: 'error' });
      fileReaderRef.current = null;
    };
    reader.onabort = () => {
      if (fileReaderRef.current === reader) fileReaderRef.current = null;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBase64InputChange = (value: string) => {
    setBase64Input(value);
    clearDecodedUrl();
    setDecodedBlob(null);
    if (!value.trim()) {
      setImagePreview('');
      setError('');
      return;
    }
    try {
      const decoded = decodeImageBase64(value);
      const url = URL.createObjectURL(decoded.blob);
      decodedUrlRef.current = url;
      setDecodedBlob(decoded.blob);
      setDecodedMimeType(decoded.mimeType);
      setImagePreview(url);
      setError('');
    } catch (decodeError) {
      setImagePreview('');
      setError((decodeError as Error).message);
    }
  };

  const handleCopyBase64 = async () => {
    const ok = await copyToClipboard(base64Output);
    enqueueSnackbar(ok ? 'Copied Base64' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleDownloadBase64 = () => {
    try {
      downloadBlob(
        'image-base64.txt',
        new Blob([base64Output], { type: 'text/plain;charset=utf-8' }),
      );
    } catch {
      enqueueSnackbar('Failed to download Base64 text', { variant: 'error' });
    }
  };

  const handleDownloadImage = () => {
    if (!decodedBlob || tab !== 1) return;
    try {
      downloadBlob(`decoded-image.${extensionForMimeType(decodedMimeType)}`, decodedBlob);
    } catch {
      enqueueSnackbar('Failed to download image', { variant: 'error' });
    }
  };

  const handleClear = () => {
    fileReaderRef.current?.abort();
    fileReaderRef.current = null;
    clearDecodedUrl();
    setBase64Output('');
    setBase64Input('');
    setImagePreview('');
    setImageName('');
    setImageInfo('');
    setDecodedBlob(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <PageHead
        title="Base64 Image Encoder - BitesInByte Tools"
        description="Convert images to/from Base64 data URIs. Free online Base64 image encoder and decoder."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Base64 Image Encoder</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert images to Base64 data URIs, or decode Base64 strings back to images.
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
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); handleClear(); }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Base64 image operation"
            sx={{ minHeight: 36, maxWidth: '100%', '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
          >
            <Tab label="Image to Base64" />
            <Tab label="Base64 to Image" />
          </Tabs>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Clear">
            <IconButton size="small" onClick={handleClear} aria-label="Clear">
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {tab === 0 && (
          <>
            {/* Drop zone */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Select an image file"
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01) },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">Click to select an image file</Typography>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileUpload} />
            </Box>

            {imageName && (
              <Chip label={`${imageName} | ${imageInfo}`} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
            )}

            {imagePreview && (
              <Box sx={{ textAlign: 'center' }}>
                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
              </Box>
            )}

            {base64Output && (
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
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
                  <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Base64 Output</Typography>
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={handleCopyBase64} aria-label="Copy Base64 output" sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={handleDownloadBase64}
                      aria-label="Download Base64 text"
                      sx={{ color: 'text.secondary' }}
                    >
                      <DownloadIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  multiline
                  rows={8}
                  fullWidth
                  value={base64Output}
                  variant="standard"
                  slotProps={{
                    input: {
                      readOnly: true,
                      disableUnderline: true,
                      sx: {
                        px: 2,
                        py: 1.5,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.75rem',
                        wordBreak: 'break-all',
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Base64 Input</Typography>
              </Box>
              <TextField
                multiline
                rows={8}
                fullWidth
                value={base64Input}
                onChange={(e) => handleBase64InputChange(e.target.value)}
                placeholder="Paste a Base64 string or data URI here..."
                variant="standard"
                aria-label="Base64 image input"
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: {
                      px: 2,
                      py: 1.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                    },
                  },
                }}
              />
            </Box>

            {imagePreview && base64Input && (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Decoded"
                  style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                  onError={() => {
                    clearDecodedUrl();
                    setImagePreview('');
                    setDecodedBlob(null);
                    setError('Decoded data is not a supported image');
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  <Button size="small" startIcon={<DownloadIcon />} onClick={handleDownloadImage}>
                    Download Image
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Stack>
    </>
  );
}
