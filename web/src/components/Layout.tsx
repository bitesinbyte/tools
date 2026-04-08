import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Link as MuiLink,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import CoffeeIcon from '@mui/icons-material/Coffee';
import GitHubIcon from '@mui/icons-material/GitHub';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useThemeMode } from '../theme/ThemeProvider';
import { tools } from '../data/tools';
import Logo from './Logo';

/* ── Desktop nav links (shown as text in the header) ─── */
const desktopNavLinks = [
  { label: 'Tools', to: '/' },
  { label: 'Blog', href: 'https://blogs.bitesinbyte.com' },
];

/* ── Mobile drawer links ─────────────────────────────── */
const mobileNavLinks = [
  { label: 'Home', to: '/', icon: <HomeIcon fontSize="small" /> },
  ...tools.map((t) => ({ label: t.title, to: t.href, icon: undefined })),
];

/* ── External social links ───────────────────────────── */
const socialLinks = [
  { label: 'Blog', href: 'https://blogs.bitesinbyte.com', icon: <ArticleIcon sx={{ fontSize: 16 }} /> },
  { label: 'Ko-fi', href: 'https://ko-fi.com/bitesinbyte', icon: <CoffeeIcon sx={{ fontSize: 16 }} /> },
  { label: 'GitHub', href: 'https://github.com/bitesinbyte', icon: <GitHubIcon sx={{ fontSize: 16 }} /> },
];

export default function Layout() {
  const { mode, toggleTheme } = useThemeMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isHome = location.pathname === '/';

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          borderBottom: 1,
          borderColor: alpha(theme.palette.divider, 0.5),
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            bgcolor: 'background.default',
            opacity: 0.8,
            zIndex: -1,
          },
        }}
      >
        <Container maxWidth="md">
          <Toolbar disableGutters sx={{ height: 56, gap: 1 }}>
            {/* Logo */}
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.primary',
                gap: 1,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <Logo sx={{ fontSize: 28 }} />
              <Typography
                component="span"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.025em',
                  fontSize: '1.125rem',
                }}
              >
                Bites In Byte
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop text nav links with underline animation */}
            {!isMobile && (
              <Box component="nav" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                {desktopNavLinks.map((item) => {
                  const isActive = item.to ? location.pathname === item.to : false;
                  const commonSx = {
                    position: 'relative',
                    px: 1.5,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    textDecoration: 'none',
                    borderRadius: 1,
                    transition: 'color 0.2s',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      height: '2px',
                      width: isActive ? 'calc(100% - 8px)' : 0,
                      bgcolor: 'text.primary',
                      transition: 'all 0.3s ease',
                      ...(isActive ? { left: 4 } : {}),
                    },
                    '&:hover': {
                      color: 'text.primary',
                      '&::after': {
                        left: 4,
                        width: 'calc(100% - 8px)',
                      },
                    },
                  };

                  if (item.href) {
                    return (
                      <MuiLink key={item.label} href={item.href} target="_blank" sx={commonSx}>
                        {item.label}
                      </MuiLink>
                    );
                  }
                  return (
                    <MuiLink key={item.label} component={Link} to={item.to!} sx={commonSx}>
                      {item.label}
                    </MuiLink>
                  );
                })}
              </Box>
            )}

            {/* Theme toggle */}
            <Box sx={{ ml: 0.5 }}>
              <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
                <IconButton
                  onClick={toggleTheme}
                  size="small"
                  sx={{
                    width: 40,
                    height: 40,
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Mobile hamburger */}
            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                size="small"
                aria-label="Open menu"
                sx={{ color: 'text.secondary', ml: 0.5 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Mobile drawer ──────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              bgcolor: 'background.default',
              borderLeft: 1,
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ pt: 2, pb: 1, px: 2 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.7rem',
            }}
          >
            Tools
          </Typography>
        </Box>
        <List dense>
          {mobileNavLinks.map((item) => (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                component={Link}
                to={item.to}
                selected={location.pathname === item.to}
                onClick={() => setDrawerOpen(false)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                }}
              >
                {item.icon && <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>}
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {socialLinks.map((item) => (
              <IconButton
                key={item.href}
                href={item.href}
                target="_blank"
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  color: 'text.secondary',
                  p: 1,
                  '&:hover': { color: 'text.primary', borderColor: alpha(theme.palette.text.primary, 0.2) },
                }}
              >
                {item.icon}
              </IconButton>
            ))}
          </Box>
        </Box>
      </Drawer>

      {/* ── Content ────────────────────────────────────── */}
      <Box sx={{ pt: '56px', flex: 1 }}>
        <Container
          maxWidth="md"
          sx={{
            py: isHome ? 0 : { xs: 3, md: 4 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────── */}
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 4, sm: 4 },
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            }}
          >
            {/* Col 1: Brand */}
            <Box sx={{ gridColumn: { sm: 'span 2', lg: 'span 1' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Logo sx={{ fontSize: 24, color: 'text.primary' }} />
                <Typography sx={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.025em' }}>
                  Bites In Byte
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Small, practical software packed into every byte.
              </Typography>
            </Box>

            {/* Col 2: Tools */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>
                Tools
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {tools.slice(0, 5).map((t) => (
                  <li key={t.href}>
                    <MuiLink
                      component={Link}
                      to={t.href}
                      underline="none"
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        transition: 'color 0.2s',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {t.title}
                    </MuiLink>
                  </li>
                ))}
              </Box>
            </Box>

            {/* Col 3: Navigation */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>
                Navigation
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'All Tools', to: '/' },
                  { label: 'Blog', href: 'https://blogs.bitesinbyte.com' },
                  { label: 'Privacy Policy', to: '/privacy-policy' },
                  { label: 'Contact', href: 'https://github.com/bitesinbyte/tools/discussions/categories/q-a' },
                ].map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <MuiLink
                        component={Link}
                        to={item.to}
                        underline="none"
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          transition: 'color 0.2s',
                          '&:hover': { color: 'text.primary' },
                        }}
                      >
                        {item.label}
                      </MuiLink>
                    ) : (
                      <MuiLink
                        href={item.href}
                        target="_blank"
                        underline="none"
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          transition: 'color 0.2s',
                          '&:hover': { color: 'text.primary' },
                        }}
                      >
                        {item.label}
                      </MuiLink>
                    )}
                  </li>
                ))}
              </Box>
            </Box>

            {/* Col 4: Connect */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>
                Connect
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {socialLinks.map((item) => (
                  <IconButton
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    size="small"
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      color: 'text.secondary',
                      p: 1,
                      '&:hover': {
                        color: 'text.primary',
                        borderColor: alpha(theme.palette.text.primary, 0.2),
                      },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Copyright */}
          <Box sx={{ mt: 5, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              &copy; {new Date().getFullYear()} Bites In Byte. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
