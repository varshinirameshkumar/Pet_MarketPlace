import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('cartItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartCount, setCartCount] = useState(() => {
    const saved = localStorage.getItem('cartCount');
    return saved ? parseInt(saved) : 0;
  });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user || !user.id) {
      setCartItems([]);
      setCartCount(0);
      setLoading(false);
      return;
    }
    
    // Only show loading spinner if we don't have cached items
    if (cartItems.length === 0) setLoading(true);

    try {
      console.log("Fetching cart for user:", user.id);
      const res = await cartAPI.getCart(user.id);
      const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
      
      setCartItems(items);
      setCartCount(items.length);

      // Save to cache
      localStorage.setItem('cartItems', JSON.stringify(items));
      localStorage.setItem('cartCount', items.length.toString());
    } catch (err) {
      console.error("Cart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (petId) => {
    // Optimistic count update
    const newCount = cartCount + 1;
    setCartCount(newCount);
    localStorage.setItem('cartCount', newCount.toString());

    try {
      await cartAPI.addToCart(petId);
      fetchCart();
    } catch (err) {
      setCartCount(prev => Math.max(0, prev - 1));
      throw err;
    }
  };

  const removeFromCart = async (itemId) => {
    const previousItems = [...cartItems];
    const newItems = cartItems.filter(item => item.cartItemId !== itemId);
    const newCount = newItems.length;
    
    // Optimistic update
    setCartItems(newItems);
    setCartCount(newCount);
    localStorage.setItem('cartItems', JSON.stringify(newItems));
    localStorage.setItem('cartCount', newCount.toString());

    try {
      await cartAPI.removeFromCart(itemId);
      fetchCart();
    } catch (err) {
      setCartItems(previousItems);
      setCartCount(previousItems.length);
      throw err;
    }
  };

  const value = {
    cartItems,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context || {}; 
};

export default CartContext;