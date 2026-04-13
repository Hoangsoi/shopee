/**
 * Gộp các lần gọi đồng thời tới /api/ctv/proposals/count thành một request (giảm burst trên Vercel).
 */
let inFlight: Promise<number> | null = null

export async function fetchCtvProposalsCount(): Promise<number> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const res = await fetch('/api/ctv/proposals/count')
      if (!res.ok) return 0
      const data = await res.json()
      return typeof data.count === 'number' ? data.count : 0
    } catch {
      return 0
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
