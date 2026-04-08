import { useState, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

const PERMISSION_LABELS = ['Read', 'Write', 'Execute'] as const;
const ENTITY_LABELS = ['Owner', 'Group', 'Others'] as const;
const PERMISSION_BITS = [4, 2, 1] as const;

interface Permissions {
  owner: [boolean, boolean, boolean];
  group: [boolean, boolean, boolean];
  others: [boolean, boolean, boolean];
}

const PRESETS: { label: string; value: string; description: string }[] = [
  { label: '777', value: '777', description: 'Full access' },
  { label: '755', value: '755', description: 'Owner full, others read+execute' },
  { label: '750', value: '750', description: 'Owner full, group read+execute' },
  { label: '644', value: '644', description: 'Owner read+write, others read' },
  { label: '600', value: '600', description: 'Owner read+write only' },
  { label: '400', value: '400', description: 'Owner read only' },
];

function octalToPermissions(octal: string): Permissions | null {
  if (!/^[0-7]{3}$/.test(octal)) return null;
  const digits = octal.split('').map(Number);
  const toBools = (digit: number): [boolean, boolean, boolean] => [
    (digit & 4) !== 0,
    (digit & 2) !== 0,
    (digit & 1) !== 0,
  ];
  return {
    owner: toBools(digits[0]),
    group: toBools(digits[1]),
    others: toBools(digits[2]),
  };
}

function permissionsToOctal(perms: Permissions): string {
  const toDigit = (bools: [boolean, boolean, boolean]): number =>
    PERMISSION_BITS.reduce((acc, bit, i) => acc + (bools[i] ? bit : 0), 0);
  return `${toDigit(perms.owner)}${toDigit(perms.group)}${toDigit(perms.others)}`;
}

function permissionsToSymbolic(perms: Permissions): string {
  const toStr = (bools: [boolean, boolean, boolean]): string =>
    (bools[0] ? 'r' : '-') + (bools[1] ? 'w' : '-') + (bools[2] ? 'x' : '-');
  return toStr(perms.owner) + toStr(perms.group) + toStr(perms.others);
}

function symbolicToPermissions(symbolic: string): Permissions | null {
  if (!/^[rwx-]{9}$/.test(symbolic)) return null;
  const toBools = (s: string): [boolean, boolean, boolean] => [
    s[0] === 'r',
    s[1] === 'w',
    s[2] === 'x',
  ];
  return {
    owner: toBools(symbolic.slice(0, 3)),
    group: toBools(symbolic.slice(3, 6)),
    others: toBools(symbolic.slice(6, 9)),
  };
}

const DEFAULT_PERMS: Permissions = {
  owner: [true, true, true],
  group: [true, false, true],
  others: [true, false, true],
};

export default function ChmodCalculator() {
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMS);
  const [octalInput, setOctalInput] = useState('755');
  const [symbolicInput, setSymbolicInput] = useState('rwxr-xr-x');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const octal = permissionsToOctal(permissions);
  const symbolic = permissionsToSymbolic(permissions);
  const chmodCommand = `chmod ${octal} filename`;
  const lsOutput = `-${symbolic}`;

  const updateFromPermissions = useCallback((perms: Permissions) => {
    setPermissions(perms);
    setOctalInput(permissionsToOctal(perms));
    setSymbolicInput(permissionsToSymbolic(perms));
  }, []);

  const handleOctalChange = (value: string) => {
    setOctalInput(value);
    if (/^[0-7]{3}$/.test(value)) {
      const perms = octalToPermissions(value);
      if (perms) {
        setPermissions(perms);
        setSymbolicInput(permissionsToSymbolic(perms));
      }
    }
  };

  const handleSymbolicChange = (value: string) => {
    setSymbolicInput(value);
    if (/^[rwx-]{9}$/.test(value)) {
      const perms = symbolicToPermissions(value);
      if (perms) {
        setPermissions(perms);
        setOctalInput(permissionsToOctal(perms));
      }
    }
  };

  const handleCheckboxChange = (
    entity: keyof Permissions,
    permIndex: number,
    checked: boolean,
  ) => {
    const newPerms = { ...permissions };
    const updated: [boolean, boolean, boolean] = [...newPerms[entity]];
    updated[permIndex] = checked;
    newPerms[entity] = updated;
    updateFromPermissions(newPerms);
  };

  const handlePreset = (value: string) => {
    const perms = octalToPermissions(value);
    if (perms) updateFromPermissions(perms);
  };

  const handleCopy = async (value: string, label: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? `Copied ${label}` : 'Failed to copy', {
      variant: ok ? 'success' : 'error',
    });
  };

  const entities: (keyof Permissions)[] = ['owner', 'group', 'others'];

  const descriptions: Record<keyof Permissions, string> = {
    owner: 'The user who owns the file. Typically the creator.',
    group: 'Users who are members of the file\u2019s group.',
    others: 'All other users on the system.',
  };

  return (
    <>
      <PageHead
        title="Chmod Calculator - BitesInByte Tools"
        description="Calculate Linux file permissions with an interactive chmod calculator. Convert between numeric, symbolic, and visual representations."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Chmod Calculator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Calculate and visualize Linux file permissions. Toggle checkboxes, enter octal or
            symbolic notation — everything stays in sync.
          </Typography>
        </Box>

        {/* Common Presets */}
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              mb: 1,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Common Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                label={`${preset.label} — ${preset.description}`}
                onClick={() => handlePreset(preset.value)}
                variant={octal === preset.value ? 'filled' : 'outlined'}
                color={octal === preset.value ? 'primary' : 'default'}
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            ))}
          </Box>
        </Box>

        {/* Permission Checkboxes */}
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
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              Permissions
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {/* Header row */}
              <Grid size={{ xs: 3 }} />
              {PERMISSION_LABELS.map((label) => (
                <Grid size={{ xs: 3 }} key={label}>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </Typography>
                </Grid>
              ))}

              {/* Permission rows */}
              {entities.map((entity, entityIdx) => (
                <>
                  <Grid size={{ xs: 3 }} key={`${entity}-label`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {ENTITY_LABELS[entityIdx]}
                      </Typography>
                    </Box>
                  </Grid>
                  {PERMISSION_BITS.map((_, permIdx) => (
                    <Grid
                      size={{ xs: 3 }}
                      key={`${entity}-${permIdx}`}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={permissions[entity][permIdx]}
                              onChange={(e) =>
                                handleCheckboxChange(entity, permIdx, e.target.checked)
                              }
                              size="small"
                            />
                          }
                          label={
                            <Typography
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.8125rem',
                                color: 'text.secondary',
                              }}
                            >
                              {PERMISSION_BITS[permIdx]}
                            </Typography>
                          }
                        />
                      </Box>
                    </Grid>
                  ))}
                </>
              ))}
            </Grid>
          </Box>
        </Box>

        {/* Inputs: Octal and Symbolic */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
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
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>
                  Numeric (Octal)
                </Typography>
                <Tooltip title="Copy numeric value">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(octal, 'numeric value')}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  value={octalInput}
                  onChange={(e) => handleOctalChange(e.target.value)}
                  placeholder="755"
                  size="small"
                  error={!/^[0-7]{0,3}$/.test(octalInput)}
                  helperText={
                    !/^[0-7]{0,3}$/.test(octalInput)
                      ? 'Enter a 3-digit octal number (0-7)'
                      : 'Three octal digits: owner, group, others'
                  }
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                      },
                    },
                    htmlInput: {
                      maxLength: 3,
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
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
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', flex: 1 }}>
                  Symbolic
                </Typography>
                <Tooltip title="Copy symbolic value">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(symbolic, 'symbolic value')}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  value={symbolicInput}
                  onChange={(e) => handleSymbolicChange(e.target.value)}
                  placeholder="rwxr-xr-x"
                  size="small"
                  error={
                    symbolicInput.length > 0 &&
                    symbolicInput.length === 9 &&
                    !/^[rwx-]{9}$/.test(symbolicInput)
                  }
                  helperText="9 characters using r, w, x, or -"
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      },
                    },
                    htmlInput: {
                      maxLength: 9,
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Output: Command and ls output */}
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {[
            { label: 'chmod Command', value: chmodCommand },
            { label: 'ls -la Output', value: lsOutput },
          ].map((item, i) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderBottom: i === 0 ? 1 : 0,
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  minWidth: 110,
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  flex: 1,
                  fontWeight: 600,
                }}
              >
                {item.value}
              </Typography>
              <Tooltip title={`Copy ${item.label.toLowerCase()}`}>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(item.value, item.label.toLowerCase())}
                  sx={{ color: 'text.secondary' }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {/* Permission Descriptions */}
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              mb: 1,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Permission Breakdown
          </Typography>
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            {entities.map((entity, i) => {
              const perms = permissions[entity];
              const digit = PERMISSION_BITS.reduce(
                (acc, bit, idx) => acc + (perms[idx] ? bit : 0),
                0,
              );
              const symbolicStr =
                (perms[0] ? 'r' : '-') +
                (perms[1] ? 'w' : '-') +
                (perms[2] ? 'x' : '-');
              const abilities = [
                perms[0] && 'read',
                perms[1] && 'write',
                perms[2] && 'execute',
              ].filter(Boolean);

              return (
                <Box
                  key={entity}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: i < entities.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
                    },
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {ENTITY_LABELS[i]}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        color: 'text.secondary',
                      }}
                    >
                      {digit} ({symbolicStr})
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}
                  >
                    {descriptions[entity]}{' '}
                    {abilities.length > 0
                      ? `Can ${abilities.join(', ')}.`
                      : 'No permissions.'}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Stack>
    </>
  );
}
