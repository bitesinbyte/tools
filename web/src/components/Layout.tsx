import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
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
  CircularProgress,
  InputAdornment,
  TextField,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import CoffeeIcon from '@mui/icons-material/Coffee';
import GitHubIcon from '@mui/icons-material/GitHub';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useThemeMode } from '../theme/ThemeProvider';
import { matchesToolSearch, tools } from '../data/tools';
import Logo from './Logo';

/* ── Desktop nav links (shown as text in the header) ─── */
const desktopNavLinks = [
  { label: 'Tools', to: '/' },
  { label: 'Blog', href: 'https://blogs.bitesinbyte.com' },
];

/* ── External social links ───────────────────────────── */
const socialLinks = [
  { label: 'Blog', href: 'https://blogs.bitesinbyte.com', icon: <ArticleIcon sx={{ fontSize: 16 }} /> },
  { label: 'Ko-fi', href: 'https://ko-fi.com/bitesinbyte', icon: <CoffeeIcon sx={{ fontSize: 16 }} /> },
  { label: 'GitHub', href: 'https://github.com/bitesinbyte', icon: <GitHubIcon sx={{ fontSize: 16 }} /> },
];

function PageLoading() {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function Layout() {
  const { mode, toggleTheme } = useThemeMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isHome = location.pathname === '/';
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  const drawerTools = useMemo(
    () => tools.filter((tool) => matchesToolSearch(tool, drawerSearch)),
    [drawerSearch],
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerSearch('');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MuiLink
        href="#main-content"
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: (muiTheme) => muiTheme.zIndex.modal + 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          transform: 'translateY(-150%)',
          '&:focus': { transform: 'translateY(0)' },
        }}
      >
        Skip to main content
      </MuiLink>
      {/* ── Nav ─────────────────────────────────────────── */}
      <AppBar
        component="header"
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
              <Box
                component="nav"
                aria-label="Primary navigation"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}
              >
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
                      <MuiLink
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.label} (opens in a new tab)`}
                        sx={commonSx}
                      >
                        {item.label}
                      </MuiLink>
                    );
                  }
                  return (
                    <MuiLink
                      key={item.label}
                      component={Link}
                      to={item.to!}
                      aria-current={isActive ? 'page' : undefined}
                      sx={commonSx}
                    >
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
                  aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
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
                aria-controls="mobile-tools-drawer"
                aria-expanded={drawerOpen}
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
        onClose={closeDrawer}
        aria-label="Tools navigation"
        slotProps={{
          paper: {
            id: 'mobile-tools-drawer',
            sx: {
              width: { xs: 'min(88vw, 360px)', sm: 360 },
              bgcolor: 'background.default',
              borderLeft: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1.5, pb: 1, px: 2 }}>
          <Typography
            id="mobile-tools-heading"
            variant="subtitle2"
            color="text.secondary"
            sx={{
              flex: 1,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.7rem',
            }}
          >
            Tools
          </Typography>
          <IconButton onClick={closeDrawer} aria-label="Close menu" size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={drawerSearch}
            onChange={(event) => setDrawerSearch(event.target.value)}
            label="Search tools"
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <List dense aria-labelledby="mobile-tools-heading" sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/"
              selected={location.pathname === '/'}
              aria-current={location.pathname === '/' ? 'page' : undefined}
              onClick={closeDrawer}
              sx={{ borderRadius: 1, mx: 1, '&.Mui-selected': { bgcolor: 'action.selected' } }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="All tools" slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
            </ListItemButton>
          </ListItem>
          {drawerTools.map((tool) => (
            <ListItem key={tool.href} disablePadding>
              <ListItemButton
                component={Link}
                to={tool.href}
                selected={location.pathname === tool.href}
                aria-current={location.pathname === tool.href ? 'page' : undefined}
                onClick={closeDrawer}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemText
                  primary={tool.title}
                  secondary={tool.category}
                  slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {drawerTools.length === 0 && (
            <Typography color="text.secondary" sx={{ px: 3, py: 2, fontSize: '0.875rem' }}>
              No tools match “{drawerSearch.trim()}”.
            </Typography>
          )}
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {socialLinks.map((item) => (
              <IconButton
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.label} (opens in a new tab)`}
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
      <Box
        component="main"
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        sx={{ pt: '56px', flex: 1, outline: 'none' }}
      >
        <Container
          maxWidth="md"
          sx={{
            py: isHome ? 0 : { xs: 3, md: 4 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────── */}
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 4, sm: 4 },
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.2fr 1fr 1fr 1fr' },
            }}
          >
            {/* Col 1: Brand */}
            <Box sx={{ gridColumn: { sm: 'span 2', md: 'span 1' } }}>
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
                        rel="noopener noreferrer"
                        aria-label={`${item.label} (opens in a new tab)`}
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
                    rel="noopener noreferrer"
                    aria-label={`${item.label} (opens in a new tab)`}
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
