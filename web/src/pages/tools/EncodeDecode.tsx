import { useState } from 'react';
import {
  Typography,
  Stack,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Box,
} from '@mui/material';
import TransformIcon from '@mui/icons-material/Transform';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';

type Mode = 'encode' | 'decode';

function useCodec() {
  const base64 = {
    encode: (s: string) => btoa(unescape(encodeURIComponent(s))),
    decode: (s: string) => decodeURIComponent(escape(atob(s))),
  };

  const url = {
    encode: (s: string) => encodeURIComponent(s),
    decode: (s: string) => decodeURIComponent(s),
  };

  const html = {
    encode: (s: string) => {
      const el = document.createElement('div');
      el.textContent = s;
      return el.innerHTML;
    },
    decode: (s: string) => {
      const el = document.createElement('div');
      el.innerHTML = s;
      return el.textContent ?? '';
    },
  };

  return { base64, url, html };
}

const tabLabels = ['Base64', 'URL', 'HTML'] as const;
type TabKey = 'base64' | 'url' | 'html';
const tabKeys: TabKey[] = ['base64', 'url', 'html'];

export default function EncodeDecode() {
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const codecs = useCodec();

  const handleConvert = () => {
    try {
      const codec = codecs[tabKeys[tab]];
      const result = mode === 'encode' ? codec.encode(input) : codec.decode(input);
      setOutput(result);
      enqueueSnackbar('Converted successfully', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(`Error: ${(e as Error).message}`, { variant: 'error' });
    }
  };

  const handleTabChange = (_: unknown, newTab: number) => {
    setTab(newTab);
    setInput('');
    setOutput('');
  };

  return (
    <>
      <PageHead
        title="Encode / Decode - BitesInByte Tools"
        description="Encode and decode strings in Base64, URL, and HTML formats. Free online encoder/decoder."
      />
      <Stack spacing={2}>
        <Typography variant="h5">Encode / Decode</Typography>
        <Tabs value={tab} onChange={handleTabChange}>
          {tabLabels.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
          >
            <ToggleButton value="encode">Encode</ToggleButton>
            <ToggleButton value="decode">Decode</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<TransformIcon />} onClick={handleConvert}>
            Convert
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Input"
              multiline
              rows={16}
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text..."
              variant="outlined"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Result"
              multiline
              rows={16}
              fullWidth
              value={output}
              slotProps={{ input: { readOnly: true } }}
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
