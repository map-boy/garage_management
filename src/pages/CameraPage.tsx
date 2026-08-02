import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cameraService } from '../services/cameraService';
import { settingsService } from '../services/settingsService';
import { CameraFeed } from '../components/camera/CameraFeed';
import { CameraStatus } from '../components/camera/CameraStatus';
import { Info, Wifi, Settings as SettingsIcon, Maximize2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function CameraPage() {
  const [status, setStatus] = useState<'online' | 'offline' | 'not_configured'>('not_configured');
  const [loading, setLoading] = useState(true);
  const settings = settingsService.get();

  const checkStatus = async () => {
    const s = await cameraService.getStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
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
          Live camera streams require an active internet connection to your CCTV device or NVR.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CameraFeed url={cameraService.getStreamUrl()} label={settings.cameraLabel} />
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-gray-400" />
              Camera Controls
            </h3>

            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-xs font-bold uppercase tracking-tight" onClick={() => document.querySelector('video')?.requestFullscreen()}>
                <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen View
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs font-bold uppercase tracking-tight" onClick={checkStatus}>
                <Wifi className="w-4 h-4 mr-2" /> Refresh Stream
              </Button>
            </div>

            {status === 'not_configured' && (
              <div className="pt-6 border-t border-gray-50">
                <p className="text-xs text-gray-500 font-medium mb-3">
                  No camera stream URL is set for this workshop.
                </p>
                <Link to="/settings">
                  <Button variant="outline" className="w-full text-xs font-bold uppercase tracking-tight">
                    Go to Settings
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
