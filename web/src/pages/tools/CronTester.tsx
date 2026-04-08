import { useState, useMemo, useCallback } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Button,
  Grid,
  Chip,
  Box,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import ClearIcon from '@mui/icons-material/Clear';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'react-router-dom';
import { copyToClipboard } from '../../utils/file';
import CronExpressionParser from 'cron-parser';
import cronstrue from 'cronstrue';

const presets = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Monday 9 AM', value: '0 9 * * 1' },
  { label: 'Weekdays at noon', value: '0 12 * * 1-5' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: '1st of every month', value: '0 0 1 * *' },
  { label: 'Every Sunday 3 AM', value: '0 3 * * 0' },
];

function computeOccurrences(expr: string, count: number, from?: Date): string[] {
  try {
    const interval = CronExpressionParser.parse(expr, { currentDate: from ?? new Date() });
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      results.push(interval.next().toDate().toLocaleString());
    }
    return results;
  } catch {
    return [];
  }
}

export default function CronTester() {
  const [searchParams] = useSearchParams();
  const initialExpr = searchParams.get('expression')?.replace(/\+/g, ' ') ?? '';
  const [expression, setExpression] = useState(initialExpr);
  const [extraOccurrences, setExtraOccurrences] = useState<{ expr: string; items: string[] }>({ expr: expression, items: [] });
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { description, error, initialOccurrences } = useMemo(() => {
    if (!expression.trim()) {
      return { description: '', error: '', initialOccurrences: [] as string[] };
    }
    try {
      const desc = cronstrue.toString(expression);
      const occ = computeOccurrences(expression, 10);
      return { description: desc, error: '', initialOccurrences: occ };
    } catch (e) {
      return { description: '', error: (e as Error).message, initialOccurrences: [] as string[] };
    }
  }, [expression]);

  const occurrences = useMemo(() => {
    const extras = extraOccurrences.expr === expression ? extraOccurrences.items : [];
    return [...initialOccurrences, ...extras];
  }, [initialOccurrences, extraOccurrences, expression]);

  const handleMore = useCallback(() => {
    if (!expression.trim()) return;
    const allOcc = [...initialOccurrences, ...(extraOccurrences.expr === expression ? extraOccurrences.items : [])];
    const lastDate = allOcc.length > 0 ? new Date(allOcc[allOcc.length - 1]) : new Date();
    const more = computeOccurrences(expression, 10, lastDate);
    setExtraOccurrences((prev) => ({
      expr: expression,
      items: prev.expr === expression ? [...prev.items, ...more] : more,
    }));
  }, [expression, initialOccurrences, extraOccurrences]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/cron?expression=${expression.replace(/ /g, '+')}`;
    const ok = await copyToClipboard(url);
    enqueueSnackbar(ok ? 'Link copied!' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  return (
    <>
      <PageHead
        title="Cron Expression Tester - BitesInByte Tools"
        description="Parse and test cron expressions with next occurrence previews. Free online cron tester."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Cron Expression Tester</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a cron expression or pick a preset to see next occurrences.
          </Typography>
        </Box>

        {/* Input */}
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              label="Cron Expression"
              fullWidth
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="* * * * *"
              error={!!error}
              helperText={error || (description && `"${description}"`)}
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
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} fullWidth onClick={handleMore} disabled={!expression.trim()}>
              More
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="outlined" startIcon={<LinkIcon />} fullWidth onClick={handleCopyLink} disabled={!expression.trim()}>
              Copy Link
            </Button>
          </Grid>
        </Grid>

        {/* Presets */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Common Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {presets.map((p) => (
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

        {/* Description badge */}
        {description && (
          <Chip
            icon={<ScheduleIcon />}
            label={description}
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
        )}

        {/* Occurrences */}
        {occurrences.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Next {occurrences.length} Occurrences
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
              {occurrences.map((occ, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < occurrences.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      fontWeight: 600,
                      minWidth: 28,
                    }}
                  >
                    {i + 1}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {occ}
                  </Typography>
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
            Cron Format
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
            {[
              { field: '*', label: 'Minute', range: '0-59' },
              { field: '*', label: 'Hour', range: '0-23' },
              { field: '*', label: 'Day', range: '1-31' },
              { field: '*', label: 'Month', range: '1-12' },
              { field: '*', label: 'Weekday', range: '0-6' },
            ].map((f) => (
              <Box key={f.label}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 0.25 }}>{f.field}</Typography>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.primary' }}>
                  {f.label}
                </Typography>
                <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>
                  ({f.range})
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
