import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import Layout from './components/Layout';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import EncyclopediaManager from './components/EncyclopediaManager';
import NewsManager from './components/NewsManager';
import { CircularProgress, Box, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme, { colors } from './theme';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setUser(currentUser);
          setIsAdmin(true);
        } else {
          setUser(null);
          setIsAdmin(false);
          auth.signOut();
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          sx={{ bgcolor: colors.background }}
        >
          <CircularProgress sx={{ color: colors.textSecondary }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={user && isAdmin ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/"
            element={
              user && isAdmin ? (
                <Layout>
                  <ConversationList />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              user && isAdmin ? (
                <Layout>
                  <ChatWindow />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/encyclopedia"
            element={
              user && isAdmin ? (
                <Layout>
                  <EncyclopediaManager />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/news"
            element={
              user && isAdmin ? (
                <Layout>
                  <NewsManager />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
