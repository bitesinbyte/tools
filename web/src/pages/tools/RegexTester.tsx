import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

interface MatchResult {
  match: string;
  index: number;
  groups: string[];
}

const COMMON_FLAGS = [
  { flag: 'g', label: 'Global' },
  { flag: 'i', label: 'Case Insensitive' },
  { flag: 'm', label: 'Multiline' },
  { flag: 's', label: 'Dotall' },
];

const PRESETS = [
  { label: 'Email', pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', flags: 'gi' },
  { label: 'URL', pattern: 'https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+', flags: 'gi' },
  { label: 'IPv4', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', flags: 'g' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
  { label: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', flags: 'g' },
];

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { matches, error } = useMemo(() => {
    if (!pattern.trim() || !testString) return { matches: [] as MatchResult[], error: '' };
    try {
      const regex = new RegExp(pattern, flags);
      const results: MatchResult[] = [];
      if (flags.includes('g')) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(testString)) !== null) {
          results.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
          if (!m[0]) regex.lastIndex++;
        }
      } else {
        const m = regex.exec(testString);
        if (m) {
          results.push({
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
        }
      }
      return { matches: results, error: '' };
    } catch (e) {
      return { matches: [] as MatchResult[], error: (e as Error).message };
    }
  }, [pattern, flags, testString]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.replace(flag, '') : prev + flag));
  };

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="Regex Tester - BitesInByte Tools"
        description="Test regex patterns with live matching, capture groups, and common presets. Free online regex tester."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Regex Tester</Typography>
          <Typography variant="body2" color="text.secondary">
            Test regular expressions with live matching and capture group extraction.
          </Typography>
        </Box>

        {/* Pattern input */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              label="Regular Expression"
              fullWidth
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              error={!!error}
              helperText={error}
              slotProps={{
                input: {
                  endAdornment: pattern ? (
                    <Tooltip title="Clear">
                      <IconButton size="small" onClick={() => setPattern('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : undefined,
                  sx: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Flags"
              fullWidth
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
          </Grid>
        </Grid>

        {/* Flag toggles */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {COMMON_FLAGS.map((f) => (
            <Chip
              key={f.flag}
              label={`${f.flag} - ${f.label}`}
              size="small"
              variant={flags.includes(f.flag) ? 'filled' : 'outlined'}
              onClick={() => toggleFlag(f.flag)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>

        {/* Presets */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Common Patterns
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                size="small"
                variant="outlined"
                onClick={() => { setPattern(p.pattern); setFlags(p.flags); }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Test string */}
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>Test String</Typography>
            <Tooltip title="Clear">
              <IconButton size="small" onClick={() => setTestString('')} disabled={!testString} sx={{ color: 'text.secondary' }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            multiline
            rows={6}
            fullWidth
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter test string here..."
            variant="standard"
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  px: 2,
                  py: 1.5,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.8125rem',
                },
              },
            }}
          />
        </Box>

        {/* Match count */}
        {pattern && testString && !error && (
          <Chip
            label={`${matches.length} match${matches.length !== 1 ? 'es' : ''} found`}
            color={matches.length > 0 ? 'success' : 'default'}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Results */}
        {matches.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Matches
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {matches.map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < matches.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, minWidth: 28 }}>
                    {i + 1}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {m.match}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                      Index: {m.index}
                      {m.groups.length > 0 && ` | Groups: ${m.groups.join(', ')}`}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy match">
                    <IconButton size="small" onClick={() => handleCopy(m.match)} sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </>
  );
}
