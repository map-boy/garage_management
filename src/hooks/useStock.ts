import { Part } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useStock() {
  const { items, save, remove } = useGarageCollection<Part>('stock');

  const updateQuantity = (id: string, delta: number) => {
    const part = items.find(p => p.id === id);
    if (part) {
      save({ ...part, quantity: part.quantity + delta });
    }
  };

  return {
    stock: items,
    addPart: (p: Part) => save(p),
    updatePart: (p: Part) => save(p),
    deletePart: (id: string) => remove(id),
    updateQuantity,
    refresh: () => {},
  };
}
