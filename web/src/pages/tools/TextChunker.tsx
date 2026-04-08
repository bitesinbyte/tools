import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, readFileAsText, downloadFile } from '../../utils/file';

type ChunkStrategy = 'tokens' | 'sentences' | 'paragraphs' | 'characters';

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  return Math.max(1, Math.round(words.length * 1.3));
}

function chunkByTokens(text: string, maxTokens: number, overlap: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  const wordsPerChunk = Math.max(1, Math.round(maxTokens / 1.3));
  const overlapWords = Math.round(overlap / 1.3);

  while (i < words.length) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    chunks.push(chunk);
    i += wordsPerChunk - overlapWords;
    if (i >= words.length) break;
  }
  return chunks;
}

function chunkBySentences(text: string, maxSentences: number, overlap: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < sentences.length) {
    const chunk = sentences.slice(i, i + maxSentences).join('');
    chunks.push(chunk.trim());
    i += maxSentences - overlap;
    if (i >= sentences.length) break;
  }
  return chunks;
}

function chunkByParagraphs(text: string, maxParagraphs: number, overlap: number): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const chunks: string[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const chunk = paragraphs.slice(i, i + maxParagraphs).join('\n\n');
    chunks.push(chunk.trim());
    i += maxParagraphs - overlap;
    if (i >= paragraphs.length) break;
  }
  return chunks;
}

function chunkByCharacters(text: string, maxChars: number, overlap: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChars));
    i += maxChars - overlap;
    if (i >= text.length) break;
  }
  return chunks;
}

export default function TextChunker() {
  const [text, setText] = useState('');
  const [strategy, setStrategy] = useState<ChunkStrategy>('tokens');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(50);
  const [fileName, setFileName] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const sizeLabel = strategy === 'tokens' ? 'tokens' : strategy === 'sentences' ? 'sentences' : strategy === 'paragraphs' ? 'paragraphs' : 'characters';
  const maxSize = strategy === 'tokens' ? 4000 : strategy === 'sentences' ? 50 : strategy === 'paragraphs' ? 20 : 10000;
  const maxOverlap = strategy === 'tokens' ? 500 : strategy === 'sentences' ? 10 : strategy === 'paragraphs' ? 5 : 2000;

  const chunks = useMemo(() => {
    if (!text.trim()) return [];
    switch (strategy) {
      case 'tokens': return chunkByTokens(text, chunkSize, overlap);
      case 'sentences': return chunkBySentences(text, chunkSize, overlap);
      case 'paragraphs': return chunkByParagraphs(text, chunkSize, overlap);
      case 'characters': return chunkByCharacters(text, chunkSize, overlap);
    }
  }, [text, strategy, chunkSize, overlap]);

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      setFileName('');
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const t = await readFileAsText(file);
    setText(t);
    setFileName(file.name);
    e.target.value = '';
  };

  const handleExport = () => {
    const data = chunks.map((c, i) => ({
      chunk_index: i,
      text: c,
      estimated_tokens: estimateTokenCount(c),
      character_count: c.length,
    }));
    downloadFile('chunks.json', JSON.stringify(data, null, 2), 'application/json');
  };

  return (
    <>
      <PageHead
        title="Text Chunker for RAG - BitesInByte Tools"
        description="Split text into chunks by tokens, sentences, paragraphs, or characters for RAG pipelines."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Text Chunker (RAG)</Typography>
          <Typography variant="body2" color="text.secondary">
            Split documents into chunks for retrieval-augmented generation pipelines.
          </Typography>
        </Box>

        {/* Controls */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <ToggleButtonGroup
                value={strategy}
                exclusive
                onChange={(_, v) => v && setStrategy(v)}
                size="small"
                fullWidth
              >
                <ToggleButton value="tokens">Tokens</ToggleButton>
                <ToggleButton value="sentences">Sentences</ToggleButton>
                <ToggleButton value="paragraphs">Paragraphs</ToggleButton>
                <ToggleButton value="characters">Chars</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                Chunk size: {chunkSize} {sizeLabel}
              </Typography>
              <Slider value={chunkSize} onChange={(_, v) => setChunkSize(v as number)} min={1} max={maxSize} step={1} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                Overlap: {overlap} {sizeLabel}
              </Typography>
              <Slider value={overlap} onChange={(_, v) => setOverlap(v as number)} min={0} max={maxOverlap} step={1} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                <Tooltip title="Paste">
                  <IconButton size="small" onClick={handlePaste}><ContentPasteIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Upload">
                  <IconButton size="small" component="label"><UploadFileIcon fontSize="small" /><input type="file" hidden onChange={handleFile} /></IconButton>
                </Tooltip>
                <Tooltip title="Clear">
                  <IconButton size="small" onClick={() => { setText(''); setFileName(''); }} disabled={!text}><ClearIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Stats */}
        {text && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${chunks.length} chunks`} color="primary" variant="outlined" size="small" />
            <Chip label={`~${estimateTokenCount(text).toLocaleString()} total tokens`} variant="outlined" size="small" />
            <Chip label={`${text.length.toLocaleString()} characters`} variant="outlined" size="small" />
            {fileName && <Chip label={fileName} variant="outlined" size="small" />}
            {chunks.length > 0 && (
              <Chip label="Export JSON" size="small" variant="outlined" onClick={handleExport} sx={{ cursor: 'pointer' }} />
            )}
          </Box>
        )}

        <Grid container spacing={2}>
          {/* Input */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01) }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Source Text</Typography>
              </Box>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setFileName(''); }}
                placeholder="Paste your document, article, or text here..."
                style={{ flex: 1, width: '100%', minHeight: 400, border: 'none', outline: 'none', resize: 'none', padding: '12px 16px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8125rem', lineHeight: 1.6, backgroundColor: 'transparent', color: 'inherit', boxSizing: 'border-box' }}
              />
            </Box>
          </Grid>

          {/* Chunks */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01), display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Chunks ({chunks.length})</Typography>
              </Box>
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                {chunks.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Enter text to see chunks</Typography>
                  </Box>
                )}
                {chunks.map((chunk, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: i < chunks.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02) },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip label={`#${i + 1}`} size="small" sx={{ fontSize: '0.625rem', height: 20 }} />
                      <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                        ~{estimateTokenCount(chunk)} tokens | {chunk.length} chars
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Tooltip title="Copy chunk">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            const ok = await copyToClipboard(chunk);
                            enqueueSnackbar(ok ? 'Copied' : 'Failed', { variant: ok ? 'success' : 'error' });
                          }}
                          sx={{ color: 'text.secondary' }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'text.primary',
                      }}
                    >
                      {chunk}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
