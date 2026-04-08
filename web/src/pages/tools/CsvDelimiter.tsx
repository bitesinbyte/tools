import { useState } from 'react';
import { Button, TextField, Typography, Stack, Grid } from '@mui/material';
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
  const { enqueueSnackbar } = useSnackbar();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      enqueueSnackbar('CSV file loaded', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to parse CSV file', { variant: 'error' });
    }
    e.target.value = '';
  };

  const handleConvert = () => {
    if (!csvData) return;
    const delimiter = newDelimiter === '\\t' ? '\t' : newDelimiter;
    const output = Papa.unparse(csvData, { delimiter });
    downloadFile(fileName ? `converted-${fileName}` : 'bitesinbyte-csv-tool.csv', output);
    enqueueSnackbar('File downloaded', { variant: 'success' });
  };

  return (
    <>
      <PageHead
        title="CSV Delimiter Changer - BitesInByte Tools"
        description="Upload a CSV file and change its delimiter to any character. Free online CSV delimiter converter."
      />
      <Stack spacing={3}>
        <Typography variant="h5">CSV Delimiter Changer</Typography>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} fullWidth>
              Upload CSV File
              <input type="file" hidden accept=".csv,.tsv,.txt" onChange={handleUpload} />
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Detected Delimiter"
              fullWidth
              value={oldDelimiter}
              onChange={(e) => setOldDelimiter(e.target.value)}
              slotProps={{ input: { readOnly: !csvData } }}
              placeholder="Auto-detected"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="New Delimiter"
              fullWidth
              value={newDelimiter}
              onChange={(e) => setNewDelimiter(e.target.value)}
              disabled={!csvData}
              placeholder="e.g., ; or | or \\t"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              fullWidth
              disabled={!csvData || !newDelimiter}
              onClick={handleConvert}
              sx={{ height: 56 }}
            >
              Convert & Download
            </Button>
          </Grid>
        </Grid>
        {csvData && (
          <Typography variant="body2" color="text.secondary">
            Loaded {csvData.length} rows from "{fileName}"
          </Typography>
        )}
      </Stack>
    </>
  );
}
