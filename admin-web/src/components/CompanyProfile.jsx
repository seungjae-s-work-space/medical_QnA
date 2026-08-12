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

const companyFontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"SF Pro Display"',
  '"SF Pro Text"',
  '"Apple SD Gothic Neo"',
  '"Pretendard Variable"',
  'Pretendard',
  '"Spoqa Han Sans Neo"',
  '"Noto Sans KR"',
  'Inter',
  '"Segoe UI"',
  'sans-serif',
].join(', ');

const baseTextSx = {
  fontFamily: companyFontFamily,
  letterSpacing: 0,
  wordBreak: 'keep-all',
};

const companyDisplayTextSx = {
  ...baseTextSx,
  fontFamily: companyFontFamily,
  fontKerning: 'normal',
  textWrap: 'balance',
};

const companyBodyTextSx = {
  ...baseTextSx,
  fontWeight: 400,
  lineHeight: 1.82,
};

const labelTextSx = {
  ...baseTextSx,
  fontWeight: 650,
};

const buttonTextSx = {
  ...baseTextSx,
  fontWeight: 650,
};

const profileSections = [
  {
    label: '회사 소개',
    title: '난임 전문 기자와 골통주부가 함께 운영',
    body: '난임 치료 과정에 필요한 정보와 상담 서비스를 제공합니다.',
  },
  {
    label: '사업 영역',
    title: '콘텐츠·뉴스·상담 서비스',
    body: '난임백과, 생식의학 뉴스, 상담 채팅, 영상 콘텐츠를 통합 운영합니다.',
  },
  {
    label: '운영 원칙',
    title: '무료 회원제·비의료기관 연계 운영',
    body: '구독/인앱결제 없이 운영하며 의료기관 연결 및 유도 행위를 하지 않습니다.',
  },
];

const businessItems = [
  {
    title: '근거 중심 정보',
    body: '난임백과와 해설형 콘텐츠를 운영합니다.',
    icon: <AutoStoriesRoundedIcon />,
  },
  {
    title: '뉴스 큐레이션',
    body: '국내외 생식의학 뉴스를 선별해 제공합니다.',
    icon: <NewspaperRoundedIcon />,
  },
  {
    title: '상담 서비스',
    body: '로그인 기반 상담 채팅을 제공합니다.',
    icon: <MedicalInformationRoundedIcon />,
  },
];

const serviceLinks = [
  { label: '난임백과', path: '/encyclopedia', icon: <AutoStoriesRoundedIcon /> },
  { label: '뉴스', path: '/news', icon: <NewspaperRoundedIcon /> },
  { label: '아기성공TV', path: '/video', icon: <YouTubeIcon /> },
  { label: '공지사항', path: '/notice', icon: <MedicalInformationRoundedIcon /> },
];

const companyHeroImage = {
  src: '/home-dashboard.png?v=3a2a078',
  alt: '난임상담톡톡 홈 이미지',
};

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
  ...buttonTextSx,
  minHeight: 42,
  px: 2,
  borderRadius: 0.6,
  bgcolor: companyPalette.black,
  color: companyPalette.surface,
  fontSize: 12,
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
  ...buttonTextSx,
  minHeight: 42,
  px: 2,
  borderRadius: 0.6,
  borderColor: companyPalette.lineStrong,
  color: companyPalette.ink,
  bgcolor: companyPalette.surface,
  fontSize: 12,
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

