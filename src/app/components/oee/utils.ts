// OEE Helper Utilities

export function getOEEColor(oee: number): string {
  if (oee >= 70) return 'text-emerald-400' // Dark-theme friendly emerald
  if (oee >= 50) return 'text-amber-400'   // Dark-theme friendly amber
  return 'text-rose-400'                   // Dark-theme friendly rose
}

export function getOEEBgColor(oee: number): string {
  if (oee >= 70) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (oee >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatOEE(value: number): string {
  return `${value.toFixed(1)}%`
}
