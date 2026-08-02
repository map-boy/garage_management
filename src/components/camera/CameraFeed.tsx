import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { CameraOff, AlertTriangle } from 'lucide-react';

export function CameraFeed({ url, label }: { url: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;

    if (url.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError('Unable to load camera stream. Check the URL or network connection.');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !url.includes('.m3u8')) {
      video.src = url;
      video.onerror = () => setError('Unable to load camera stream. Check the URL or network connection.');
    } else {
      setError('This browser cannot play HLS streams.');
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [url]);

  if (!url) {
    return (
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 text-gray-500">
        <CameraOff className="w-10 h-10" />
        <p className="text-sm font-medium">No camera configured. Add a stream URL in Settings.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 text-amber-400">
        <AlertTriangle className="w-10 h-10" />
        <p className="text-sm font-medium text-center px-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        className="w-full h-full object-cover"
      />
      {label && (
        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] text-white font-mono uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          {label}
        </div>
      )}
    </div>
  );
}
