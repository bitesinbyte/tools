import { useState } from 'react';
import { TextField, Typography, Stack, Grid, Alert } from '@mui/material';
import PageHead from '../../components/PageHead';
import { jwtDecode } from 'jwt-decode';

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    setToken(value);
    setError('');
    if (!value.trim()) {
      setHeader('');
      setPayload('');
      return;
    }
    try {
      const decoded = jwtDecode(value);
      const headerDecoded = jwtDecode(value, { header: true });
      setHeader(JSON.stringify(headerDecoded, null, 2));
      setPayload(JSON.stringify(decoded, null, 2));
    } catch {
      setError('Invalid JWT');
      setHeader('');
      setPayload('');
    }
  };

  return (
    <>
      <PageHead
        title="JWT Decoder - BitesInByte Tools"
        description="Decode and inspect JSON Web Token headers and payloads online. Free alternative to jwt.io."
      />
      <Stack spacing={2}>
        <Typography variant="h5">JWT Decoder</Typography>
        <Alert severity="warning">
          JWTs are credentials. Be careful where you paste them. We do not transmit tokens anywhere -- all decoding happens in your browser.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Encoded JWT"
              multiline
              rows={18}
              fullWidth
              value={token}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Paste your JWT here..."
              variant="outlined"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <TextField
                label="Header (Algorithm & Token Type)"
                multiline
                rows={5}
                fullWidth
                value={header}
                slotProps={{ input: { readOnly: true } }}
                variant="outlined"
              />
              <TextField
                label="Payload (Data)"
                multiline
                rows={11}
                fullWidth
                value={payload}
                slotProps={{ input: { readOnly: true } }}
                variant="outlined"
              />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
