export function getPublicCacheHeaders(
  sMaxAge: number,
  staleWhileRevalidate: number
) {
  const value = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`

  return {
    'Cache-Control': value,
    'CDN-Cache-Control': value,
    'Vercel-CDN-Cache-Control': value,
  }
}
