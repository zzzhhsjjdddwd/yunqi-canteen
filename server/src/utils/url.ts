export function getFullUrl(req: any, relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  return baseUrl + relativePath;
}
