/** "2 min 05 s" or "30 s". Used by the plan's status text and by the components. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m} min ${s.toString().padStart(2, '0')} s` : `${s} s`
}
