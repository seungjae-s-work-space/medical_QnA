import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
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
  Badge,
} from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import { colors } from '../theme';
import MembershipRequiredDialog from './MembershipRequiredDialog';
import { shouldShowMembershipPrompt } from '../utils/membershipAccess';

const DRAWER_WIDTH = 280;

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoggedIn } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [membershipPromptOpen, setMembershipPromptOpen] = useState(false);

  useEffect(() => {
    if (shouldShowMembershipPrompt(location.pathname, isLoggedIn)) {
      setMembershipPromptOpen(true);
    } else {
      setMembershipPromptOpen(false);
    }
  }, [location.pathname, isLoggedIn]);

  // 안 읽은 채팅방 개수 실시간 리스너 (관리자만)
  useEffect(() => {
    if (!isAdmin) {
      setUnreadChatCount(0);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('unreadByAdmin', '>', 0)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadChatCount(snapshot.docs.length);
    });

    return unsubscribe;
  }, [isAdmin]);

  // 역할에 따른 메뉴 구성
  const getMenuItems = () => {
    const allMenuItems = [
      {
        path: '/',
        label: isAdmin ? '상담 채팅' : '상담하기',
        icon: <ChatBubbleOutlineRoundedIcon />,
        description: isAdmin ? '사용자 문의 관리' : '전문가 상담',
        badge: isAdmin ? unreadChatCount : 0,
        visible: true, // 모든 사용자 (비로그인도 탭 보임)
      },
      {
        path: '/notice',
        label: '공지사항',
        icon: <CampaignRoundedIcon />,
        description: isAdmin ? '공지사항 관리' : '공지사항 보기',
        badge: 0,
        visible: true, // 모든 사용자
      },
      {
        path: '/encyclopedia',
        label: '난임백과',
        icon: <AutoStoriesRoundedIcon />,
        description: isAdmin ? '정보 콘텐츠 관리' : '난임 정보 보기',
        badge: 0,
        visible: true, // 모든 사용자
      },
      {
        path: '/news',
        label: '뉴스',
        icon: <ArticleRoundedIcon />,
        description: isAdmin ? '뉴스 콘텐츠 관리' : '뉴스 보기',
        badge: 0,
        visible: true, // 모든 사용자
      },
      {
        path: '/video',
        label: '아기성공TV',
        icon: <YouTubeIcon />,
        description: isAdmin ? '유튜브 영상 관리' : '영상 보기',
        badge: 0,
        visible: true, // 모든 사용자
      },
      {
        path: '/users',
        label: '사용자 관리',
        icon: <PeopleAltRoundedIcon />,
        description: '사용자 목록 조회',
        badge: 0,
        visible: isAdmin, // 관리자만
      },
    ];

    return allMenuItems.filter(item => item.visible);
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/encyclopedia');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleMembershipLogin = () => {
    setMembershipPromptOpen(false);
    navigate('/login');
  };

  const handleMenuNavigation = (path) => {
    if (shouldShowMembershipPrompt(path, isLoggedIn)) {
      const normalizedCurrentPath =
        location.pathname.replace(/\/+$/, '') || '/';
      if (normalizedCurrentPath === path) {
        setMembershipPromptOpen(true);
      }
      navigate(path);
      return;
    }

    navigate(path);
  };

  // 타이틀 결정
  const getSubtitle = () => {
    if (isAdmin) return '관리자 대시보드';
    if (isLoggedIn) return '난임 정보 포털';
    return '난임 정보 포털';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.background }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: colors.sidebar,
            borderRight: 'none',
            boxShadow: '1px 0 10px rgba(0,0,0,0.03)',
          },
        }}
      >
        {/* Logo / Title */}
        <Box
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: colors.primary,
              fontSize: 18,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
            }}
          >
            Q
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: colors.textPrimary,
                lineHeight: 1.2,
                fontSize: 18,
              }}
            >
              난임상담톡톡
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: colors.textTertiary,
                fontSize: 12,
              }}
            >
              {getSubtitle()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 2.5, mb: 1 }} />

        {/* Navigation */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: colors.textTertiary,
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              px: 1.5,
            }}
          >
            메뉴
          </Typography>
        </Box>
        <List sx={{ px: 2, flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleMenuNavigation(item.path)}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.5,
                    px: 2,
                    bgcolor: isActive ? colors.primaryLight : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? colors.primaryLight : colors.backgroundAlt,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 44,
                      color: isActive ? colors.primary : colors.textSecondary,
                    }}
                  >
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: 10,
                          fontWeight: 700,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                        },
                      }}
                    >
                      {item.icon}
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.description}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? colors.primary : colors.textPrimary,
                    }}
                    secondaryTypographyProps={{
                      fontSize: 11,
                      color: colors.textTertiary,
                      mt: 0.25,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Login / Logout */}
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          {isLoggedIn ? (
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2.5,
                py: 1.5,
                px: 2,
                '&:hover': {
                  bgcolor: colors.errorLight,
                  '& .MuiListItemIcon-root': {
                    color: colors.error,
                  },
                  '& .MuiListItemText-primary': {
                    color: colors.error,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 44, color: colors.textSecondary }}>
                <LogoutRoundedIcon />
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
          ) : (
            <ListItemButton
              onClick={handleLogin}
              sx={{
                borderRadius: 2.5,
                py: 1.5,
                px: 2,
                bgcolor: colors.primaryLight,
                '&:hover': {
                  bgcolor: colors.primary,
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '& .MuiListItemText-primary': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 44, color: colors.primary }}>
                <LoginRoundedIcon />
              </ListItemIcon>
              <ListItemText
                primary="로그인 / 회원가입"
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.primary,
                }}
              />
            </ListItemButton>
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
      <MembershipRequiredDialog
        open={membershipPromptOpen}
        onContinue={() => setMembershipPromptOpen(false)}
        onLogin={handleMembershipLogin}
      />
    </Box>
  );
}

export default Layout;
