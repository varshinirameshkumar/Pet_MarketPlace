import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Chip, Paper, List, ListItem,
  ListItemText, Divider, Button, CircularProgress, Grid,
  Card, CardContent, Avatar, Alert
} from '@mui/material';
import {
  CheckCircle, Cancel, Chat, Add, Inventory,
  ListAlt, VerifiedUser, TrendingUp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { requestAPI, petAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'error' };

const StatCard = ({ icon, label, value, color }) => (
  <Card elevation={2} sx={{ borderRadius: 3 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark`, width: 48, height: 48 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [requests, setRequests] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [alert,    setAlert]    = useState({ msg: '', type: 'success' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, l, o] = await Promise.all([
        requestAPI.getSellerRequests(),
        petAPI.getMyListings(),
        orderAPI.getSellerOrders(user.id),
      ]);
      // Added safety: ensuring we only set state if the response contains an array
      setRequests(Array.isArray(r.data) ? r.data : []);
      setListings(Array.isArray(l.data) ? l.data : []);
      setOrders(Array.isArray(o.data) ? o.data : []);
    } catch (e) {
      setAlert({ msg: 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchAll(); }, [user]);

  const handleApprove = async (id) => {
    // Optimistic Update
    const originalRequests = [...requests];
    setRequests(prev => prev.map(r => r.requestId === id ? { ...r, status: 'ACCEPTED' } : r));
    
    try {
      await requestAPI.approveRequest(id);
      setAlert({ msg: 'Request approved! Order created.', type: 'success' });
      // Minor background sync for orders/listings balance
      fetchAll(); 
    } catch (e) {
      setRequests(originalRequests);
      setAlert({ msg: e.response?.data?.message || 'Failed to approve', type: 'error' });
    }
  };
 
  const handleReject = async (id) => {
    // Optimistic Update
    const originalRequests = [...requests];
    setRequests(prev => prev.map(r => r.requestId === id ? { ...r, status: 'REJECTED' } : r));
 
    try {
      await requestAPI.rejectRequest(id);
      setAlert({ msg: 'Request rejected.', type: 'info' });
    } catch (e) {
      setRequests(originalRequests);
      setAlert({ msg: e.response?.data?.message || 'Failed to reject', type: 'error' });
    }
  };

  // Fixed: Added Array.isArray checks to prevent "filter is not a function"
  const pending   = Array.isArray(requests) ? requests.filter(r => r.status === 'PENDING').length : 0;
  const available = Array.isArray(listings) ? listings.filter(l => l.availability).length : 0;

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Seller Dashboard</Typography>
          <Typography variant="body1" color="text.secondary">Welcome back, {user?.username}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<VerifiedUser />} onClick={() => navigate('/seller/licenses')}>Licenses</Button>
          <Button variant="outlined" startIcon={<Inventory />}    onClick={() => navigate('/seller/orders')}>Orders</Button>
          <Button variant="contained" startIcon={<Add />}         onClick={() => navigate('/seller/add-pet')}>Add Pet</Button>
        </Box>
      </Box>

      {alert.msg && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert({ msg: '' })}>
          {alert.msg}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { icon: <ListAlt />,    label: 'Total Listings',   value: listings?.length || 0, color: 'primary' },
          { icon: <TrendingUp />, label: 'Available',        value: available,       color: 'success' },
          { icon: <CheckCircle />,label: 'Pending Requests', value: pending,         color: 'warning' },
          { icon: <Inventory />,  label: 'Active Orders',    value: orders?.length || 0,   color: 'secondary' },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Incoming Requests
            {pending > 0 && <Chip label={`${pending} pending`} color="warning" size="small" sx={{ ml: 1 }} />}
          </Typography>
          <Paper elevation={2} sx={{ borderRadius: 3 }}>
            {(!requests || requests.length === 0) ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No requests yet.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {requests.map((req, idx) => (
                  <React.Fragment key={req.requestId}>
                    {idx > 0 && <Divider />}
                    <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography fontWeight={600}>
                              {req.pet?.breed} — by {req.buyer?.username}
                            </Typography>
                            <Chip size="small" label={req.status} color={STATUS_COLORS[req.status] || 'default'} />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            {req.description && (
                              <Typography variant="body2" color="text.secondary" mb={1}>
                                "{req.description}"
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.disabled">
                              {new Date(req.createdAt).toLocaleString()}
                            </Typography>
                            {req.status === 'PENDING' && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                                  onClick={() => handleApprove(req.requestId)}>Approve</Button>
                                <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                                  onClick={() => handleReject(req.requestId)}>Reject</Button>
                              </Box>
                            )}
                            {req.status === 'ACCEPTED' && (
                              <Button size="small" variant="outlined" startIcon={<Chat />} sx={{ mt: 1 }}
                                onClick={() => navigate(`/chat/${req.requestId}`)}>Open Chat</Button>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={600} mb={2}>My Listings</Typography>
          <Paper elevation={2} sx={{ borderRadius: 3 }}>
            {(!listings || listings.length === 0) ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" mb={2}>No listings yet.</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/seller/add-pet')}>
                  Add Your First Pet
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {listings.map((pet, idx) => (
                  <React.Fragment key={pet.petId}>
                    {idx > 0 && <Divider />}
                    <ListItem sx={{ px: 3, py: 1.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography fontWeight={500}>{pet.breed}</Typography>
                            <Chip size="small" label={pet.availability ? 'Available' : 'Taken'}
                              color={pet.availability ? 'success' : 'default'} />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip size="small" label={pet.type === 'ADOPTION' ? 'Adoption' : `$${pet.price}`}
                              color={pet.type === 'ADOPTION' ? 'success' : 'secondary'} variant="outlined" />
                            {pet.category && <Chip size="small" label={pet.category} variant="outlined" />}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SellerDashboard;