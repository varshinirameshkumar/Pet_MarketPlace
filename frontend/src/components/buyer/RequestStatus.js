import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Chip, Paper, List, ListItem,
  ListItemText, Divider, Button, CircularProgress
} from '@mui/material';
import { Chat, Payment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { requestAPI, orderAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'error' };

const RequestStatus = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [requests, setRequests] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      requestAPI.getBuyerRequests(user.id),
      orderAPI.getBuyerOrders(user.id),
    ]).then(([r, o]) => {
      setRequests(Array.isArray(r.data) ? r.data : []);
      setOrders(Array.isArray(o.data) ? o.data : []);
    }).catch(() => {
      setRequests([]);
      setOrders([]);
    }).finally(() => setLoading(false));
  }, [user]);

  const getOrderForRequest = (requestId) =>
    orders.find(o => o.request?.requestId === requestId);

  const handlePay = async (orderId) => {
    try {
      const res = await paymentAPI.createCheckoutSession({
        orderId,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl:  `${window.location.origin}/payment/cancel`,
      });
      window.location.href = res.data.checkoutUrl;
    } catch (e) { alert('Payment error: ' + e.response?.data?.message); }
  };

  const handleClearRejected = async () => {
    if (!window.confirm("Are you sure you want to clear all rejected requests?")) return;
    try {
      await requestAPI.clearRejectedRequests();
      setRequests(prev => prev.filter(r => r.status !== 'REJECTED'));
    } catch (e) {
      alert('Failed to clear requests: ' + (e.response?.data?.message || e.message));
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );

  const hasRejected = requests.some(r => r.status === 'REJECTED');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>My Requests</Typography>
        {hasRejected && (
          <Button variant="outlined" color="error" size="small" onClick={handleClearRejected}>
            Clear Rejected
          </Button>
        )}
      </Box>

      {requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">No requests yet.</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>Browse Pets</Button>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3 }}>
          <List>
            {requests.map((req, idx) => {
              const order = getOrderForRequest(req.requestId);
              return (
                <React.Fragment key={req.requestId}>
                  {idx > 0 && <Divider />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontWeight={600}>{req.pet?.breed}</Typography>
                          <Chip size="small" label={req.status} color={STATUS_COLORS[req.status] || 'default'} />
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          {req.description && (
                            <Typography variant="body2" color="text.secondary">{req.description}</Typography>
                          )}
                          <Typography variant="caption" color="text.disabled">
                            Submitted: {new Date(req.createdAt).toLocaleDateString()}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {req.status === 'ACCEPTED' && (
                              <Button size="small" variant="contained" startIcon={<Chat />}
                                onClick={() => navigate(`/chat/${req.requestId}`)}>
                                Open Chat
                              </Button>
                            )}
                            {order && order.paymentStatus === 'PENDING' && req.pet?.type === 'SALE' && (
                              <Button size="small" variant="outlined" color="secondary" startIcon={<Payment />}
                                onClick={() => handlePay(order.orderId)}>
                                Pay Now
                              </Button>
                            )}
                          </Box>

                           {/* Helpful Status Messages */}
                          {req.status === 'ACCEPTED' && (
                            <Box mt={1}>
                              {req.pet?.type === 'ADOPTION' && (
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                  ✓ Free Adoption - The seller will finalize this order.
                                </Typography>
                              )}
                              {!order && req.pet?.type === 'SALE' && (
                                <Typography variant="body2" color="error.main" fontWeight={600}>
                                  ⚠ Legacy Request - Order was not generated. Please make a new request to test stripe checkout.
                                </Typography>
                              )}
                              {order?.paymentStatus === 'PAID' && (
                                <Chip size="small" label="Paid ✓" color="success" sx={{ mt: 1 }} />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default RequestStatus;