import { CAMERA_STREAM_URL } from '../lib/constants';

export const cameraService = {
  getStreamUrl: (): string => {
    return CAMERA_STREAM_URL;
  },
  getStatus: async (): Promise<'online' | 'offline'> => {
    try {
      // Small timeout since it's just a status check
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(CAMERA_STREAM_URL, { 
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' 
      });
      
      clearTimeout(id);
      return 'online';
    } catch (e) {
      return 'offline';
    }
  }
};
