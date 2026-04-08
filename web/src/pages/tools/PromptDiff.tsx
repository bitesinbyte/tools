import { useState } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AddIcon from '@mui/icons-material/Add';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';

interface PromptVersion {
  id: string;
  label: string;
  content: string;
  timestamp: number;
}

function diffLines(a: string, b: string): { type: 'same' | 'added' | 'removed'; text: string }[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = [];
  const maxLen = Math.max(aLines.length, bLines.length);

  // Simple line-by-line diff
  let ai = 0, bi = 0;
  while (ai < aLines.length || bi < bLines.length) {
    if (ai < aLines.length && bi < bLines.length && aLines[ai] === bLines[bi]) {
      result.push({ type: 'same', text: aLines[ai] });
      ai++; bi++;
    } else if (bi < bLines.length && (ai >= aLines.length || !aLines.slice(ai).includes(bLines[bi]))) {
      result.push({ type: 'added', text: bLines[bi] });
      bi++;
    } else if (ai < aLines.length && (bi >= bLines.length || !bLines.slice(bi).includes(aLines[ai]))) {
      result.push({ type: 'removed', text: aLines[ai] });
      ai++;
    } else {
      // Changed line
      if (ai < aLines.length) { result.push({ type: 'removed', text: aLines[ai] }); ai++; }
      if (bi < bLines.length) { result.push({ type: 'added', text: bLines[bi] }); bi++; }
    }
    if (result.length > maxLen * 3) break; // safety
  }
  return result;
}

