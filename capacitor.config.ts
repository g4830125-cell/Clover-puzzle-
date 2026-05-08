import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.managrid.puzzle',
  appName: 'ManaGrid',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  backgroundColor: '#050508'
};

export default config;
