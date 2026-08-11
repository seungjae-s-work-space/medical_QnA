import { useEffect, useState } from 'react';
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
  page: '#565653',
  surface: '#FCFBF8',
  paper: '#F6F3EC',
  ink: '#2B2F2D',
  muted: '#6E746F',
  subtle: '#9EA59F',
  line: '#E8E2D8',
  lineStrong: '#D9CFBE',
  emerald: '#183D34',
  emeraldSoft: '#EEF4F1',
  champagne: '#B89B62',
  black: '#111312',
};

const profileSections = [
  {
    label: '회사 소개',
    title: '디지털 헬스케어 콘텐츠 팀',
    body: '취재와 당사자 관점을 바탕으로 난임 정보를 정리합니다.',
  },
  {
    label: '사업 영역',
    title: '백과·뉴스·상담 운영',
    body: '읽고, 확인하고, 질문하는 흐름을 제공합니다.',
  },
  {
    label: '운영 원칙',
    title: '무료 회원제 운영',
    body: '구독/인앱결제 없이 운영하며 의료기관 연결을 하지 않습니다.',
  },
];

const businessItems = [
  {
    title: '근거 중심 정보',
    body: '난임백과와 해설형 콘텐츠를 제공합니다.',
    icon: <AutoStoriesRoundedIcon />,
  },
  {
    title: '뉴스 큐레이션',
    body: '생식의학 동향을 읽기 쉽게 정리합니다.',
    icon: <NewspaperRoundedIcon />,
  },
  {
    title: '상담 접점',
    body: '회원이 이어서 질문할 수 있는 채팅을 제공합니다.',
    icon: <MedicalInformationRoundedIcon />,
  },
];

const serviceLinks = [
  { label: '난임백과', path: '/encyclopedia', icon: <AutoStoriesRoundedIcon /> },
  { label: '뉴스', path: '/news', icon: <NewspaperRoundedIcon /> },
  { label: '아기성공TV', path: '/video', icon: <YouTubeIcon /> },
  { label: '공지사항', path: '/notice', icon: <MedicalInformationRoundedIcon /> },
];

const editorialFrameSx = {
  width: '100%',
  maxWidth: 1040,
  mx: 'auto',
  bgcolor: companyPalette.surface,
  border: `1px solid ${companyPalette.lineStrong}`,
  boxShadow: '0 34px 86px rgba(17, 19, 18, 0.24)',
  p: { xs: 1, sm: 1.3 },
};

const innerPaperSx = {
  border: `1px solid ${companyPalette.lineStrong}`,
  bgcolor: companyPalette.surface,
  px: { xs: 2, sm: 3.4, md: 4 },
  py: { xs: 2, sm: 3.2, md: 3.8 },
};

