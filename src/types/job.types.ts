export type JobStatus = 'Pending' | 'In Progress' | 'Waiting Parts' | 'Completed';

export interface JobCard {
  id: string;
  vehicleId: string;
  technicianName: string;
  description: string;
  status: JobStatus;
  partsUsed: { partId: string; quantity: number }[];
  laborCost: number;
  /**
   * Work the garage did but chose not to charge for - a wash after a paint
   * job, re-cleaning a panel it dirtied. Recorded so the owner sees the true
   * effort on the vehicle, and carried onto the invoice at zero cost.
   */
  freeServices?: { description: string; cost: number }[];
  /** On a monthly salary: their time is already paid, so it adds nothing to this vehicle. */
  technicianPaidMonthly?: boolean;
  startedAt: string;
  completedAt?: string;
}
