import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vidmate.clone',
  appName: 'VidMate Clone',
  webDir: 'dist',
  server: { allowNavigation: ['*'] }
};

export default config;
