import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Chip, Paper, List, ListItem,
  ListItemText, Divider, Button, CircularProgress, Alert, Avatar
} from '@mui/material';
import { Chat, ArrowBack, ShoppingBag } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ORDER_COLORS = { PROCESSING: 'warning', COMPLETED: 'success', CANCELLED: 'error' };
const PAY_COLORS   = { PENDING: 'default', PAID: 'success', FAILED: 'error', REFUNDED: 'info' };

const BuyerOrderList = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert,   setAlert]   = useState({ msg: '', type: 'success' });

  useEffect(() => {
    if (user) {
      orderAPI.getBuyerOrders(user.id)
        .then(r => setOrders(r.data))
        .catch(() => setAlert({ msg: 'Failed to load orders', type: 'error' }))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all completed orders?")) return;
    try {
      await orderAPI.clearCompletedOrders();
      setOrders(prev => prev.filter(o => o.status !== 'COMPLETED'));
      setAlert({ msg: 'Completed orders cleared!', type: 'success' });
    } catch (e) {
      setAlert({ msg: 'Failed to clear orders: ' + (e.response?.data?.message || e.message), type: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const hasCompleted = orders.some(o => o.status === 'COMPLETED');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/requests')} sx={{ mb: 1 }}>Back to Requests</Button>
          <Typography variant="h4" fontWeight={700}>My Orders</Typography>
        </Box>
        {hasCompleted && (
          <Button variant="outlined" color="error" size="small" onClick={handleClear}>
            Clear Completed
          </Button>
        )}
      </Box>

      {alert.msg && <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert({ msg: '' })}>{alert.msg}</Alert>}

      {orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">No orders yet. Once your pet requests are accepted, they will appear here.</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/')}>Browse Pets</Button>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {orders.map((order, idx) => (
              <React.Fragment key={order.orderId}>
                {idx > 0 && <Divider />}
                <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                  <Avatar 
                    variant="rounded"
                    src={order.request?.pet?.imageUrl} 
                    sx={{ width: 80, height: 80, mr: 2, bgcolor: 'grey.200' }}
                  >
                    <ShoppingBag />
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={600}>
                          {order.request?.pet?.breed || 'Pet'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip size="small" label={order.status} color={ORDER_COLORS[order.status] || 'default'} />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Typography variant="body1" color="text.primary" fontWeight={500}>
                          {order.request?.pet?.type === 'ADOPTION' ? 'Free Adoption' : `Price: $${order.request?.pet?.price}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Seller: {order.sellerUsername} &bull; 
                          Status: {order.paymentStatus === 'PAID' ? 'Paid ✓' : 'Payment Pending'}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Ordered on: {new Date(order.createdAt).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Button size="small" variant="outlined" startIcon={<Chat />}
                            onClick={() => navigate(`/chat/${order.request?.requestId}`)}>
                            Chat with Seller
                          </Button>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default BuyerOrderList;
