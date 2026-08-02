import { Client } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useClients() {
  const { items, save, remove } = useGarageCollection<Client>('clients');

  return {
    clients: items,
    addClient: (c: Client) => save(c),
    updateClient: (c: Client) => save(c),
    deleteClient: (id: string) => remove(id),
    refresh: () => {}, // no-op: onSnapshot keeps data live automatically
  };
}
