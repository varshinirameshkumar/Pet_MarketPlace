import React, { useEffect, useState } from 'react';
import {
  Container, Box, Typography, Chip, Button, CircularProgress,
  Paper, Grid, Divider, TextField, Alert
} from '@mui/material';
import { ShoppingCart, LocationOn, Pets } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { petAPI, requestAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1601758174114-e711c0cbaa69?w=800&h=500&fit=crop';

const PetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [pet, setPet]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc]       = useState('');
  const [msg, setMsg]         = useState({ text: '', type: 'success' });

  useEffect(() => {
    petAPI.getPetById(id).then(r => setPet(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    try { await addToCart(pet.petId); setMsg({ text: 'Added to cart!', type: 'success' }); }
    catch (e) { setMsg({ text: e.response?.data?.message || 'Failed', type: 'error' }); }
  };

  const handleRequest = async () => {
    if (!user) { navigate('/login'); return; }
    const prevDesc = desc;
    setDesc('');
    setMsg({ text: 'Sending request...', type: 'info' });
    try {
      await requestAPI.submitRequest({ petId: pet.petId, description: prevDesc });
      setMsg({ text: 'Request submitted! Check My Requests.', type: 'success' });
    } catch (e) {
      setDesc(prevDesc);
      setMsg({ text: e.response?.data?.message || 'Failed to send request', type: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!pet)    return <Container><Typography mt={4}>Pet not found.</Typography></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {msg.text && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg({ text: '' })}>{msg.text}</Alert>}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box component="img" src={pet.imageUrl || PLACEHOLDER}
            alt={pet.breed} sx={{ width: '100%', borderRadius: 3, boxShadow: 3 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h4" fontWeight={700}>{pet.breed}</Typography>
              <Chip label={pet.type === 'ADOPTION' ? 'Free Adoption' : `$${pet.price}`}
                color={pet.type === 'ADOPTION' ? 'success' : 'secondary'} size="medium" />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {pet.category && <Chip icon={<Pets />} label={pet.category} size="small" variant="outlined" />}
              {pet.age      && <Chip label={`${pet.age} yr${pet.age !== 1 ? 's' : ''}`} size="small" />}
              <Chip label={pet.availability ? 'Available' : 'Not Available'}
                color={pet.availability ? 'success' : 'default'} size="small" />
            </Box>

            {pet.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">{pet.location}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body1">{pet.description || 'No description provided.'}</Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">Listed by: {pet.sellerUsername}</Typography>

            {pet.availability && (
              <Box sx={{ mt: 3 }}>
                <TextField fullWidth multiline rows={2} label="Message to seller (optional)"
                  value={desc} onChange={e => setDesc(e.target.value)} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" fullWidth onClick={handleRequest}>Submit Request</Button>
                  <Button variant="outlined"  fullWidth startIcon={<ShoppingCart />} onClick={handleAddToCart}>
                    Add to Cart
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PetDetail;
