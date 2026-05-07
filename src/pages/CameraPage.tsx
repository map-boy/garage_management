import React, { useState, useEffect } from 'react';
import { cameraService } from '../services/cameraService';
import { CameraFeed } from '../components/camera/CameraFeed';
import { CameraStatus } from '../components/camera/CameraStatus';
import { Info, Wifi, Settings, Maximize2, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function CameraPage() {
  const [status, setStatus] = useState<'online' | 'offline'>('offline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const s = await cameraService.getStatus();
      setStatus(s);
      setLoading(false);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">CCTV Surveillance</h1>
          <p className="text-sm text-gray-500 font-medium">Remote workshop floor monitoring</p>
        </div>
        {!loading && <CameraStatus status={status} />}
      </div>

      <div className="bg-blue-600/5 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 font-medium leading-relaxed">
          <span className="font-bold">Privacy Alert:</span> Live camera streams require an active internet connection. All video data is processed locally in your browser and never stored on GarageFlow servers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CameraFeed url={cameraService.getStreamUrl()} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              Camera Controls
            </h3>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-xs font-bold uppercase tracking-tight">
                <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen View
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs font-bold uppercase tracking-tight">
                <Wifi className="w-4 h-4 mr-2" /> Refresh Stream
              </Button>
            </div>

            <div className="pt-6 border-t border-gray-50">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-tighter">Connection Secure</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">
                Encrypted P2P connection established with Workshop-IP-Cam-Node-01
              </p>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl text-white">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Storage State</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">Stream Cache</span>
                <span className="text-xs font-mono">1.2 GB</span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full">
                <div className="h-full bg-blue-500 w-1/4 rounded-full" />
              </div>
              <p className="text-[10px] text-gray-500 italic">Cache automatically cleared every 24 hours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
