"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cartAPI } from "@/lib/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load cart from API
  const loadCart = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await cartAPI.get();
      setCart(res.data);
      setItemCount(res.data?.items?.length || 0);
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart when user logs in
  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart(null);
      setItemCount(0);
    }
  }, [user, loadCart]);

  // Add item to cart and update state
  const addItem = useCallback(
    async (productId, quantity = 1, format = "physical", subFormat = null) => {
      try {
        const payload = { productId, quantity, format };
        if (subFormat) payload.subFormat = subFormat;
        
        const res = await cartAPI.addItem(payload);
        setCart(res.data);
        setItemCount(res.data?.items?.length || 0);
        return res;
      } catch (error) {
        console.error("Failed to add item to cart:", error);
        throw error;
      }
    },
    []
  );

  // Update cart item
  const updateItem = useCallback(async (itemId, updates) => {
    try {
      const res = await cartAPI.updateItem(itemId, updates);
      setCart(res.data);
      setItemCount(res.data?.items?.length || 0);
      return res;
    } catch (error) {
      console.error("Failed to update cart item:", error);
      throw error;
    }
  }, []);

  // Remove item from cart
  const removeItem = useCallback(async (itemId) => {
    try {
      const res = await cartAPI.removeItem(itemId);
      setCart(res.data);
      setItemCount(res.data?.items?.length || 0);
      return res;
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      throw error;
    }
  }, []);

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      const res = await cartAPI.clear();
      setCart({ items: [] });
      setItemCount(0);
      return res;
    } catch (error) {
      console.error("Failed to clear cart:", error);
      throw error;
    }
  }, []);

  const value = {
    cart,
    itemCount,
    loading,
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
