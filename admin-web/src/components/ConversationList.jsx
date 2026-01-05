import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Badge,
  AppBar,
  Toolbar,
  Button,
  Box
} from '@mui/material';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convs);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            질문 목록
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 2 }}>
        {conversations.length === 0 ? (
          <Typography align="center" sx={{ mt: 4 }}>
            아직 질문이 없습니다
          </Typography>
        ) : (
          <List>
            {conversations.map((conv) => (
              <ListItem key={conv.id} disablePadding>
                <ListItemButton
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <ListItemText
                    primary={conv.userName || '익명'}
                    secondary={conv.lastMessage}
                  />
                  {conv.unreadByAdmin > 0 && (
                    <Badge badgeContent={conv.unreadByAdmin} color="error" />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  );
}

export default ConversationList;
