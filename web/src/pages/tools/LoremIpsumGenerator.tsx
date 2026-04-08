import { useState, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, downloadFile } from '../../utils/file';

type Unit = 'words' | 'sentences' | 'paragraphs';

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
  'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
  'mollit', 'anim', 'id', 'est', 'laborum', 'at', 'vero', 'eos', 'accusamus', 'iusto', 'odio',
  'dignissimos', 'ducimus', 'blanditiis', 'praesentium', 'voluptatum', 'deleniti', 'atque',
  'corrupti', 'quos', 'dolores', 'quas', 'molestias', 'excepturi', 'obcaecati', 'cupiditate',
  'provident', 'similique', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo', 'nemo',
  'ipsam', 'voluptatem', 'quia', 'voluptas', 'aspernatur', 'fugit', 'consequuntur', 'magni',
];

function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function generateSentence(minWords = 6, maxWords = 15): string {
  const count = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  const words = Array.from({ length: count }, () => randomWord());
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function generateParagraph(minSentences = 3, maxSentences = 7): string {
  const count = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
  return Array.from({ length: count }, () => generateSentence()).join(' ');
}

function generateText(unit: Unit, count: number): string {
  switch (unit) {
    case 'words':
      return Array.from({ length: count }, () => randomWord()).join(' ');
    case 'sentences':
      return Array.from({ length: count }, () => generateSentence()).join(' ');
    case 'paragraphs':
      return Array.from({ length: count }, () => generateParagraph()).join('\n\n');
  }
}

export default function LoremIpsumGenerator() {
  const [unit, setUnit] = useState<Unit>('paragraphs');
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const generate = useCallback(() => {
    setOutput(generateText(unit, Math.min(count, 1000)));
  }, [unit, count]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="Lorem Ipsum Generator - BitesInByte Tools"
        description="Generate placeholder Lorem Ipsum text by words, sentences, or paragraphs. Free online lorem ipsum generator."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Lorem Ipsum Generator</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate placeholder text in words, sentences, or paragraphs.
          </Typography>
        </Box>

        {/* Controls */}
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
            value={unit}
            exclusive
            onChange={(_, v) => v && setUnit(v)}
            size="small"
          >
            <ToggleButton value="words">Words</ToggleButton>
            <ToggleButton value="sentences">Sentences</ToggleButton>
            <ToggleButton value="paragraphs">Paragraphs</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Count"
            type="number"
            size="small"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            sx={{ width: 100 }}
            slotProps={{ input: { inputProps: { min: 1, max: 1000 } } }}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="contained" startIcon={<RefreshIcon />} onClick={generate}>
            Generate
          </Button>
        </Box>

        {output && (
          <Chip
            label={`${output.split(/\s+/).length} words`}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Output */}
        {output && (
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
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
              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Generated Text</Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => downloadFile('lorem-ipsum.txt', output, 'text/plain')}
                  sx={{ color: 'text.secondary' }}
                >
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear">
                <IconButton size="small" onClick={() => setOutput('')} sx={{ color: 'text.secondary' }}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {output}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </>
  );
}
