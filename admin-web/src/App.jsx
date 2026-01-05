import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import { Container, CircularProgress, Box } from '@mui/material';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 사용자 role 확인
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Routes>
          <Route
            path="/login"
            element={user && isAdmin ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/"
            element={user && isAdmin ? <ConversationList /> : <Navigate to="/login" />}
          />
          <Route
            path="/chat/:conversationId"
            element={user && isAdmin ? <ChatWindow /> : <Navigate to="/login" />}
          />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}

export default App;
