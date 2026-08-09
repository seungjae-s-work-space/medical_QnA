import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import MedicalInformationRoundedIcon from '@mui/icons-material/MedicalInformationRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';

const COMPANY_URL = 'https://agisungong.net/company';

const companyPalette = {
  page: '#FCFBF8',
  surface: '#FFFFFF',
  ink: '#2B2F2D',
  muted: '#6E746F',
  subtle: '#9EA59F',
  line: '#E8E2D8',
  lineStrong: '#D9CFBE',
  emerald: '#183D34',
  emeraldSoft: '#EEF4F1',
  champagne: '#B89B62',
};

const profileSections = [
  {
    label: 'Who we are',
    title: '난임 당사자와 실무자의 언어를 함께 이해하는 팀',
    body: '난임 전문 기자의 취재력과 골통주부의 당사자 관점을 바탕으로, 복잡한 정보를 차분하게 정리합니다.',
  },
  {
    label: 'What we do',
    title: '정보, 뉴스, 상담 흐름을 한곳에 모읍니다',
    body: '근거 중심 정보와 실제 치료 과정에서 필요한 질문을 연결해 사용자가 다음 선택을 더 선명하게 볼 수 있도록 돕습니다.',
  },
  {
    label: 'Why it matters',
    title: '위로보다 방향이 필요한 순간을 위해 만듭니다',
    body: '난임상담톡톡은 무료 회원제 난임 정보·상담 서비스로, 구독/인앱결제 없이 운영됩니다.',
  },
];

const trustItems = [
  {
    title: '근거 중심 정보',
    body: '난임백과와 뉴스로 임신 준비와 치료 흐름을 정리합니다.',
  },
  {
    title: '전문가 상담 흐름',
    body: '로그인 후 상담 채팅으로 개인 상황을 이어서 확인할 수 있습니다.',
  },
  {
    title: '무료 회원제',
    body: '구독/인앱결제 없이 운영하며 정보 접근성을 우선합니다.',
  },
];

const serviceLinks = [
  { label: '난임백과', path: '/encyclopedia', icon: <AutoStoriesRoundedIcon /> },
  { label: '뉴스', path: '/news', icon: <NewspaperRoundedIcon /> },
  { label: '아기성공TV', path: '/video', icon: <YouTubeIcon /> },
  { label: '공지사항', path: '/notice', icon: <MedicalInformationRoundedIcon /> },
];

const primaryButtonSx = {
  minHeight: 48,
  px: 2.4,
  borderRadius: 999,
  bgcolor: companyPalette.emerald,
  color: companyPalette.surface,
  boxShadow: '0 14px 30px rgba(24, 61, 52, 0.16)',
  '&:hover': {
    bgcolor: '#102E27',
    boxShadow: '0 16px 34px rgba(24, 61, 52, 0.2)',
  },
};

