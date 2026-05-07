import { useMemo } from 'react';

interface TechnicianChartProps {
  data: { name: string; value: number }[];
}

export function TechnicianChart({ data }: TechnicianChartProps) {
  const max = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  return (
    <div className="space-y-4">
      {data.map((item, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-gray-600">{item.name}</span>
            <span className="text-gray-400">{item.value} ACTIVE JOBS</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          No technician engagement data
        </div>
      )}
    </div>
  );
}
