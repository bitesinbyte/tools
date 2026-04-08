import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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
import yaml from 'js-yaml';

type Direction = 'json-to-yaml' | 'yaml-to-json';

function detectFormat(text: string): 'json' | 'yaml' | 'unknown' {
  const trimmed = text.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  try {
    JSON.parse(trimmed);
    return 'json';
  } catch {
    // Not JSON, check YAML
  }
  try {
    const parsed = yaml.load(trimmed);
    if (typeof parsed === 'object' && parsed !== null) return 'yaml';
  } catch {
    // Not valid YAML either
  }
  return 'unknown';
}

export default function JsonYamlConverter() {
  const [input, setInput] = useState('');
  const [direction, setDirection] = useState<Direction>('json-to-yaml');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const inputLang = direction === 'json-to-yaml' ? 'json' : 'yaml';
  const outputLang = direction === 'json-to-yaml' ? 'yaml' : 'json';

  // Derived state: compute output from input + direction
  const { output, error } = useMemo(() => {
    if (!input.trim()) {
      return { output: '', error: '' };
    }
    try {
      if (direction === 'json-to-yaml') {
        const parsed = JSON.parse(input);
        return { output: yaml.dump(parsed, { indent: 2, lineWidth: -1, noRefs: true }), error: '' };
      } else {
        const parsed = yaml.load(input);
        return { output: JSON.stringify(parsed, null, 2), error: '' };
      }
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, direction]);

  const handleSwap = () => {
    const newDir: Direction = direction === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
    setDirection(newDir);
    if (output) {
      setInput(output);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      // Auto-detect format and set direction
      const fmt = detectFormat(text);
      if (fmt === 'json') setDirection('json-to-yaml');
      else if (fmt === 'yaml') setDirection('yaml-to-json');
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setInput(text);
      const fmt = detectFormat(text);
      if (fmt === 'json') setDirection('json-to-yaml');
      else if (fmt === 'yaml') setDirection('yaml-to-json');
      enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to read file', { variant: 'error' });
    }
    e.target.value = '';
  };

  const handleDownload = () => {
    const ext = outputLang === 'json' ? 'json' : 'yaml';
    downloadFile(`converted.${ext}`, output, 'text/plain');
    enqueueSnackbar('File downloaded', { variant: 'success' });
  };

  return (
    <>
      <PageHead
        title="JSON / YAML Converter - BitesInByte Tools"
        description="Convert between JSON and YAML formats instantly with real-time conversion and auto-detection."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>JSON / YAML Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time bidirectional conversion. Auto-detects format when you paste.
          </Typography>
        </Box>

        {/* Controls bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <ToggleButtonGroup
            value={direction}
            exclusive
            onChange={(_, v) => v && setDirection(v)}
            size="small"
          >
            <ToggleButton value="json-to-yaml">JSON &rarr; YAML</ToggleButton>
            <ToggleButton value="yaml-to-json">YAML &rarr; JSON</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Swap direction & use output as input">
            <IconButton size="small" onClick={handleSwap} sx={{ color: 'text.secondary' }}>
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste from clipboard">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload file">
            <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
              <FileUploadIcon fontSize="small" />
              <input type="file" hidden accept=".json,.yaml,.yml,.txt" onChange={handleUpload} />
            </IconButton>
          </Tooltip>

          <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 0.5, height: 24 }} />

          <Tooltip title="Copy result">
            <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download result">
            <IconButton
              size="small"
              onClick={handleDownload}
              disabled={!output}
              sx={{ color: 'text.secondary' }}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear all">
            <IconButton
              size="small"
              onClick={() => { setInput(''); }}
              disabled={!input && !output}
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status */}
        {input.trim() && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {error ? (
              <Chip
                icon={<ErrorIcon />}
                label={error}
                size="small"
                color="error"
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<CheckCircleIcon />}
                label="Converted successfully"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Editor panels */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {inputLang.toUpperCase()} Input
            </Typography>
            <CodeEditor value={input} onChange={setInput} language={inputLang} height={480} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {outputLang.toUpperCase()} Output
            </Typography>
            <CodeEditor value={output} language={outputLang} readOnly height={480} />
          </Box>
        </Box>
      </Stack>
    </>
  );
}
