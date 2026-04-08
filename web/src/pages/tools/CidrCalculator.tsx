import { useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  MenuItem,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

// ─── CIDR calculation logic ───────────────────────────────────────────────────

function isValidIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return /^\d{1,3}$/.test(p) && n >= 0 && n <= 255;
  });
}

function ipToUint32(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function uint32ToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

function prefixToMask(prefix: number): number {
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

function maskToBinary(mask: number): string {
  return [
    ((mask >>> 24) & 0xff).toString(2).padStart(8, '0'),
    ((mask >>> 16) & 0xff).toString(2).padStart(8, '0'),
    ((mask >>> 8) & 0xff).toString(2).padStart(8, '0'),
    (mask & 0xff).toString(2).padStart(8, '0'),
  ].join('.');
}

function getIpClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function isPrivateIp(ip: number): boolean {
  const a = (ip >>> 24) & 0xff;
  const b = (ip >>> 16) & 0xff;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

interface CidrResult {
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  subnetMask: string;
  wildcardMask: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: string;
  binaryMask: string;
  isPrivate: boolean;
  prefix: number;
}

function calculateCidr(ip: string, prefix: number): CidrResult | null {
  if (!isValidIp(ip) || prefix < 0 || prefix > 32) return null;

  const ipNum = ipToUint32(ip);
  const mask = prefixToMask(prefix);
  const wildcard = (~mask) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalAddresses = Math.pow(2, 32 - prefix);

  let firstHost: string;
  let lastHost: string;
  let usableHosts: number;

  if (prefix === 32) {
    firstHost = uint32ToIp(network);
    lastHost = uint32ToIp(network);
    usableHosts = 1;
  } else if (prefix === 31) {
    // RFC 3021 point-to-point
    firstHost = uint32ToIp(network);
    lastHost = uint32ToIp(broadcast);
    usableHosts = 2;
  } else {
    firstHost = uint32ToIp(network + 1);
    lastHost = uint32ToIp(broadcast - 1);
    usableHosts = totalAddresses - 2;
  }

  const firstOctet = (ipNum >>> 24) & 0xff;

  return {
    networkAddress: uint32ToIp(network),
    broadcastAddress: uint32ToIp(broadcast),
    firstHost,
    lastHost,
    subnetMask: uint32ToIp(mask),
    wildcardMask: uint32ToIp(wildcard),
    totalAddresses,
    usableHosts,
    ipClass: getIpClass(firstOctet),
    binaryMask: maskToBinary(mask),
    isPrivate: isPrivateIp(ipNum),
    prefix,
  };
}

function parseCidrNotation(input: string): { ip: string; prefix: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;
  const ip = match[1];
  const prefix = parseInt(match[2], 10);
  if (!isValidIp(ip) || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}

// ─── Reference table data ─────────────────────────────────────────────────────

const REFERENCE_TABLE = [
  { cidr: '/8', mask: '255.0.0.0', hosts: 16777214 },
  { cidr: '/16', mask: '255.255.0.0', hosts: 65534 },
  { cidr: '/24', mask: '255.255.255.0', hosts: 254 },
  { cidr: '/25', mask: '255.255.255.128', hosts: 126 },
  { cidr: '/26', mask: '255.255.255.192', hosts: 62 },
  { cidr: '/27', mask: '255.255.255.224', hosts: 30 },
  { cidr: '/28', mask: '255.255.255.240', hosts: 14 },
  { cidr: '/29', mask: '255.255.255.248', hosts: 6 },
  { cidr: '/30', mask: '255.255.255.252', hosts: 2 },
  { cidr: '/31', mask: '255.255.255.254', hosts: 2 },
  { cidr: '/32', mask: '255.255.255.255', hosts: 1 },
];

const PRESETS = [
  { label: '10.0.0.0/8', value: '10.0.0.0/8' },
  { label: '172.16.0.0/12', value: '172.16.0.0/12' },
  { label: '192.168.0.0/16', value: '192.168.0.0/16' },
  { label: '192.168.1.0/24', value: '192.168.1.0/24' },
];

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ─── Component ────────────────────────────────────────────────────────────────

export default function CidrCalculator() {
  const [cidrInput, setCidrInput] = useState('192.168.1.0/24');
  const [ipInput, setIpInput] = useState('');
  const [prefixInput, setPrefixInput] = useState(24);
  const [mode, setMode] = useState<'cidr' | 'separate'>('cidr');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const result = useMemo<CidrResult | null>(() => {
    if (mode === 'cidr') {
      const parsed = parseCidrNotation(cidrInput);
      if (!parsed) return null;
      return calculateCidr(parsed.ip, parsed.prefix);
    }
    if (!isValidIp(ipInput)) return null;
    return calculateCidr(ipInput, prefixInput);
  }, [mode, cidrInput, ipInput, prefixInput]);

  const hasInput = mode === 'cidr' ? cidrInput.trim().length > 0 : ipInput.trim().length > 0;
  const hasError = hasInput && !result;

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseCidrNotation(text.trim());
      if (parsed) {
        setMode('cidr');
        setCidrInput(text.trim());
      } else if (isValidIp(text.trim())) {
        setMode('separate');
        setIpInput(text.trim());
      } else {
        setMode('cidr');
        setCidrInput(text.trim());
      }
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handlePreset = (value: string) => {
    setMode('cidr');
    setCidrInput(value);
  };

  const resultRows = result
    ? [
        { label: 'Network Address', value: result.networkAddress },
        { label: 'Broadcast Address', value: result.broadcastAddress },
        { label: 'First Usable Host', value: result.firstHost },
        { label: 'Last Usable Host', value: result.lastHost },
        { label: 'Subnet Mask', value: result.subnetMask },
        { label: 'Wildcard Mask', value: result.wildcardMask },
        { label: 'Total Addresses', value: result.totalAddresses.toLocaleString() },
        { label: 'Usable Hosts', value: result.usableHosts.toLocaleString() },
        { label: 'IP Class', value: `Class ${result.ipClass}` },
        { label: 'CIDR Notation', value: `${result.networkAddress}/${result.prefix}` },
        { label: 'Binary Mask', value: result.binaryMask },
        { label: 'IP Type', value: result.isPrivate ? 'Private (RFC 1918)' : 'Public' },
      ]
    : [];

  return (
    <>
      <PageHead
        title="CIDR / Subnet Calculator - BitesInByte Tools"
        description="Calculate subnet details from CIDR notation or IP address and prefix length. Network address, broadcast, usable hosts, masks, and more."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>CIDR / Subnet Calculator</Typography>
          <Typography variant="body2" color="text.secondary">
            Calculate network details from CIDR notation. Get subnet mask, broadcast address, usable host range, and more.
          </Typography>
        </Box>

        {/* Mode toggle */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="CIDR Notation"
            size="small"
            variant={mode === 'cidr' ? 'filled' : 'outlined'}
            color={mode === 'cidr' ? 'primary' : 'default'}
            onClick={() => setMode('cidr')}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="IP + Prefix"
            size="small"
            variant={mode === 'separate' ? 'filled' : 'outlined'}
            color={mode === 'separate' ? 'primary' : 'default'}
            onClick={() => setMode('separate')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>

        {/* Input */}
        {mode === 'cidr' ? (
          <TextField
            label="CIDR Notation"
            fullWidth
            value={cidrInput}
            onChange={(e) => setCidrInput(e.target.value)}
            placeholder="e.g., 192.168.1.0/24"
            error={hasError}
            helperText={hasError ? 'Invalid CIDR notation (expected format: x.x.x.x/n)' : undefined}
            slotProps={{
              input: {
                endAdornment: (
                  <>
                    <Tooltip title="Paste">
                      <IconButton size="small" onClick={handlePaste}>
                        <ContentPasteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {cidrInput && (
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => setCidrInput('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                ),
                sx: {
                  fontFamily: MONO_FONT,
                  fontSize: '0.875rem',
                },
              },
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="IP Address"
              fullWidth
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g., 192.168.1.0"
              error={!!ipInput.trim() && !isValidIp(ipInput)}
              helperText={ipInput.trim() && !isValidIp(ipInput) ? 'Invalid IP address' : undefined}
              slotProps={{
                input: {
                  endAdornment: (
                    <>
                      <Tooltip title="Paste">
                        <IconButton size="small" onClick={handlePaste}>
                          <ContentPasteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {ipInput && (
                        <Tooltip title="Clear">
                          <IconButton size="small" onClick={() => setIpInput('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  ),
                  sx: {
                    fontFamily: MONO_FONT,
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
            <TextField
              select
              label="Prefix"
              value={prefixInput}
              onChange={(e) => setPrefixInput(Number(e.target.value))}
              sx={{ minWidth: 100 }}
              slotProps={{
                input: {
                  sx: {
                    fontFamily: MONO_FONT,
                    fontSize: '0.875rem',
                  },
                },
              }}
            >
              {Array.from({ length: 25 }, (_, i) => i + 8).map((p) => (
                <MenuItem key={p} value={p}>/{p}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {/* Quick presets */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                size="small"
                variant="outlined"
                onClick={() => handlePreset(p.value)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Results */}
        {result && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subnet Details
            </Typography>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              {resultRows.map((row, i) => (
                <Box
                  key={row.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < resultRows.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', minWidth: 130 }}>
                    {row.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: '0.8125rem',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {row.value}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={() => handleCopy(row.value)} sx={{ color: 'text.secondary' }}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* IP type badge */}
        {result && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={result.isPrivate ? 'Private (RFC 1918)' : 'Public'}
              color={result.isPrivate ? 'info' : 'warning'}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Class ${result.ipClass}`}
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Reference table */}
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Subnet Mask Reference
          </Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', minWidth: 50 }}>
                CIDR
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', flex: 1 }}>
                Subnet Mask
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', minWidth: 100, textAlign: 'right' }}>
                Usable Hosts
              </Typography>
            </Box>
            {REFERENCE_TABLE.map((row, i) => (
              <Box
                key={row.cidr}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1,
                  borderBottom: i < REFERENCE_TABLE.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                  },
                }}
                onClick={() => handlePreset(`192.168.1.0${row.cidr}`)}
              >
                <Typography
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    minWidth: 50,
                  }}
                >
                  {row.cidr}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: '0.8125rem',
                    flex: 1,
                  }}
                >
                  {row.mask}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: '0.8125rem',
                    minWidth: 100,
                    textAlign: 'right',
                  }}
                >
                  {row.hosts.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
