import { Box, Typography, Grid, Chip, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import { tools } from '../data/tools';
import PageHead from '../components/PageHead';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArticleIcon from '@mui/icons-material/Article';
import CoffeeIcon from '@mui/icons-material/Coffee';

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
          minHeight: 'calc(100vh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
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
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
          {/* Badge */}
          <Box
            sx={{
              mb: 3,
              opacity: 0,
              animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.1s forwards, glow-pulse 3s ease-in-out 1s infinite',
            }}
          >
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
              label="Tools that solve real problems"
              variant="outlined"
              size="small"
              sx={{
                backdropFilter: 'blur(4px)',
                bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
                borderColor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08),
                px: 1,
                fontSize: '0.875rem',
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.025em',
              fontSize: { xs: '2.25rem', sm: '3.75rem', lg: '4.5rem' },
              lineHeight: 1.1,
              mb: 3,
              opacity: 0,
              animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.3s forwards',
            }}
          >
            Free, browser-based{' '}
            <Box
              component="span"
              sx={{
                background: isDark
                  ? `linear-gradient(to right, ${alpha('#fafafa', 0.7)}, #fafafa, ${alpha('#fafafa', 0.7)})`
                  : `linear-gradient(to right, ${alpha('#09090b', 0.7)}, #09090b, ${alpha('#09090b', 0.7)})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% auto',
                animation: 'gradient-shift 4s ease infinite',
              }}
            >
              developer tools
            </Box>
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              color: 'text.secondary',
              maxWidth: 520,
              mx: 'auto',
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.125rem' },
              lineHeight: 1.8,
              opacity: 0,
              animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.5s forwards',
            }}
          >
            JSON formatter, YAML validator, JWT decoder, and more.
            All processing happens in your browser -- no data leaves your machine.
          </Typography>

          {/* Social links row */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mt: 4,
              opacity: 0,
              animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.7s forwards',
            }}
          >
            {[
              { label: 'GitHub', href: 'https://github.com/bitesinbyte', icon: <GitHubIcon sx={{ fontSize: 18 }} /> },
              { label: 'Blog', href: 'https://blogs.bitesinbyte.com', icon: <ArticleIcon sx={{ fontSize: 18 }} /> },
              { label: 'Ko-fi', href: 'https://ko-fi.com/bitesinbyte', icon: <CoffeeIcon sx={{ fontSize: 18 }} /> },
            ].map((item) => (
              <Tooltip key={item.label} title={item.label}>
                <IconButton
                  href={item.href}
                  target="_blank"
                  sx={{
                    width: 40,
                    height: 40,
                    color: 'text.secondary',
                    transition: 'transform 0.2s, color 0.2s',
                    '&:hover': { transform: 'scale(1.1)', color: 'text.primary' },
                  }}
                >
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Scroll-down arrow */}
        <Box
          sx={{
            mt: 8,
            opacity: 0,
            animation: 'hero-fade-up 0.9s cubic-bezier(.16,1,.3,1) 0.9s forwards',
          }}
        >
          <Box
            component="a"
            href="#tools"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.5),
              transition: 'color 0.2s',
              display: 'inline-flex',
              animation: 'bounce 2s infinite',
              '&:hover': { color: 'text.secondary' },
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-8px)' },
              },
            }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 28 }} />
          </Box>
        </Box>
      </Box>

      {/* ── Tools section ─────────────────────────────────── */}
      <Box
        id="tools"
        sx={{
          py: { xs: 6, md: 8 },
          borderTop: 1,
          borderColor: 'divider',
          scrollMarginTop: '56px',
        }}
      >
        {/* Section header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.025em',
              fontSize: { xs: '1.875rem', sm: '2.25rem' },
              mb: 1.5,
            }}
          >
            Our Tools
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
            Free utilities for everyday development tasks
          </Typography>
        </Box>

        {/* Card grid */}
        <Grid container spacing={2.5}>
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <Grid key={tool.href} size={{ xs: 12, sm: 6 }}>
                <Box
                  component={Link}
                  to={tool.href}
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    height: '100%',
                    opacity: 0,
                    animation: `hero-fade-up 0.6s cubic-bezier(.16,1,.3,1) ${0.1 + i * 0.08}s forwards`,
                  }}
                >
                  <Box
                    className="tool-card"
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
                      /* Glow effect */
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: -1,
                        borderRadius: 'inherit',
                        background: isDark
                          ? `linear-gradient(135deg, ${alpha('#fafafa', 0.15)}, transparent 60%)`
                          : `linear-gradient(135deg, ${alpha('#09090b', 0.06)}, transparent 60%)`,
                        opacity: 0,
                        transition: 'opacity 0.4s ease',
                        zIndex: 0,
                      },
                      '&:hover': {
                        borderColor: isDark ? alpha('#fafafa', 0.1) : alpha('#09090b', 0.1),
                        boxShadow: isDark
                          ? `0 8px 32px ${alpha('#000', 0.3)}`
                          : '0 8px 32px rgba(0,0,0,0.06)',
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
                        '.tool-card:hover &': {
                          bgcolor: isDark ? alpha('#fafafa', 0.1) : alpha('#09090b', 0.08),
                        },
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>

                    {/* Title */}
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
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
                        transition: 'color 0.2s ease, transform 0.2s ease',
                        '.tool-card:hover &': {
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
