import { settingsService } from './settingsService';

export const cameraService = {
  getStreamUrl: (): string => {
    return settingsService.get().cameraStreamUrl;
  },
  getStatus: async (): Promise<'online' | 'offline' | 'not_configured'> => {
    const url = settingsService.get().cameraStreamUrl;
    if (!url) return 'not_configured';
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      await fetch(url, {
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
