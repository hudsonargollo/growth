import { useState } from 'react'
import {
  Link2, Search, Copy, Check, ExternalLink, Loader2,
  Star, Package, AlertTriangle, Trash2, Tag,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'

// ── Affiliate link result card ────────────────────────────────────────────────

function ResultCard({ item, onRemove }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(item.affiliateLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const priceFormatted = item.price != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: item.currency ?? 'BRL' }).format(item.price)
    : null

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', gap: 16, padding: '16px 18px' }}>
        {/* Thumbnail */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail.replace('http://', 'https://')}
            alt={item.title}
            style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'contain',
              background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <Package size={22} style={{ color: 'rgba(255,255,255,0.20)' }} />
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4, marginBottom: 6, display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {priceFormatted && (
              <span style={{ fontSize: 15, fontWeight: 800, color: '#CCFF00' }}>
                {priceFormatted}
              </span>
            )}
            {item.condition && (
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 100,
                background: item.condition === 'new' ? 'rgba(0,255,185,0.10)' : 'rgba(255,184,0,0.10)',
                color: item.condition === 'new' ? '#00FFB9' : '#FFB800',
                border: `1px solid ${item.condition === 'new' ? 'rgba(0,255,185,0.20)' : 'rgba(255,184,0,0.20)'}`,
              }}>
                {item.condition === 'new' ? 'Novo' : 'Usado'}
              </span>
            )}
            {item.rating != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <Star size={10} style={{ color: '#FFB800' }} />
                {item.rating.toFixed(1)}
                {item.reviewCount ? ` (${item.reviewCount.toLocaleString('pt-BR')})` : ''}
              </span>
            )}
            {item.soldQty != null && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
                {item.soldQty.toLocaleString('pt-BR')} vendidos
              </span>
            )}
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: 'rgba(255,255,255,0.20)',
            alignSelf: 'flex-start', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF3366'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Affiliate link bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: item.affiliateTag ? 'rgba(204,255,0,0.03)' : 'rgba(255,184,0,0.03)',
      }}>
        <Tag size={11} style={{ color: item.affiliateTag ? '#CCFF00' : '#FFB800', flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.35)',
          fontFamily: "'JetBrains Mono', monospace",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.affiliateLink}
        </span>
        <a
          href={item.affiliateLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '4px 6px', borderRadius: 6, color: 'rgba(255,255,255,0.30)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.30)'}
        >
          <ExternalLink size={12} />
        </a>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer', transition: 'all 200ms',
            background: copied ? '#00FFB9' : item.affiliateTag ? 'rgba(204,255,0,0.12)' : 'rgba(255,184,0,0.10)',
            color: copied ? '#07070B' : item.affiliateTag ? '#CCFF00' : '#FFB800',
          }}
        >
          {copied ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar link</>}
        </button>
      </div>

      {!item.affiliateTag && (
        <div style={{
          padding: '8px 18px', borderTop: '1px solid rgba(255,184,0,0.10)',
          background: 'rgba(255,184,0,0.04)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AlertTriangle size={11} style={{ color: '#FFB800', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,184,0,0.70)' }}>
            Nenhuma tag de afiliado configurada — salve <strong>ML_AFFILIATE_TAG</strong> em Configurações → Chaves de API para adicionar sua tag automaticamente.
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Afiliados() {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [results, setResults] = useState([])  // list of fetched items

  async function handleFetch() {
    const val = input.trim()
    if (!val) return
    setLoading(true); setError(null)
    try {
      // Worker handles ID extraction + ML item fetch + affiliate tag resolution.
      // We pass the raw URL or ID directly — no browser-side ML API call needed.
      const res  = await fetch('/api/affiliate/ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: val }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)

      // Prevent duplicates
      setResults(prev => prev.some(r => r.itemId === data.itemId) ? prev : [data, ...prev])
      setInput('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function removeResult(itemId) {
    setResults(prev => prev.filter(r => r.itemId !== itemId))
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Ferramentas"
        title="Links de Afiliado"
        description="Cole uma URL ou ID de produto do Mercado Livre e gere o link de afiliado instantaneamente"
      />

      {/* Input */}
      <div style={{
        borderRadius: 16, padding: '20px 22px', marginBottom: 24,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleFetch()}
              placeholder="Cole a URL do produto ou o ID (ex: MLB123456789)…"
              autoFocus
              style={{
                width: '100%', padding: '11px 14px 11px 36px', borderRadius: 10,
                fontSize: 13, background: 'rgba(255,255,255,0.06)',
                border: error ? '1px solid rgba(255,51,102,0.50)' : '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box',
                transition: 'border 150ms',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.50)'}
              onBlur={e => e.target.style.borderColor = error ? 'rgba(255,51,102,0.50)' : 'rgba(255,255,255,0.10)'}
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 20px', borderRadius: 10, border: 'none',
              fontSize: 13, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed',
              background: input.trim() ? '#CCFF00' : 'rgba(255,255,255,0.06)',
              color: input.trim() ? '#07070B' : 'rgba(255,255,255,0.25)',
              transition: 'all 200ms', flexShrink: 0,
            }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Buscando…</>
              : <><Link2 size={14} /> Gerar Link</>
            }
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 10, fontSize: 12, color: '#FF3366' }}>
            <AlertTriangle size={12} />
            {error}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
          Aceita URLs completas do Mercado Livre ou IDs no formato <code style={{ color: 'rgba(255,255,255,0.40)' }}>MLB123456789</code>. Pressione Enter para buscar.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {results.length} produto{results.length !== 1 ? 's' : ''}
            </p>
            {results.length > 1 && (
              <button
                onClick={() => setResults([])}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#FF3366'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >
                <Trash2 size={11} /> Limpar tudo
              </button>
            )}
          </div>
          {results.map(item => (
            <ResultCard key={item.itemId} item={item} onRemove={() => removeResult(item.itemId)} />
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '64px 32px', gap: 12,
          borderRadius: 16, border: '1px dashed rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.15)',
          }}>
            <Link2 size={20} style={{ color: '#CCFF00' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
            Nenhum link gerado ainda
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.20)', textAlign: 'center', maxWidth: 320 }}>
            Cole a URL de qualquer produto do Mercado Livre acima para ver os dados e o link de afiliado pronto para copiar.
          </p>
        </div>
      )}
    </div>
  )
}
