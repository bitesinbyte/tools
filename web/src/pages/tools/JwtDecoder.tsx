import { useState, useMemo } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Grid,
  Alert,
  Box,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { jwtDecode } from 'jwt-decode';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

/** Labels for common JWT claims */
const claimLabels: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
  name: 'Full Name',
  email: 'Email',
  role: 'Role',
  roles: 'Roles',
  scope: 'Scope',
  azp: 'Authorized Party',
  nonce: 'Nonce',
  auth_time: 'Auth Time',
  at_hash: 'Access Token Hash',
  c_hash: 'Code Hash',
  typ: 'Type',
  alg: 'Algorithm',
  kid: 'Key ID',
};

function isTimestamp(key: string, value: unknown): boolean {
  return (
    typeof value === 'number' &&
    ['exp', 'nbf', 'iat', 'auth_time'].includes(key)
  );
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  if (!Number.isFinite(ts) || Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  });
}

function isExpired(payload: Record<string, unknown>): boolean | null {
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
  return Date.now() / 1000 > payload.exp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateJwtShape(token: string): void {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    throw new Error('A JWT must contain three dot-separated parts');
  }
  if (!parts.every((part) => /^[A-Za-z0-9_-]*$/.test(part))) {
    throw new Error('JWT parts must use Base64URL characters');
  }
  if (parts[0].length % 4 === 1 || parts[1].length % 4 === 1) {
    throw new Error('JWT contains malformed Base64URL data');
  }
}

interface ClaimRowProps {
  claimKey: string;
  value: unknown;
}

function ClaimRow({ claimKey, value }: ClaimRowProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const label = claimLabels[claimKey];
  const isTs = isTimestamp(claimKey, value);

  const displayValue = isTs
    ? formatTimestamp(value as number)
    : typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 0.5, sm: 2 },
        py: 1.5,
        px: 2,
        borderRadius: 1.5,
        '&:hover': {
          bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
        },
      }}
    >
      <Box sx={{ minWidth: 160, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {claimKey}
        </Typography>
        {label && (
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.25 }}>
            {label}
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.8125rem',
            color: 'text.secondary',
            wordBreak: 'break-all',
            whiteSpace: typeof value === 'object' ? 'pre-wrap' : 'normal',
          }}
        >
          {displayValue}
        </Typography>
        {isTs && (
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.25 }}>
            Unix: {String(value)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function SectionCard({
  title,
  data,
  onCopy,
}: {
  title: string;
  data: Record<string, unknown>;
  onCopy: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const entries = Object.entries(data);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</Typography>
        <Tooltip title="Copy as JSON">
          <IconButton size="small" onClick={onCopy} aria-label={`Copy ${title} as JSON`} sx={{ color: 'text.secondary' }}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ py: 0.5 }}>
        {entries.map(([key, val]) => (
          <ClaimRow key={key} claimKey={key} value={val} />
        ))}
        {entries.length === 0 && (
          <Typography sx={{ p: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
            No claims found
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const decoded = useMemo(() => {
    const trimmedToken = token.trim();
    if (!trimmedToken) return null;
    try {
      validateJwtShape(trimmedToken);
      const header: unknown = jwtDecode(trimmedToken, { header: true });
      const payload: unknown = jwtDecode(trimmedToken);
      if (!isRecord(header) || !isRecord(payload)) {
        throw new Error('JWT header and payload must be JSON objects');
      }
      return { header, payload, error: null };
    } catch (error) {
      return {
        header: null,
        payload: null,
        error: error instanceof Error ? error.message : 'Invalid JWT token',
      };
    }
  }, [token]);

  const expired = decoded?.payload ? isExpired(decoded.payload) : null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleCopySection = async (data: Record<string, unknown>) => {
    const ok = await copyToClipboard(JSON.stringify(data, null, 2));
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const parts = token.trim().split('.');

  return (
    <>
      <PageHead
        title="JWT Decoder - BitesInByte Tools"
        description="Decode and inspect JSON Web Token headers and payloads online. Free alternative to jwt.io."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>JWT Decoder</Typography>
          <Typography variant="body2" color="text.secondary">
            Paste a JWT token to instantly decode and inspect its header and payload.
          </Typography>
        </Box>

        <Alert severity="info" variant="outlined">
          Decoding happens in your browser and does not verify the token signature.
        </Alert>

        {/* Token input */}
        <Box
          sx={{
            border: 1,
            borderColor: decoded?.error ? 'error.main' : 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>Encoded Token</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Paste from clipboard">
                <IconButton size="small" onClick={handlePaste} aria-label="Paste JWT" sx={{ color: 'text.secondary' }}>
                  <ContentPasteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear">
                <IconButton
                  size="small"
                  onClick={() => setToken('')}
                  disabled={!token}
                  aria-label="Clear token"
                  sx={{ color: 'text.secondary' }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <TextField
            multiline
            rows={4}
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            variant="standard"
            aria-label="Encoded JWT"
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  px: 2,
                  py: 1.5,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.8125rem',
                },
              },
            }}
          />
        </Box>

        {/* Token part badges */}
        {token.trim() && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`${parts.length} parts`}
              size="small"
              variant="outlined"
              color={parts.length === 3 ? 'success' : 'error'}
            />
            {expired !== null && (
              <Chip
                label={expired ? 'Expired' : 'Valid (not expired)'}
                size="small"
                variant="outlined"
                color={expired ? 'error' : 'success'}
              />
            )}
          </Box>
        )}

        {decoded?.error && <Alert severity="error">{decoded.error}</Alert>}

        {/* Decoded sections */}
        {decoded?.header && decoded?.payload && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard
                title="Header"
                data={decoded.header}
                onCopy={() => handleCopySection(decoded.header!)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard
                title="Payload"
                data={decoded.payload}
                onCopy={() => handleCopySection(decoded.payload!)}
              />
            </Grid>
          </Grid>
        )}
      </Stack>
    </>
  );
}
