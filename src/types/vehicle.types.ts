export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number | '';
  color: string;
  clientId: string;
  mileage: number | '';
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
}

