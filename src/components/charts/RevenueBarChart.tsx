import { useMemo } from 'react';
import { formatCurrency } from '../../lib/utils';

interface RevenueBarChartProps {
  data: { name: string; value: number }[];
}

export function RevenueBarChart({ data }: RevenueBarChartProps) {
  // Map data to points for a 400x100 SVG viewbox
  const points = useMemo(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data.map(d => d.value), 1);
    const step = 400 / (data.length - 1 || 1);
    
    return data.map((item, i) => {
      const x = i * step;
      const y = 80 - (item.value / max) * 60; // Scale to fit in [20, 80] range
      return `${x},${y}`;
    }).join(' ');
  }, [data]);

  const areaPath = useMemo(() => {
    if (!points) return '';
    const lastX = (data.length - 1) * (400 / (data.length - 1 || 1));
    return `M ${points} L ${lastX},100 L 0,100 Z`;
  }, [data, points]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 group">
        {data.length > 0 ? (
          <svg viewBox="0 0 400 100" className="w-full h-full text-blue-500 overflow-visible" preserveAspectRatio="none">
            <path 
              d={`M ${points}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="drop-shadow-sm"
            />
            <path 
              d={areaPath} 
              fill="currentColor" 
              fillOpacity="0.1" 
            />
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] uppercase font-bold text-gray-300">
            No active metrics
          </div>
        )}
      </div>
      
      <div className="flex justify-between text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest px-1">
        {data.map((item, i) => (
          <span key={i}>{item.name.substring(0, 3)}</span>
        ))}
      </div>
    </div>
  );
}
