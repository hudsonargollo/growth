// Shared status metadata for the Código Internacional CRM (dark theme palette).

// TEKTONE light-theme palette — reads on Ivory Clay.
export const LEAD_STATUSES = [
  { key: 'new',       label: 'Novo',        color: '#3a6b8c' },
  { key: 'contacted', label: 'Contatado',   color: '#6b5b95' },
  { key: 'qualified', label: 'Qualificado', color: '#9c6f1e' },
  { key: 'won',       label: 'Fechado',     color: '#2e4a43' },
  { key: 'lost',      label: 'Descartado',  color: '#9b2c2c' },
]

export const SALE_STATUSES = [
  { key: 'pending_payment', label: 'Aguardando pgto', color: '#9c6f1e' },
  { key: 'paid',            label: 'Pago',            color: '#3a6b8c' },
  { key: 'onboarding',      label: 'Onboarding',      color: '#2e4a43' },
  { key: 'journey',         label: 'Jornada',         color: '#6b5b95' },
  { key: 'completed',       label: 'Concluído',       color: '#1f6f4f' },
  { key: 'refunded',        label: 'Reembolsado',     color: '#9b2c2c' },
]

export const COMMISSION_STATUSES = [
  { key: 'projected', label: 'Prevista',  color: '#7a7f86' },
  { key: 'pending',   label: 'Pendente',  color: '#9c6f1e' },
  { key: 'approved',  label: 'Aprovada',  color: '#3a6b8c' },
  { key: 'paid',      label: 'Paga',      color: '#2e4a43' },
  { key: 'void',      label: 'Anulada',   color: '#9b2c2c' },
]

// Step-1-only captures — stored for remarketing, never shown in the pipeline.
export const INCOMPLETE = { key: 'incomplete', label: 'Incompleto', color: '#7a7f86' }

export function meta(list, key) {
  return list.find((s) => s.key === key) ?? { key, label: key, color: '#888' }
}

/** A small status pill styled for the dark theme. */
export function pill(list, key) {
  const m = meta(list, key)
  return {
    color: m.color,
    background: `${m.color}1A`,
    border: `1px solid ${m.color}40`,
  }
}

export function brl(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Build a wa.me click-to-chat link to a lead's number, with an optional prefilled message. */
export function waLink(phone, text = '') {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const withCC = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCC}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** Default opening message the closer (Pedro) can edit before sending. */
export function waGreeting(lead) {
  const name = (lead?.name || '').split(' ')[0]
  return `Olá${name ? ' ' + name : ''}! Aqui é o Pedro Silvestrini, d'O Código Internacional. Recebi seu contato e queria falar pessoalmente sobre a sua vaga. Podemos conversar?`
}