const secondaryButtonSx = {
  minHeight: 48,
  px: 2.4,
  borderRadius: 999,
  borderColor: companyPalette.lineStrong,
  color: companyPalette.ink,
  bgcolor: companyPalette.surface,
  '&:hover': {
    borderColor: companyPalette.emerald,
    bgcolor: companyPalette.emeraldSoft,
  },
};

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
        bgcolor: companyPalette.page,
        color: companyPalette.ink,
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 680,
          mx: 'auto',
        }}
      >
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: { xs: 5, sm: 7 },
          }}
        >
          <Typography
            sx={{
              color: companyPalette.emerald,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.12em',
            }}
          >
            NANIMTALK
          </Typography>
          <Typography
            sx={{
              color: companyPalette.subtle,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            agisungong.net/company
          </Typography>
        </Box>

        <Box component="main">
          <Box
            component="section"
            sx={{
              pb: { xs: 4, sm: 5 },
              borderBottom: `1px solid ${companyPalette.line}`,
            }}
          >
            <Typography
              sx={{
                color: companyPalette.champagne,
                fontSize: 13,
                fontWeight: 800,
                mb: 2,
              }}
            >
              난임 정보·상담 플랫폼
            </Typography>
            <Typography
              component="h1"
              sx={{
                color: companyPalette.ink,
                fontSize: { xs: 39, sm: 52 },
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: 0,
                mb: 2.2,
              }}
            >
              난임상담톡톡
            </Typography>
            <Typography
              sx={{
                color: companyPalette.muted,
                fontSize: { xs: 17, sm: 19 },
                lineHeight: 1.72,
                maxWidth: 590,
                mb: 3.2,
              }}
            >
              난임 전문 기자와 골통주부가 함께 만든, 무료 회원제 난임 정보·상담 서비스입니다.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
              <Button
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate('/')}
                sx={primaryButtonSx}
              >
                서비스 보기
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/chat')}
                sx={secondaryButtonSx}
              >
                상담 시작하기
              </Button>
            </Box>
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 3.5, sm: 4.5 },
              display: 'grid',
              gap: { xs: 2.4, sm: 2.8 },
              borderBottom: `1px solid ${companyPalette.line}`,
            }}
          >
            {profileSections.map((section) => (
              <Box
                key={section.label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '128px minmax(0, 1fr)' },
                  gap: { xs: 0.9, sm: 2.5 },
                }}
              >
                <Typography
                  sx={{
                    color: companyPalette.champagne,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {section.label}
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      color: companyPalette.ink,
                      fontSize: { xs: 18, sm: 19 },
                      fontWeight: 850,
                      lineHeight: 1.44,
                      mb: 0.8,
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: companyPalette.muted,
                      fontSize: 14.5,
                      lineHeight: 1.72,
                    }}
                  >
                    {section.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 3.5, sm: 4.5 },
              borderBottom: `1px solid ${companyPalette.line}`,
            }}
          >
            <Typography
              sx={{
                color: companyPalette.ink,
                fontSize: 16,
                fontWeight: 850,
                mb: 1.8,
              }}
            >
              Service signals
            </Typography>
            <Box sx={{ display: 'grid', gap: 0 }}>
              {trustItems.map((item, index) => (
                <Box key={item.title}>
                  {index > 0 && <Divider sx={{ borderColor: companyPalette.line }} />}
                  <Box
                    sx={{
                      py: 1.8,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '168px minmax(0, 1fr)' },
                      gap: { xs: 0.6, sm: 2 },
                    }}
                  >
                    <Typography
                      sx={{
                        color: companyPalette.emerald,
                        fontSize: 14,
                        fontWeight: 850,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: companyPalette.muted,
                        fontSize: 14,
                        lineHeight: 1.65,
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
            component="section"
            sx={{
              py: { xs: 3.5, sm: 4.5 },
              borderBottom: `1px solid ${companyPalette.line}`,
            }}
          >
            <Typography
              sx={{
                color: companyPalette.ink,
                fontSize: 16,
                fontWeight: 850,
                mb: 1.5,
              }}
            >
              Explore
            </Typography>
            <Box>
              {serviceLinks.map((item, index) => (
                <Box key={item.path}>
                  {index > 0 && <Divider sx={{ borderColor: companyPalette.line }} />}
                  <Button
                    fullWidth
                    onClick={() => navigate(item.path)}
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{
                      minHeight: 52,
                      px: 0,
                      justifyContent: 'space-between',
                      color: companyPalette.ink,
                      borderRadius: 0,
                      '& .MuiButton-startIcon': {
                        color: companyPalette.emerald,
                      },
                      '& .MuiButton-endIcon': {
                        color: companyPalette.subtle,
                      },
                      '&:hover': {
                        bgcolor: 'transparent',
                        color: companyPalette.emerald,
                      },
                    }}
                    startIcon={item.icon}
                  >
                    {item.label}
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            component="section"
            sx={{
              py: { xs: 3.5, sm: 4.5 },
            }}
          >
            <Typography
              sx={{
                color: companyPalette.ink,
                fontSize: 16,
                fontWeight: 850,
                mb: 1,
              }}
            >
              Contact / Link
            </Typography>
            <Typography
              sx={{
                color: companyPalette.muted,
                fontSize: 14.5,
                lineHeight: 1.72,
                mb: 2,
              }}
            >
              외부 미팅이나 소개가 필요할 때 아래 링크를 공유하세요.
            </Typography>
            <Button
              fullWidth
              startIcon={<ContentCopyRoundedIcon />}
              onClick={handleCopy}
              sx={primaryButtonSx}
            >
              회사소개 링크 복사
            </Button>
            <Typography
              sx={{
                color: companyPalette.subtle,
                fontSize: 12.5,
                lineHeight: 1.65,
                mt: 2.4,
              }}
            >
              본 서비스는 의료법과 생명윤리법을 준수하며 의료기관 연결 및 유도 행위를 하지 않습니다.
            </Typography>
          </Box>
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
