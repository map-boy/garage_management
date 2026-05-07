import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function CameraStatus({ status }: { status: 'online' | 'offline' }) {
  return (
    <div className="flex items-center gap-2">
      {status === 'online' ? (
        <Badge variant="success" className="gap-1.5">
          <Wifi className="w-3 h-3" /> Online
        </Badge>
      ) : (
        <Badge variant="danger" className="gap-1.5">
          <WifiOff className="w-3 h-3" /> Offline
        </Badge>
      )}
    </div>
  );
}
