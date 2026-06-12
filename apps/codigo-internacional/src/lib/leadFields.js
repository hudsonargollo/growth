// Qualification field options — canonical set, aligned with the application form.
// Keys are stored in D1; labels are shown in the UI. Keep in sync with the
// worker's notify.js label maps.

export const REVENUE_BANDS = [
  { key: 'ate-30k', label: 'Até R$30 mil', sub: 'por mês' },
  { key: '30-50k', label: 'R$30 a 50 mil', sub: 'por mês' },
  { key: '50-100k', label: 'R$50 a 100 mil', sub: 'por mês' },
  { key: '100-300k', label: 'R$100 a 300 mil', sub: 'por mês' },
  { key: '300k-1m', label: 'R$300 mil a 1 mi', sub: 'por mês' },
  { key: 'acima-1m', label: 'Acima de R$1 mi', sub: 'por mês' },
]

export const HEADCOUNT_BANDS = [
  { key: 'solo', label: 'Apenas eu', sub: 'sem equipe' },
  { key: '2-5', label: '2 a 5', sub: 'pessoas' },
  { key: '6-20', label: '6 a 20', sub: 'pessoas' },
  { key: '21-50', label: '21 a 50', sub: 'pessoas' },
  { key: 'acima-50', label: 'Mais de 50', sub: 'pessoas' },
]

// A lead is "high value" when the business is clearly sizeable.
export const HIGH_VALUE_REVENUE = ['300k-1m', 'acima-1m']
export const HIGH_VALUE_HEADCOUNT = ['21-50', 'acima-50']
export const isHighValue = (lead) =>
  HIGH_VALUE_REVENUE.includes(lead?.revenue_band) || HIGH_VALUE_HEADCOUNT.includes(lead?.headcount)

export const YEARS_BANDS = [
  { key: 'lt1', label: 'Menos de 1 ano' },
  { key: '1-3', label: '1 a 3 anos' },
  { key: '3-5', label: '3 a 5 anos' },
  { key: 'gt5', label: 'Mais de 5 anos' },
]

export const DECISION_BANDS = [
  { key: 'imediato', label: 'Imediatamente' },
  { key: '7d', label: 'Em até 7 dias' },
  { key: '30d', label: 'Em até 30 dias' },
  { key: 'avaliando', label: 'Ainda estou avaliando' },
]

const map = (arr) => Object.fromEntries(arr.map((o) => [o.key, o.label]))
export const REVENUE_LABEL = map(REVENUE_BANDS)
export const HEADCOUNT_LABEL = map(HEADCOUNT_BANDS)
export const YEARS_LABEL = map(YEARS_BANDS)
export const DECISION_LABEL = map(DECISION_BANDS)

export const revenueLabel = (k) => REVENUE_LABEL[k] || k || '—'
export const headcountLabel = (k) => HEADCOUNT_LABEL[k] || k || '—'
export const yearsLabel = (k) => YEARS_LABEL[k] || k || '—'
export const decisionLabel = (k) => DECISION_LABEL[k] || k || '—'
