import { Languages, Check, Loader2, ArrowRight } from 'lucide-react'
import { LANG_BY_CODE, langChip } from '../lib/languages.js'

/**
 * Opt-in "generate this in another language" card.
 *
 * Deliberately NOT automatic — each language is one extra LLM/TTS call, so the
 * user triggers it with an explicit click. Shared by Scripts, Wizard and
 * Voiceover. Emoji-free by design (text chips only).
 *
 * Props:
 *  - title / subtitle  copy for the card
 *  - currentCode       language already produced (rendered as a done chip)
 *  - options           language codes to offer as buttons
 *  - doneCodes         codes already produced this session (check + locked)
 *  - busyCode          code currently generating (spinner)
 *  - disabled          lock every button (e.g. another flow is running)
 *  - onPick(code)      click handler
 */
export default function LanguageFollowUp({
  title = 'Gerar em outro idioma?',
  subtitle,
  currentCode,
  options = [],
  doneCodes = [],
  busyCode = null,
  disabled = false,
  onPick,
}) {
  const done = new Set(doneCodes)
  if (options.length === 0) return null

  return (
    <div
      className="rounded-2xl p-5 mt-4 ec-langfollow"
      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139,92,246,0.15)' }}
        >
          <Languages size={17} className="text-violet-300" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white/85">{title}</p>
          {subtitle && <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{subtitle}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Already-produced source language */}
            {currentCode && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(0,255,185,0.10)', border: '1px solid rgba(0,255,185,0.22)', color: 'rgba(0,255,185,0.85)' }}
              >
                <Check size={13} /> {langChip(currentCode)}
              </span>
            )}

            {options.map((code) => {
              const l       = LANG_BY_CODE[code]
              const isDone  = done.has(code)
              const isBusy  = busyCode === code
              const locked  = isDone || isBusy || disabled || !!busyCode
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => !locked && onPick?.(code)}
                  disabled={locked}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    background:  isDone ? 'rgba(0,255,185,0.10)' : 'rgba(255,255,255,0.04)',
                    border:      `1px solid ${isDone ? 'rgba(0,255,185,0.22)' : 'rgba(139,92,246,0.30)'}`,
                    color:       isDone ? 'rgba(0,255,185,0.85)' : '#fff',
                    cursor:      locked ? 'default' : 'pointer',
                    opacity:     disabled && !isBusy && !isDone ? 0.45 : 1,
                  }}
                >
                  {isBusy
                    ? <Loader2 size={13} className="animate-spin" />
                    : isDone
                      ? <Check size={13} />
                      : <ArrowRight size={13} className="text-violet-300" />}
                  <span>{langChip(code)}</span>
                  {l?.label && <span className="font-medium opacity-70 hidden sm:inline">{l.label}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
