import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard } from '../../utils/file';

interface ColorValues {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) {
    const m3 = hex.replace('#', '').match(/^([a-f\d])([a-f\d])([a-f\d])$/i);
    if (!m3) return null;
    return [parseInt(m3[1] + m3[1], 16), parseInt(m3[2] + m3[2], 16), parseInt(m3[3] + m3[3], 16)];
  }
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// Simple OKLCH approximation via sRGB
function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  // Convert to linear sRGB
  const toLinear = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  // To OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l1 = Math.cbrt(l_), m1 = Math.cbrt(m_), s1 = Math.cbrt(s_);
  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bOk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [parseFloat((L * 100).toFixed(2)), parseFloat(C.toFixed(4)), parseFloat(H.toFixed(1))];
}

function parseColor(input: string): [number, number, number] | null {
  const trimmed = input.trim();
  // Try hex
  const hex = hexToRgb(trimmed);
  if (hex) return hex;
  // Try rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  // Try hsl(h, s%, l%)
  const hslMatch = trimmed.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);
  if (hslMatch) return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3]);
  return null;
}

export default function ColorConverter() {
  const [input, setInput] = useState('#3b82f6');
  const [colors, setColors] = useState<ColorValues>({ hex: '', rgb: '', hsl: '', oklch: '' });
  const [pickerColor, setPickerColor] = useState('#3b82f6');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const updateFromRgb = useCallback((r: number, g: number, b: number) => {
    const hex = rgbToHex(r, g, b);
    const [h, s, l] = rgbToHsl(r, g, b);
    const [oL, oC, oH] = rgbToOklch(r, g, b);
    setColors({
      hex: hex.toUpperCase(),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`,
      oklch: `oklch(${oL}% ${oC} ${oH})`,
    });
    setPickerColor(hex);
  }, []);

  useEffect(() => {
    const rgb = parseColor(input);
    if (rgb) {
      updateFromRgb(...rgb);
    }
  }, [input, updateFromRgb]);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setInput(hex);
  };

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const formats = [
    { label: 'HEX', value: colors.hex },
    { label: 'RGB', value: colors.rgb },
    { label: 'HSL', value: colors.hsl },
    { label: 'OKLCH', value: colors.oklch },
  ];

  return (
    <>
      <PageHead
        title="Color Converter - BitesInByte Tools"
        description="Convert between HEX, RGB, HSL, and OKLCH color formats with a visual picker. Free online color converter."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Color Converter</Typography>
          <Typography variant="body2" color="text.secondary">
            Convert between HEX, RGB, HSL, and OKLCH. Use the color picker or type any format.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Color Picker
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <input
                  type="color"
                  value={pickerColor}
                  onChange={handlePickerChange}
                  style={{ width: '100%', height: 100, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                />
              </Box>
              <TextField
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="#3b82f6 or rgb(59,130,246)"
                size="small"
                slotProps={{
                  input: {
                    sx: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {/* Color preview */}
            <Box
              sx={{
                height: '100%',
                minHeight: 200,
                borderRadius: 2,
                bgcolor: pickerColor,
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-end',
                p: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {colors.hex}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {formats.map((fmt, i) => (
                <Box
                  key={fmt.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    borderBottom: i < formats.length - 1 ? 1 : 0,
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
                      minWidth: 48,
                    }}
                  >
                    {fmt.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                    }}
                  >
                    {fmt.value}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(fmt.value)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}
