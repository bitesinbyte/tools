import { useState, useCallback } from 'react';
import { Button, Typography, Stack, Box, Chip, Tooltip, IconButton, alpha, useTheme } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import CompressIcon from '@mui/icons-material/Compress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile, readFileAsText } from '../../utils/file';

type JsonStatsValid = { valid: true; type: string; keys: number; size: number };
type JsonStatsInvalid = { valid: false; error: string };
type JsonStats = JsonStatsValid | JsonStatsInvalid;

function getJsonStats(value: string): JsonStats | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
    const isArray = Array.isArray(parsed);
    const size = new Blob([value]).size;
    return {
      valid: true as const,
      type: isArray ? 'Array' : typeof parsed === 'object' && parsed !== null ? 'Object' : typeof parsed,
      keys: isArray ? parsed.length : keys,
      size,
    };
  } catch (e) {
    return { valid: false as const, error: (e as Error).message };
  }
}

export default function JsonFormatter() {
  const [value, setValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const stats = getJsonStats(value);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
      enqueueSnackbar('Formatted JSON', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Invalid JSON: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed));
      enqueueSnackbar('Minified JSON', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Invalid JSON: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied to clipboard' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
    } catch {
      enqueueSnackbar('Failed to paste from clipboard', { variant: 'error' });
    }
  };

  const handleClear = () => {
    setValue('');
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setValue(text);
      enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to read file', { variant: 'error' });
    }
    e.target.value = '';
  }, [enqueueSnackbar]);

  const handleDownload = () => {
    downloadFile('formatted.json', value, 'application/json');
    enqueueSnackbar('File downloaded', { variant: 'success' });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <PageHead
        title="JSON Formatter & Validator - BitesInByte Tools"
        description="Format, validate, minify, and beautify JSON online with syntax highlighting. Free browser-based JSON formatter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>JSON Formatter & Validator</Typography>
          <Typography variant="body2" color="text.secondary">
            Paste or upload JSON to format, minify, and validate instantly.
          </Typography>
        </Box>

        {/* Toolbar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Button variant="contained" size="small" startIcon={<FormatAlignLeftIcon />} onClick={handleFormat}>
            Format
          </Button>
          <Button variant="outlined" size="small" startIcon={<CompressIcon />} onClick={handleMinify}>
            Minify
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste from clipboard">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" onClick={handleCopy} disabled={!value} sx={{ color: 'text.secondary' }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={handleClear} disabled={!value} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 0.5 }} />

          <Tooltip title="Upload JSON file">
            <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
              <FileUploadIcon fontSize="small" />
              <input type="file" hidden accept=".json,.txt" onChange={handleUpload} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download JSON file">
            <IconButton size="small" onClick={handleDownload} disabled={!value} sx={{ color: 'text.secondary' }}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status bar */}
        {value.trim() && stats && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {stats.valid ? (
              <>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Valid JSON"
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip label={`Type: ${stats.type}`} size="small" variant="outlined" />
                <Chip
                  label={`${stats.type === 'Array' ? 'Items' : 'Keys'}: ${stats.keys}`}
                  size="small"
                  variant="outlined"
                />
                <Chip label={formatBytes(stats.size)} size="small" variant="outlined" />
              </>
            ) : (
              <Chip
                icon={<ErrorIcon />}
                label={`Invalid: ${stats.error}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        )}

        <CodeEditor value={value} onChange={setValue} language="json" height={500} />
      </Stack>
    </>
  );
}
