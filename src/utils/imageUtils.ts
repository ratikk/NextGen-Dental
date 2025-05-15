// Image handling utility
export const getImageUrl = (path: string): string => {
  // In development, use the local path
  if (import.meta.env.DEV) {
    return path;
  }
  
  // In production, use the full S3 URL
  const s3Domain = 'lilacdentalaustintx-website.s3.amazonaws.com';
  return `https://${s3Domain}${path}`;
}
