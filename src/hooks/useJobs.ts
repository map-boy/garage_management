import { JobCard } from '../types';
import { useGarageCollection } from './useGarageCollection';

export function useJobs(vehicleId?: string) {
  const { items, save, remove } = useGarageCollection<JobCard>('jobs');
  const jobs = vehicleId ? items.filter(j => j.vehicleId === vehicleId) : items;

  return {
    jobs,
    addJob: (j: JobCard) => save(j),
    updateJob: (j: JobCard) => save(j),
    deleteJob: (id: string) => remove(id),
    refresh: () => {},
  };
}
