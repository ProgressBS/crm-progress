export const money = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0) + ' ₸'
export const num = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0)
export const fdate = (d) => { if (!d) return '—'; try { const x = new Date(d); return x.toLocaleDateString('ru-RU') } catch (e) { return '—' } }
