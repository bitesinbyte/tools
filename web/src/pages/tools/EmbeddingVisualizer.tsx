import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

type Metric = 'cosine' | 'dot' | 'euclidean';

function parseVector(input: string): number[] | null {
  try {
    const trimmed = input.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return trimmed.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
  } catch {
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function drawVectors(canvas: HTMLCanvasElement, vecA: number[], vecB: number[], isDark: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = isDark ? '#18181b' : '#fafafa';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= w; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

  // Only draw if we have at least 2 dimensions
  if (vecA.length < 2 || vecB.length < 2) return;

  // Scale to fit
  const allVals = [...vecA.slice(0, 2), ...vecB.slice(0, 2)].map(Math.abs);
  const maxVal = Math.max(...allVals, 0.001);
  const scale = (Math.min(w, h) * 0.4) / maxVal;

  // Draw vector A
  const ax = cx + vecA[0] * scale;
  const ay = cy - vecA[1] * scale;
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
  // Arrow head
  drawArrowHead(ctx, cx, cy, ax, ay, '#3b82f6');
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('A', ax + 8, ay - 8);

  // Draw vector B
  const bx = cx + vecB[0] * scale;
  const by = cy - vecB[1] * scale;
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
  drawArrowHead(ctx, cx, cy, bx, by, '#22c55e');
  ctx.fillStyle = '#22c55e';
  ctx.fillText('B', bx + 8, by - 8);

  // Angle arc
  const angleA = Math.atan2(-(vecA[1]), vecA[0]);
  const angleB = Math.atan2(-(vecB[1]), vecB[0]);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, 30, Math.min(angleA, angleB), Math.max(angleA, angleB));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArrowHead(ctx: CanvasRenderingContext2D, fx: number, fy: number, tx: number, ty: number, color: string) {
  const angle = Math.atan2(ty - fy, tx - fx);
  const headLen = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export default function EmbeddingVisualizer() {
  const [inputA, setInputA] = useState('[0.8, 0.6, 0.1, -0.2]');
  const [inputB, setInputB] = useState('[0.3, 0.9, -0.1, 0.4]');
  const [metric, setMetric] = useState<Metric>('cosine');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const vecA = useMemo(() => parseVector(inputA), [inputA]);
  const vecB = useMemo(() => parseVector(inputB), [inputB]);

  const results = useMemo(() => {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return null;
    const minLen = Math.min(vecA.length, vecB.length);
    const a = vecA.slice(0, minLen);
    const b = vecB.slice(0, minLen);
    return {
      cosine: cosineSimilarity(a, b),
      dot: dotProduct(a, b),
      euclidean: euclideanDistance(a, b),
      dimA: vecA.length,
      dimB: vecB.length,
      magnitudeA: Math.sqrt(vecA.reduce((s, v) => s + v * v, 0)),
      magnitudeB: Math.sqrt(vecB.reduce((s, v) => s + v * v, 0)),
    };
  }, [vecA, vecB]);

  useEffect(() => {
    if (canvasRef.current && vecA && vecB) {
      drawVectors(canvasRef.current, vecA, vecB, isDark);
    }
  }, [vecA, vecB, isDark]);

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed', { variant: ok ? 'success' : 'error' });
  };

  const metricValue = results
    ? metric === 'cosine' ? results.cosine
    : metric === 'dot' ? results.dot
    : results.euclidean
    : 0;

  const metricItems = results ? [
    { label: 'Cosine Similarity', value: results.cosine.toFixed(6), highlight: metric === 'cosine' },
    { label: 'Dot Product', value: results.dot.toFixed(6), highlight: metric === 'dot' },
    { label: 'Euclidean Distance', value: results.euclidean.toFixed(6), highlight: metric === 'euclidean' },
    { label: 'Dimensions (A)', value: results.dimA.toString() },
    { label: 'Dimensions (B)', value: results.dimB.toString() },
    { label: '|A| Magnitude', value: results.magnitudeA.toFixed(4) },
    { label: '|B| Magnitude', value: results.magnitudeB.toFixed(4) },
  ] : [];

  return (
    <>
      <PageHead
        title="Embedding Visualizer - BitesInByte Tools"
        description="Visualize vector embeddings and compute cosine similarity, dot product, and Euclidean distance."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Embedding Visualizer</Typography>
          <Typography variant="body2" color="text.secondary">
            Compare vector embeddings with similarity metrics. First 2 dimensions are visualized on the canvas.
          </Typography>
        </Box>

        {/* Metric selector */}
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
          <ToggleButtonGroup value={metric} exclusive onChange={(_, v) => v && setMetric(v)} size="small">
            <ToggleButton value="cosine">Cosine</ToggleButton>
            <ToggleButton value="dot">Dot Product</ToggleButton>
            <ToggleButton value="euclidean">Euclidean</ToggleButton>
          </ToggleButtonGroup>
          {results && (
            <Chip
              label={`${metric === 'cosine' ? 'Similarity' : metric === 'dot' ? 'Dot Product' : 'Distance'}: ${metricValue.toFixed(4)}`}
              color={metric === 'cosine' ? (metricValue > 0.8 ? 'success' : metricValue > 0.5 ? 'warning' : 'error') : 'default'}
              variant="outlined"
            />
          )}
        </Box>

        <Grid container spacing={2}>
          {/* Vector inputs */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', flex: 1 }}>Vector A</Typography>
                  <Tooltip title="Clear">
                    <IconButton size="small" onClick={() => setInputA('')} disabled={!inputA}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  placeholder="[0.1, 0.2, 0.3, ...] or space/comma separated"
                  error={!!inputA && !vecA}
                  helperText={inputA && !vecA ? 'Invalid vector format' : vecA ? `${vecA.length} dimensions` : undefined}
                  slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e', flex: 1 }}>Vector B</Typography>
                  <Tooltip title="Clear">
                    <IconButton size="small" onClick={() => setInputB('')} disabled={!inputB}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder="[0.4, 0.5, 0.6, ...] or space/comma separated"
                  error={!!inputB && !vecB}
                  helperText={inputB && !vecB ? 'Invalid vector format' : vecB ? `${vecB.length} dimensions` : undefined}
                  slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.8125rem' } } }}
                />
              </Box>

              {/* Metric results */}
              {metricItems.length > 0 && (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  {metricItems.map((item, i) => (
                    <Box
                      key={item.label}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderBottom: i < metricItems.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                        bgcolor: item.highlight ? (isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04)) : undefined,
                        '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02) },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', flex: 1 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: item.highlight ? 700 : 400 }}>
                        {item.value}
                      </Typography>
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => handleCopy(item.value)} sx={{ color: 'text.secondary' }}>
                          <ContentCopyIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Canvas */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: isDark ? '#18181b' : '#fafafa',
              }}
            >
              <canvas
                ref={canvasRef}
                width={480}
                height={480}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
