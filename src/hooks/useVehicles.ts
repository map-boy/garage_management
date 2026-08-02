import { Vehicle } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useVehicles(clientId?: string) {
  const { items, save, remove } = useGarageCollection<Vehicle>('vehicles');
  const vehicles = clientId ? items.filter(v => v.clientId === clientId) : items;

  return {
    vehicles,
    addVehicle: (v: Vehicle) => save(v),
    updateVehicle: (v: Vehicle) => save(v),
    deleteVehicle: (id: string) => remove(id),
    refresh: () => {},
  };
}
