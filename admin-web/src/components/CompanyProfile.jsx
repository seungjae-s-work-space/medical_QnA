import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import MedicalInformationRoundedIcon from '@mui/icons-material/MedicalInformationRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { colors } from '../theme';

const COMPANY_URL = 'https://agisungong.net/company';

const trustItems = [
  {
    title: '근거 중심 정보',
    body: '난임백과와 뉴스로 임신 준비와 치료 흐름을 차분하게 정리합니다.',
    icon: <AutoStoriesRoundedIcon />,
  },
  {
    title: '전문가 상담 흐름',
    body: '로그인 후 상담 채팅으로 개인 상황을 이어서 확인할 수 있습니다.',
    icon: <ChatBubbleOutlineRoundedIcon />,
  },
  {
    title: '무료 회원제',
    body: '구독/인앱결제 없이 운영하며 필요한 정보 접근성을 우선합니다.',
    icon: <VolunteerActivismRoundedIcon />,
  },
];

const serviceLinks = [
  { label: '난임백과', path: '/encyclopedia', icon: <AutoStoriesRoundedIcon /> },
  { label: '뉴스', path: '/news', icon: <NewspaperRoundedIcon /> },
  { label: '아기성공TV', path: '/video', icon: <YouTubeIcon /> },
  { label: '공지사항', path: '/notice', icon: <MedicalInformationRoundedIcon /> },
];

function CompanyProfile() {
  const navigate = useNavigate();
  const [copyMessage, setCopyMessage] = useState('');

  const handleCopy = async () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setCopyMessage('링크 복사를 지원하지 않는 브라우저입니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(COMPANY_URL);
      setCopyMessage('소개 링크를 복사했습니다.');
    } catch (error) {
      setCopyMessage('링크를 복사하지 못했습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 5 },
        bgcolor: colors.background,
        background: `linear-gradient(145deg, ${colors.background} 0%, ${colors.aqua} 48%, ${colors.backgroundWarm} 100%)`,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
        <Box
          component="section"
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.82)',
            boxShadow: '0 26px 72px rgba(31, 51, 43, 0.13)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Chip
              label="난임 정보·상담 플랫폼"
              sx={{
                mb: 2,
                bgcolor: colors.primaryLight,
                color: colors.primaryDark,
                fontWeight: 800,
              }}
            />
            <Typography
              component="h1"
              sx={{
                color: colors.textPrimary,
                fontSize: { xs: 34, sm: 46 },
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: 0,
                mb: 1.5,
              }}
            >
              난임상담톡톡
            </Typography>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: { xs: 16, sm: 18 },
                lineHeight: 1.75,
                mb: 3,
              }}
            >
              난임 전문 기자와 골통주부가 함께 만든, 무료 회원제 난임 정보·상담 서비스입니다.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate('/')}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                서비스 보기
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/chat')}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                상담 시작하기
              </Button>
            </Box>
          </Box>
          <Divider sx={{ borderColor: colors.border }} />
          <Box sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gap: 1.25 }}>
            {trustItems.map((item) => (
              <Box
                key={item.title}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: colors.cardTint,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Box sx={{ color: colors.primaryDark, pt: 0.25 }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: colors.textPrimary,
                      fontWeight: 850,
                      fontSize: 15.5,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: colors.textSecondary,
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      mt: 0.4,
                    }}
                  >
                    {item.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          {serviceLinks.map((item) => (
            <Button
              key={item.path}
              variant="outlined"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                minHeight: 52,
                borderRadius: 3,
                justifyContent: 'flex-start',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box
          sx={{
            mt: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 4,
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.76)',
          }}
        >
          <Typography
            sx={{ color: colors.primaryDark, fontWeight: 850, mb: 0.75 }}
          >
            공유 링크
          </Typography>
          <Typography
            sx={{
              color: colors.textSecondary,
              fontSize: 14,
              wordBreak: 'break-all',
              mb: 1.5,
            }}
          >
            agisungong.net/company
          </Typography>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={handleCopy}
            sx={{ borderRadius: 3 }}
          >
            소개 링크 복사
          </Button>
          <Typography
            sx={{
              color: colors.textTertiary,
              fontSize: 12.5,
              lineHeight: 1.65,
              mt: 2,
            }}
          >
            본 서비스는 의료법과 생명윤리법을 준수하며 의료기관 연결 및 유도 행위를 하지 않습니다.
          </Typography>
        </Box>
      </Box>
      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={2200}
        onClose={() => setCopyMessage('')}
        message={copyMessage}
      />
    </Box>
  );
}

export default CompanyProfile;
