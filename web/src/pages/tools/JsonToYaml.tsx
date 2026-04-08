import { useState } from 'react';
import { Typography, Stack, Button, Grid, Box } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml';

export default function JsonToYaml() {
  const [jsonValue, setJsonValue] = useState('');
  const [yamlValue, setYamlValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleConvert = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      const result = yaml.dump(parsed, { indent: 2, lineWidth: -1 });
      setYamlValue(result);
      enqueueSnackbar('Converted to YAML', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Error: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="JSON to YAML Converter - BitesInByte Tools"
        description="Convert JSON documents to YAML format instantly. Free online converter."
      />
      <Stack spacing={2}>
        <Typography variant="h5">JSON to YAML</Typography>
        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <CodeEditor value={jsonValue} onChange={setJsonValue} language="json" height={500} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Button variant="contained" startIcon={<ArrowForwardIcon />} onClick={handleConvert}>
                Convert
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <CodeEditor value={yamlValue} language="yaml" readOnly height={500} />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
