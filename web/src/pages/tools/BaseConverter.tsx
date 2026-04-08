import { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch,
  alpha,
  useTheme,
  MenuItem,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

interface BaseOption {
  label: string;
  value: number;
  prefix: string;
  pattern: RegExp;
  hint: string;
}

const BASES: BaseOption[] = [
  { label: 'Binary', value: 2, prefix: '0b', pattern: /^[01]+$/, hint: '0-1' },
  { label: 'Octal', value: 8, prefix: '0o', pattern: /^[0-7]+$/, hint: '0-7' },
  { label: 'Decimal', value: 10, prefix: '', pattern: /^[0-9]+$/, hint: '0-9' },
  { label: 'Hexadecimal', value: 16, prefix: '0x', pattern: /^[0-9a-fA-F]+$/, hint: '0-9, a-f' },
];

const PRESETS = [
  { label: '255', value: '255', base: 10 },
  { label: '1024', value: '1024', base: 10 },
  { label: '65535', value: '65535', base: 10 },
  { label: '0xFF', value: 'FF', base: 16 },
  { label: '0xDEAD', value: 'DEAD', base: 16 },
  { label: '0b11111111', value: '11111111', base: 2 },
  { label: 'MAX_SAFE_INTEGER', value: '9007199254740991', base: 10 },
];

function stripPrefix(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) return trimmed.slice(2);
  if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) return trimmed.slice(2);
  if (trimmed.startsWith('0o') || trimmed.startsWith('0O')) return trimmed.slice(2);
  return trimmed;
}

function parseBigInt(digits: string, base: number): bigint {
  const clean = digits.toLowerCase();
  let result = 0n;
  const b = BigInt(base);
  for (const ch of clean) {
    const digit = ch >= 'a' ? ch.charCodeAt(0) - 87 : ch.charCodeAt(0) - 48;
    result = result * b + BigInt(digit);
  }
  return result;
}

function bigIntToBase(value: bigint, base: number): string {
  if (value === 0n) return '0';
  const b = BigInt(base);
  const digits: string[] = [];
  let v = value;
  while (v > 0n) {
    const rem = Number(v % b);
    digits.push(rem < 10 ? String(rem) : String.fromCharCode(87 + rem));
    v = v / b;
  }
  return digits.reverse().join('');
}

function groupBinary(bin: string): string {
  const padded = bin.length % 4 === 0 ? bin : bin.padStart(Math.ceil(bin.length / 4) * 4, '0');
  return padded.match(/.{1,4}/g)?.join(' ') ?? bin;
}

export default function BaseConverter() {
  const [input, setInput] = useState('');
  const [fromBase, setFromBase] = useState(10);
  const [showPrefixes, setShowPrefixes] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const currentBase = BASES.find((b) => b.value === fromBase)!;

  const result = useMemo(() => {
    const raw = stripPrefix(input);
    if (!raw) return null;
    if (!currentBase.pattern.test(raw)) {
      return { error: `Invalid ${currentBase.label.toLowerCase()} digit. Allowed: ${currentBase.hint}` };
    }
    try {
      const decimal = parseBigInt(raw, fromBase);
      return {
        value: decimal,
        binary: bigIntToBase(decimal, 2),
        octal: bigIntToBase(decimal, 8),
        decimal: bigIntToBase(decimal, 10),
        hex: bigIntToBase(decimal, 16),
      };
    } catch {
      return { error: 'Failed to parse number' };
    }
  }, [input, fromBase, currentBase]);

  const handleCopy = useCallback(async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  }, [enqueueSnackbar]);

  const handlePreset = (value: string, base: number) => {
    setFromBase(base);
    setInput(value);
  };

  const outputs = result && !('error' in result)
    ? [
        {
          label: 'Binary',
          value: result.binary,
          display: groupBinary(result.binary),
          prefix: '0b',
        },
        {
          label: 'Octal',
          value: result.octal,
          display: result.octal,
          prefix: '0o',
        },
        {
          label: 'Decimal',
          value: result.decimal,
          display: result.decimal,
          prefix: '',
        },
        {
          label: 'Hexadecimal',
          value: result.hex,
          display: result.hex.toUpperCase(),
          prefix: '0x',
        },
      ]
    : null;

  return (
    <>
      <PageHead
        title="Base Converter - BitesInByte Tools"
        description="Convert numbers between binary, octal, decimal, and hexadecimal with BigInt support. Free online base converter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Base Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert numbers between binary (base 2), octal (base 8), decimal (base 10), and hexadecimal (base 16).
          </Typography>
        </Box>

        {/* Input */}
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>
              Input
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showPrefixes}
                  onChange={(e) => setShowPrefixes(e.target.checked)}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  Prefixes
                </Typography>
              }
              sx={{ mr: 1 }}
            />
            <Tooltip title="Clear">
              <IconButton
                size="small"
                onClick={() => setInput('')}
                disabled={!input}
                sx={{ color: 'text.secondary' }}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="From Base"
                  value={fromBase}
                  onChange={(e) => {
                    setFromBase(Number(e.target.value));
                    setInput('');
                  }}
                  size="small"
                >
                  {BASES.map((b) => (
                    <MenuItem key={b.value} value={b.value}>
                      {b.label} (base {b.value})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label={`${currentBase.label} Number`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Enter a ${currentBase.label.toLowerCase()} number (digits: ${currentBase.hint})`}
                  size="small"
                  error={!!result && 'error' in result}
                  helperText={result && 'error' in result ? result.error : `Allowed digits: ${currentBase.hint}`}
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
          </Box>
        </Box>

        {/* Results */}
        {outputs && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Conversion Results
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {outputs.map((out, i) => {
                const copyValue = showPrefixes && out.prefix
                  ? `${out.prefix}${out.display.replace(/\s/g, '')}`
                  : out.display.replace(/\s/g, '');
                return (
                  <Box
                    key={out.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      px: 2,
                      py: 1.5,
                      borderBottom: i < outputs.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'text.secondary',
                        minWidth: 90,
                      }}
                    >
                      {out.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.8125rem',
                        flex: 1,
                        wordBreak: 'break-all',
                      }}
                    >
                      {showPrefixes && out.prefix && (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          {out.prefix}
                        </Box>
                      )}
                      {out.display}
                    </Typography>
                    <Tooltip title="Copy">
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(copyValue)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Bit info */}
        {result && !('error' in result) && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bit Info
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Bit Length', value: result.binary.length.toString() },
                { label: 'Byte Length', value: Math.ceil(result.binary.length / 8).toString() },
                { label: 'Hex Digits', value: result.hex.length.toString() },
              ].map((item) => (
                <Grid key={item.label} size={{ xs: 4 }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {item.value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Quick presets */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                size="small"
                variant="outlined"
                onClick={() => handlePreset(p.value, p.base)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
