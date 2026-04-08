import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import { createTheme, alpha } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ mode: 'dark', toggleTheme: () => {} });

export const useThemeMode = () => useContext(ThemeContext);

/* ── Zinc palette (shadcn/ui style) ─────────────────────────── */
const zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const theme = useMemo(() => {
    const isDark = mode === 'dark';

    return createTheme({
      palette: {
        mode,
        ...(isDark
          ? {
              primary: { main: zinc[50], contrastText: zinc[900] },
              secondary: { main: zinc[400] },
              background: { default: zinc[950], paper: zinc[900] },
              text: { primary: zinc[50], secondary: zinc[400] },
              divider: zinc[800],
              action: {
                hover: alpha(zinc[50], 0.06),
                selected: alpha(zinc[50], 0.08),
                disabled: zinc[600],
                disabledBackground: alpha(zinc[50], 0.04),
              },
            }
          : {
              primary: { main: zinc[900], contrastText: zinc[50] },
              secondary: { main: zinc[500] },
              background: { default: '#ffffff', paper: '#ffffff' },
              text: { primary: zinc[900], secondary: zinc[500] },
              divider: zinc[200],
              action: {
                hover: alpha(zinc[900], 0.04),
                selected: alpha(zinc[900], 0.06),
                disabled: zinc[300],
                disabledBackground: alpha(zinc[900], 0.04),
              },
            }),
      },
      typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.025em' },
        h3: { fontWeight: 700, letterSpacing: '-0.025em' },
        h4: { fontWeight: 700, letterSpacing: '-0.025em' },
        h5: { fontWeight: 600, letterSpacing: '-0.015em' },
        h6: { fontWeight: 600, letterSpacing: '-0.01em' },
        body1: { lineHeight: 1.7 },
        body2: { lineHeight: 1.6 },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${isDark ? zinc[800] : zinc[200]}`,
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                borderColor: isDark ? alpha(zinc[50], 0.1) : alpha(zinc[900], 0.1),
                boxShadow: isDark
                  ? `0 8px 32px ${alpha(zinc[950], 0.5)}`
                  : '0 8px 32px rgba(0,0,0,0.08)',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 8,
            },
            contained: {
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                transform: 'scale(1.1)',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 500,
              borderRadius: 9999,
            },
            outlined: {
              borderColor: isDark ? zinc[700] : zinc[200],
              backgroundColor: isDark ? alpha(zinc[50], 0.04) : alpha(zinc[900], 0.02),
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDark ? zinc[700] : zinc[200],
                },
                '&:hover fieldset': {
                  borderColor: isDark ? zinc[500] : zinc[400],
                },
              },
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
            },
          },
        },
        MuiToggleButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
      },
    });
  }, [mode]);

  const globalStyles = (
    <GlobalStyles
      styles={{
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${zinc[600]} transparent`,
        },
        'html, body': {
          scrollBehavior: 'smooth',
        },
        '::selection': {
          backgroundColor: mode === 'dark' ? alpha(zinc[50], 0.15) : alpha(zinc[900], 0.12),
        },
        /* Hero gradient animation */
        '@keyframes gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '@keyframes hero-fade-up': {
          '0%': { opacity: 0, transform: 'translateY(30px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes glow-pulse': {
          '0%, 100%': {
            boxShadow: `0 0 20px ${alpha(mode === 'dark' ? zinc[50] : zinc[900], 0.05)}`,
          },
          '50%': {
            boxShadow: `0 0 40px ${alpha(mode === 'dark' ? zinc[50] : zinc[900], 0.1)}`,
          },
        },
      }}
    />
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
