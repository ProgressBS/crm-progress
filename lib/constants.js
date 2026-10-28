export const STAGES = [
  { id: 'call', name: 'Звонок / заявка', v: '--s1' },
  { id: 'kp', name: 'КП отправлено', v: '--s2' },
  { id: 'contract', name: 'Договор', v: '--s3' },
  { id: 'invoice', name: 'Счёт выставлен', v: '--s4' },
  { id: 'paid', name: 'Оплачено', v: '--s5' },
  { id: 'training', name: 'Обучение', v: '--s6' },
  { id: 'cert', name: 'Сертификат выдан', v: '--s7' },
  { id: 'review', name: 'Отзыв получен', v: '--s8' },
]
export const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]))
export const money = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0) + ' ₸'
