import { useState, useMemo } from 'react';
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
  css: string;
}

type Rgba = [number, number, number, number];

const EMPTY_COLORS: ColorValues = { hex: '', rgb: '', hsl: '', oklch: '', css: '' };

function hexToRgb(hex: string): Rgba | null {
  const value = hex.replace(/^#/, '');
  if (![3, 4, 6, 8].includes(value.length) || !/^[a-f\d]+$/i.test(value)) return null;
  const expanded = value.length <= 4
    ? value.split('').map((part) => part + part).join('')
    : value;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
    expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  ];
}

function rgbToHex(r: number, g: number, b: number, alpha = 1): string {
  const channels = [r, g, b].map((value) => Math.round(Math.max(0, Math.min(255, value))));
  if (alpha < 1) channels.push(Math.round(Math.max(0, Math.min(1, alpha)) * 255));
  return '#' + channels.map((value) => value.toString(16).padStart(2, '0')).join('');
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
  h = ((h % 360) + 360) % 360;
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

function oklchToRgb(lightness: number, chroma: number, hue: number): [number, number, number] {
  const angle = hue * Math.PI / 180;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);
  const l1 = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = l1 ** 3;
  const m = m1 ** 3;
  const s = s1 ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((channel) => {
    const encoded = channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, encoded)) * 255);
  }) as [number, number, number];
}

function parseAlpha(value: string | undefined): number | null {
  if (value === undefined) return 1;
  const parsed = value.endsWith('%') ? Number(value.slice(0, -1)) / 100 : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function parseHue(value: string): number | null {
  const match = value.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? 'deg';
  if (unit === 'turn') return amount * 360;
  if (unit === 'grad') return amount * 0.9;
  if (unit === 'rad') return amount * 180 / Math.PI;
  return amount;
}

function splitFunctionArgs(value: string): { channels: string[]; alpha?: string } {
  const [channelPart, alphaPart, ...extra] = value.trim().split('/');
  if (extra.length > 0) return { channels: [] };
  return {
    channels: channelPart.trim().split(/[,\s]+/).filter(Boolean),
    alpha: alphaPart?.trim(),
  };
}

function parseColor(input: string): Rgba | null {
  const trimmed = input.trim();
  const hex = hexToRgb(trimmed);
  if (hex) return hex;

  const functionMatch = trimmed.match(/^(rgb|rgba|hsl|hsla|oklch)\((.*)\)$/i);
  if (!functionMatch) return null;
  const name = functionMatch[1].toLowerCase();
  const args = splitFunctionArgs(functionMatch[2]);
  let alphaText = args.alpha;
  if ((name === 'rgba' || name === 'hsla') && !alphaText && args.channels.length === 4) {
    alphaText = args.channels.pop();
  }
  const alpha = parseAlpha(alphaText);
  if (alpha === null || args.channels.length !== 3) return null;

  if (name === 'rgb' || name === 'rgba') {
    const channels = args.channels.map((value) => {
      const parsed = value.endsWith('%') ? Number(value.slice(0, -1)) * 2.55 : Number(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 255 ? parsed : NaN;
    });
    return channels.every(Number.isFinite) ? [channels[0], channels[1], channels[2], alpha] : null;
  }

  if (name === 'hsl' || name === 'hsla') {
    const hue = parseHue(args.channels[0]);
    if (hue === null || !args.channels[1].endsWith('%') || !args.channels[2].endsWith('%')) return null;
    const saturation = Number(args.channels[1].slice(0, -1));
    const lightness = Number(args.channels[2].slice(0, -1));
    if (![saturation, lightness].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) return null;
    return [...hslToRgb(hue, saturation, lightness), alpha];
  }

  const lightness = args.channels[0].endsWith('%')
    ? Number(args.channels[0].slice(0, -1)) / 100
    : Number(args.channels[0]);
  const chroma = Number(args.channels[1]);
  const hue = parseHue(args.channels[2]);
  if (
    !Number.isFinite(lightness) || lightness < 0 || lightness > 1
    || !Number.isFinite(chroma) || chroma < 0
    || hue === null
  ) return null;
  return [...oklchToRgb(lightness, chroma, hue), alpha];
}

function formatAlpha(alpha: number): string {
  return Number(alpha.toFixed(3)).toString();
}

function convertColor(color: Rgba | null): ColorValues {
  if (!color) return EMPTY_COLORS;
  const [rawR, rawG, rawB, alpha] = color;
  const [r, g, b] = [rawR, rawG, rawB].map((value) => Math.round(value));
  const hex = rgbToHex(r, g, b, alpha);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [oL, oC, oH] = rgbToOklch(r, g, b);
  const alphaSuffix = alpha < 1 ? ` / ${formatAlpha(alpha)}` : '';
  return {
    hex: hex.toUpperCase(),
    rgb: `rgb(${r} ${g} ${b}${alphaSuffix})`,
    hsl: `hsl(${h} ${s}% ${l}%${alphaSuffix})`,
    oklch: `oklch(${oL}% ${oC} ${oH}${alphaSuffix})`,
    css: `rgb(${r} ${g} ${b} / ${formatAlpha(alpha)})`,
  };
}

export default function ColorConverter() {
  const [input, setInput] = useState('#3b82f6');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const parsedColor = useMemo(() => parseColor(input), [input]);
  const colors = useMemo(() => convertColor(parsedColor), [parsedColor]);
  const pickerColor = parsedColor ? rgbToHex(parsedColor[0], parsedColor[1], parsedColor[2]) : '#000000';

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
                  aria-label="Choose color"
                  value={pickerColor}
                  onChange={handlePickerChange}
                  style={{ width: '100%', height: 100, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                />
              </Box>
              <TextField
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="#3b82f6 or rgb(59 130 246)"
                size="small"
                error={input.trim().length > 0 && !parsedColor}
                helperText={input.trim().length > 0 && !parsedColor ? 'Enter a valid HEX, RGB, HSL, or OKLCH color' : 'Alpha values are supported'}
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
                bgcolor: parsedColor ? colors.css : 'action.disabledBackground',
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
                  color: parsedColor ? '#fff' : 'text.secondary',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {parsedColor ? colors.hex : 'Invalid color'}
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
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {fmt.value}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(fmt.value)}
                      disabled={!fmt.value}
                      aria-label={`Copy ${fmt.label} color`}
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
