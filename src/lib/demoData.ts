import { Client } from '../types/client.types';
import { Vehicle } from '../types/vehicle.types';
import { JobCard } from '../types/job.types';
import { Part } from '../types/stock.types';
import { Invoice } from '../types/invoice.types';
import { ServiceReminder } from '../types/reminder.types';
import { STORAGE_KEYS, writeStorage } from './storage';

export const DEMO_DATA = {
  clients: [
    { id: 'C1', name: 'Kofi Mensah', phone: '+233 24 123 4567', email: 'kofi@example.com', vehicleIds: ['V1'], createdAt: '2024-01-10T10:00:00Z' },
    { id: 'C2', name: 'Abeba Tesfaye', phone: '+251 91 123 4567', email: 'abeba@example.com', vehicleIds: ['V2'], createdAt: '2024-01-15T11:30:00Z' },
    { id: 'C3', name: 'Mandla Dlamini', phone: '+27 82 123 4567', email: 'mandla@example.com', vehicleIds: ['V3'], createdAt: '2024-02-01T09:00:00Z' },
    { id: 'C4', name: 'Fatoumata Diallo', phone: '+221 77 123 4567', email: 'fatou@example.com', vehicleIds: ['V4'], createdAt: '2024-02-10T14:20:00Z' },
    { id: 'C5', name: 'Chidi Okoro', phone: '+234 803 123 4567', email: 'chidi@example.com', vehicleIds: ['V5', 'V6'], createdAt: '2024-02-20T16:45:00Z' },
  ],
  vehicles: [
    { id: 'V1', plate: 'GHA-1234', make: 'Toyota', model: 'Camry', year: 2018, color: 'Silver', clientId: 'C1', mileage: 45000, fuelType: 'Petrol' },
    { id: 'V2', plate: 'ETH-5678', make: 'Hyundai', model: 'Tucson', year: 2020, color: 'Black', clientId: 'C2', mileage: 28000, fuelType: 'Petrol' },
    { id: 'V3', plate: 'RSA-9012', make: 'Volkswagen', model: 'Polo', year: 2019, color: 'White', clientId: 'C3', mileage: 52000, fuelType: 'Diesel' },
    { id: 'V4', plate: 'SEN-3456', make: 'Renault', model: 'Kwid', year: 2021, color: 'Red', clientId: 'C4', mileage: 12000, fuelType: 'Petrol' },
    { id: 'V5', plate: 'NGR-7890', make: 'Mercedes-Benz', model: 'C200', year: 2017, color: 'Grey', clientId: 'C5', mileage: 85000, fuelType: 'Petrol' },
    { id: 'V6', plate: 'NGR-1234', make: 'Toyota', model: 'Hilux', year: 2015, color: 'White', clientId: 'C5', mileage: 140000, fuelType: 'Diesel' },
  ],
  jobs: [
    { id: 'J1', vehicleId: 'V1', technicianName: 'Samuel', description: 'Full service and brake pad replacement', status: 'Completed', partsUsed: [{ partId: 'P1', quantity: 1 }, { partId: 'P2', quantity: 4 }], laborCost: 5000, startedAt: '2024-03-01T08:00:00Z', completedAt: '2024-03-01T15:00:00Z' },
    { id: 'J2', vehicleId: 'V2', technicianName: 'Joseph', description: 'Oil leak investigation', status: 'In Progress', partsUsed: [{ partId: 'P1', quantity: 1 }], laborCost: 2500, startedAt: '2024-03-05T09:30:00Z' },
    { id: 'J3', vehicleId: 'V5', technicianName: 'Samuel', description: 'Engine light diagnosis', status: 'Waiting Parts', partsUsed: [], laborCost: 1500, startedAt: '2024-03-06T10:00:00Z' },
    { id: 'J4', vehicleId: 'V6', technicianName: 'Peter', description: 'Suspension check and repair', status: 'Pending', partsUsed: [], laborCost: 0, startedAt: '2024-03-07T08:00:00Z' },
  ],
  parts: [
    { id: 'P1', name: 'Oil Filter', partNumber: 'OF-TY-01', quantity: 25, reorderLevel: 5, unitCost: 800, supplier: 'AutoParts Hub' },
    { id: 'P2', name: 'Engine Oil 5W30', partNumber: 'OIL-5W30-4L', quantity: 40, reorderLevel: 10, unitCost: 3500, supplier: 'Oil Express' },
    { id: 'P3', name: 'Brake Pads Front', partNumber: 'BP-TY-CAM', quantity: 12, reorderLevel: 4, unitCost: 4500, supplier: 'AutoParts Hub' },
    { id: 'P4', name: 'Spark Plugs Platinum', partNumber: 'SP-NGK-01', quantity: 30, reorderLevel: 10, unitCost: 1200, supplier: 'Global Spares' },
    { id: 'P5', name: 'Air Filter', partNumber: 'AF-HY-TUC', quantity: 8, reorderLevel: 5, unitCost: 1500, supplier: 'AutoParts Hub' },
    { id: 'P6', name: 'Fuel Filter', partNumber: 'FF-VW-POLO', quantity: 5, reorderLevel: 3, unitCost: 2200, supplier: 'Global Spares' },
    { id: 'P7', name: 'Coolant 5L', partNumber: 'CL-RED-5L', quantity: 15, reorderLevel: 5, unitCost: 2500, supplier: 'Oil Express' },
    { id: 'P8', name: 'Wiper Blades', partNumber: 'WB-UNI-22', quantity: 20, reorderLevel: 6, unitCost: 1000, supplier: 'AutoParts Hub' },
    { id: 'P9', name: 'Timing Belt', partNumber: 'TB-MB-C200', quantity: 2, reorderLevel: 2, unitCost: 12000, supplier: 'Premium Motors' },
    { id: 'P10', name: 'Battery 70Ah', partNumber: 'BAT-VAR-70', quantity: 6, reorderLevel: 3, unitCost: 15000, supplier: 'Global Spares' },
  ],
  invoices: [
    { id: 'INV-101', jobId: 'J1', clientId: 'C1', lineItems: [{ description: 'Full Service Labor', qty: 1, unitCost: 5000 }, { description: 'Oil Filter', qty: 1, unitCost: 800 }, { description: 'Engine Oil 5W30', qty: 4, unitCost: 3500 }], laborCost: 5000, taxRate: 0.15, status: 'Paid', issuedAt: '2024-03-01T16:00:00Z' },
    { id: 'INV-102', jobId: 'J2', clientId: 'C2', lineItems: [{ description: 'Oil Leak Investigation Labor', qty: 1, unitCost: 2500 }], laborCost: 2500, taxRate: 0.15, status: 'Unpaid', issuedAt: '2024-03-05T12:00:00Z' },
    { id: 'INV-103', jobId: 'J3', clientId: 'C5', lineItems: [{ description: 'Engine Diagnosis Labor', qty: 1, unitCost: 1500 }], laborCost: 1500, taxRate: 0.15, status: 'Unpaid', issuedAt: '2024-03-06T11:00:00Z' },
  ],
  reminders: [
    { id: 'R1', vehicleId: 'V1', type: 'Oil Change', dueDate: '2024-09-01', notes: 'Scheduled after 6 months', isDone: false },
    { id: 'R2', vehicleId: 'V3', type: 'Full Service', dueDate: '2024-04-15', notes: 'High mileage service', isDone: false },
    { id: 'R3', vehicleId: 'V4', type: 'Tyre Rotation', dueDate: '2024-05-10', notes: 'Front tyres wearing down', isDone: false },
    { id: 'R4', vehicleId: 'V2', type: 'Oil Change', dueDate: '2024-03-15', notes: 'Urgent oil change needed', isDone: false },
  ],
  technicians: [
    { id: 'T1', name: 'Samuel' },
    { id: 'T2', name: 'Joseph' },
    { id: 'T3', name: 'Peter' },
  ]
};

export function initDemoData() {
  if (localStorage.getItem(STORAGE_KEYS.CLIENTS)) return;

  writeStorage(STORAGE_KEYS.CLIENTS, DEMO_DATA.clients);
  writeStorage(STORAGE_KEYS.VEHICLES, DEMO_DATA.vehicles);
  writeStorage(STORAGE_KEYS.JOBS, DEMO_DATA.jobs);
  writeStorage(STORAGE_KEYS.STOCK, DEMO_DATA.parts);
  writeStorage(STORAGE_KEYS.INVOICES, DEMO_DATA.invoices);
  writeStorage(STORAGE_KEYS.REMINDERS, DEMO_DATA.reminders);
  writeStorage(STORAGE_KEYS.TECHNICIANS, DEMO_DATA.technicians);
}
