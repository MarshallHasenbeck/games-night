import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marshallhasenbeck.pugdoku',
  appName: 'Pugdoku',
  webDir: 'dist',
  ios: { contentInset: 'never', backgroundColor: '#1f3d2b', scheme: 'Pugdoku' },
  plugins: { SplashScreen: { launchAutoHide: false, backgroundColor: '#1f3d2b' } },
};
export default config;
