export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  // If we are in the browser and the path is relative, it works automatically.
  // If we are in an APK (Capacitor), window.location.origin might be 'capacitor://localhost'
  // so we should use the explicit baseUrl if available.
  
  if (typeof window !== 'undefined' && window.location.origin.includes('capacitor')) {
    return `${baseUrl}${path}`;
  }
  
  return path;
};
