import { Box, Typography, Grid, Chip, alpha, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';
import { tools } from '../data/tools';
import PageHead from '../components/PageHead';
import BuildIcon from '@mui/icons-material/Build';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function Home() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <>
      <PageHead
        title="BitesInByte - Free Developer Tools"
        description="Free browser-based developer tools: JSON formatter, YAML validator, JWT decoder, text compare, encode/decode, CSV delimiter changer, cron tester, and JSON/YAML converters."
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: isDark
              ? 'linear-gradient(-45deg, #121216, #0f0e11, #101114, #0b0b0e)'
              : `linear-gradient(-45deg, ${alpha(theme.palette.primary.main, 0.03)}, ${alpha(theme.palette.secondary.main, 0.06)}, ${alpha(theme.palette.primary.main, 0.02)}, ${alpha(theme.palette.secondary.main, 0.04)})`,
            backgroundSize: '400% 400%',
            animation: 'gradient-shift 12s ease infinite',
            zIndex: -1,
          },
        }}
      >
        {/* Badge */}
        <Box
          sx={{
            mb: 3,
            opacity: 0,
            animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.1s forwards, glow-pulse 3s ease-in-out 1s infinite',
          }}
        >
          <Chip
            icon={<BuildIcon sx={{ fontSize: 16 }} />}
            label="100% Client-Side Processing"
            variant="outlined"
            sx={{
              backdropFilter: 'blur(4px)',
              bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
              borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08),
              px: 1,
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.025em',
            fontSize: { xs: '2.25rem', sm: '3.75rem', lg: '4.5rem' },
            lineHeight: 1.1,
            mb: 2,
            opacity: 0,
            animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.3s forwards',
            background: isDark
              ? `linear-gradient(to right, ${alpha('#fafafa', 0.7)}, #fafafa, ${alpha('#fafafa', 0.7)})`
              : `linear-gradient(to right, ${alpha('#09090b', 0.7)}, #09090b, ${alpha('#09090b', 0.7)})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
          }}
        >
          Developer Tools
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            maxWidth: 560,
            mx: 'auto',
            fontWeight: 400,
            fontSize: { xs: '1rem', sm: '1.125rem' },
            lineHeight: 1.7,
            opacity: 0,
            animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.5s forwards',
          }}
        >
          Free, fast, browser-based utilities.
          <br />
          No data leaves your machine.
        </Typography>
      </Box>

      {/* ── Tool cards ────────────────────────────────────── */}
      <Box sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={2.5}>
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <Grid key={tool.href} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  component={Link}
                  to={tool.href}
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    height: '100%',
                    opacity: 0,
                    animation: `hero-fade-up 0.7s cubic-bezier(.16,1,.3,1) ${0.1 + i * 0.08}s forwards`,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      p: 3,
                      borderRadius: '12px',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: -1,
                        borderRadius: 'inherit',
                        background: isDark
                          ? `linear-gradient(135deg, ${alpha('#fafafa', 0.15)}, transparent 60%)`
                          : `linear-gradient(135deg, ${alpha('#09090b', 0.08)}, transparent 60%)`,
                        opacity: 0,
                        transition: 'opacity 0.4s ease',
                        zIndex: 0,
                      },
                      '&:hover': {
                        borderColor: isDark ? alpha('#fafafa', 0.1) : alpha('#09090b', 0.1),
                        boxShadow: isDark
                          ? `0 8px 32px ${alpha('#000', 0.3)}`
                          : '0 8px 32px rgba(0,0,0,0.06)',
                        transform: 'translateY(-2px)',
                        '&::before': { opacity: 1 },
                      },
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: isDark ? alpha('#fafafa', 0.06) : alpha('#09090b', 0.04),
                        color: isDark ? alpha('#fafafa', 0.7) : alpha('#09090b', 0.7),
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                        transition: 'background-color 0.3s ease',
                        '.MuiBox-root:hover > &': {
                          bgcolor: isDark ? alpha('#fafafa', 0.1) : alpha('#09090b', 0.08),
                        },
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        mb: 0.75,
                        position: 'relative',
                        zIndex: 1,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {tool.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.6,
                        position: 'relative',
                        zIndex: 1,
                        mb: 2,
                      }}
                    >
                      {tool.description}
                    </Typography>

                    {/* Open link */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        position: 'relative',
                        zIndex: 1,
                        transition: 'color 0.2s ease',
                        '.MuiBox-root:hover > &': {
                          color: 'text.primary',
                        },
                      }}
                    >
                      Open tool
                      <ArrowForwardIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </>
  );
}