export default function PromptDiff() {
  const [versions, setVersions] = useState<PromptVersion[]>([
    {
      id: crypto.randomUUID(),
      label: 'v1',
      content: 'You are a helpful assistant.\nPlease answer the user\'s question clearly and concisely.\nUse examples when appropriate.',
      timestamp: Date.now() - 86400000,
    },
    {
      id: crypto.randomUUID(),
      label: 'v2',
      content: 'You are a helpful AI assistant specializing in software engineering.\nPlease answer the user\'s question clearly, concisely, and accurately.\nUse code examples when appropriate.\nIf you are unsure, say so.',
      timestamp: Date.now(),
    },
  ]);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const left = versions[leftIdx]?.content ?? '';
  const right = versions[rightIdx]?.content ?? '';
  const diffResult = diffLines(left, right);
  const addedCount = diffResult.filter((d) => d.type === 'added').length;
  const removedCount = diffResult.filter((d) => d.type === 'removed').length;

  const addVersion = () => {
    setVersions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `v${prev.length + 1}`,
        content: '',
        timestamp: Date.now(),
      },
    ]);
  };

  const updateVersion = (idx: number, content: string) => {
    setVersions((prev) => prev.map((v, i) => (i === idx ? { ...v, content, timestamp: Date.now() } : v)));
  };

  const updateLabel = (idx: number, label: string) => {
    setVersions((prev) => prev.map((v, i) => (i === idx ? { ...v, label } : v)));
  };

  const removeVersion = (idx: number) => {
    if (versions.length <= 2) return;
    setVersions((prev) => prev.filter((_, i) => i !== idx));
    if (leftIdx >= versions.length - 1) setLeftIdx(0);
    if (rightIdx >= versions.length - 1) setRightIdx(Math.min(1, versions.length - 2));
  };

  const handleExport = () => {
    downloadFile('prompt-versions.json', JSON.stringify(versions, null, 2), 'application/json');
  };

  const handleCopyDiff = async () => {
    const text = diffResult.map((d) => `${d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '} ${d.text}`).join('\n');
    const ok = await copyToClipboard(text);
    enqueueSnackbar(ok ? 'Copied diff' : 'Failed', { variant: ok ? 'success' : 'error' });
  };

  const DIFF_COLORS = {
    added: isDark ? alpha('#22c55e', 0.15) : alpha('#22c55e', 0.1),
    removed: isDark ? alpha('#ef4444', 0.15) : alpha('#ef4444', 0.1),
    same: 'transparent',
  };

  return (
    <>
      <PageHead
        title="Prompt Diff & Versioner - BitesInByte Tools"
        description="Compare and version your AI prompts. Track changes between prompt iterations."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Prompt Diff & Versioner</Typography>
          <Typography variant="body2" color="text.secondary">
            Track and compare prompt versions. See exactly what changed between iterations.
          </Typography>
        </Box>

        {/* Version selector */}
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
          {versions.map((v, i) => (
            <Chip
              key={v.id}
              label={v.label}
              size="small"
              variant={(i === leftIdx || i === rightIdx) ? 'filled' : 'outlined'}
              color={i === leftIdx ? 'error' : i === rightIdx ? 'success' : 'default'}
              onClick={() => {
                if (i !== rightIdx) setLeftIdx(i);
                else setLeftIdx(leftIdx);
              }}
              onDelete={versions.length > 2 ? () => removeVersion(i) : undefined}
              sx={{ cursor: 'pointer' }}
            />
          ))}
          <IconButton size="small" onClick={addVersion}><AddIcon fontSize="small" /></IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" onClick={handleExport}>Export</Button>
          <Tooltip title="Copy diff">
            <IconButton size="small" onClick={handleCopyDiff}><ContentCopyIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>

        {/* Compare selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
          <select value={leftIdx} onChange={(e) => setLeftIdx(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid', background: 'transparent', color: 'inherit' }}>
            {versions.map((v, i) => <option key={v.id} value={i}>{v.label}</option>)}
          </select>
          <CompareArrowsIcon sx={{ color: 'text.secondary' }} />
          <select value={rightIdx} onChange={(e) => setRightIdx(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid', background: 'transparent', color: 'inherit' }}>
            {versions.map((v, i) => <option key={v.id} value={i}>{v.label}</option>)}
          </select>
          <Chip label={`+${addedCount}`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
          <Chip label={`-${removedCount}`} size="small" color="error" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
        </Box>

        <Grid container spacing={2}>
          {/* Left editor */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01) }}>
                <input
                  value={versions[leftIdx]?.label ?? ''}
                  onChange={(e) => updateLabel(leftIdx, e.target.value)}
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 700, fontSize: '0.8125rem', width: 80, outline: 'none' }}
                />
                <Box sx={{ flexGrow: 1 }} />
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                  {versions[leftIdx] ? new Date(versions[leftIdx].timestamp).toLocaleString() : ''}
                </Typography>
              </Box>
              <textarea
                value={left}
                onChange={(e) => updateVersion(leftIdx, e.target.value)}
                rows={12}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', padding: '12px 16px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8125rem', lineHeight: 1.6, backgroundColor: 'transparent', color: 'inherit', boxSizing: 'border-box' }}
              />
            </Box>
          </Grid>

          {/* Right editor */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01) }}>
                <input
                  value={versions[rightIdx]?.label ?? ''}
                  onChange={(e) => updateLabel(rightIdx, e.target.value)}
                  style={{ border: 'none', background: 'transparent', color: '#22c55e', fontWeight: 700, fontSize: '0.8125rem', width: 80, outline: 'none' }}
                />
                <Box sx={{ flexGrow: 1 }} />
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                  {versions[rightIdx] ? new Date(versions[rightIdx].timestamp).toLocaleString() : ''}
                </Typography>
              </Box>
              <textarea
                value={right}
                onChange={(e) => updateVersion(rightIdx, e.target.value)}
                rows={12}
                style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', padding: '12px 16px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8125rem', lineHeight: 1.6, backgroundColor: 'transparent', color: 'inherit', boxSizing: 'border-box' }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Diff output */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Diff View
          </Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 400, overflow: 'auto' }}>
            {diffResult.map((line, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  px: 2,
                  py: 0.5,
                  bgcolor: DIFF_COLORS[line.type],
                  borderBottom: i < diffResult.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: line.type !== 'same' ? 600 : 400,
                    color: line.type === 'added' ? 'success.main' : line.type === 'removed' ? 'error.main' : 'text.primary',
                    minWidth: 16,
                    mr: 1,
                  }}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontFamily: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {line.text || ' '}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