const primaryButtonSx = {
  minHeight: 42,
  px: 2,
  borderRadius: 0.6,
  bgcolor: companyPalette.black,
  color: companyPalette.surface,
  fontSize: 12,
  fontWeight: 850,
  transition: 'transform 160ms ease, background-color 160ms ease',
  '&:hover': {
    bgcolor: companyPalette.emerald,
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
};

const secondaryButtonSx = {
  minHeight: 42,
  px: 2,
  borderRadius: 0.6,
  borderColor: companyPalette.lineStrong,
  color: companyPalette.ink,
  bgcolor: companyPalette.surface,
  fontSize: 12,
  fontWeight: 850,
  transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
  '&:hover': {
    borderColor: companyPalette.emerald,
    bgcolor: companyPalette.emeraldSoft,
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
};

function CompanyProfile() {
  const navigate = useNavigate();
  const [copyMessage, setCopyMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(profileSections[0].label);

  useEffect(() => {
    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress =
        scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0;

      setScrollProgress(nextProgress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const copiedTimer = window.setTimeout(() => setCopied(false), 2200);

    return () => window.clearTimeout(copiedTimer);
  }, [copied]);

  const handleCopy = async () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setCopied(false);
      setCopyMessage('링크 복사를 지원하지 않는 브라우저입니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(COMPANY_URL);
      setCopied(true);
      setCopyMessage('소개 링크를 복사했습니다.');
    } catch (error) {
      setCopied(false);
      setCopyMessage('링크를 복사하지 못했습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: companyPalette.page,
        color: companyPalette.ink,
        px: { xs: 1.5, sm: 3 },
        py: { xs: 3, sm: 6.5 },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${Math.round(scrollProgress * 100)}%`,
          height: 3,
          bgcolor: companyPalette.champagne,
          zIndex: 1300,
          transition: 'width 0.12s ease-out',
        }}
      />

      <Typography
        sx={{
          color: companyPalette.surface,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textAlign: 'center',
          mb: 1.2,
        }}
      >
        회사소개서
      </Typography>
      <Typography
        sx={{
          color: 'rgba(252, 251, 248, 0.82)',
          fontSize: { xs: 17, sm: 20 },
          fontWeight: 650,
          letterSpacing: '0.08em',
          textAlign: 'center',
          mb: { xs: 3.4, sm: 5.4 },
        }}
      >
        agisungong.net/company
      </Typography>

      <Box sx={editorialFrameSx}>
        <Box sx={innerPaperSx}>
          <Box
            component="header"
            sx={{
              minHeight: 42,
              borderBottom: `1px solid ${companyPalette.ink}`,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', md: '180px 1fr auto' },
              alignItems: 'center',
              gap: 1.4,
              pb: 1.3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 19,
                  height: 19,
                  border: `1px solid ${companyPalette.ink}`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    bgcolor: companyPalette.emerald,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 850 }}>NANIMTALK</Typography>
            </Box>

            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                justifyContent: 'center',
                gap: 2.2,
              }}
            >
              {['소개', '사업', '원칙', '문의'].map((item) => (
                <Typography
                  key={item}
                  sx={{
                    color: companyPalette.ink,
                    fontSize: 10,
                    fontWeight: 850,
                    letterSpacing: '0.08em',
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>

            <Button onClick={handleCopy} sx={{ ...primaryButtonSx, minHeight: 30, px: 1.4 }}>
              {copied ? '링크 복사됨' : 'SHARE'}
            </Button>
          </Box>

          <Box component="main">
            <Box
              component="section"
              sx={{
                py: { xs: 3.2, sm: 4.8 },
              }}
            >
              <Typography
                sx={{
                  color: companyPalette.muted,
                  fontSize: 11,
                  fontWeight: 850,
                  letterSpacing: '0.08em',
                  mb: 1.4,
                }}
              >
                법인·사업 소개
              </Typography>
              <Typography
                component="h1"
                sx={{
                  color: companyPalette.black,
                  fontSize: { xs: 43, sm: 70, md: 86 },
                  fontWeight: 900,
                  lineHeight: 0.98,
                  letterSpacing: 0,
                  maxWidth: 850,
                  mb: { xs: 2.4, sm: 3.2 },
                }}
              >
                난임 정보 사업을 운영합니다.
              </Typography>
              <Typography
                sx={{
                  color: companyPalette.muted,
                  fontSize: { xs: 16, sm: 19 },
                  lineHeight: 1.72,
                  maxWidth: 620,
                }}
              >
                디지털 헬스케어 콘텐츠 팀이 운영하는 무료 회원제 난임 정보·상담 서비스입니다.
              </Typography>
            </Box>

            <Box
              component="section"
              sx={{
                borderRadius: 0.8,
                overflow: 'hidden',
                border: `1px solid ${companyPalette.lineStrong}`,
                bgcolor: companyPalette.paper,
                mb: { xs: 3.4, sm: 4.4 },
              }}
            >
              <Box
                component="img"
                src="/home-dashboard.png"
                alt="난임상담톡톡 서비스 소개 이미지"
                sx={{
                  display: 'block',
                  width: '100%',
                  height: { xs: 248, sm: 360, md: 430 },
                  objectFit: 'cover',
                  objectPosition: '50% 34%',
                }}
              />
            </Box>

            <Box
              component="section"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
                borderTop: `1px solid ${companyPalette.ink}`,
                borderBottom: `1px solid ${companyPalette.ink}`,
              }}
            >
              <Box
                sx={{
                  py: { xs: 3.2, md: 4.2 },
                  pr: { md: 5 },
                  borderRight: { md: `1px solid ${companyPalette.ink}` },
                }}
              >
                <Typography
                  sx={{
                    color: companyPalette.muted,
                    fontSize: 11,
                    fontWeight: 850,
                    letterSpacing: '0.08em',
                    mb: 1.4,
                  }}
                >
                  사업 개요
                </Typography>
                <Typography
                  sx={{
                    color: companyPalette.black,
                    fontSize: { xs: 33, sm: 46, md: 54 },
                    fontWeight: 900,
                    lineHeight: 1.04,
                    letterSpacing: 0,
                    mb: 3,
                  }}
              >
                  난임 정보와 상담 접점을 운영합니다.
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

              <Box sx={{ py: { xs: 1.2, md: 2.6 }, pl: { md: 3.4 } }}>
                {profileSections.map((section, index) => {
                  const isActive = activeSection === section.label;

                  return (
                    <Box key={section.label}>
                      {index > 0 && <Divider sx={{ borderColor: companyPalette.lineStrong }} />}
                      <Box
                        component="button"
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveSection(section.label)}
                        onMouseEnter={() => setActiveSection(section.label)}
                        sx={{
                          appearance: 'none',
                          width: '100%',
                          border: 0,
                          borderRadius: 0,
                          bgcolor: isActive ? companyPalette.emeraldSoft : 'transparent',
                          display: 'grid',
                          gridTemplateColumns: '42px minmax(0, 1fr)',
                          gap: 1.6,
                          textAlign: 'left',
                          cursor: 'pointer',
                          py: 2,
                          px: { xs: 0.8, md: 1.2 },
                          transition:
                            'background-color 180ms ease, transform 180ms ease, color 180ms ease',
                          '&:hover': {
                            bgcolor: companyPalette.emeraldSoft,
                            transform: 'translateX(2px)',
                          },
                          '&:active': {
                            transform: 'translateX(0)',
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            color: isActive ? companyPalette.emerald : companyPalette.champagne,
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </Typography>
                        <Box>
                          <Typography
                            sx={{
                              color: companyPalette.black,
                              fontSize: 14,
                              fontWeight: 900,
                              letterSpacing: '0.04em',
                              mb: 0.6,
                            }}
                          >
                            {section.label}
                          </Typography>
                          <Typography
                            sx={{
                              color: companyPalette.ink,
                              fontSize: { xs: 18, sm: 20 },
                              fontWeight: 850,
                              lineHeight: 1.34,
                              mb: 0.7,
                            }}
                          >
                            {section.title}
                          </Typography>
                          <Typography
                            sx={{
                              color: companyPalette.muted,
                              fontSize: 13.5,
                              lineHeight: 1.65,
                            }}
                          >
                            {section.body}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box
              component="section"
              sx={{
                py: { xs: 3.4, sm: 4.4 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
                gap: { xs: 2.4, md: 3.4 },
                borderBottom: `1px solid ${companyPalette.ink}`,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: companyPalette.black,
                    fontSize: { xs: 28, sm: 34 },
                    fontWeight: 900,
                    lineHeight: 1.02,
                    mb: 1.2,
                  }}
                >
                  사업 영역
                </Typography>
                <Typography
                  sx={{
                    color: companyPalette.muted,
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  필요한 정보를 짧고 명확하게 연결합니다.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                  borderTop: { xs: `1px solid ${companyPalette.lineStrong}`, sm: 0 },
                  borderLeft: { sm: `1px solid ${companyPalette.lineStrong}` },
                }}
              >
                {businessItems.map((item, index) => (
                  <Box
                    key={item.title}
                    sx={{
                      minHeight: 150,
                      p: { xs: 2.1, sm: 2.3 },
                      borderRight: {
                        sm: index < businessItems.length - 1
                          ? `1px solid ${companyPalette.lineStrong}`
                          : 0,
                      },
                      borderBottom: {
                        xs: index < businessItems.length - 1
                          ? `1px solid ${companyPalette.lineStrong}`
                          : 0,
                        sm: 0,
                      },
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box
                      sx={{
                        color: companyPalette.emerald,
                        display: 'flex',
                        mb: 2.2,
                        '& svg': { fontSize: 25 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      sx={{
                        color: companyPalette.black,
                        fontSize: 17,
                        fontWeight: 900,
                        mb: 1,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: companyPalette.muted,
                        fontSize: 13.5,
                        lineHeight: 1.62,
                      }}
                    >
                      {item.body}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              component="section"
              sx={{
                py: { xs: 3.4, sm: 4.4 },
                borderBottom: `1px solid ${companyPalette.ink}`,
              }}
            >
              <Box
                sx={{
                  bgcolor: companyPalette.black,
                  color: companyPalette.surface,
                  p: { xs: 2.4, sm: 3 },
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '180px minmax(0, 1fr) 220px' },
                  gap: { xs: 1.8, md: 3 },
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(252, 251, 248, 0.66)',
                    fontSize: 11,
                    fontWeight: 850,
                    letterSpacing: '0.08em',
                  }}
                >
                  운영 원칙
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 24, sm: 31 },
                    fontWeight: 900,
                    lineHeight: 1.14,
                  }}
                >
                  무료 회원제 · 의료기관 연결 없음
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(252, 251, 248, 0.72)',
                    fontSize: 13.5,
                    lineHeight: 1.62,
                  }}
                >
                  구독/인앱결제 없이 운영합니다.
                </Typography>
              </Box>
            </Box>

            <Box
              component="section"
              sx={{
                py: { xs: 3.4, sm: 4.4 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '250px minmax(0, 1fr)' },
                gap: { xs: 2, md: 4 },
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: companyPalette.black,
                    fontSize: { xs: 27, sm: 34 },
                    fontWeight: 900,
                    lineHeight: 1.06,
                    mb: 1.2,
                  }}
                >
                  서비스 구성
                </Typography>
                <Typography
                  sx={{
                    color: companyPalette.muted,
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  실제 서비스로 바로 이동합니다.
                </Typography>
              </Box>

              <Box>
                {serviceLinks.map((item, index) => (
                  <Box key={item.path}>
                    {index > 0 && <Divider sx={{ borderColor: companyPalette.lineStrong }} />}
                    <Button
                      fullWidth
                      onClick={() => navigate(item.path)}
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{
                        minHeight: 58,
                        px: 0,
                        justifyContent: 'space-between',
                        color: companyPalette.ink,
                        borderRadius: 0,
                        fontSize: 15,
                        fontWeight: 850,
                        transition: 'color 160ms ease, transform 160ms ease',
                        '& .MuiButton-startIcon': {
                          color: companyPalette.emerald,
                        },
                        '& .MuiButton-endIcon': {
                          color: companyPalette.subtle,
                        },
                        '&:hover': {
                          bgcolor: 'transparent',
                          color: companyPalette.emerald,
                          transform: 'translateX(3px)',
                        },
                        '&:active': {
                          transform: 'translateX(0)',
                        },
                      }}
                      startIcon={item.icon}
                    >
                      {item.label}
                    </Button>
                  </Box>
                ))}

                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', mt: 2.8 }}>
                  <Button
                    fullWidth
                    startIcon={<ContentCopyRoundedIcon />}
                    onClick={handleCopy}
                    sx={primaryButtonSx}
                  >
                    {copied ? '링크 복사됨' : '회사소개 링크 복사'}
                  </Button>
                </Box>
              </Box>
            </Box>
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
