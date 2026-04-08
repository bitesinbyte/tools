import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Stack,
  Box,
  TextField,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageHead from '../../components/PageHead';
import { useSnackbar } from 'notistack';
import { copyToClipboard, readFileAsText } from '../../utils/file';

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;

async function computeHash(algorithm: string, data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function md5(text: string): Promise<string> {
  // Simple MD5 implementation for browser
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  function md5str(s: string): string {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= n; i += 64) {
      const block: number[] = [];
      for (let j = i - 64; j < i; j += 4) {
        block.push(
          s.charCodeAt(j) | (s.charCodeAt(j + 1) << 8) | (s.charCodeAt(j + 2) << 16) | (s.charCodeAt(j + 3) << 24)
        );
      }
      md5cycle(state, block);
    }
    const tail: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let j = 0; j < n % 64; j++) {
      tail[j >> 2] |= s.charCodeAt(i - 64 + j) << ((j % 4) << 3);
    }
    tail[(n % 64) >> 2] |= 0x80 << (((n % 64) % 4) << 3);
    if (n % 64 > 55) {
      md5cycle(state, tail);
      for (let j = 0; j < 16; j++) tail[j] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    const hex_chr = '0123456789abcdef';
    let result = '';
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        const byte = (state[j] >> (k * 8)) & 0xff;
        result += hex_chr.charAt((byte >> 4) & 0x0f) + hex_chr.charAt(byte & 0x0f);
      }
    }
    return result;
  }

  return md5str(text);
}

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const computeAll = useCallback(async (text: string) => {
    if (!text) {
      setHashes({});
      return;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const results: Record<string, string> = {};
    results['MD5'] = await md5(text);
    for (const alg of ALGORITHMS) {
      results[alg] = await computeHash(alg, data.buffer as ArrayBuffer);
    }
    setHashes(results);
  }, []);

  useEffect(() => {
    computeAll(input);
  }, [input, computeAll]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      setFileName('');
    } catch {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    setInput(text);
    setFileName(file.name);
    e.target.value = '';
  };

  const handleCopy = async (value: string) => {
    const ok = await copyToClipboard(value);
    enqueueSnackbar(ok ? 'Copied' : 'Failed to copy', { variant: ok ? 'success' : 'error' });
  };

  const allAlgorithms = ['MD5', ...ALGORITHMS];

  return (
    <>
      <PageHead
        title="Hash Generator - BitesInByte Tools"
        description="Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes for text and files. Free online hash generator."
      />
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Hash Generator</Typography>
          <Typography variant="body2" color="text.secondary">
            Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes in real time.
          </Typography>
        </Box>

        {/* Input */}
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
              Input {fileName && `(${fileName})`}
            </Typography>
            <Tooltip title="Paste">
              <IconButton size="small" onClick={handlePaste} sx={{ color: 'text.secondary' }}>
                <ContentPasteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload file">
              <IconButton size="small" component="label" sx={{ color: 'text.secondary' }}>
                <UploadFileIcon sx={{ fontSize: 16 }} />
                <input type="file" hidden onChange={handleFile} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton
                size="small"
                onClick={() => { setInput(''); setFileName(''); }}
                disabled={!input}
                sx={{ color: 'text.secondary' }}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            multiline
            rows={6}
            fullWidth
            value={input}
            onChange={(e) => { setInput(e.target.value); setFileName(''); }}
            placeholder="Type or paste text here, or upload a file..."
            variant="standard"
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

        {/* Results */}
        {Object.keys(hashes).length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hash Results
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              {allAlgorithms.map((alg, i) => (
                <Box
                  key={alg}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.25,
                    borderBottom: i < allAlgorithms.length - 1 ? 1 : 0,
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
                      minWidth: 64,
                    }}
                  >
                    {alg}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {hashes[alg] ?? ''}
                  </Typography>
                  <Tooltip title="Copy">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(hashes[alg] ?? '')}
                      sx={{ color: 'text.secondary' }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </>
  );
}
