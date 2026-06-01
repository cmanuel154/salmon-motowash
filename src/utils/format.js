export const formatRp = (n) =>
  'Rp ' + (Number(n) || 0).toLocaleString('id-ID')

export const fmtDate = (s) => {
  const d = s instanceof Date ? s : new Date(String(s).includes('T') ? s : s + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
