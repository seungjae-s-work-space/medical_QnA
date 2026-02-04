import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <HashRouter>
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
            ) : isLoggedIn ? (
              <Layout>
                <UserChatWindow />
              </Layout>
            ) : (
              <Navigate to="/encyclopedia" />
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
    </HashRouter>
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
