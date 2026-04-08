import { useState, useMemo, useCallback } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Button,
  Box,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import TranslateIcon from '@mui/icons-material/Translate';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

// ── Constants ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FIELD_META = [
  { label: 'Minute', range: '0-59', min: 0, max: 59 },
  { label: 'Hour', range: '0-23', min: 0, max: 23 },
  { label: 'Day of Month', range: '1-31', min: 1, max: 31 },
  { label: 'Month', range: '1-12', min: 1, max: 12 },
  { label: 'Day of Week', range: '0-7', min: 0, max: 7 },
];

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every weekday at 8:30 AM', value: '30 8 * * 1-5' },
  { label: 'First day of every month', value: '0 0 1 * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every Sunday at 3 PM', value: '0 15 * * 0' },
];

// ── Cron-to-English translator ─────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const m = minute.toString().padStart(2, '0');
  return `${h.toString().padStart(2, '0')}:${m} ${period}`;
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);

    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (stepMatch) {
      const step = parseInt(stepMatch[2], 10);
      if (step <= 0) return null;
      let start = min;
      let end = max;
      if (stepMatch[1] !== '*') {
        const rm = stepMatch[1].match(/^(\d+)(?:-(\d+))?$/);
        if (!rm) return null;
        start = parseInt(rm[1], 10);
        if (rm[2] !== undefined) end = parseInt(rm[2], 10);
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (a > b) return null;
      for (let i = a; i <= b; i++) values.add(i);
    } else if (/^\d+$/.test(part)) {
      const v = parseInt(part, 10);
      if (v < min || v > max) return null;
      values.add(v);
    } else {
      return null;
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

interface FieldDescription {
  field: string;
  label: string;
  meaning: string;
}

interface TranslationResult {
  description: string;
  breakdown: FieldDescription[];
  error?: undefined;
}

interface TranslationError {
  description?: undefined;
  breakdown?: undefined;
  error: string;
}

function describeField(raw: string, fieldIndex: number): string {
  const meta = FIELD_META[fieldIndex];

  if (raw === '*') return `every ${meta.label.toLowerCase()}`;

  const stepMatch = raw.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
  if (stepMatch) {
    const step = stepMatch[2];
    const base = stepMatch[1];
    if (base === '*') return `every ${step} ${meta.label.toLowerCase()}${parseInt(step) > 1 ? 's' : ''}`;
    return `every ${step} ${meta.label.toLowerCase()}${parseInt(step) > 1 ? 's' : ''} (in ${base})`;
  }

  const parts = raw.split(',');
  const descriptions: string[] = [];

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (fieldIndex === 4) {
        descriptions.push(`${DOW_NAMES[a % 7]} through ${DOW_NAMES[b % 7]}`);
      } else if (fieldIndex === 3) {
        descriptions.push(`${MONTH_NAMES[a]} through ${MONTH_NAMES[b]}`);
      } else {
        descriptions.push(`${a} through ${b}`);
      }
    } else if (/^\d+$/.test(part)) {
      const v = parseInt(part, 10);
      if (fieldIndex === 4) {
        descriptions.push(DOW_NAMES[v % 7]);
      } else if (fieldIndex === 3) {
        descriptions.push(MONTH_NAMES[v] || String(v));
      } else {
        descriptions.push(String(v));
      }
    } else {
      descriptions.push(part);
    }
  }

  return joinList(descriptions);
}

