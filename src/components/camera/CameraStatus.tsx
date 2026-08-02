import { Wifi, WifiOff, Settings } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function CameraStatus({ status }: { status: 'online' | 'offline' | 'not_configured' }) {
  return (
    <div className="flex items-center gap-2">
      {status === 'online' && (
        <Badge variant="success" className="gap-1.5">
          <Wifi className="w-3 h-3" /> Online
        </Badge>
      )}
      {status === 'offline' && (
        <Badge variant="danger" className="gap-1.5">
          <WifiOff className="w-3 h-3" /> Offline
        </Badge>
      )}
      {status === 'not_configured' && (
        <Badge variant="warning" className="gap-1.5">
          <Settings className="w-3 h-3" /> Not Configured
        </Badge>
      )}
    </div>
  );
}
