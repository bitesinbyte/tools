import { useState, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile, readFileAsText } from '../../utils/file';

// ---------------------------------------------------------------------------
// LCS-based unified diff algorithm
// ---------------------------------------------------------------------------

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

interface DiffOp {
  type: 'same' | 'added' | 'removed';
  line: string;
  oldIdx?: number; // 0-based line index in original
  newIdx?: number; // 0-based line index in modified
}

function computeDiffOps(a: string[], b: string[]): DiffOp[] {
  const dp = computeLCS(a, b);
  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'same', line: a[i - 1], oldIdx: i - 1, newIdx: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', line: b[j - 1], newIdx: j - 1 });
      j--;
    } else {
      ops.push({ type: 'removed', line: a[i - 1], oldIdx: i - 1 });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

function generateUnifiedDiff(
  original: string,
  modified: string,
  oldFileName: string,
  newFileName: string,
  contextLines = 3,
): string {
  const aLines = original.split('\n');
  const bLines = modified.split('\n');
  const ops = computeDiffOps(aLines, bLines);

  // Find change regions and expand with context
  const changeIndices: number[] = [];
  ops.forEach((op, idx) => {
    if (op.type !== 'same') changeIndices.push(idx);
  });

  if (changeIndices.length === 0) return '';

  // Group changes into hunks
  interface Hunk {
    start: number;
    end: number;
  }
  const hunks: Hunk[] = [];
  let hunkStart = Math.max(0, changeIndices[0] - contextLines);
  let hunkEnd = Math.min(ops.length - 1, changeIndices[0] + contextLines);

  for (let c = 1; c < changeIndices.length; c++) {
    const newStart = Math.max(0, changeIndices[c] - contextLines);
    const newEnd = Math.min(ops.length - 1, changeIndices[c] + contextLines);
    if (newStart <= hunkEnd + 1) {
      // merge into current hunk
      hunkEnd = newEnd;
    } else {
      hunks.push({ start: hunkStart, end: hunkEnd });
      hunkStart = newStart;
      hunkEnd = newEnd;
    }
  }
  hunks.push({ start: hunkStart, end: hunkEnd });

  const lines: string[] = [];
  lines.push(`--- a/${oldFileName}`);
  lines.push(`+++ b/${newFileName}`);

  for (const hunk of hunks) {
    // Compute old/new start line numbers and counts
    let oldStart = 0;
    let oldCount = 0;
    let newStart = 0;
    let newCount = 0;
    let foundFirst = false;

    for (let i = hunk.start; i <= hunk.end; i++) {
      const op = ops[i];
      if (!foundFirst) {
        oldStart = (op.oldIdx ?? (op.type === 'added' ? (ops[i + 1]?.oldIdx ?? aLines.length) : 0)) + 1;
        newStart = (op.newIdx ?? (op.type === 'removed' ? (ops[i + 1]?.newIdx ?? bLines.length) : 0)) + 1;
        foundFirst = true;
      }
      if (op.type === 'same') {
        oldCount++;
        newCount++;
      } else if (op.type === 'removed') {
        oldCount++;
      } else {
        newCount++;
      }
    }

    lines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);

    for (let i = hunk.start; i <= hunk.end; i++) {
      const op = ops[i];
      if (op.type === 'same') {
        lines.push(` ${op.line}`);
      } else if (op.type === 'removed') {
        lines.push(`-${op.line}`);
      } else {
        lines.push(`+${op.line}`);
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Patch application
// ---------------------------------------------------------------------------

interface PatchHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: { prefix: string; content: string }[];
}

function parsePatch(patch: string): PatchHunk[] {
  const hunks: PatchHunk[] = [];
  const rawLines = patch.split('\n');
  let current: PatchHunk | null = null;

  for (const line of rawLines) {
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (hunkMatch) {
      current = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: hunkMatch[2] !== '' ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newCount: hunkMatch[4] !== '' ? parseInt(hunkMatch[4], 10) : 1,
        lines: [],
      };
      hunks.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
      current.lines.push({ prefix: line[0], content: line.slice(1) });
    } else if (line === '') {
      // could be a context line that is an empty line (space-prefixed but trimmed)
      current.lines.push({ prefix: ' ', content: '' });
    }
  }

  return hunks;
}

function applyPatch(original: string, patch: string): string {
  const hunks = parsePatch(patch);
  if (hunks.length === 0) throw new Error('No valid hunks found in patch');

  const origLines = original.split('\n');
  const result: string[] = [];
  let origIdx = 0; // 0-based

  for (const hunk of hunks) {
    const hunkOrigStart = hunk.oldStart - 1; // 0-based
    // Copy lines before this hunk
    while (origIdx < hunkOrigStart && origIdx < origLines.length) {
      result.push(origLines[origIdx]);
      origIdx++;
    }
    // Apply hunk
    for (const hl of hunk.lines) {
      if (hl.prefix === ' ') {
        // Context line — pass through from original
        if (origIdx < origLines.length) {
          result.push(origLines[origIdx]);
          origIdx++;
        }
      } else if (hl.prefix === '-') {
        // Remove line — skip in original
        origIdx++;
      } else if (hl.prefix === '+') {
        // Add line
        result.push(hl.content);
      }
    }
  }

  // Copy remaining lines
  while (origIdx < origLines.length) {
    result.push(origLines[origIdx]);
    origIdx++;
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Mode = 'generate' | 'apply';

export default function DiffToPatch() {
  const [mode, setMode] = useState<Mode>('generate');

  // Generate mode state
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [oldFileName, setOldFileName] = useState('file.txt');
  const [newFileName, setNewFileName] = useState('file.txt');
  const [diffOutput, setDiffOutput] = useState('');

  // Apply mode state
  const [applyOriginal, setApplyOriginal] = useState('');
  const [patchInput, setPatchInput] = useState('');
  const [applyResult, setApplyResult] = useState('');

  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Generate diff
  const handleGenerate = useCallback(() => {
    if (!original && !modified) {
      enqueueSnackbar('Enter original and modified text', { variant: 'warning' });
      return;
    }
    const diff = generateUnifiedDiff(original, modified, oldFileName, newFileName);
    setDiffOutput(diff || '(no differences)');
  }, [original, modified, oldFileName, newFileName, enqueueSnackbar]);

  // Apply patch
  const handleApply = useCallback(() => {
    if (!patchInput.trim()) {
      enqueueSnackbar('Enter patch content', { variant: 'warning' });
      return;
    }
    try {
      const result = applyPatch(applyOriginal, patchInput);
      setApplyResult(result);
      enqueueSnackbar('Patch applied successfully', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Failed to apply patch: ${(e as Error).message}`, { variant: 'error' });
    }
  }, [applyOriginal, patchInput, enqueueSnackbar]);

  // Stats for generate mode
  const computeStats = () => {
    if (!diffOutput || diffOutput === '(no differences)') return null;
    const lines = diffOutput.split('\n');
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    for (const l of lines) {
      if (l.startsWith('@@') || l.startsWith('---') || l.startsWith('+++')) continue;
      if (l.startsWith('+')) added++;
      else if (l.startsWith('-')) removed++;
      else if (l.startsWith(' ')) unchanged++;
    }
    return { added, removed, unchanged };
  };
  const stats = computeStats();

  // Helpers
  const handlePaste = async (setter: (v: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      setter(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setter(text);
      enqueueSnackbar(`Loaded ${file.name}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to read file', { variant: 'error' });
    }
    e.target.value = '';
  };

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handleDownloadPatch = () => {
    if (!diffOutput || diffOutput === '(no differences)') return;
    downloadFile('changes.patch', diffOutput, 'text/plain');
    enqueueSnackbar('Downloaded patch file', { variant: 'success' });
  };

  // Diff preview colors
  const DIFF_COLORS = {
    added: isDark ? alpha('#22c55e', 0.15) : alpha('#22c55e', 0.1),
    removed: isDark ? alpha('#ef4444', 0.15) : alpha('#ef4444', 0.1),
    context: 'transparent',
    header: isDark ? alpha('#3b82f6', 0.12) : alpha('#3b82f6', 0.08),
  };

  // Textarea panel builder
  const renderTextArea = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options?: { readOnly?: boolean; rows?: number; placeholder?: string },
  ) => (
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
        <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>{label}</Typography>
        {!options?.readOnly && (
          <>
            <Tooltip title="Paste">
              <IconButton size="small" onClick={() => handlePaste(onChange)} sx={{ color: 'text.secondary' }}>
                <ContentPasteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload file">
              <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
                <UploadFileIcon sx={{ fontSize: 16 }} />
                <input type="file" hidden onChange={(e) => handleFile(e, onChange)} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title="Copy">
          <IconButton
            size="small"
            onClick={() => handleCopy(value)}
            disabled={!value}
            sx={{ color: 'text.secondary' }}
          >
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton
            size="small"
            onClick={() => onChange('')}
            disabled={!value}
            sx={{ color: 'text.secondary' }}
          >
            <ClearIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <TextField
        multiline
        rows={options?.rows ?? 12}
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={options?.placeholder ?? ''}
        variant="standard"
        slotProps={{
          input: {
            readOnly: options?.readOnly,
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
  );

  // Colored diff preview
  const renderDiffPreview = (diff: string) => {
    if (!diff || diff === '(no differences)') return null;
    const lines = diff.split('\n');
    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 400, overflow: 'auto' }}>
        {lines.map((line, i) => {
          let bg = DIFF_COLORS.context;
          let color: string = theme.palette.text.primary;
          let weight = 400;

          if (line.startsWith('@@')) {
            bg = DIFF_COLORS.header;
            color = theme.palette.info.main;
            weight = 600;
          } else if (line.startsWith('---') || line.startsWith('+++')) {
            weight = 700;
          } else if (line.startsWith('+')) {
            bg = DIFF_COLORS.added;
            color = theme.palette.success.main;
          } else if (line.startsWith('-')) {
            bg = DIFF_COLORS.removed;
            color = theme.palette.error.main;
          }

          return (
            <Box
              key={i}
              sx={{
                px: 2,
                py: 0.25,
                bgcolor: bg,
                borderBottom: i < lines.length - 1 ? 1 : 0,
                borderColor: 'divider',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color,
                fontWeight: weight,
              }}
            >
              {line || ' '}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <>
      <PageHead
        title="Diff to Patch Converter - BitesInByte Tools"
        description="Generate unified diffs from text comparison or apply patches to files. Free online diff and patch tool."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Diff to Patch Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate unified diffs from two texts or apply a patch to produce the result.
          </Typography>
        </Box>

        {/* Mode toggle */}
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
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
          >
            <ToggleButton value="generate">Generate Diff</ToggleButton>
            <ToggleButton value="apply">Apply Patch</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          {mode === 'generate' && (
            <>
              <TextField
                size="small"
                label="Old filename"
                value={oldFileName}
                onChange={(e) => setOldFileName(e.target.value)}
                sx={{ width: 140 }}
                slotProps={{ input: { sx: { fontSize: '0.8125rem' } } }}
              />
              <TextField
                size="small"
                label="New filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                sx={{ width: 140 }}
                slotProps={{ input: { sx: { fontSize: '0.8125rem' } } }}
              />
            </>
          )}
        </Box>

        {/* Generate Diff mode */}
        {mode === 'generate' && (
          <>
            <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderTextArea('Original', original, setOriginal, {
                  placeholder: 'Paste or upload original text...',
                })}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderTextArea('Modified', modified, setModified, {
                  placeholder: 'Paste or upload modified text...',
                })}
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={handleGenerate}
                disabled={!original && !modified}
              >
                Generate Diff
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => handleCopy(diffOutput)}
                disabled={!diffOutput || diffOutput === '(no differences)'}
              >
                Copy Diff
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPatch}
                disabled={!diffOutput || diffOutput === '(no differences)'}
              >
                Download .patch
              </Button>
            </Box>

            {/* Stats */}
            {stats && (
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
                <Chip label={`+${stats.added} added`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
                <Chip label={`-${stats.removed} removed`} size="small" color="error" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
                <Chip label={`${stats.unchanged} unchanged`} size="small" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
              </Box>
            )}

            {/* Diff preview */}
            {diffOutput && (
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Diff Preview
                </Typography>
                {diffOutput === '(no differences)' ? (
                  <Typography variant="body2" color="text.secondary">
                    No differences found between the two texts.
                  </Typography>
                ) : (
                  renderDiffPreview(diffOutput)
                )}
              </Box>
            )}
          </>
        )}

        {/* Apply Patch mode */}
        {mode === 'apply' && (
          <>
            <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderTextArea('Original Text', applyOriginal, setApplyOriginal, {
                  placeholder: 'Paste or upload the original text...',
                })}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderTextArea('Patch Content', patchInput, setPatchInput, {
                  placeholder: 'Paste or upload a unified diff / .patch file...',
                })}
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={handleApply}
                disabled={!patchInput.trim()}
              >
                Apply Patch
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => handleCopy(applyResult)}
                disabled={!applyResult}
              >
                Copy Result
              </Button>
            </Box>

            {applyResult && (
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Patched Result
                </Typography>
                {renderTextArea('Result', applyResult, setApplyResult, {
                  readOnly: true,
                  rows: 14,
                  placeholder: '',
                })}
              </Box>
            )}
          </>
        )}
      </Stack>
    </>
  );
}
