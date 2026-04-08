import { useState, useCallback } from 'react';
import {
  Button,
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ClearIcon from '@mui/icons-material/Clear';
import { CodeDiffEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { readFileAsText } from '../../utils/file';

export default function TextCompare() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length < 2) {
        enqueueSnackbar('Please select exactly 2 files', { variant: 'warning' });
        return;
      }
      try {
        const [text1, text2] = await Promise.all([readFileAsText(files[0]), readFileAsText(files[1])]);
        setOriginal(text1);
        setModified(text2);
        enqueueSnackbar('Files loaded', { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to read files', { variant: 'error' });
      }
      e.target.value = '';
    },
    [enqueueSnackbar],
  );

  const handleSwap = () => {
    setOriginal(modified);
    setModified(original);
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
  };

  // Compute diff stats
  const computeStats = () => {
    if (!original && !modified) return null;
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const added = modLines.filter((line, i) => i >= origLines.length || origLines[i] !== line).length;
    const removed = origLines.filter((line, i) => i >= modLines.length || modLines[i] !== line).length;
    return {
      originalLines: origLines.length,
      modifiedLines: modLines.length,
      added,
      removed,
    };
  };

  const stats = computeStats();

  return (
    <>
      <PageHead
        title="Text & File Compare - BitesInByte Tools"
        description="Compare two text inputs or uploaded files side-by-side with diff highlighting."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Text & File Compare</Typography>
          <Typography variant="body2" color="text.secondary">
            Type directly in the editors or upload two files to compare side-by-side.
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
          <Button variant="contained" component="label" size="small" startIcon={<CloudUploadIcon />}>
            Upload 2 Files
            <input type="file" hidden multiple onChange={handleUpload} />
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Swap left and right">
            <IconButton
              size="small"
              onClick={handleSwap}
              disabled={!original && !modified}
              sx={{ color: 'text.secondary' }}
            >
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear both editors">
            <IconButton
              size="small"
              onClick={handleClear}
              disabled={!original && !modified}
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats */}
        {stats && (original || modified) && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              px: 2,
              py: 1,
              borderRadius: 1.5,
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
              fontSize: '0.8125rem',
              color: 'text.secondary',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            <span>Original: {stats.originalLines} lines</span>
            <span>Modified: {stats.modifiedLines} lines</span>
            <Box component="span" sx={{ color: 'success.main' }}>+{stats.added}</Box>
            <Box component="span" sx={{ color: 'error.main' }}>-{stats.removed}</Box>
          </Box>
        )}

        <CodeDiffEditor original={original} modified={modified} height={550} />
      </Stack>
    </>
  );
}
