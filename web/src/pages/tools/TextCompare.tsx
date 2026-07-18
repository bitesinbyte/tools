import { useState, useCallback, useMemo } from 'react';
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
import type { DiffLineStats } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { readFileAsText } from '../../utils/file';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function countLines(value: string) {
  return value === '' ? 0 : value.split(/\r\n|\r|\n/).length;
}

export default function TextCompare() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [sourceNames, setSourceNames] = useState<{ original?: string; modified?: string }>({});
  const [diffStats, setDiffStats] = useState<DiffLineStats | null>({ added: 0, removed: 0 });
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const files = Array.from(input.files ?? []);
      if (files.length !== 2) {
        enqueueSnackbar('Please select exactly 2 files', { variant: 'warning' });
        input.value = '';
        return;
      }
      if (files.some((file) => file.size > MAX_FILE_SIZE)) {
        enqueueSnackbar('Each file must be 50 MB or smaller', { variant: 'warning' });
        input.value = '';
        return;
      }

      try {
        const [text1, text2] = await Promise.all([readFileAsText(files[0]), readFileAsText(files[1])]);
        setDiffStats(null);
        setOriginal(text1);
        setModified(text2);
        setSourceNames({ original: files[0].name, modified: files[1].name });
        enqueueSnackbar(`Loaded ${files[0].name} as Original and ${files[1].name} as Modified`, {
          variant: 'success',
        });
      } catch {
        enqueueSnackbar('Failed to read files', { variant: 'error' });
      } finally {
        input.value = '';
      }
    },
    [enqueueSnackbar],
  );

  const handleSwap = () => {
    setDiffStats(null);
    setOriginal(modified);
    setModified(original);
    setSourceNames(({ original: originalName, modified: modifiedName }) => ({
      original: modifiedName,
      modified: originalName,
    }));
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
    setSourceNames({});
    setDiffStats({ added: 0, removed: 0 });
  };

  const lineCounts = useMemo(
    () => ({ original: countLines(original), modified: countLines(modified) }),
    [original, modified],
  );
  const hasComparison =
    original !== '' || modified !== '' || sourceNames.original !== undefined || sourceNames.modified !== undefined;
  const originalLabel = sourceNames.original ? `Original — ${sourceNames.original}` : 'Original text';
  const modifiedLabel = sourceNames.modified ? `Modified — ${sourceNames.modified}` : 'Modified text';

  return (
    <>
      <PageHead
        title="Text & File Compare - Lamplit Labs Tools"
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
            <input
              type="file"
              hidden
              multiple
              aria-label="Choose exactly two files, original first and modified second"
              onChange={handleUpload}
            />
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Swap left and right">
            <IconButton
              size="small"
              onClick={handleSwap}
              disabled={!hasComparison}
              aria-label="Swap original and modified text"
              sx={{ color: 'text.secondary' }}
            >
              <SwapHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear both editors">
            <IconButton
              size="small"
              onClick={handleClear}
              disabled={!hasComparison}
              aria-label="Clear original and modified text"
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats */}
        {hasComparison && (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
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
            <span>Original: {lineCounts.original} lines</span>
            <span>Modified: {lineCounts.modified} lines</span>
            {diffStats ? (
              <>
                <Box component="span" sx={{ color: 'success.main' }}>+{diffStats.added}</Box>
                <Box component="span" sx={{ color: 'error.main' }}>-{diffStats.removed}</Box>
              </>
            ) : (
              <span>Calculating changes…</span>
            )}
          </Box>
        )}

        <CodeDiffEditor
          original={original}
          modified={modified}
          onOriginalChange={setOriginal}
          onModifiedChange={setModified}
          onDiffChange={setDiffStats}
          originalLabel={originalLabel}
          modifiedLabel={modifiedLabel}
          height={550}
        />
        <Typography variant="caption" color="text.secondary">
          On narrow screens, the editor switches to an inline diff: removed lines are from Original and added lines are
          from Modified. Tab moves focus out of the editor.
        </Typography>
      </Stack>
    </>
  );
}
