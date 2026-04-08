import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
import { CodeEditor } from '../../components/CodeEditor';
import { format } from 'sql-formatter';

const SQL_DIALECTS = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'transactsql', label: 'SQL Server (T-SQL)' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'plsql', label: 'PL/SQL' },
] as const;

type SqlDialect = (typeof SQL_DIALECTS)[number]['value'];

const SAMPLE_SQL = `SELECT u.id, u.name, u.email, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at > '2024-01-01' AND u.status = 'active' GROUP BY u.id, u.name, u.email HAVING COUNT(o.id) > 0 ORDER BY total_spent DESC LIMIT 100;`;

export default function SqlFormatter() {
  const [input, setInput] = useState(SAMPLE_SQL);
  const [dialect, setDialect] = useState<SqlDialect>('sql');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { formatted, error } = useMemo(() => {
    if (!input.trim()) return { formatted: '', error: '' };
    try {
      const result = format(input, {
        language: dialect,
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2,
      });
      return { formatted: result, error: '' };
    } catch (e) {
      return { formatted: '', error: (e as Error).message };
    }
  }, [input, dialect]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(formatted);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="SQL Formatter - BitesInByte Tools"
        description="Format and beautify SQL queries with support for multiple dialects. Free online SQL formatter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>SQL Formatter</Typography>
          <Typography variant="body2" color="text.secondary">
            Format and beautify SQL queries. Supports MySQL, PostgreSQL, SQL Server, and more.
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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>SQL Dialect</InputLabel>
            <Select
              value={dialect}
              label="SQL Dialect"
              onChange={(e) => setDialect(e.target.value as SqlDialect)}
            >
              {SQL_DIALECTS.map((d) => (
                <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Paste">
            <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
              <ContentPasteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={() => setInput('')} disabled={!input} sx={{ color: 'text.secondary' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Chip label={error} color="error" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} />
        )}

        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Input
            </Typography>
            <CodeEditor
              value={input}
              onChange={(v) => setInput(v)}
              language="sql"
              height={400}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                Formatted
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={handleCopy} disabled={!formatted} sx={{ color: 'text.secondary' }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => downloadFile('formatted.sql', formatted, 'text/plain')}
                  disabled={!formatted}
                  sx={{ color: 'text.secondary' }}
                >
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <CodeEditor
              value={formatted}
              language="sql"
              readOnly
              height={400}
            />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
