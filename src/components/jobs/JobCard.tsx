import React from 'react';
import { Calendar, User, Car } from 'lucide-react';
import { JobCard as JobCardType, Vehicle } from '../../types';
import { formatDate } from '../../lib/utils';
import { JobStatusBadge } from './JobStatusBadge';

interface JobCardProps {
  job: JobCardType;
  vehicle?: Vehicle;
  onClick?: () => void;
}

export function JobCard({ job, vehicle, onClick }: JobCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-gray-900 mb-1">#{job.id}</h4>
          <p className="text-sm text-gray-500 line-clamp-1">{job.description}</p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mt-4">
        <div className="flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-gray-400" />
          <span>{vehicle ? `${vehicle.plate} - ${vehicle.make}` : job.vehicleId}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span>{job.technicianName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{formatDate(job.startedAt)}</span>
        </div>
      </div>
    </div>
  );
}