function translateCron(expr: string): TranslationResult | TranslationError {
  const trimmed = expr.trim();
  if (!trimmed) return { error: 'Enter a cron expression' };

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return { error: `Expected 5 fields, got ${parts.length}. Format: minute hour day-of-month month day-of-week` };
  }

  const [minuteRaw, hourRaw, domRaw, monthRaw, dowRaw] = parts;

  // Validate each field can be parsed
  const minuteVals = parseField(minuteRaw, 0, 59);
  const hourVals = parseField(hourRaw, 0, 23);
  const domVals = parseField(domRaw, 1, 31);
  const monthVals = parseField(monthRaw, 1, 12);
  const dowVals = parseField(dowRaw, 0, 7);

  if (!minuteVals) return { error: `Invalid minute field: "${minuteRaw}"` };
  if (!hourVals) return { error: `Invalid hour field: "${hourRaw}"` };
  if (!domVals) return { error: `Invalid day-of-month field: "${domRaw}"` };
  if (!monthVals) return { error: `Invalid month field: "${monthRaw}"` };
  if (!dowVals) return { error: `Invalid day-of-week field: "${dowRaw}"` };

  // Build breakdown
  const breakdown: FieldDescription[] = [
    { field: minuteRaw, label: 'Minute', meaning: describeField(minuteRaw, 0) },
    { field: hourRaw, label: 'Hour', meaning: describeField(hourRaw, 1) },
    { field: domRaw, label: 'Day of Month', meaning: describeField(domRaw, 2) },
    { field: monthRaw, label: 'Month', meaning: describeField(monthRaw, 3) },
    { field: dowRaw, label: 'Day of Week', meaning: describeField(dowRaw, 4) },
  ];

  // Build the English description
  const segments: string[] = [];

  // Time part
  const isEveryMinute = minuteRaw === '*';
  const isEveryHour = hourRaw === '*';
  const minuteStep = minuteRaw.match(/^\*\/(\d+)$/);
  const hourStep = hourRaw.match(/^\*\/(\d+)$/);

  if (isEveryMinute && isEveryHour) {
    segments.push('Every minute');
  } else if (minuteStep && isEveryHour) {
    segments.push(`Every ${minuteStep[1]} minutes`);
  } else if (isEveryMinute && !isEveryHour) {
    if (hourStep) {
      segments.push(`Every minute, every ${hourStep[1]} hours`);
    } else {
      const hourDesc = hourVals.map((h) => formatTime(h, 0).replace(/:00/, ':xx')).join(', ');
      segments.push(`Every minute during hour${hourVals.length > 1 ? 's' : ''} ${hourDesc.replace(/:xx/g, '')}`);
    }
  } else if (minuteStep && !isEveryHour) {
    if (hourStep) {
      segments.push(`Every ${minuteStep[1]} minutes, every ${hourStep[1]} hours`);
    } else {
      segments.push(`Every ${minuteStep[1]} minutes, during hour${hourVals.length > 1 ? 's' : ''} ${joinList(hourVals.map(String))}`);
    }
  } else if (!isEveryMinute && isEveryHour) {
    if (minuteVals.length === 1) {
      segments.push(`At minute ${minuteVals[0]} of every hour`);
    } else {
      segments.push(`At minutes ${joinList(minuteVals.map(String))} of every hour`);
    }
  } else if (hourStep) {
    segments.push(`At minute ${joinList(minuteVals.map(String))}, every ${hourStep[1]} hours`);
  } else {
    // Specific hour(s) and minute(s)
    if (hourVals.length === 1 && minuteVals.length === 1) {
      segments.push(`At ${formatTime(hourVals[0], minuteVals[0])}`);
    } else if (minuteVals.length === 1) {
      const times = hourVals.map((h) => formatTime(h, minuteVals[0]));
      segments.push(`At ${joinList(times)}`);
    } else {
      const minuteList = joinList(minuteVals.map((m) => m.toString().padStart(2, '0')));
      const hourList = joinList(hourVals.map((h) => formatTime(h, 0).replace(/:00\s/, ' ')));
      segments.push(`At minute${minuteVals.length > 1 ? 's' : ''} ${minuteList}, at ${hourList}`);
    }
  }

  // Day of month part
  if (domRaw !== '*') {
    const domStep = domRaw.match(/^\*\/(\d+)$/);
    if (domStep) {
      segments.push(`every ${domStep[1]} days`);
    } else if (domVals.length === 1) {
      segments.push(`on day ${ordinal(domVals[0])} of the month`);
    } else {
      segments.push(`on days ${joinList(domVals.map(ordinal))} of the month`);
    }
  }

  // Month part
  if (monthRaw !== '*') {
    const monthStep = monthRaw.match(/^\*\/(\d+)$/);
    if (monthStep) {
      segments.push(`every ${monthStep[1]} months`);
    } else {
      const names = monthVals.map((m) => MONTH_NAMES[m] || String(m));
      // Check for range in raw
      if (monthRaw.includes('-') && !monthRaw.includes(',')) {
        const rm = monthRaw.match(/^(\d+)-(\d+)$/);
        if (rm) {
          segments.push(`in ${MONTH_NAMES[parseInt(rm[1])]} through ${MONTH_NAMES[parseInt(rm[2])]}`);
        } else {
          segments.push(`only in ${joinList(names)}`);
        }
      } else {
        segments.push(`only in ${joinList(names)}`);
      }
    }
  }

  // Day of week part
  if (dowRaw !== '*') {
    const dowStep = dowRaw.match(/^\*\/(\d+)$/);
    if (dowStep) {
      segments.push(`every ${dowStep[1]} days of the week`);
    } else {
      // Normalize: 7 -> 0 (both are Sunday)
      const normalized = dowVals.map((d) => d % 7);
      const unique = [...new Set(normalized)].sort((a, b) => a - b);
      const names = unique.map((d) => DOW_NAMES[d]);

      if (dowRaw.includes('-') && !dowRaw.includes(',')) {
        const rm = dowRaw.match(/^(\d+)-(\d+)$/);
        if (rm) {
          segments.push(`only on ${DOW_NAMES[parseInt(rm[1]) % 7]} through ${DOW_NAMES[parseInt(rm[2]) % 7]}`);
        } else {
          segments.push(`only on ${joinList(names)}`);
        }
      } else {
        segments.push(`only on ${joinList(names)}`);
      }
    }
  }

  return {
    description: segments.join(', '),
    breakdown,
  };
}

