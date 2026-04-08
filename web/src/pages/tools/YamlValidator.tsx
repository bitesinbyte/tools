import { useState, useEffect } from 'react';
import { Autocomplete, TextField, Button, Stack, Typography, Grid, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml';
import Ajv from 'ajv';

interface SchemaEntry {
  name: string;
  description?: string;
  url: string;
}

export default function YamlValidator() {
  const [schemas, setSchemas] = useState<SchemaEntry[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<SchemaEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [yamlValue, setYamlValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setLoading(true);
    fetch('https://www.schemastore.org/api/json/catalog.json')
      .then((r) => r.json())
      .then((data) => setSchemas(data.schemas ?? []))
      .catch(() => enqueueSnackbar('Failed to load schema catalog', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleValidate = async () => {
    if (!selectedSchema) {
      enqueueSnackbar('Please select a schema first', { variant: 'warning' });
      return;
    }
    try {
      const jsonObj = yaml.load(yamlValue);
      const schemaRes = await fetch(selectedSchema.url);
      const schemaJson = await schemaRes.json();
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(schemaJson);
      const valid = validate(jsonObj);
      if (valid) {
        enqueueSnackbar('Valid YAML', { variant: 'success' });
      } else {
        const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ');
        enqueueSnackbar(`Invalid YAML: ${errors}`, { variant: 'error' });
      }
    } catch (e) {
      enqueueSnackbar(`Error: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="YAML Schema Validator - BitesInByte Tools"
        description="Validate YAML documents against JSON Schema definitions from schemastore.org."
      />
      <Stack spacing={2}>
        <Typography variant="h5">YAML Schema Validator</Typography>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Autocomplete
              options={schemas}
              getOptionLabel={(o) => o.name}
              value={selectedSchema}
              onChange={(_, v) => setSelectedSchema(v)}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Schema"
                  placeholder="Search schemas..."
                  slotProps={{
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress size={20} /> : null}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              disabled={!selectedSchema}
              onClick={() => selectedSchema && window.open(selectedSchema.url, '_blank')}
            >
              View Schema
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button fullWidth variant="contained" startIcon={<CheckCircleIcon />} onClick={handleValidate}>
              Validate
            </Button>
          </Grid>
        </Grid>
        <CodeEditor value={yamlValue} onChange={setYamlValue} language="yaml" height={500} />
      </Stack>
    </>
  );
}
