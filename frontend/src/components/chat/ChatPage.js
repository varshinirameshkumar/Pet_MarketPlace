import React, { useEffect, useRef, useState } from 'react';
import {
  Container, Box, Typography, TextField, IconButton,
  Paper, Avatar, CircularProgress, Chip, Alert,
  Divider, Button
} from '@mui/material';
import { Send, ArrowBack } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatAPI, requestAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const ChatPage = () => {
  const { requestId } = useParams();
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const bottomRef     = useRef(null);
  const clientRef     = useRef(null);

  const [messages,  setMessages]  = useState([]);
  const [request,   setRequest]   = useState(null);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [histRes, reqRes] = await Promise.all([
          chatAPI.getHistory(requestId),
          requestAPI.getRequest(requestId),
        ]);
        setMessages(histRes.data);
        setRequest(reqRes.data);
      } catch {
        setError('Failed to load chat. Make sure the request is accepted.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [requestId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/chat/${requestId}`, (msg) => {
          const incoming = JSON.parse(msg.body);
          setMessages(prev => {
            // Prevent duplicate message if it was just added optimistically
            // Check by ID if present, or by content/timestamp/sender if not
            const exists = prev.some(m => 
              (m.chatId && m.chatId === incoming.chatId) || 
              (m.sender?.userId === incoming.sender?.userId && m.message === incoming.message && !m.chatId)
            );
            return exists ? prev : [...prev, incoming];
          });
        });
      },
      onDisconnect: () => setConnected(false),
      reconnectDelay: 3000,
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getReceiverId = () => {
    if (!request || !user) return null;
    return user.id === request.buyer?.userId
      ? request.pet?.sellerId
      : request.buyer?.userId;
  };

  const handleSend = async () => {
    const receiverId = getReceiverId();
    if (!text.trim() || !receiverId) return;
    
    const messageContent = text.trim();
    setText(''); // Clear input immediately

    // Optimistic Update
    const tempMsg = {
      chatId: null, // Temporary marker
      sender: { userId: user.id, username: user.username },
      message: messageContent,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    const payload = { senderId: user.id, receiverId, message: messageContent };

    if (connected && clientRef.current?.connected) {
      clientRef.current.publish({
        destination: `/app/chat/${requestId}`,
        body: JSON.stringify(payload),
      });
    } else {
      try {
        await chatAPI.sendMessage(requestId, { receiverId, message: messageContent });
        // SILENT background sync or wait for WebSocket broadcast
      } catch { 
        setError('Failed to send message'); 
        // Optional: rollback optimistic update on failure
        setMessages(prev => prev.filter(m => m !== tempMsg));
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>

      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white',
                   display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {request?.pet?.breed || 'Live Chat'} — Request #{requestId}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {request?.buyer?.username} &harr; {request?.pet?.sellerUsername}
            </Typography>
          </Box>
          <Chip label={connected ? '● Live' : '○ Reconnecting...'}
            size="small"
            sx={{ bgcolor: connected ? 'success.main' : 'warning.main', color: 'white', fontWeight: 600 }} />
        </Box>

        {error && <Alert severity="error" sx={{ m: 1 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Messages area */}
        <Box sx={{ height: 440, overflowY: 'auto', p: 2, bgcolor: '#f4f6f8' }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No messages yet. Start the conversation!</Typography>
            </Box>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.sender?.userId === user.id || msg.sender?.userId === parseInt(user.id);
            return (
              <Box key={msg.chatId || idx}
                sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 2 }}>
                {!isMe && (
                  <Avatar sx={{ width: 34, height: 34, mr: 1, bgcolor: 'secondary.main', fontSize: 14 }}>
                    {msg.sender?.username?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '68%' }}>
                  {!isMe && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      {msg.sender?.username}
                    </Typography>
                  )}
                  <Paper elevation={1} sx={{
                    px: 2, py: 1.2, mt: 0.3,
                    borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    bgcolor: isMe ? 'primary.main' : 'white',
                    color: isMe ? 'white' : 'text.primary',
                  }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.message}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Typography>
                </Box>
                {isMe && (
                  <Avatar sx={{ width: 34, height: 34, ml: 1, bgcolor: 'primary.dark', fontSize: 14 }}>
                    {user.username?.[0]?.toUpperCase()}
                  </Avatar>
                )}
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end', bgcolor: 'white' }}>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Type a message... (Enter to send)"
            value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton onClick={handleSend} disabled={!text.trim()}
            sx={{ bgcolor: 'primary.main', color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: 'grey.300' },
                  width: 44, height: 44 }}>
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatPage;
