import { useState, useCallback } from 'react';
import {
  Button,
  TextField,
  Typography,
  Stack,
  Grid,
  Box,
  Chip,
  alpha,
  useTheme,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import Papa from 'papaparse';
import { downloadFile, readFileAsText } from '../../utils/file';

export default function CsvDelimiter() {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [oldDelimiter, setOldDelimiter] = useState('');
  const [newDelimiter, setNewDelimiter] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
        setCsvData(result.data);
        setFileName(file.name);

        // Detect delimiter
        const firstLine = text.split('\n')[0] ?? '';
        const delimiters = [',', ';', '\t', '|'];
        const detected = delimiters.find((d) => firstLine.includes(d)) ?? ',';
        setOldDelimiter(detected === '\t' ? '\\t' : detected);

        enqueueSnackbar(`Loaded ${file.name} (${result.data.length} rows)`, { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to parse CSV file', { variant: 'error' });
      }
    },
    [enqueueSnackbar],
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) await loadFile(file);
    },
    [loadFile],
  );

  const handleConvert = () => {
    if (!csvData) return;
    const delimiter = newDelimiter === '\\t' ? '\t' : newDelimiter;
    const output = Papa.unparse(csvData, { delimiter });
    downloadFile(fileName ? `converted-${fileName}` : 'bitesinbyte-csv-tool.csv', output);
    enqueueSnackbar('File downloaded', { variant: 'success' });
  };

  const presetDelimiters = [
    { label: 'Comma', value: ',' },
    { label: 'Semicolon', value: ';' },
    { label: 'Tab', value: '\\t' },
    { label: 'Pipe', value: '|' },
  ];

  return (
    <>
      <PageHead
        title="CSV Delimiter Changer - BitesInByte Tools"
        description="Upload a CSV file and change its delimiter to any character. Free online CSV delimiter converter."
      />
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>CSV Delimiter Changer</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a CSV file, pick a new delimiter, and download the converted file.
          </Typography>
        </Box>

        {/* Drop zone */}
        {!csvData && (
          <Box
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: isDragOver ? 'primary.main' : 'divider',
              borderRadius: 3,
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              bgcolor: isDragOver
                ? isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02)
                : 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            component="label"
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
              Drop a CSV file here, or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports .csv, .tsv, and .txt files
            </Typography>
            <input type="file" hidden accept=".csv,.tsv,.txt" onChange={handleUpload} />
          </Box>
        )}

        {/* File loaded controls */}
        {csvData && (
          <>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                <Chip label={fileName} variant="outlined" size="small" />
                <Chip label={`${csvData.length} rows`} variant="outlined" size="small" />
                <Chip label={`${csvData[0]?.length ?? 0} columns`} variant="outlined" size="small" />
                <Chip
                  label={`Delimiter: "${oldDelimiter}"`}
                  variant="outlined"
                  size="small"
                  color="info"
                />

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Replace File
                  <input type="file" hidden accept=".csv,.tsv,.txt" onChange={handleUpload} />
                </Button>
              </Box>

              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    label="New Delimiter"
                    fullWidth
                    size="small"
                    value={newDelimiter}
                    onChange={(e) => setNewDelimiter(e.target.value)}
                    placeholder="e.g., ; or | or \\t"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {presetDelimiters.map((d) => (
                      <Chip
                        key={d.value}
                        label={d.label}
                        size="small"
                        variant={newDelimiter === d.value ? 'filled' : 'outlined'}
                        onClick={() => setNewDelimiter(d.value)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    fullWidth
                    disabled={!newDelimiter}
                    onClick={handleConvert}
                  >
                    Convert & Download
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Preview table */}
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preview (first 10 rows)
              </Typography>
              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  maxHeight: 400,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
                        }}
                      >
                        #
                      </TableCell>
                      {csvData[0]?.map((_, colIndex) => (
                        <TableCell
                          key={colIndex}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
                          }}
                        >
                          Col {colIndex + 1}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvData.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex} hover>
                        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {rowIndex + 1}
                        </TableCell>
                        {row.map((cell, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            sx={{
                              fontSize: '0.8125rem',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {csvData.length > 10 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
                  Showing 10 of {csvData.length} rows
                </Typography>
              )}
            </Box>
          </>
        )}
      </Stack>
    </>
  );
}