const representativeImageSx = {
  display: 'block',
  width: '100%',
  maxWidth: { xs: 340, sm: 500, md: 620 },
  height: 'auto',
  mx: 'auto',
  objectFit: 'contain',
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
        fontFamily: companyFontFamily,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
        wordBreak: 'keep-all',
        '& .MuiTypography-root, & .MuiButton-root': {
          fontFamily: companyFontFamily,
          letterSpacing: 0,
        },
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
              <Typography sx={{ ...labelTextSx, fontSize: 12, fontWeight: 800 }}>
                NANIMTALK
              </Typography>
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
                    ...labelTextSx,
                    color: companyPalette.ink,
                    fontSize: 10,
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
                  ...labelTextSx,
                  color: companyPalette.muted,
                  fontSize: 11,
                  mb: 1.4,
                }}
              >
                공식 사업 소개
              </Typography>
              <Typography
                component="h1"
                sx={{
                  ...companyDisplayTextSx,
                  color: companyPalette.black,
                  fontSize: { xs: 31, sm: 46, md: 58 },
                  fontWeight: 760,
                  lineHeight: 1.18,
                  maxWidth: 880,
                  mb: { xs: 2.4, sm: 3.2 },
                }}
              >
                난임상담톡톡은 난임을 준비하는 사람들이 정보를 이해하고, 다음 선택을 준비할 수 있도록 돕는 플랫폼입니다.
              </Typography>
              <Typography
                sx={{
                  ...companyBodyTextSx,
                  color: companyPalette.muted,
                  fontSize: { xs: 15.5, sm: 18 },
                  maxWidth: 700,
                }}
              >
                난임 전문 기자와 골통주부가 함께 운영하며, 생식의학 뉴스·난임백과·상담 콘텐츠를 무료 회원제로 제공합니다. 의료기관 연결이나 유도 없이 정보와 상담의 접근성을 높이는 데 집중합니다.
              </Typography>
            </Box>

            <Box
              component="section"
              sx={{
                mb: { xs: 3.4, sm: 4.4 },
                display: 'grid',
                placeItems: 'center',
                py: { xs: 1.2, sm: 2 },
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={companyHeroImage.src}
                alt={companyHeroImage.alt}
                loading="lazy"
                sx={representativeImageSx}
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
                    ...labelTextSx,
                    color: companyPalette.muted,
                    fontSize: 11,
                    mb: 1.4,
                  }}
                >
                  사업 개요
                </Typography>
                <Typography
                  sx={{
                    ...baseTextSx,
                    color: companyPalette.black,
                    fontSize: { xs: 30, sm: 40, md: 48 },
                    fontWeight: 800,
                    lineHeight: 1.14,
                    mb: 3,
                  }}
                >
                  콘텐츠, 뉴스, 상담을 하나의 서비스로 제공합니다.
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
                            ...labelTextSx,
                            color: isActive ? companyPalette.emerald : companyPalette.champagne,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </Typography>
                        <Box>
                          <Typography
                            sx={{
                              ...labelTextSx,
                              color: companyPalette.black,
                              fontSize: 14,
                              mb: 0.6,
                            }}
                          >
                            {section.label}
                          </Typography>
                          <Typography
                            sx={{
                              ...baseTextSx,
                              color: companyPalette.ink,
                              fontSize: { xs: 18, sm: 20 },
                              fontWeight: 700,
                              lineHeight: 1.38,
                              mb: 0.7,
                            }}
                          >
                            {section.title}
                          </Typography>
                          <Typography
                            sx={{
                              ...baseTextSx,
                              color: companyPalette.muted,
                              fontSize: 13.5,
                              fontWeight: 400,
                              lineHeight: 1.68,
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
                    ...baseTextSx,
                    color: companyPalette.black,
                    fontSize: { xs: 28, sm: 34 },
                    fontWeight: 800,
                    lineHeight: 1.12,
                    mb: 1.2,
                  }}
                >
                  사업 영역
                </Typography>
                <Typography
                  sx={{
                    ...baseTextSx,
                    color: companyPalette.muted,
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.68,
                  }}
                >
                  난임백과, 뉴스, 상담, 영상 콘텐츠를 중심으로 운영합니다.
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
                        ...baseTextSx,
                        color: companyPalette.black,
                        fontSize: 17,
                        fontWeight: 800,
                        mb: 1,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      sx={{
                        ...baseTextSx,
                        color: companyPalette.muted,
                        fontSize: 13.5,
                        fontWeight: 400,
                        lineHeight: 1.66,
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
                    ...labelTextSx,
                    color: 'rgba(252, 251, 248, 0.66)',
                    fontSize: 11,
                  }}
                >
                  운영 원칙
                </Typography>
                <Typography
                  sx={{
                    ...baseTextSx,
                    fontSize: { xs: 24, sm: 31 },
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  무료 회원제 · 비의료기관 연계 운영
                </Typography>
                <Typography
                  sx={{
                    ...baseTextSx,
                    color: 'rgba(252, 251, 248, 0.72)',
                    fontSize: 13.5,
                    fontWeight: 400,
                    lineHeight: 1.66,
                  }}
                >
                  구독/인앱결제 없이 운영하며 의료기관 연결 및 유도 행위를 하지 않습니다.
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
                    ...baseTextSx,
                    color: companyPalette.black,
                    fontSize: { xs: 27, sm: 34 },
                    fontWeight: 800,
                    lineHeight: 1.12,
                    mb: 1.2,
                  }}
                >
                  문의 및 서비스
                </Typography>
                <Typography
                  sx={{
                    ...baseTextSx,
                    color: companyPalette.muted,
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.68,
                  }}
                >
                  제휴·광고·콘텐츠 협업 검토 시 이 페이지를 공유하세요.
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
                        ...buttonTextSx,
                        minHeight: 58,
                        px: 0,
                        justifyContent: 'space-between',
                        color: companyPalette.ink,
                        borderRadius: 0,
                        fontSize: 15,
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
