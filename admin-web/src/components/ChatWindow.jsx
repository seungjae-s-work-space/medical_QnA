import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function ChatWindow() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // 대화방 정보 가져오기
    const fetchConversation = async () => {
      const convDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (convDoc.exists()) {
        setUserName(convDoc.data().userName || '익명');
      }
    };
    fetchConversation();

    // 메시지 실시간 구독
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    // 읽음 표시
    updateDoc(doc(db, 'conversations', conversationId), {
      unreadByAdmin: 0,
    });

    return unsubscribe;
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId: currentUser.uid,
      senderRole: 'admin',
      senderName: '전문가',
      text: newMessage,
      imageUrl: null,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: newMessage,
      lastMessageAt: serverTimestamp(),
      unreadByUser: increment(1),
    });

    setNewMessage('');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{userName}</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ height: 'calc(100vh - 200px)', overflowY: 'auto', mt: 2 }}>
        <List>
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              sx={{
                justifyContent: msg.senderRole === 'admin' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  bgcolor: msg.senderRole === 'admin' ? 'primary.main' : 'grey.300',
                  color: msg.senderRole === 'admin' ? 'white' : 'black',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {msg.senderName}
                </Typography>
                <Typography variant="body1">{msg.text}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {msg.createdAt?.toDate().toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Paper>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{ display: 'flex', gap: 1, mt: 2 }}
      >
        <TextField
          fullWidth
          placeholder="답변 입력..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button variant="contained" type="submit">
          전송
        </Button>
      </Box>
    </>
  );
}

export default ChatWindow;
