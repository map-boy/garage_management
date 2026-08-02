import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { useVehicles } from '../hooks/useVehicles';
import { JobCard } from '../components/jobs/JobCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Filter, Wrench } from 'lucide-react';
import { generateId } from '../lib/utils';
import { JOB_STATUSES } from '../lib/constants';
import { settingsService } from '../services/settingsService';
import { JobCard as JobCardType } from '../types';

export function JobCardsPage() {
  const currency = settingsService.get().currency;
  const navigate = useNavigate();
  const { jobs, addJob } = useJobs();
  const { vehicles } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '', technicianName: '', description: '', laborCost: 0
  });

  const filtered = jobs.filter(j => {
    const v = vehicles.find(vec => vec.id === j.vehicleId);
    const matchesSearch = 
      j.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v?.plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).reverse();

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobCardType = {
      id: `JOB-${generateId()}`,
      vehicleId: formData.vehicleId,
      technicianName: formData.technicianName,
      description: formData.description,
      status: 'Pending',
      partsUsed: [],
      laborCost: Number(formData.laborCost) || 0,
      startedAt: new Date().toISOString(),
    };
    addJob(newJob);
    setIsModalOpen(false);
    navigate(`/jobs/${newJob.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Job Cards</h1>
          <p className="text-sm text-gray-500 font-medium font-mono">Active Workflow: {jobs.filter(j => j.status !== 'Completed').length} Pending</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> Create Job Card
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 flex-1 w-full sm:w-auto shadow-xs">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Job ID, plate, or description..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full ml-3 outline-hidden"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-hidden focus:ring-2 focus:ring-blue-500 w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {Object.values(JOB_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((job) => (
          <JobCard 
            key={job.id} 
            job={job} 
            vehicle={vehicles.find(v => v.id === job.vehicleId)}
            onClick={() => navigate(`/jobs/${job.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
            <Wrench className="w-12 h-12 mb-4 opacity-10" />
            <p className="italic">No job cards found matching your filters</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Job Card">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Vehicle</label>
            <select 
              required
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              value={formData.vehicleId}
              onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Technician</label>
            <input 
              type="text" required
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={formData.technicianName}
              onChange={(e) => setFormData({...formData, technicianName: e.target.value})}
              placeholder="e.g. Samuel"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Job Description</label>
            <textarea 
              required rows={3}
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Estimated Labor Cost ({currency})</label>
            <input 
              type="number"
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={formData.laborCost}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setFormData({...formData, laborCost: e.target.value === '' ? '' : parseFloat(e.target.value)})}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Start Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

