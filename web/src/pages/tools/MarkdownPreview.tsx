import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const DEFAULT_MD = `# Hello World

This is a **Markdown** preview tool. Start editing to see the result!

## Features

- Real-time preview
- GitHub Flavored Markdown
- Sanitized HTML output

### Code Block

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

### Table

| Feature | Status |
|---------|--------|
| Bold    | Yes    |
| Italic  | Yes    |
| Links   | Yes    |

> Blockquotes work too!

[Visit GitHub](https://github.com)
`;

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(DEFAULT_MD);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const html = useMemo(() => {
    try {
      const raw = marked.parse(markdown, { async: false }) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return '<p style="color:red">Error parsing markdown</p>';
    }
  }, [markdown]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMarkdown(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleCopyHtml = async () => {
    const ok = await copyToClipboard(html);
    enqueueSnackbar(ok ? 'Copied HTML' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="Markdown Preview - BitesInByte Tools"
        description="Live Markdown editor with side-by-side preview. Supports GitHub Flavored Markdown. Free online markdown previewer."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Markdown Preview</Typography>
          <Typography variant="body2" color="text.secondary">
            Write Markdown and see a live, side-by-side HTML preview.
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          {/* Editor */}
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Markdown</Typography>
                <Tooltip title="Paste">
                  <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
                    <ContentPasteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear">
                  <IconButton size="small" onClick={() => setMarkdown('')} disabled={!markdown} sx={{ color: 'text.secondary' }}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ flex: 1 }}>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Write markdown here..."
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 500,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    padding: '12px 16px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Preview */}
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
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Preview</Typography>
                <Tooltip title="Copy HTML">
                  <IconButton size="small" onClick={handleCopyHtml} sx={{ color: 'text.secondary' }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download HTML">
                  <IconButton
                    size="small"
                    onClick={() => downloadFile('preview.html', html, 'text/html')}
                    sx={{ color: 'text.secondary' }}
                  >
                    <DownloadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                sx={{
                  p: 2,
                  flex: 1,
                  minHeight: 500,
                  maxHeight: 600,
                  overflow: 'auto',
                  '& h1': { fontSize: '1.5rem', fontWeight: 700, mb: 1, mt: 2 },
                  '& h2': { fontSize: '1.25rem', fontWeight: 600, mb: 1, mt: 2 },
                  '& h3': { fontSize: '1.1rem', fontWeight: 600, mb: 0.5, mt: 1.5 },
                  '& p': { mb: 1, lineHeight: 1.6 },
                  '& ul, & ol': { pl: 3, mb: 1 },
                  '& li': { mb: 0.25 },
                  '& code': {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.85em',
                    bgcolor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                  },
                  '& pre': {
                    bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.03),
                    p: 1.5,
                    borderRadius: 1,
                    overflow: 'auto',
                    mb: 1,
                    '& code': { bgcolor: 'transparent', px: 0, py: 0 },
                  },
                  '& blockquote': {
                    borderLeft: 3,
                    borderColor: 'divider',
                    pl: 2,
                    ml: 0,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    mb: 1,
                  },
                  '& th, & td': {
                    border: 1,
                    borderColor: 'divider',
                    px: 1.5,
                    py: 0.75,
                    textAlign: 'left',
                  },
                  '& th': {
                    fontWeight: 600,
                    bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                  },
                  '& a': { color: 'primary.main' },
                  '& img': { maxWidth: '100%' },
                  '& hr': { border: 'none', borderTop: 1, borderColor: 'divider', my: 2 },
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
