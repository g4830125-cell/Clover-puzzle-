export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }
  
  if (typeof window !== 'undefined') {
    // If on Netlify but no API URL, API calls to relative paths might work if proxied, 
    // but usually they fail.
    if (window.location.hostname.endsWith('.netlify.app')) {
      console.warn('ManaGrid: Running on Netlify without VITE_API_URL. API calls may fail.');
    }
  }

  return path;
};

export const getSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  if (baseUrl) {
    console.log('ManaGrid: Using configured API URL for WebSocket:', baseUrl);
    return baseUrl;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    
    // If we're on Capacitor but no API URL is set, fallback to localhost:3000
    if (origin.includes('localhost') && !origin.includes(':3000')) {
      return 'http://localhost:3000';
    }

    // If on Netlify, we MUST have an API URL provided, because Netlify doesn't host the backend
    if (hostname.endsWith('.netlify.app')) {
      console.error('ManaGrid: WebSocket connection will likely fail. You must set VITE_API_URL in Netlify to your Cloud Run backend URL.');
    }

    return origin;
  }
  
  return 'http://localhost:3000';
};
