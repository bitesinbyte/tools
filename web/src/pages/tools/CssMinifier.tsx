import { useState, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme,
} from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import CompressIcon from '@mui/icons-material/Compress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile, readFileAsText } from '../../utils/file';

type IndentSize = '2' | '4';

function minifyCss(css: string): string {
  let result = css;
  // Remove comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove newlines and carriage returns
  result = result.replace(/[\r\n]+/g, '');
  // Collapse multiple spaces to one
  result = result.replace(/\s{2,}/g, ' ');
  // Remove spaces around { } : ; ,
  result = result.replace(/\s*\{\s*/g, '{');
  result = result.replace(/\s*\}\s*/g, '}');
  result = result.replace(/\s*;\s*/g, ';');
  result = result.replace(/\s*:\s*/g, ':');
  result = result.replace(/\s*,\s*/g, ',');
  // Remove trailing semicolons before closing braces
  result = result.replace(/;}/g, '}');
  // Trim leading/trailing whitespace
  result = result.trim();
  return result;
}

function beautifyCss(css: string, indent: string): string {
  // First strip comments and normalise whitespace so we work from a clean slate
  let cleaned = css;
  // Preserve comments by not stripping them — just normalise whitespace
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, (match) => `/*COMMENT:${match}*/`);
  // Actually, for simplicity let's strip comments, normalise, then we won't re-add them.
  cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Normalise all whitespace
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.trim();

  if (!cleaned) return '';

  let result = '';
  let depth = 0;

  const addIndent = () => indent.repeat(depth);

  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (ch === '{') {
      // Ensure space before {
      result = result.trimEnd();
      result += ' {\n';
      depth++;
      i++;
      // Skip whitespace after {
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
    } else if (ch === '}') {
      // Remove trailing whitespace before }
      result = result.trimEnd();
      if (!result.endsWith('\n')) result += '\n';
      depth = Math.max(0, depth - 1);
      result += addIndent() + '}\n';
      i++;
      // Skip whitespace after }
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
      // Add blank line between rule blocks at top level
      if (depth === 0 && i < cleaned.length) {
        result += '\n';
      }
    } else if (ch === ';') {
      result += ';\n';
      i++;
      // Skip whitespace after ;
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
      // Add indent for next line if not closing brace
      if (i < cleaned.length && cleaned[i] !== '}') {
        result += addIndent();
      }
    } else if (ch === ':') {
      // Add colon with a space after it (for declarations)
      // But not for selectors like :hover, ::before — check if we're inside a rule
      if (depth > 0) {
        result += ': ';
      } else {
        result += ch;
      }
      i++;
      // Skip whitespace after :
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
    } else {
      // At the beginning of a line or after a newline, add indent
      if (result.endsWith('\n')) {
        result += addIndent();
      }
      result += ch;
      i++;
    }
  }

  // Clean up: remove trailing blank lines, ensure single newline at end
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trimEnd() + '\n';

  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CssMinifier() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState<IndentSize>('2');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const savings = inputSize > 0 ? ((1 - outputSize / inputSize) * 100).toFixed(1) : '0';

  const handleMinify = () => {
    if (!input.trim()) {
      enqueueSnackbar('Nothing to minify', { variant: 'warning' });
      return;
    }
    const result = minifyCss(input);
    setOutput(result);
    enqueueSnackbar('CSS minified', { variant: 'success' });
  };

  const handleBeautify = () => {
    if (!input.trim()) {
      enqueueSnackbar('Nothing to beautify', { variant: 'warning' });
      return;
    }
    const indent = indentSize === '2' ? '  ' : '    ';
    const result = beautifyCss(input, indent);
    setOutput(result);
    enqueueSnackbar('CSS beautified', { variant: 'success' });
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied to clipboard' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      enqueueSnackbar('Failed to paste from clipboard', { variant: 'error' });
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setInput(text);
      enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to read file', { variant: 'error' });
    }
    e.target.value = '';
  }, [enqueueSnackbar]);

  const handleDownload = () => {
    downloadFile('output.css', output, 'text/css');
    enqueueSnackbar('File downloaded', { variant: 'success' });
  };

  return (
    <>
      <PageHead
        title="CSS Minifier & Beautifier - BitesInByte Tools"
        description="Minify and beautify CSS online. Remove whitespace and comments or format CSS with proper indentation. Free browser-based CSS tool."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>CSS Minifier & Beautifier</Typography>
          <Typography variant="body2" color="text.secondary">
            Minify CSS to reduce file size or beautify it with proper indentation. No data leaves your browser.
          </Typography>
        </Box>

        {/* Toolbar */}
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
          <Button variant="contained" size="small" startIcon={<FormatAlignLeftIcon />} onClick={handleBeautify}>
            Beautify
          </Button>
          <Button variant="outlined" size="small" startIcon={<CompressIcon />} onClick={handleMinify}>
            Minify
          </Button>

          <ToggleButtonGroup
            value={indentSize}
            exclusive
            onChange={(_, v) => v && setIndentSize(v)}
            size="small"
            sx={{ ml: 1 }}
          >
            <ToggleButton value="2">2 spaces</ToggleButton>
            <ToggleButton value="4">4 spaces</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste from clipboard">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={handleClear} disabled={!input && !output} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 0.5 }} />

          <Tooltip title="Upload CSS file">
            <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
              <FileUploadIcon fontSize="small" />
              <input type="file" hidden accept=".css,.txt" onChange={handleUpload} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download output as CSS">
            <IconButton size="small" onClick={handleDownload} disabled={!output} sx={{ color: 'text.secondary' }}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats */}
        {output && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip label={`Original: ${formatBytes(inputSize)}`} size="small" variant="outlined" />
            <Chip label={`Output: ${formatBytes(outputSize)}`} size="small" variant="outlined" />
            <Chip
              label={`Savings: ${savings}%`}
              size="small"
              variant="outlined"
              color={Number(savings) > 0 ? 'success' : 'default'}
            />
          </Box>
        )}

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          {/* Input panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Input</Typography>
              </Box>
              <TextField
                multiline
                rows={18}
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste or type your CSS here..."
                variant="standard"
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: {
                      px: 2,
                      py: 1.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                    },
                  },
                }}
              />
            </Box>
          </Grid>

          {/* Output panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Output</Typography>
                <Tooltip title="Copy output">
                  <IconButton size="small" onClick={handleCopy} disabled={!output} sx={{ color: 'text.secondary' }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download as .css">
                  <IconButton size="small" onClick={handleDownload} disabled={!output} sx={{ color: 'text.secondary' }}>
                    <FileDownloadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                multiline
                rows={18}
                fullWidth
                value={output}
                slotProps={{
                  input: {
                    readOnly: true,
                    disableUnderline: true,
                    sx: {
                      px: 2,
                      py: 1.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                    },
                  },
                }}
                variant="standard"
              />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
