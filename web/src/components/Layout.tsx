import { useState } from 'react';
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

const navLinks = [
  { label: 'Home', to: '/', icon: <HomeIcon fontSize="small" /> },
  ...tools.map((t) => ({ label: t.title, to: t.href, icon: undefined })),
];

export default function Layout() {
  const { mode, toggleTheme } = useThemeMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isHome = location.pathname === '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          borderBottom: 1,
          borderColor: 'divider',
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
        <Container maxWidth="lg">
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
                mr: 2,
              }}
            >
              <img src="/favicons/android-chrome-192x192.png" width={28} height={28} alt="logo" />
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.025em',
                  fontSize: '1.125rem',
                }}
              >
                BitesInByte
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop nav links */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {[
                  { label: 'Blog', href: 'https://blogs.bitesinbyte.com', icon: <ArticleIcon fontSize="small" /> },
                  { label: 'Ko-fi', href: 'https://ko-fi.com/bitesinbyte', icon: <CoffeeIcon fontSize="small" /> },
                  { label: 'GitHub', href: 'https://github.com/manishtiwari25', icon: <GitHubIcon fontSize="small" /> },
                ].map((item) => (
                  <Tooltip key={item.label} title={item.label}>
                    <IconButton
                      color="inherit"
                      href={item.href}
                      target="_blank"
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 0.75,
                        '&:hover': { color: 'text.primary', borderColor: 'action.hover' },
                      }}
                    >
                      {item.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            )}

            {/* Theme toggle */}
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: 'text.secondary',
                  ml: 0.5,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Mobile menu */}
            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                size="small"
                sx={{ color: 'text.secondary', ml: 0.5 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: 280, bgcolor: 'background.default', borderLeft: 1, borderColor: 'divider' },
          },
        }}
      >
        <Box sx={{ pt: 2, pb: 1, px: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            Tools
          </Typography>
        </Box>
        <List dense>
          {navLinks.map((item) => (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                component={Link}
                to={item.to}
                selected={location.pathname === item.to}
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: 1, mx: 1, '&.Mui-selected': { bgcolor: 'action.selected' } }}
              >
                {item.icon && <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>}
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { href: 'https://blogs.bitesinbyte.com', icon: <ArticleIcon fontSize="small" /> },
              { href: 'https://ko-fi.com/bitesinbyte', icon: <CoffeeIcon fontSize="small" /> },
              { href: 'https://github.com/manishtiwari25', icon: <GitHubIcon fontSize="small" /> },
            ].map((item) => (
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
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {item.icon}
              </IconButton>
            ))}
          </Box>
        </Box>
      </Drawer>

      {/* ── Content ────────────────────────────────────────── */}
      <Box sx={{ pt: '56px' }}>
        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            py: isHome ? 0 : { xs: 3, md: 4 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          mt: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              &copy; {new Date().getFullYear()} bitesinbyte.com
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <MuiLink
                component={Link}
                to="/privacy-policy"
                variant="body2"
                underline="none"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Privacy Policy
              </MuiLink>
              <MuiLink
                href="https://github.com/bitesinbyte/tools/discussions/categories/q-a"
                target="_blank"
                variant="body2"
                underline="none"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Contact Us
              </MuiLink>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1.5, display: 'block', opacity: 0.7, fontSize: '0.75rem' }}
          >
            This website uses cookies to personalise content and analyse traffic.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
