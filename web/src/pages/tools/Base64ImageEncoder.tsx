import { useState, useRef } from 'react';
import {
  Typography,
  Stack,
  Box,
  Button,
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
import { copyToClipboard, downloadFile } from '../../utils/file';

export default function Base64ImageEncoder() {
  const [tab, setTab] = useState(0); // 0 = Image to Base64, 1 = Base64 to Image
  const [base64Output, setBase64Output] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageInfo, setImageInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please select an image file', { variant: 'error' });
      return;
    }
    setImageName(file.name);
    setImageInfo(`${file.type} | ${(file.size / 1024).toFixed(1)} KB`);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBase64Output(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBase64InputChange = (value: string) => {
    setBase64Input(value);
    if (!value.trim()) {
      setImagePreview('');
      return;
    }
    // Try to render as image
    let src = value.trim();
    if (!src.startsWith('data:')) {
      src = `data:image/png;base64,${src}`;
    }
    setImagePreview(src);
  };

  const handleCopyBase64 = async () => {
    const ok = await copyToClipboard(base64Output);
    enqueueSnackbar(ok ? 'Copied Base64' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleDownloadImage = () => {
    if (!imagePreview || tab !== 1) return;
    // Convert data URL to downloadable
    const link = document.createElement('a');
    link.href = imagePreview;
    link.download = 'decoded-image.png';
    link.click();
  };

  const handleClear = () => {
    setBase64Output('');
    setBase64Input('');
    setImagePreview('');
    setImageName('');
    setImageInfo('');
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
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
          >
            <Tab label="Image to Base64" />
            <Tab label="Base64 to Image" />
          </Tabs>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Clear">
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {tab === 0 && (
          <>
            {/* Drop zone */}
            <Box
              onClick={() => fileInputRef.current?.click()}
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
                    <IconButton size="small" onClick={handleCopyBase64} sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => downloadFile('image-base64.txt', base64Output, 'text/plain')}
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
                  onError={() => setImagePreview('')}
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
