export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  if (baseUrl && baseUrl.startsWith('http')) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }
  
  // If we're on Capacitor but no API URL is set, we might need a fallback.
  // For now, if it's relative and we're not on a standard web port, it might fail.
  return path;
};

export const getSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (baseUrl && baseUrl.startsWith('http')) {
    return baseUrl;
  }

  // Fallback for development
  if (typeof window !== 'undefined') {
    if (window.location.origin.includes('localhost') && !window.location.origin.includes(':3000')) {
      // Likely mobile localhost or Capacitor
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }
  
  return 'http://localhost:3000';
};
