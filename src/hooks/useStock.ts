import { useState, useEffect } from 'react';
import { Part } from '../types';
import { stockService } from '../services/stockService';

export function useStock() {
  const [stock, setStock] = useState<Part[]>([]);

  const refresh = () => setStock(stockService.getAll());

  useEffect(() => {
    refresh();
  }, []);

  const addPart = (p: Part) => {
    stockService.save(p);
    refresh();
  };

  const updatePart = (p: Part) => {
    stockService.save(p);
    refresh();
  };

  const deletePart = (id: string) => {
    stockService.deleteById(id);
    refresh();
  };

  const updateQuantity = (id: string, delta: number) => {
    stockService.updateQuantity(id, delta);
    refresh();
  };

  return { stock, addPart, updatePart, deletePart, updateQuantity, refresh };
}
