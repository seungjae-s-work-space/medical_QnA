import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import LogoutIcon from '@mui/icons-material/Logout';
import { colors } from '../theme';

const DRAWER_WIDTH = 260;

const menuItems = [
  { path: '/', label: '상담 채팅', icon: <ChatIcon /> },
  { path: '/encyclopedia', label: '난임백과 관리', icon: <MenuBookIcon /> },
  { path: '/news', label: '뉴스 관리', icon: <NewspaperIcon /> },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: colors.inputBackground,
            borderRight: `1px solid ${colors.divider}`,
          },
        }}
      >
        {/* Logo / Title */}
        <Box
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: colors.textPrimary,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Q
          </Avatar>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: colors.textPrimary, lineHeight: 1.2 }}
            >
              난임상담톡
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              Admin Panel
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 2 }} />

        {/* Navigation */}
        <List sx={{ px: 1.5, py: 2, flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    bgcolor: isActive ? colors.backgroundAlt : 'transparent',
                    border: isActive ? `1px solid ${colors.divider}` : '1px solid transparent',
                    '&:hover': {
                      bgcolor: colors.backgroundAlt,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? colors.textPrimary : colors.textSecondary,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? colors.textPrimary : colors.textSecondary,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Logout */}
        <Box sx={{ p: 2, borderTop: `1px solid ${colors.divider}` }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.5,
              '&:hover': {
                bgcolor: colors.backgroundAlt,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: colors.textSecondary }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="로그아웃"
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                color: colors.textSecondary,
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: colors.background,
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
