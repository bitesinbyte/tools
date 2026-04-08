import { useState, useCallback } from 'react';
import { Button, Typography, Stack } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { CodeDiffEditor } from '../../components/CodeEditor';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { readFileAsText } from '../../utils/file';

export default function TextCompare() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length < 2) {
      enqueueSnackbar('Please select exactly 2 files', { variant: 'warning' });
      return;
    }
    try {
      const [text1, text2] = await Promise.all([readFileAsText(files[0]), readFileAsText(files[1])]);
      setOriginal(text1);
      setModified(text2);
    } catch {
      enqueueSnackbar('Failed to read files', { variant: 'error' });
    }
    e.target.value = '';
  }, [enqueueSnackbar]);

  return (
    <>
      <PageHead
        title="Text & File Compare - BitesInByte Tools"
        description="Compare two text inputs or uploaded files side-by-side with diff highlighting."
      />
      <Stack spacing={2}>
        <Typography variant="h5">Text & File Compare</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter text directly in the editors below, or upload two files to compare.
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Upload 2 Files
          <input type="file" hidden multiple onChange={handleUpload} />
        </Button>
        <CodeDiffEditor original={original} modified={modified} height={550} />
      </Stack>
    </>
  );
}
