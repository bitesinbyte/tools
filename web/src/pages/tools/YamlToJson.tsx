import { useState } from 'react';
import { Typography, Stack, Button, Grid, Box } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml';

export default function YamlToJson() {
  const [yamlValue, setYamlValue] = useState('');
  const [jsonValue, setJsonValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleConvert = () => {
    try {
      const parsed = yaml.load(yamlValue);
      const result = JSON.stringify(parsed, null, 2);
      setJsonValue(result);
      enqueueSnackbar('Converted to JSON', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Error: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="YAML to JSON Converter - BitesInByte Tools"
        description="Convert YAML documents to JSON format instantly. Free online converter."
      />
      <Stack spacing={2}>
        <Typography variant="h5">YAML to JSON</Typography>
        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <CodeEditor value={yamlValue} onChange={setYamlValue} language="yaml" height={500} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Button variant="contained" startIcon={<ArrowForwardIcon />} onClick={handleConvert}>
                Convert
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <CodeEditor value={jsonValue} language="json" readOnly height={500} />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
