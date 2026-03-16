import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentAPI } from '../../services/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      paymentAPI.confirmPayment(sessionId)
        .then(() => setLoading(false))
        .catch(err => {
          setError(err.response?.data?.message || 'Verification failed');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <CircularProgress size={60} />
      <Typography variant="h6" mt={2}>Verifying your payment...</Typography>
    </Container>
  );

  if (error) return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
        <ErrorOutline sx={{ fontSize: 80, color: 'error.main' }} />
        <Typography variant="h4" fontWeight={700} mt={2}>Verification Failed</Typography>
        <Typography color="text.secondary" mt={1} mb={3}>{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/requests')}>Back to Requests</Button>
      </Paper>
    </Container>
  );

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />
        <Typography variant="h4" fontWeight={700} mt={2}>Payment Successful!</Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          Your payment has been processed. The order is now complete.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/orders')}>View My Orders</Button>
          <Button variant="outlined"  onClick={() => navigate('/')}>Home</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentSuccess;
