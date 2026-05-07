export type JobStatus = 'Pending' | 'In Progress' | 'Waiting Parts' | 'Completed';

export interface JobCard {
  id: string;
  vehicleId: string;
  technicianName: string;
  description: string;
  status: JobStatus;
  partsUsed: { partId: string; quantity: number }[];
  laborCost: number;
  startedAt: string;
  completedAt?: string;
}
