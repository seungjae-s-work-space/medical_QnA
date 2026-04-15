import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import UserChatWindow from './components/UserChatWindow';
import EncyclopediaManager from './components/EncyclopediaManager';
import NewsManager from './components/NewsManager';
import NoticeManager from './components/NoticeManager';
import VideoManager from './components/VideoManager';
import SubscriptionManager from './components/SubscriptionManager';
import { CircularProgress, Box, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme, { colors } from './theme';

const SITE_NAME = '난임상담톡톡';
const SITE_URL = 'https://agisungong.net';
const DEFAULT_TITLE = `${SITE_NAME} 공식 홈페이지 | 난임 정보 포털`;
const DEFAULT_DESCRIPTION =
  '난임상담톡톡 공식 홈페이지입니다. 난임백과, 뉴스, 공지사항, 아기성공TV와 전문가 상담을 제공하는 난임 정보 포털입니다.';

function updateMetaTag(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function updateLinkTag(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
}

function buildAbsoluteUrl(pathname) {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${normalizedPath}`;
}

function getRouteMetadata(pathname, isAdmin, isLoggedIn) {
  if (pathname.startsWith('/chat/')) {
    return {
      title: `상담 채팅 관리 | ${SITE_NAME}`,
      description: '관리자가 사용자 문의를 확인하고 답변하는 상담 채팅 관리 화면입니다.',
      shouldIndex: false,
    };
  }

  const routeMetadata = {
    '/': isAdmin
      ? {
          title: `관리자 상담 채팅 | ${SITE_NAME}`,
          description: '관리자가 사용자 상담 채팅을 확인하고 관리하는 대시보드입니다.',
          shouldIndex: false,
        }
      : isLoggedIn
        ? {
            title: `상담하기 | ${SITE_NAME}`,
            description: '난임 관련 상담을 확인하고 전문가와 소통할 수 있는 화면입니다.',
            shouldIndex: false,
          }
        : {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            shouldIndex: true,
          },
    '/login': {
      title: `로그인 | ${SITE_NAME}`,
      description: '난임상담톡톡 로그인 및 회원가입 화면입니다.',
      shouldIndex: false,
    },
    '/encyclopedia': {
      title: `난임백과 | ${SITE_NAME}`,
      description: '난임 치료와 임신 준비에 도움이 되는 정보를 한곳에서 확인할 수 있습니다.',
      shouldIndex: true,
    },
    '/news': {
      title: `뉴스 | ${SITE_NAME}`,
      description: '난임, 임신 준비, 의료 분야의 최신 소식을 확인할 수 있습니다.',
      shouldIndex: true,
    },
    '/notice': {
      title: `공지사항 | ${SITE_NAME}`,
      description: '서비스 업데이트와 주요 공지사항을 확인할 수 있습니다.',
      shouldIndex: true,
    },
    '/video': {
      title: `아기성공TV | ${SITE_NAME}`,
      description: '난임과 임신 준비에 도움이 되는 영상 콘텐츠를 볼 수 있습니다.',
      shouldIndex: true,
    },
    '/subscription': {
      title: `구독 관리 | ${SITE_NAME}`,
      description: '관리자가 구독자 현황과 결제 상태를 관리하는 화면입니다.',
      shouldIndex: false,
    },
  };

  return routeMetadata[pathname] || {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    shouldIndex: false,
  };
}

function SeoManager({ isAdmin, isLoggedIn }) {
  const location = useLocation();

  useEffect(() => {
    const { title, description, shouldIndex } = getRouteMetadata(
      location.pathname,
      isAdmin,
      isLoggedIn
    );
    const canonicalUrl = buildAbsoluteUrl(location.pathname);

    document.title = title;
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'robots', shouldIndex ? 'index, follow' : 'noindex, nofollow');
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateLinkTag('canonical', canonicalUrl);
  }, [location.pathname, isAdmin, isLoggedIn]);

  return null;
}

function AppRoutes() {
  const { isAdmin, isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: colors.background }}
      >
        <CircularProgress sx={{ color: colors.textSecondary }} />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <SeoManager isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
      <Routes>
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" /> : <Login />}
        />

        {/* 홈: 역할에 따라 다른 화면 */}
        <Route
          path="/"
          element={
            isAdmin ? (
              <Layout>
                <ConversationList />
              </Layout>
            ) : (
              <Layout>
                <UserChatWindow />
              </Layout>
            )
          }
        />

        {/* 관리자 채팅 (관리자 전용) */}
        <Route
          path="/chat/:conversationId"
          element={
            isAdmin ? (
              <Layout>
                <ChatWindow />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* 공개 콘텐츠 - 모든 사용자 접근 가능 (비로그인 포함) */}
        <Route
          path="/encyclopedia"
          element={
            <Layout>
              <EncyclopediaManager readOnly={!isAdmin} />
            </Layout>
          }
        />
        <Route
          path="/news"
          element={
            <Layout>
              <NewsManager readOnly={!isAdmin} />
            </Layout>
          }
        />
        <Route
          path="/notice"
          element={
            <Layout>
              <NoticeManager readOnly={!isAdmin} />
            </Layout>
          }
        />
        <Route
          path="/video"
          element={
            <Layout>
              <VideoManager readOnly={!isAdmin} />
            </Layout>
          }
        />

        {/* 구독 관리 (관리자 전용) */}
        <Route
          path="/subscription"
          element={
            isAdmin ? (
              <Layout>
                <SubscriptionManager />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* 기타 경로는 홈으로 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
