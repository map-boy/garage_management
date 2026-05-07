import { useState, useEffect } from 'react';
import { Client } from '../types';
import { clientService } from '../services/clientService';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);

  const refresh = () => setClients(clientService.getAll());

  useEffect(() => {
    refresh();
  }, []);

  const addClient = (c: Client) => {
    clientService.save(c);
    refresh();
  };

  const updateClient = (c: Client) => {
    clientService.save(c);
    refresh();
  };

  const deleteClient = (id: string) => {
    clientService.deleteById(id);
    refresh();
  };

  return { clients, addClient, updateClient, deleteClient, refresh };
}