// ── Component ──────────────────────────────────────────────────────────

export default function CronTranslator() {
  const [expression, setExpression] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const result = useMemo(() => translateCron(expression), [expression]);

  const handleCopy = useCallback(async () => {
    if (!result.description) return;
    const ok = await copyToClipboard(result.description);
    enqueueSnackbar(ok ? 'Translation copied!' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  }, [result, enqueueSnackbar]);

  return (
    <>
      <PageHead
        title="Cron to English Translator - BitesInByte Tools"
        description="Translate cron expressions to human-readable English descriptions. Free online cron translator."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Cron to English Translator</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a cron expression to see its plain-English description and field breakdown.
          </Typography>
        </Box>

        {/* Input */}
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 9 }}>
            <TextField
              label="Cron Expression"
              fullWidth
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="* * * * *"
              error={!!expression.trim() && !!result.error}
              helperText={expression.trim() && result.error ? result.error : 'Format: minute hour day-of-month month day-of-week'}
              slotProps={{
                input: {
                  endAdornment: expression ? (
                    <Tooltip title="Clear">
                      <IconButton size="small" onClick={() => setExpression('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : undefined,
                  sx: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '1rem',
                  },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              fullWidth
              onClick={handleCopy}
              disabled={!result.description}
            >
              Copy Translation
            </Button>
          </Grid>
        </Grid>

        {/* Presets */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Common Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                size="small"
                variant={expression === p.value ? 'filled' : 'outlined'}
                onClick={() => setExpression(p.value)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* English translation */}
        {result.description && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: 1,
              borderColor: 'primary.main',
              bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <TranslateIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                English Translation
              </Typography>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {result.description}
              </Typography>
            </Box>
            <Tooltip title="Copy translation">
              <IconButton size="small" onClick={handleCopy} sx={{ color: 'primary.main' }}>
                <ContentCopyIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Field breakdown */}
        {result.breakdown && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Field Breakdown
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {result.breakdown.map((item, i) => (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < result.breakdown!.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      minWidth: 48,
                      textAlign: 'center',
                      color: 'primary.main',
                    }}
                  >
                    {item.field}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {item.meaning}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Cron format reference */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Field Reference
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1,
              textAlign: 'center',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {FIELD_META.map((f) => (
              <Box key={f.label}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 0.25 }}>*</Typography>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.primary' }}>
                  {f.label}
                </Typography>
                <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
                  ({f.range})
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Syntax reference */}
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Syntax
            </Typography>
            <Grid container spacing={1}>
              {[
                { syntax: '*', desc: 'Any value' },
                { syntax: '*/n', desc: 'Every n intervals' },
                { syntax: 'n-m', desc: 'Range (n through m)' },
                { syntax: 'n,m', desc: 'List (n and m)' },
                { syntax: 'n', desc: 'Specific value' },
              ].map((item) => (
                <Grid key={item.syntax} size={{ xs: 6, sm: 4, md: 2.4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'primary.main',
                      }}
                    >
                      {item.syntax}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Stack>
    </>
  );
}
