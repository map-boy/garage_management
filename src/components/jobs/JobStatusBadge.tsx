import { JobStatus } from '../../types';
import { Badge } from '../ui/Badge';

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const variants: Record<JobStatus, 'danger' | 'warning' | 'info' | 'success'> = {
    'Pending': 'danger',
    'In Progress': 'warning',
    'Waiting Parts': 'info',
    'Completed': 'success',
  };

  return <Badge variant={variants[status]}>{status}</Badge>;
}
