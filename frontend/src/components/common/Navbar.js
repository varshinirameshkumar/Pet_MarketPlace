import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Badge,
  Box, Menu, MenuItem, Avatar, Tooltip
} from '@mui/material';
import { Pets, ShoppingCart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  
  // Destructure with a fallback to avoid "null" destructuring errors
  const cartData = useCart();
  const cartCount = cartData ? cartData.cartCount : 0;

  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu  = (e) => setAnchorEl(e.currentTarget);
  const handleClose = ()  => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar>
        <Pets sx={{ mr: 1 }} />
        <Typography 
          variant="h6" 
          sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 700 }}
          onClick={() => navigate('/')}
        >
          PetMarket
        </Typography>

        <Button color="inherit" onClick={() => navigate('/')}>Browse Pets</Button>

        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* The Cart Button - Now properly inside the component */}
            <Tooltip title="Cart">
              <IconButton 
                color="inherit" 
                onClick={() => {
                  console.log("Navigating to cart...");
                  navigate('/cart');
                }}
              >
                <Badge badgeContent={cartCount} color="error">
                  <ShoppingCart />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={user.username || "Profile"}>
              <IconButton onClick={handleMenu} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>My Profile</MenuItem>
              <MenuItem onClick={() => { navigate('/requests'); handleClose(); }}>My Requests</MenuItem>
              <MenuItem onClick={() => { navigate('/orders'); handleClose(); }}>My Orders</MenuItem>
              <MenuItem onClick={() => { navigate('/seller'); handleClose(); }}>Seller Dashboard</MenuItem>
              <MenuItem onClick={() => { navigate('/seller/licenses'); handleClose(); }}>Licenses</MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" onClick={() => navigate('/login')}>Login</Button>
            <Button variant="outlined" color="inherit" onClick={() => navigate('/register')}>Register</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;