import { useEffect, useRef } from 'react';
import { CameraOff } from 'lucide-react';

export function CameraFeed({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Note: Standard HTML5 video doesn't support HLS (.m3u8) without hls.js
  // For this local-storage demo, we'll simulate the feed with a stable sample video
  // that typically works in most browsers or show a placeholder.
  
  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
      <div className="absolute inset-0 flex items-center justify-center">
        <CameraOff className="w-12 h-12 text-gray-800 opacity-20" />
      </div>
      
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover relative z-10"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      />
      
      <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] text-white font-mono uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Direct Feed: Tech-Bay 01
      </div>
      
      <div className="absolute bottom-0 inset-x-0 h-1 z-20 bg-blue-500/30">
        <div className="h-full bg-blue-500 w-1/3 animate-ping duration-[3000ms]"></div>
      </div>
    </div>
  );
}
