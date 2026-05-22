import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';

const quickLinks = [
  {
    label: '상담하기',
    description: '전문가 1:1 상담',
    path: '/chat',
    icon: <ChatBubbleOutlineRoundedIcon />,
  },
  {
    label: '난임백과',
    description: '근거 중심 정보',
    path: '/encyclopedia',
    icon: <AutoStoriesRoundedIcon />,
  },
  {
    label: '뉴스',
    description: '최신 이슈 분석',
    path: '/news',
    icon: <ArticleRoundedIcon />,
  },
  {
    label: '공지사항',
    description: '서비스 안내',
    path: '/notice',
    icon: <CampaignRoundedIcon />,
  },
  {
    label: '아기성공TV',
    description: '영상 콘텐츠',
    path: '/video',
    icon: <YouTubeIcon />,
  },
  {
    label: '회원제(무료)',
    description: '무료로 운영합니다',
    action: 'membership',
    icon: <FavoriteBorderRoundedIcon />,
  },
];

const updatePrompts = [
  {
    label: '오늘의 뉴스',
    title: '난임 최신 연구와 치료 흐름을 확인하세요',
    action: 'news',
  },
  {
    label: '추천 백과',
    title: '시술 전 알아두면 좋은 핵심 정보를 모았습니다',
    action: 'encyclopedia',
  },
];

function HomeDashboard() {
  const navigate = useNavigate();
  const [membershipInfoOpen, setMembershipInfoOpen] = useState(false);

  const handleQuickLinkClick = (item) => {
    if (item.action === 'membership') {
      setMembershipInfoOpen(true);
      return;
    }

    navigate(item.path);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 5 },
        background:
          `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)' },
            gap: { xs: 2, md: 3 },
            alignItems: 'stretch',
            p: { xs: 2.25, md: 3 },
            borderRadius: { xs: 3, md: 5 },
            bgcolor: 'rgba(255,255,255,0.78)',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 24px 70px rgba(31, 51, 43, 0.12)',
          }}
        >
          <Box
            sx={{
              minHeight: { xs: 'auto', md: 330 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: { xs: 1, md: 2 },
            }}
          >
            <Typography
              sx={{
                display: 'inline-flex',
                width: 'fit-content',
                mb: 2,
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                bgcolor: colors.primaryLight,
                color: colors.primaryDark,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              회원제(무료)로 운영합니다
            </Typography>
            <Typography
              variant="h3"
              sx={{
                color: colors.textPrimary,
                fontWeight: 900,
                fontSize: { xs: 30, md: 42 },
                lineHeight: 1.15,
                mb: 2,
                letterSpacing: 0,
              }}
            >
              난임상담톡톡
            </Typography>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: { xs: 15, md: 17 },
                lineHeight: 1.75,
                maxWidth: 620,
                mb: 3,
              }}
            >
              난임 전문 기자와 골통주부가 만든 정보 포털입니다. 상담, 난임백과,
              뉴스, 영상 콘텐츠를 한 화면에서 빠르게 시작하세요.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate('/chat')}
                sx={{ px: 3, py: 1.35, borderRadius: 999 }}
              >
                상담 시작하기
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/encyclopedia')}
                sx={{ px: 3, py: 1.35, borderRadius: 999 }}
              >
                난임백과 보기
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: { xs: 3, md: 4 },
              p: { xs: 1.25, md: 1.75 },
              bgcolor: 'rgba(255,255,255,0.72)',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 44px rgba(31, 51, 43, 0.1)',
            }}
          >
            <Box
              component="img"
              src="/home-dashboard.png"
              alt="난임상담톡톡"
              sx={{
                display: 'block',
                width: '100%',
                maxWidth: 330,
                maxHeight: { xs: 360, md: 430 },
                objectFit: 'contain',
                borderRadius: { xs: 2, md: 3 },
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {quickLinks.map((item) => (
            <Box
              key={item.label}
              component="button"
              type="button"
              onClick={() => handleQuickLinkClick(item)}
              sx={{
                width: '100%',
                minHeight: 112,
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                textAlign: 'left',
                p: 2,
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                bgcolor: 'rgba(255,255,255,0.74)',
                boxShadow: '0 14px 34px rgba(31, 51, 43, 0.07)',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                font: 'inherit',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: colors.primary,
                  boxShadow: '0 18px 44px rgba(31, 51, 43, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: colors.primaryLight,
                  color: colors.primaryDark,
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: colors.textPrimary, fontWeight: 800, fontSize: 16 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ color: colors.textSecondary, fontSize: 13, mt: 0.4 }}>
                  {item.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {updatePrompts.map((item) => (
            <Box
              key={item.label}
              component="button"
              type="button"
              onClick={() => {
                if (item.action === 'news') {
                  navigate('/news');
                  return;
                }
                navigate('/encyclopedia');
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 2,
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                bgcolor: 'rgba(255,255,255,0.64)',
                color: colors.textPrimary,
                cursor: 'pointer',
                font: 'inherit',
                textAlign: 'left',
                '&:hover': {
                  bgcolor: colors.primaryLight,
                },
              }}
            >
              <Box>
                <Typography sx={{ color: colors.primaryDark, fontSize: 13, fontWeight: 800, mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ color: colors.textPrimary, fontWeight: 700, fontSize: 15 }}>
                  {item.title}
                </Typography>
              </Box>
              <ArrowForwardRoundedIcon sx={{ color: colors.primaryDark, flexShrink: 0 }} />
            </Box>
          ))}
        </Box>

        <Dialog
          open={membershipInfoOpen}
          onClose={() => setMembershipInfoOpen(false)}
          aria-labelledby="home-membership-info-title"
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle
            id="home-membership-info-title"
            sx={{
              color: colors.textPrimary,
              fontSize: 20,
              fontWeight: 800,
              pb: 1,
            }}
          >
            회원제(무료) 안내
          </DialogTitle>
          <DialogContent>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              본 서비스는 회원제(무료)로 운영됩니다. 로그인하면 채팅 상담을
              이용하고 관심 콘텐츠를 더 편하게 이어볼 수 있습니다.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setMembershipInfoOpen(false)} sx={{ color: colors.textSecondary }}>
              닫기
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setMembershipInfoOpen(false);
                navigate('/login');
              }}
            >
              로그인하러 가기
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

export default HomeDashboard;
