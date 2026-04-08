import { useState, useEffect, useCallback } from 'react';
import { TextField, Typography, Stack, Button, List, ListItem, ListItemText, Grid, Chip, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'react-router-dom';
import { copyToClipboard } from '../../utils/file';
import CronExpressionParser from 'cron-parser';
import cronstrue from 'cronstrue';

export default function CronTester() {
  const [searchParams] = useSearchParams();
  const initialExpr = searchParams.get('expression')?.replace(/\+/g, ' ') ?? '0 12 * * 1-5';
  const [expression, setExpression] = useState(initialExpr);
  const [occurrences, setOccurrences] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const computeOccurrences = useCallback((expr: string, count: number, from?: Date) => {
    try {
      const interval = CronExpressionParser.parse(expr, { currentDate: from ?? new Date() });
      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        const next = interval.next();
        results.push(next.toDate().toLocaleString());
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    setError('');
    setDescription('');
    if (!expression.trim()) {
      setOccurrences([]);
      return;
    }
    try {
      const desc = cronstrue.toString(expression);
      setDescription(desc);
      setOccurrences(computeOccurrences(expression, 10));
    } catch (e) {
      setError((e as Error).message);
      setOccurrences([]);
    }
  }, [expression, computeOccurrences]);

  const handleMore = () => {
    if (!expression.trim()) return;
    const lastDate = occurrences.length > 0 ? new Date(occurrences[occurrences.length - 1]) : new Date();
    const more = computeOccurrences(expression, 10, lastDate);
    setOccurrences((prev) => [...prev, ...more]);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/NCrontab?expression=${expression.replace(/ /g, '+')}`;
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
        <Typography variant="h5">Cron Expression Tester</Typography>
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
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="outlined" startIcon={<AddIcon />} fullWidth onClick={handleMore}>
              More
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="outlined" startIcon={<LinkIcon />} fullWidth onClick={handleCopyLink}>
              Copy Link
            </Button>
          </Grid>
        </Grid>
        {description && <Chip label={description} variant="outlined" sx={{ alignSelf: 'flex-start' }} />}
        {occurrences.length > 0 && (
          <Box
            sx={{
              maxHeight: 400,
              overflow: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: '8px',
              p: 1,
            }}
          >
            <List dense>
              {occurrences.map((occ, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={occ}
                    slotProps={{
                      primary: {
                        sx: {
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: 14,
                        },
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Stack>
    </>
  );
}
