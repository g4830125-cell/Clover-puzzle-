export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  if (baseUrl && baseUrl.startsWith('http')) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }
  
  return path;
};
