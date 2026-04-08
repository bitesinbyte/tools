import { useState } from 'react';
import { Button, Typography, Stack } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import { CodeEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';

export default function JsonFormatter() {
  const [value, setValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
      enqueueSnackbar('Valid JSON', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Invalid JSON: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHead
        title="JSON Formatter & Validator - BitesInByte Tools"
        description="Format, validate, and beautify JSON online with syntax highlighting. Free browser-based JSON formatter."
      />
      <Stack spacing={2}>
        <Typography variant="h5">JSON Formatter & Validator</Typography>
        <Button
          variant="contained"
          startIcon={<FormatAlignLeftIcon />}
          onClick={handleFormat}
          sx={{ alignSelf: 'flex-start' }}
        >
          Format
        </Button>
        <CodeEditor value={value} onChange={setValue} language="json" height={500} />
      </Stack>
    </>
  );
}
