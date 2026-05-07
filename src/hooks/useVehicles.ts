import { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { vehicleService } from '../services/vehicleService';

export function useVehicles(clientId?: string) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const refresh = () => {
    if (clientId) {
      setVehicles(vehicleService.getByClientId(clientId));
    } else {
      setVehicles(vehicleService.getAll());
    }
  };

  useEffect(() => {
    refresh();
  }, [clientId]);

  const addVehicle = (v: Vehicle) => {
    vehicleService.save(v);
    refresh();
  };

  const updateVehicle = (v: Vehicle) => {
    vehicleService.save(v);
    refresh();
  };

  const deleteVehicle = (id: string) => {
    vehicleService.deleteById(id);
    refresh();
  };

  return { vehicles, addVehicle, updateVehicle, deleteVehicle, refresh };
}
