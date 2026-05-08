// Utility to get the base API URL
export const getApiUrl = (path: string) => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // 1. Check for configured environment variable first
  if (envUrl) {
    const cleanBase = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }
  
  // 2. Fallback for browser environments
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    
    // If on Netlify but no API URL, we caution that it might fail unless proxied
    if (hostname.endsWith('.netlify.app')) {
      // We return a relative path, which works if a netlify.toml proxy is set up
      return path.startsWith('/') ? path : `/${path}`;
    }
    
    // For local dev where backend is on 3000 but frontend might be on another port
    if (origin.includes('localhost') && !origin.includes(':3000')) {
      return `http://localhost:3000${path.startsWith('/') ? path : `/${path}`}`;
    }
    
    // Default to relative path
    return path.startsWith('/') ? path : `/${path}`;
  }

  // 3. Fallback for non-browser environments
  return `http://localhost:3000${path.startsWith('/') ? path : `/${path}`}`;
};

// Utility to get the WebSocket/Socket.io URL
export const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // 1. Explicitly configured URL
  if (envUrl) {
    return envUrl;
  }

  // 2. Browser detection
  if (typeof window !== 'undefined') {
    const { origin, hostname, protocol } = window.location;
    
    // If we're on Capacitor or a local dev server that isn't the backend
    if (origin.includes('localhost') && !origin.includes(':3000')) {
      return 'http://localhost:3000';
    }

    // On Netlify, we default to the current origin (handles proxies)
    // but warn if it feels like it might fail
    if (hostname.endsWith('.netlify.app')) {
      console.info('ManaGrid: Connecting to WebSocket on current origin. Ensure Netlify proxy or VITE_API_URL is set.');
    }

    return origin;
  }
  
  // 3. Absolute default
  return 'http://localhost:3000';
};
