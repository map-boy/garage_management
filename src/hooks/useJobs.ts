import { useState, useEffect } from 'react';
import { JobCard } from '../types';
import { jobService } from '../services/jobService';

export function useJobs(vehicleId?: string) {
  const [jobs, setJobs] = useState<JobCard[]>([]);

  const refresh = () => {
    if (vehicleId) {
      setJobs(jobService.getByVehicleId(vehicleId));
    } else {
      setJobs(jobService.getAll());
    }
  };

  useEffect(() => {
    refresh();
  }, [vehicleId]);

  const addJob = (j: JobCard) => {
    jobService.save(j);
    refresh();
  };

  const updateJob = (j: JobCard) => {
    jobService.save(j);
    refresh();
  };

  const deleteJob = (id: string) => {
    jobService.deleteById(id);
    refresh();
  };

  return { jobs, addJob, updateJob, deleteJob, refresh };
}
