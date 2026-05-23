import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { getItems } from '../api';

const ItemsContext = createContext();

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useItems = () => useContext(ItemsContext);

export const ItemsProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshItems = useCallback(async () => {
    try {
      const data = await getItems('');
      setItems(data);
      setError('');
    } catch (err) {
      console.error('Failed to refresh items:', err);
      setError('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  // Silent background refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refreshItems();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshItems]);

  return (
    <ItemsContext.Provider value={{ items, loading, error, refreshItems }}>
      {children}
    </ItemsContext.Provider>
  );
};
