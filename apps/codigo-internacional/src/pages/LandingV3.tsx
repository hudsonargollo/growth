

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PT, EN } from './copyV3';
import { submitLead, captureAttribution, trackVisit } from '../lib/api.js';

// Map v3 form selections → backend cohort ids / revenue band keys.
const V3_TURMA_IDS = ['2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02', '2026-08-09'];
const V3_REVENUE_KEYS = ['30-50k', '50-100k', '100-300k', '300k-1m'];

type Lang = 'pt' | 'en';
type VslState = 'idle' | 'playing' | 'unlocked';

const LOCK_SECONDS = 5;
const TOTAL_SECONDS = 150;
const TURMA_DEADLINE = new Date('2026-07-12T23:59:59').getTime();

function fmtTime(s: number) {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

function fmtCountdown(ms: number) {
  const r = Math.max(0, ms);
  const d = Math.floor(r / 86400000);
  const h = Math.floor((r % 86400000) / 3600000);
  const m = Math.floor((r % 3600000) / 60000);
  const s = Math.floor((r % 60000) / 1000);
  return `${d}d ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('pt');
  const [activeDay, setActiveDay] = useState(1);
  const [openFaq, setOpenFaq] = useState(-1);
  const [sent, setSent] = useState(false);
  const [turma, setTurma] = useState(-1);
  const [revenue, setRevenue] = useState(-1);
  const [fields, setFields] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [appStep, setAppStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const setField = (k: 'name' | 'phone' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  // Reveal the application wizard (clicked from any "quero minha vaga" CTA).
  // On mobile, anchor to the form card itself so the inputs land right under the
  // sticky header and the active step fits the viewport (intro stays above).
  const openForm = () => {
    setShowForm(true);
    setTimeout(() => {
      const target = isMobile ? formCardRef.current : document.getElementById('aplicacao');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  async function submitApplication() {
    if (submitting) return;
    setSubmitting(true); setFormErr(null);
    try {
      const attr: any = captureAttribution();
      await submitLead({
        name: fields.name.trim(), phone: fields.phone.trim(), email: fields.email.trim() || undefined,
        turma: turma >= 0 ? V3_TURMA_IDS[turma] : undefined,
        revenue_band: revenue >= 0 ? V3_REVENUE_KEYS[revenue] : undefined,
        ...attr,
        utm_source: attr.utm_source || 'v3',
        utm_medium: attr.utm_medium || 'landing',
      });
      setSent(true);
    } catch (err: any) { setFormErr(err?.message || 'Falha ao enviar. Tente novamente.'); }
    finally { setSubmitting(false); }
  }

  // Keep the active wizard step anchored just below the sticky header so each
  // step opens in the same place and stays fully inside the viewport on mobile.
  const scrollFormIntoView = () => {
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  function nextStep() {
    if (appStep === 0 && (!fields.name.trim() || !fields.phone.trim() || !fields.email.trim())) { setFormErr('Preencha nome, WhatsApp e e-mail.'); return; }
    if (appStep === 1 && turma < 0) { setFormErr('Escolha a sua turma.'); return; }
    if (appStep === 2 && revenue < 0) { setFormErr('Escolha o seu faturamento.'); return; }
    setFormErr(null);
    if (appStep < 2) { setAppStep((s) => s + 1); scrollFormIntoView(); }
    else submitApplication();
  }
  function prevStep() { setFormErr(null); setAppStep((s) => Math.max(0, s - 1)); scrollFormIntoView(); }
  const appLabelStyle: React.CSSProperties = { display: 'block', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8E8268', marginBottom: 8 };
  const appStepTitles = ['Seus dados', 'Sua turma', 'Faturamento'];
  const [vsl, setVsl] = useState<VslState>('idle');
  const [vslElapsed, setVslElapsed] = useState(0);
  const [vslClosed, setVslClosed] = useState(false);
  const [vslPaused, setVslPaused] = useState(false);
  const [now, setNow] = useState(Date.now());

  const trackRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLFormElement>(null);
  const rafRef = useRef<number | null>(null);
  const vtRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const t = lang === 'pt' ? PT : EN;

  // Lock/unlock scroll
  const applyLock = useCallback((lock: boolean) => {
    try {
      document.documentElement.style.overflow = lock ? 'hidden' : '';
      document.body.style.overflow = lock ? 'hidden' : '';
    } catch {}
  }, []);

  // Urgency countdown
  useEffect(() => {
    utRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (utRef.current) clearInterval(utRef.current); };
  }, []);

  // Lock on mount
  useEffect(() => {
    applyLock(true);
    captureAttribution();
    trackVisit('v3');
    return () => { applyLock(false); };
  }, [applyLock]);

  // Expose the sticky header height so the day-section pin can lock right below it.
  useEffect(() => {
    const setH = () => {
      const h = headerRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty('--v3-header-h', `${h}px`);
    };
    setH();
    window.addEventListener('resize', setH);
    const ro = typeof ResizeObserver !== 'undefined' && headerRef.current ? new ResizeObserver(setH) : null;
    if (ro && headerRef.current) ro.observe(headerRef.current);
    return () => { window.removeEventListener('resize', setH); ro?.disconnect(); };
  }, []);

  // Track the mobile breakpoint (matches the 880px CSS breakpoint) so we can
  // render a stacked, non-pinned 7-day section instead of the scroll-locked one.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 880px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    // addEventListener is the modern API; addListener is the Safari<14 fallback.
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  // Mobile sticky bottom CTA — reveal once the user scrolls past the hero.
  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > (window.innerHeight || 800) * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-driven day stepper (desktop only — mobile renders all days stacked).
  useEffect(() => {
    if (isMobile) return;
    const compute = () => {
      const track = trackRef.current;
      if (!track) return;
      const vh = window.innerHeight || 800;
      const rect = track.getBoundingClientRect();
      const total = rect.height - vh;
      if (total <= 0) return;
      let p = (-rect.top) / total;
      p = Math.max(0, Math.min(0.999999, p));
      const day = Math.min(7, Math.max(1, Math.floor(p * 7) + 1));
      setActiveDay(day);
    };

    const loop = () => { compute(); rafRef.current = requestAnimationFrame(loop); };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
        } else {
          if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        }
      });
    }, { threshold: 0 });

    if (trackRef.current) io.observe(trackRef.current);
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [isMobile]);

  // VSL tick
  const startTick = useCallback(() => {
    if (vtRef.current) return;
    vtRef.current = setInterval(() => {
      setVslElapsed((prev) => {
        if (vslPaused) return prev;
        const next = prev + 0.25;
        if (next >= TOTAL_SECONDS) {
          if (vtRef.current) { clearInterval(vtRef.current); vtRef.current = null; }
          return TOTAL_SECONDS;
        }
        return next;
      });
    }, 250);
  }, [vslPaused]);

  // Unlock when elapsed reaches LOCK_SECONDS
  useEffect(() => {
    if (vsl === 'playing' && vslElapsed >= LOCK_SECONDS) {
      setVsl('unlocked');
      applyLock(false);
    }
  }, [vsl, vslElapsed, applyLock]);

  // Reliably (re)start playback whenever the VSL should be playing — covers the
  // race where the first play() call fires before the <video> is ready.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const shouldPlay = (vsl === 'playing' || (vsl === 'unlocked' && !vslClosed)) && !vslPaused;
    if (shouldPlay) v.play().catch(() => {});
  }, [vsl, vslClosed, vslPaused]);

  const startVsl = () => {
    if (vsl !== 'idle') return;
    applyLock(true);
    setVsl('playing');
    startTick();
    videoRef.current?.play().catch(() => {});
  };

  const closeDock = () => setVslClosed(true);
  const reopenDock = () => {
    setVslClosed(false);
    if (vslElapsed < TOTAL_SECONDS) startTick();
  };
  const togglePause = () => {
    setVslPaused((p) => {
      const next = !p;
      if (!next) {
        if (videoRef.current) videoRef.current.play().catch(() => {});
        startTick();
      } else {
        videoRef.current?.pause();
      }
      return next;
    });
  };

  const scrollToDay = (i: number) => {
    const track = trackRef.current;
    if (track) {
      const vh = window.innerHeight || 800;
      const rect = track.getBoundingClientRect();
      const total = rect.height - vh;
      if (total > 0) {
        const p = (i + 0.5) / 7;
        const targetTop = -(p * total);
        const delta = rect.top - targetTop;
        window.scrollBy({ top: delta, behavior: 'smooth' });
      }
    }
    setActiveDay(i + 1);
  };

  const vslActive = vsl === 'playing' || (vsl === 'unlocked' && !vslClosed);
  const vslIdle = vsl === 'idle';
  const vslPlaying = vsl === 'playing';
  const vslDocked = vsl === 'unlocked' && !vslClosed;
  const vslReopen = vsl === 'unlocked' && vslClosed;
  const gateVisible = vsl === 'playing';
  const prog = Math.min(1, vslElapsed / TOTAL_SECONDS);
  const remain = TURMA_DEADLINE - now;

  const langBtn = (active: boolean): React.CSSProperties => active
    ? { background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', border: 'none', padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.1em' }
    : { background: 'transparent', color: '#A99C80', border: 'none', padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.1em' };

  const currentDay = t.days[activeDay - 1] || t.days[0];

  const tileSel = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer', textAlign: 'center', borderRadius: 6, padding: '16px 12px', transition: 'all .2s', fontFamily: 'var(--font-archivo), sans-serif',
    ...(active
      ? { background: 'linear-gradient(180deg,rgba(234,203,126,.2),rgba(194,154,78,.06))', border: '1px solid #C2A05A', boxShadow: '0 10px 26px -16px rgba(194,160,90,.7)' }
      : { background: 'rgba(255,255,255,.02)', border: '1px solid rgba(194,160,90,.22)' })
  });

  const revTile = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer', textAlign: 'center', borderRadius: 6, padding: '16px 12px', fontFamily: 'var(--font-archivo), sans-serif', fontSize: 13.5, lineHeight: 1.35, transition: 'all .2s',
    ...(active
      ? { background: 'linear-gradient(180deg,rgba(234,203,126,.2),rgba(194,154,78,.06))', border: '1px solid #C2A05A', color: '#F4E6BD', fontWeight: 600, boxShadow: '0 10px 26px -16px rgba(194,160,90,.7)' }
      : { background: 'rgba(255,255,255,.02)', border: '1px solid rgba(194,160,90,.22)', color: '#CFC3A6' })
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(194,160,90,.28)', borderRadius: 3, padding: '13px 14px', color: '#EFE6D0', fontFamily: 'var(--font-archivo), sans-serif', fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1100px 640px at 80% -8%,rgba(194,160,90,.16),transparent 58%),radial-gradient(820px 480px at 4% 2%,rgba(120,92,42,.13),transparent 55%),linear-gradient(180deg,#0C0A07,#090806 55%,#0B0A07)', color: '#ECE3CF', fontFamily: 'var(--font-archivo), system-ui, sans-serif', position: 'relative', overflowX: 'clip' }}>

      {/* Noise overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .045, zIndex: 1, mixBlendMode: 'overlay', backgroundImage: NOISE_BG }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ===== VSL GATE / DOCKED PLAYER ===== */}
        {vslActive && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 95, pointerEvents: 'none' }}>
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,5,3,.95)', transition: 'opacity .55s ease', opacity: gateVisible ? 1 : 0, pointerEvents: gateVisible ? 'auto' : 'none', backdropFilter: gateVisible ? 'blur(5px)' : 'none' }} />
            {/* Panel */}
            <div style={{ position: 'absolute', pointerEvents: 'auto', transition: 'all .6s cubic-bezier(.4,0,.2,1)', border: '1px solid rgba(194,160,90,.45)', borderRadius: 10, overflow: 'hidden', background: '#0B0906', boxShadow: '0 40px 90px -30px rgba(0,0,0,.9)', ...(gateVisible ? { right: '50%', bottom: '50%', transform: 'translate(50%,50%)', width: 'min(880px,88vw)' } : { right: 22, bottom: 22, transform: 'none', width: 'min(340px,84vw)' }) }}>
              {/* Video area */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
                <div className="ci-sheen-bg" style={{ position: 'absolute', inset: 0 }} />
                <video ref={videoRef} src="/vsl.webm" preload="auto" controls={vslPlaying || vslDocked} onClick={() => { const v = videoRef.current; if (v && v.paused) v.play().catch(() => {}); }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: vslPlaying || vslDocked ? 1 : 0 }} playsInline loop />
                {vslIdle && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 16 }}>
                    <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(10px,1.3vw,13px)', letterSpacing: '.26em', color: '#C2A05A' }}>{t.vslLabel}</div>
                    <button type="button" onClick={startVsl} style={{ margin: '4px 0', width: 80, height: 80, borderRadius: '50%', border: 'none', background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 40px -14px rgba(194,160,90,.85)' }}>
                      <span style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '15px 0 15px 25px', borderColor: 'transparent transparent transparent #1B1408', marginLeft: 5 }} />
                    </button>
                  </div>
                )}
                {vslDocked && (
                  <>
                    <button type="button" onClick={togglePause} style={{ position: 'absolute', left: 10, bottom: 13, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(194,160,90,.5)', background: 'rgba(10,8,5,.75)', color: '#EBD9AC', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{vslPaused ? '▶' : '❚❚'}</button>
                    <button type="button" onClick={closeDock} style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(194,160,90,.5)', background: 'rgba(10,8,5,.75)', color: '#EBD9AC', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </>
                )}
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: 'rgba(194,160,90,.18)' }}>
                <div style={{ height: '100%', width: `${prog * 100}%`, background: 'linear-gradient(90deg,#C29A4E,#EACB7E)', transition: 'width .25s linear' }} />
              </div>
              {/* Idle panel */}
              {vslIdle && (
                <div style={{ padding: '18px 20px', textAlign: 'center', background: 'rgba(18,14,9,.94)' }}>
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(19px,2.4vw,26px)', color: '#F2EAD6', marginBottom: 14 }}>{t.gateTitle}</div>
                  <button type="button" onClick={startVsl} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, letterSpacing: '.04em', fontSize: 14, padding: '14px 28px', border: 'none', borderRadius: 2, cursor: 'pointer', boxShadow: '0 16px 40px -16px rgba(194,160,90,.7)' }}>▶ {t.heroWatch}</button>
                  <div style={{ fontSize: 11, color: '#8E8268', marginTop: 12, letterSpacing: '.06em' }}>{t.gateHint}</div>
                </div>
              )}
              {/* Playing — lock countdown */}
              {vslPlaying && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, background: 'rgba(18,14,9,.94)' }}>
                  <span style={{ fontSize: 15 }}>🔒</span>
                  <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.1em', color: '#E7D7AC' }}>{t.vslLockMsg} <span style={{ color: '#EACB7E' }}>{fmtTime(Math.max(0, LOCK_SECONDS - vslElapsed))}</span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reopen dock button — hidden while the application form is open so it never overlaps the inputs. */}
        {vslReopen && !showForm && !sent && (
          <button type="button" onClick={reopenDock} style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 95, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, fontSize: 13, padding: '11px 17px', border: 'none', borderRadius: 999, cursor: 'pointer', boxShadow: '0 14px 30px -12px rgba(194,160,90,.7)' }}>▶ {t.vslReopenLabel}</button>
        )}

        {/* ===== MOBILE STICKY BOTTOM CTA ===== */}
        {isMobile && showStickyCta && !vslActive && !showForm && !sent && (
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, padding: '12px 16px calc(12px + env(safe-area-inset-bottom,0px))', background: 'linear-gradient(180deg,rgba(8,7,5,.4),rgba(8,7,5,.96) 40%)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(194,160,90,.22)' }}>
            <button type="button" onClick={openForm} style={{ display: 'block', width: '100%', background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, letterSpacing: '.04em', fontSize: 15, textTransform: 'uppercase', padding: '16px 20px', border: 'none', borderRadius: 4, cursor: 'pointer', boxShadow: '0 14px 34px -14px rgba(194,160,90,.8)' }}>{t.navCta}</button>
          </div>
        )}

        {/* ===== STICKY HEADER ===== */}
        <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 40 }}>
          {/* Urgency bar */}
          <div style={{ background: 'linear-gradient(90deg,#3c0f0b,#230706 50%,#3c0f0b)', borderBottom: '1px solid rgba(194,160,90,.34)', boxShadow: '0 1px 22px -6px rgba(190,42,30,.55)' }}>
            {isMobile ? (
              /* Compact single-line mobile bar — no wrap, no redundant CTA (the sticky bottom CTA covers conversion). */
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-cinzel), serif', fontSize: 10.5, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
                <span className="ci-blink-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#F0473A', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#C9A98A', textTransform: 'uppercase' }}>{t.urgencyShort || t.urgencyMid}</span>
                <span className="ci-glow-countdown" style={{ color: '#FBEBBE', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmtCountdown(remain)}</span>
              </div>
            ) : (
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '11px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11, fontFamily: 'var(--font-cinzel), serif', fontSize: 11.5, letterSpacing: '.12em' }}>
                  <span className="ci-blink-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: '#F0473A', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: '#C9A98A' }}>{t.urgencyPrefix}</span>
                  <span style={{ color: '#F4E6BD', fontWeight: 600 }}>{t.urgencyDate}</span>
                  <span style={{ color: '#7A5B50' }}>·</span>
                  <span style={{ color: '#C9A98A' }}>{t.urgencyMid}</span>
                  <span className="ci-glow-countdown" style={{ color: '#FBEBBE', fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', minWidth: 140, display: 'inline-block' }}>{fmtCountdown(remain)}</span>
                </span>
                <button type="button" onClick={openForm} style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#1B1408', background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', padding: '8px 16px', borderRadius: 2, border: 'none', cursor: 'pointer', boxShadow: '0 6px 18px -8px rgba(234,203,126,.8)' }}>{t.navCta}</button>
              </div>
            )}
          </div>
          {/* Nav */}
          <nav style={{ backdropFilter: 'blur(10px)', background: 'rgba(10,9,6,.72)', borderBottom: '1px solid rgba(194,160,90,.16)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
                  <defs><linearGradient id="goldNav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4E6BD"/><stop offset=".55" stopColor="#D7AE58"/><stop offset="1" stopColor="#A87F38"/></linearGradient></defs>
                  <circle cx="32" cy="32" r="29" fill="none" stroke="url(#goldNav)" strokeWidth="1.4"/>
                  <circle cx="32" cy="32" r="23" fill="none" stroke="url(#goldNav)" strokeWidth=".8" opacity=".7"/>
                  <text x="32" y="41" textAnchor="middle" fontFamily="var(--font-cormorant),serif" fontWeight="600" fontSize="26" fill="url(#goldNav)">CI</text>
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                  <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 14, letterSpacing: '.22em', color: '#EBD9AC' }}>CÓDIGO</span>
                  <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 14, letterSpacing: '.22em', color: '#EBD9AC' }}>INTERNACIONAL</span>
                </span>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(194,160,90,.28)', borderRadius: 999, overflow: 'hidden', fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.1em' }}>
                  <button onClick={() => setLang('pt')} style={langBtn(lang === 'pt')}>PT</button>
                  <button onClick={() => setLang('en')} style={langBtn(lang === 'en')}>EN</button>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* ===== HERO ===== */}
        <header id="top" style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '48px 28px', minHeight: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Crest watermark */}
          <svg viewBox="0 0 220 220" width="520" style={{ position: 'absolute', top: -40, right: -90, opacity: .07, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <linearGradient id="goldHero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6E9C2"/><stop offset="1" stopColor="#A87F38"/></linearGradient>
              <path id="sealHero" d="M110,110 m-83,0 a83,83 0 1,1 166,0 a83,83 0 1,1 -166,0"/>
            </defs>
            <circle cx="110" cy="110" r="91" fill="none" stroke="url(#goldHero)" strokeWidth="2"/>
            <circle cx="110" cy="110" r="61" fill="none" stroke="url(#goldHero)" strokeWidth="1"/>
            <text fontFamily="var(--font-cinzel),serif" fontSize="11" letterSpacing="3.4" fill="url(#goldHero)"><textPath href="#sealHero" startOffset="0">CÓDIGO INTERNACIONAL · ORDO TEKHNÉ · PERMANENTIA · </textPath></text>
            <text x="110" y="126" textAnchor="middle" fontFamily="var(--font-cormorant),serif" fontWeight="600" fontSize="64" fill="url(#goldHero)">CI</text>
          </svg>

          <div style={{ textAlign: 'center', maxWidth: 920, margin: '0 auto 44px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <span style={{ width: 26, height: 1, background: 'linear-gradient(90deg,transparent,#C2A05A)' }} />
              <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.3em', color: '#C2A05A' }}>{t.heroEyebrow}</span>
              <span style={{ width: 26, height: 1, background: 'linear-gradient(90deg,#C2A05A,transparent)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(34px,5.4vw,60px)', lineHeight: 1.06, letterSpacing: '-.01em', color: '#F2EAD6', margin: '0 0 20px' }}>
              {t.heroH1a} <span style={{ fontStyle: 'italic', fontWeight: 600, background: 'linear-gradient(180deg,#F6E9C2,#D7AE58 60%,#A87F38)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.heroH1b}</span>
            </h1>
            <p style={{ maxWidth: 600, margin: '0 auto 10px', fontSize: 18, lineHeight: 1.65, color: '#B6A985' }}>{t.heroSub}</p>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 19, lineHeight: 1.5, color: '#CDBE99', margin: 0 }}>{t.heroItalic}</p>
            <div style={{ marginTop: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button type="button" onClick={startVsl} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 14, padding: '19px 42px', border: 'none', borderRadius: 2, boxShadow: '0 18px 44px -16px rgba(194,160,90,.7)' }}>▶ {t.heroTriggerCta}</button>
              <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.16em', color: '#8E8268', textTransform: 'uppercase' }}>{t.heroLockHint} ↓</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 26px', justifyContent: 'center' }}>
            {t.heroTrust.map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, letterSpacing: '.08em', color: '#8E8268', textTransform: 'uppercase' }}>
                <span className="ci-pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#C2A05A', display: 'inline-block' }} />{item.label}
              </span>
            ))}
          </div>
        </header>

        {/* ===== MECHANISM ===== */}
        <section style={{ borderTop: '1px solid rgba(194,160,90,.14)', borderBottom: '1px solid rgba(194,160,90,.14)', background: 'radial-gradient(900px 460px at 50% 0%,rgba(194,160,90,.08),transparent 60%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', padding: '104px 28px', textAlign: 'center', position: 'relative' }}>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.28, color: '#E9DEC2', margin: '0 0 30px' }}>{t.mech1}</p>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 'clamp(28px,3.8vw,46px)', lineHeight: 1.22, margin: '0 0 30px', color: '#F2EAD6' }}>
              {t.mech2a} <span style={{ fontStyle: 'italic', background: 'linear-gradient(180deg,#F6E9C2,#D7AE58 60%,#A87F38)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.mech2b}</span>
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <span style={{ flex: 1, height: 1, width: 40, background: 'rgba(194,160,90,.4)' }} />
              <span style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 'clamp(20px,2.6vw,28px)', color: '#CDBE99' }}>{t.mech3}</span>
              <span style={{ flex: 1, height: 1, width: 40, background: 'rgba(194,160,90,.4)' }} />
            </div>
          </div>
        </section>

        {/* ===== THE 7 DAYS — mobile: stacked vertical timeline ===== */}
        {isMobile ? (
          <section id="dias" style={{ position: 'relative', padding: '60px 20px' }}>
            <div style={{ maxWidth: 560, margin: '0 auto 30px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(30px,8vw,40px)', lineHeight: 1.1, color: '#F2EAD6', margin: '0 0 14px' }}>{t.daysTitle}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#A99C80', margin: 0 }}>{t.daysIntro}</p>
            </div>
            <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', display: 'grid', gap: 16 }}>
              {t.days.map((day, i) => (
                <div key={i} style={{ border: '1px solid rgba(194,160,90,.26)', borderRadius: 8, background: 'linear-gradient(180deg,rgba(20,16,10,.7),rgba(12,10,7,.55))', padding: '22px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                    <span style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 44, lineHeight: 1, padding: '0.04em 0.02em', background: 'linear-gradient(180deg,#F6E9C2,#D7AE58 60%,#A87F38)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{day.n}</span>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 10, letterSpacing: '.16em', color: '#C2A05A' }}>{day.label}</span>
                      <span style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 16, color: '#CDBE99' }}>{day.day}</span>
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: '#F2EAD6', margin: '0 0 12px' }}>{day.title}</h3>
                  {day.tasks.map((task, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid rgba(194,160,90,.12)' }}>
                      <span style={{ color: '#D7AE58', fontSize: 12, marginTop: 3 }}>◆</span>
                      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: '#CFC3A6' }}>{task.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : (
        <section id="dias" style={{ position: 'relative' }}>
          <div ref={trackRef} className="ci-day-track" style={{ position: 'relative' }}>
            <div className="ci-day-pin" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 28px' }}>
                <div style={{ maxWidth: 780, margin: '0 auto 26px', textAlign: 'center' }}>
                  <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(32px,4.2vw,52px)', lineHeight: 1.08, color: '#F2EAD6', margin: '0 0 16px' }}>{t.daysTitle}</h2>
                  <p style={{ fontSize: 15, lineHeight: 1.7, color: '#A99C80', margin: 0 }}>{t.daysIntro}</p>
                </div>
                {/* Day tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                  {t.days.map((day, i) => (
                    <button key={i} onClick={() => scrollToDay(i)} style={{ minWidth: 74, fontFamily: 'var(--font-cinzel), serif', padding: '10px 14px', borderRadius: 2, cursor: 'pointer', transition: 'all .25s', ...(activeDay === i + 1 ? { background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', border: '1px solid transparent' } : { background: 'transparent', color: '#A99C80', border: '1px solid rgba(194,160,90,.3)' }) }}>
                      <span style={{ display: 'block', fontSize: 9, letterSpacing: '.12em', opacity: .8 }}>{day.label}</span>
                      <span style={{ display: 'block', fontSize: 12, letterSpacing: '.06em', marginTop: 2 }}>{day.day}</span>
                    </button>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{ maxWidth: 520, margin: '0 auto 12px', height: 2, background: 'rgba(194,160,90,.18)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((activeDay / 7) * 100)}%`, background: 'linear-gradient(90deg,#C29A4E,#EACB7E)', transition: 'width .4s ease' }} />
                </div>
                {/* Day detail */}
                <div className="ci-day" style={{ maxWidth: 900, margin: '0 auto', border: '1px solid rgba(194,160,90,.3)', borderRadius: 6, background: 'linear-gradient(180deg,rgba(20,16,10,.7),rgba(12,10,7,.6))', padding: 42, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: 150 }}>
                    <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.16em', color: '#C2A05A' }}>{currentDay.label}</div>
                    <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 104, lineHeight: 1.12, padding: '0.06em 0.04em', background: 'linear-gradient(180deg,#F6E9C2,#D7AE58 60%,#A87F38)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{currentDay.n}</div>
                    <div style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 20, color: '#CDBE99', marginTop: 4 }}>{currentDay.day}</div>
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 32, color: '#F2EAD6', margin: '0 0 18px' }}>{currentDay.title}</h3>
                    {currentDay.tasks.map((task, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid rgba(194,160,90,.12)' }}>
                        <span style={{ color: '#D7AE58', fontSize: 13, marginTop: 3 }}>◆</span>
                        <span style={{ fontSize: 16, lineHeight: 1.5, color: '#CFC3A6' }}>{task.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ===== WHAT'S INCLUDED ===== */}
        <section style={{ borderTop: '1px solid rgba(194,160,90,.14)', background: 'radial-gradient(800px 440px at 50% 120%,rgba(194,160,90,.07),transparent 60%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--v3-pad)' }}>
            <div style={{ maxWidth: 760, margin: '0 auto 50px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: 18 }}>{t.inclLabel}</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(32px,4.2vw,52px)', lineHeight: 1.08, color: '#F2EAD6', margin: 0 }}>{t.inclTitle}</h2>
            </div>
            <div className="ci-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {t.included.map((item, i) => (
                <div key={i} style={{ border: '1px solid rgba(194,160,90,.2)', borderRadius: 4, padding: 30, background: 'rgba(255,255,255,.018)', transition: 'border-color .3s,transform .3s' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(194,160,90,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D7AE58', fontSize: 18, marginBottom: 20 }}>{item.mark}</div>
                  <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 22, color: '#F0E7D2', margin: '0 0 10px' }}>{item.name}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.62, color: '#A99C80', margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== DINNER / NETWORKING ===== */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--v3-pad)' }}>
          <div style={{ border: '1px solid rgba(194,160,90,.3)', borderRadius: 8, background: 'linear-gradient(180deg,rgba(194,160,90,.07),rgba(194,160,90,.01))', padding: 'clamp(28px,5vw,64px)', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: 22 }}>{t.tableLabel}</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,50px)', lineHeight: 1.12, color: '#F2EAD6', margin: '0 auto 28px', maxWidth: 780 }}>{t.tableTitle}</h2>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 'clamp(19px,2.4vw,24px)', lineHeight: 1.5, color: '#E7D7AC', margin: '0 auto 26px', maxWidth: 620 }}>{t.tableQuote}</p>
            <p style={{ fontSize: 16.5, lineHeight: 1.75, color: '#A99C80', margin: '0 auto', maxWidth: 680 }}>{t.tableBody}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 34 }}>
              <span style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 50, lineHeight: 1, background: 'linear-gradient(180deg,#F6E9C2,#D7AE58)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.tableStatV}</span>
              <span style={{ textAlign: 'left', fontSize: 14, lineHeight: 1.4, color: '#A99C80', maxWidth: 180 }}>{t.tableStatL}</span>
            </div>
          </div>
        </section>

        {/* ===== MENTOR ===== */}
        <section id="mentor" style={{ borderTop: '1px solid rgba(194,160,90,.14)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--v3-pad)' }}>
            <div className="ci-2col" style={{ display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 54, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', aspectRatio: '4/5', border: '1px solid rgba(194,160,90,.35)', borderRadius: 6, overflow: 'hidden', boxShadow: '0 30px 70px -45px rgba(0,0,0,.9)' }}>
                  <img src="/pedro.webp" alt="Pedro Silvestrini" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
                {/* Badge */}
                <div className="ci-float-badge" style={{ position: 'absolute', top: -24, right: -24, width: 128, height: 128, zIndex: 3, filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.65))' }}>
                  <svg viewBox="0 0 120 120" width="128" height="128">
                    <defs>
                      <linearGradient id="goldBadge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6E9C2"/><stop offset=".55" stopColor="#D7AE58"/><stop offset="1" stopColor="#A87F38"/></linearGradient>
                      <path id="badgeArcTop" d="M60,60 m-46,0 a46,46 0 1,1 92,0"/>
                      <path id="badgeArcBot" d="M60,60 m-43,0 a43,43 0 0,0 86,0"/>
                    </defs>
                    <circle cx="60" cy="60" r="59" fill="#0B0906"/>
                    <circle cx="60" cy="60" r="57.5" fill="none" stroke="url(#goldBadge)" strokeWidth="1.4"/>
                    <circle cx="60" cy="60" r="38" fill="none" stroke="url(#goldBadge)" strokeWidth=".7" opacity=".55"/>
                    <text fontFamily="var(--font-cinzel),serif" fontSize="9" letterSpacing="4.5" fill="url(#goldBadge)"><textPath href="#badgeArcTop" startOffset="50%" textAnchor="middle">O MENTOR</textPath></text>
                    <text fontFamily="var(--font-cinzel),serif" fontSize="8.4" letterSpacing="0.6" fill="url(#goldBadge)"><textPath href="#badgeArcBot" startOffset="50%" textAnchor="middle">PEDRO SILVESTRINI</textPath></text>
                    <text x="60" y="75" textAnchor="middle" fontFamily="var(--font-cormorant),serif" fontWeight="600" fontSize="46" fill="url(#goldBadge)">CI</text>
                    <circle cx="14" cy="60" r="1.5" fill="url(#goldBadge)"/>
                    <circle cx="106" cy="60" r="1.5" fill="url(#goldBadge)"/>
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: 16 }}>{t.mentorLabel}</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 'clamp(34px,4.4vw,54px)', lineHeight: 1.04, color: '#F2EAD6', margin: '0 0 6px' }}>{t.mentorName}</h2>
                <div style={{ fontSize: 14, letterSpacing: '.04em', color: '#C2A05A', marginBottom: 24 }}>{t.mentorRole}</div>
                <p style={{ fontSize: 16.5, lineHeight: 1.75, color: '#A99C80', margin: '0 0 24px' }}>{t.mentorBio}</p>
                <p style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 24, lineHeight: 1.4, color: '#E7D7AC', margin: '0 0 28px', borderLeft: '2px solid rgba(194,160,90,.45)', paddingLeft: 18 }}>{t.mentorQuote}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {t.mentorCreds.map((c, i) => (
                    <span key={i} style={{ fontSize: 12, letterSpacing: '.06em', color: '#CBAE6A', border: '1px solid rgba(194,160,90,.3)', borderRadius: 999, padding: '8px 16px' }}>{c.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="investimento" style={{ borderTop: '1px solid rgba(194,160,90,.14)', background: 'radial-gradient(950px 520px at 50% 0%,rgba(194,160,90,.09),transparent 60%)' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: 'var(--v3-pad)' }}>
            <div style={{ textAlign: 'center', marginBottom: 46 }}>
              <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: 24 }}>{t.priceLabel}</div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(30px,4.4vw,52px)', lineHeight: 1.1, color: '#897F66', margin: '0 0 4px', textDecoration: 'line-through', textDecorationColor: 'rgba(194,160,90,.45)' }}>{t.priceCrossed}</div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 'clamp(40px,6.6vw,80px)', lineHeight: 1.02, margin: 0, background: 'linear-gradient(180deg,#F6E9C2,#D7AE58 60%,#A87F38)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.priceMain}</div>
            </div>
            <div style={{ border: '1px solid rgba(194,160,90,.3)', borderRadius: 8, background: 'linear-gradient(180deg,rgba(20,16,10,.65),rgba(12,10,7,.55))', padding: 'clamp(28px,4vw,44px)' }}>
              <p style={{ fontSize: 17, lineHeight: 1.75, color: '#C4B894', margin: '0 0 22px', textAlign: 'center', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>{t.priceMath}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 30 }}>
                <div style={{ border: '1px solid rgba(194,160,90,.4)', borderRadius: 3, padding: '14px 22px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 10, letterSpacing: '.14em', color: '#C2A05A' }}>{t.priceInstLabel}</div>
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 26, color: '#F2EAD6', marginTop: 2 }}>{t.priceInst}</div>
                </div>
                <div style={{ border: '1px solid rgba(194,160,90,.4)', borderRadius: 3, padding: '14px 22px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 10, letterSpacing: '.14em', color: '#C2A05A' }}>{t.priceInclLabel}</div>
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 26, color: '#F2EAD6', marginTop: 2 }}>{t.priceInclVal}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 19, letterSpacing: '.01em', color: '#B89F6A', textAlign: 'center', marginBottom: 22 }}>{t.turmasLabel}</div>
              <div className="ci-turmas" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 14 }}>
                {t.turmas.map((tr, i) => (
                  <div key={i} style={{ border: '1px solid rgba(194,160,90,.24)', borderRadius: 4, padding: '18px 10px', textAlign: 'center', background: 'rgba(255,255,255,.015)' }}>
                    <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.08em', color: '#E7D29A' }}>{tr.n}</div>
                    <div style={{ fontSize: 13, color: '#CFC3A6', marginTop: 8, lineHeight: 1.4 }}>{tr.range}</div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={openForm} style={{ display: 'block', width: '100%', maxWidth: 460, margin: '28px auto 0', textAlign: 'center', background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, letterSpacing: '.04em', fontSize: 15, textTransform: 'uppercase', padding: '18px 28px', borderRadius: 2, border: 'none', cursor: 'pointer', boxShadow: '0 16px 40px -16px rgba(194,160,90,.7)' }}>{t.priceCta}</button>
            </div>
          </div>
        </section>

        {/* ===== APPLICATION — wizard, revealed by a "quero minha vaga" CTA ===== */}
        <section id="aplicacao" style={{ background: 'radial-gradient(1000px 560px at 50% 120%,rgba(194,160,90,.1),transparent 60%)', borderTop: (showForm || sent) ? '1px solid rgba(194,160,90,.14)' : 'none', scrollMarginTop: 'calc(var(--v3-header-h, 90px) + 12px)' }}>
          {(showForm || sent) && (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--v3-pad)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', border: '1px solid rgba(194,160,90,.4)', borderRadius: 6, padding: '54px 30px', background: 'linear-gradient(180deg,rgba(194,160,90,.08),rgba(194,160,90,.02))' }}>
                <div style={{ fontSize: 38, color: '#D7AE58', marginBottom: 14 }}>✦</div>
                <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 32, color: '#F2EAD6', margin: '0 0 12px' }}>{t.sentTitle}</h3>
                <p style={{ fontSize: 16, color: '#A99C80', margin: 0, lineHeight: 1.6 }}>{t.sentBody}</p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: isMobile ? 18 : 26 }}>
                  <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: isMobile ? 11 : 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: isMobile ? 12 : 16 }}>{t.ctaLabel}</div>
                  <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(24px,6.4vw,48px)', lineHeight: 1.08, color: '#F2EAD6', margin: isMobile ? '0 0 12px' : '0 0 18px' }}>{t.ctaTitle}</h2>
                  <p style={{ fontSize: isMobile ? 14 : 16, lineHeight: 1.6, color: '#A99C80', margin: isMobile ? '0 auto 10px' : '0 auto 14px', maxWidth: 580 }}>{t.appIntro}</p>
                  <p style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: isMobile ? 15.5 : 18, lineHeight: 1.4, color: '#C9B583', margin: 0 }}>{t.appIntro2}</p>
                </div>

                <div style={{ border: '1px solid rgba(194,160,90,.3)', borderLeft: '3px solid #C2A05A', borderRadius: 4, background: 'rgba(194,160,90,.05)', padding: isMobile ? '13px 16px' : '18px 22px', margin: isMobile ? '0 auto 20px' : '0 auto 30px', maxWidth: 620 }}>
                  <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 11, letterSpacing: '.16em', color: '#C2A05A', marginRight: 8 }}>PS</span>
                  <span style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: isMobile ? 15.5 : 18, lineHeight: 1.45, color: '#E0D4B6' }}>{t.psLine}</span>
                </div>

                <form ref={formCardRef} onSubmit={(e) => { e.preventDefault(); nextStep(); }} style={{ border: '1px solid rgba(194,160,90,.28)', borderRadius: 6, padding: 'clamp(18px,5vw,32px)', background: 'rgba(20,16,10,.55)', scrollMarginTop: 'calc(var(--v3-header-h, 90px) + 12px)' }}>
                  {/* progress */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.14em', color: '#E7D29A' }}>{appStepTitles[appStep]}</span>
                      <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10.5, letterSpacing: '.08em', color: '#8E8268' }}>ETAPA {appStep + 1} DE 3</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {[0, 1, 2].map((i) => <div key={i} style={{ height: 3, borderRadius: 2, background: i <= appStep ? 'linear-gradient(90deg,#C29A4E,#EACB7E)' : 'rgba(194,160,90,.18)', transition: 'background .3s' }} />)}
                    </div>
                  </div>

                  {appStep === 0 && (
                    <div style={{ display: 'grid', gap: 16 }}>
                      <label style={{ display: 'block' }}><span style={appLabelStyle}>{t.formName}</span><input value={fields.name} onChange={setField('name')} autoComplete="name" autoFocus style={inputStyle} /></label>
                      <label style={{ display: 'block' }}><span style={appLabelStyle}>{t.formWhats}</span><input value={fields.phone} onChange={setField('phone')} inputMode="tel" autoComplete="tel" style={inputStyle} /></label>
                      <label style={{ display: 'block' }}><span style={appLabelStyle}>{t.formEmail}</span><input type="email" value={fields.email} onChange={setField('email')} autoComplete="email" style={inputStyle} /></label>
                    </div>
                  )}
                  {appStep === 1 && (
                    <div>
                      <span style={appLabelStyle}>{t.formTurma}</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))', gap: 10, marginTop: 4 }}>
                        {t.turmas.map((tr, idx) => { const a = turma === idx; return (
                          <button key={idx} type="button" onClick={() => setTurma(idx)} style={tileSel(a)}>
                            <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.08em', color: a ? '#F4E6BD' : '#E7D29A' }}>{tr.n}</div>
                            <div style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.3, color: a ? '#EAD9AC' : '#A99C80' }}>{tr.range}</div>
                          </button>
                        ); })}
                      </div>
                    </div>
                  )}
                  {appStep === 2 && (
                    <div>
                      <span style={appLabelStyle}>{t.formRevenue}</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 4 }}>
                        {t.revenueOptions.map((o, idx) => <button key={idx} type="button" onClick={() => setRevenue(idx)} style={revTile(revenue === idx)}>{o.label}</button>)}
                      </div>
                    </div>
                  )}

                  {formErr && <div style={{ textAlign: 'center', color: '#F0473A', fontSize: 13, marginTop: 16 }}>{formErr}</div>}

                  <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
                    {appStep > 0 && (
                      <button type="button" onClick={prevStep} style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: '#A99C80', background: 'transparent', border: '1px solid rgba(194,160,90,.3)', borderRadius: 2, padding: '14px 20px', cursor: 'pointer' }}>← Voltar</button>
                    )}
                    <button type="submit" disabled={submitting} style={{ flex: 1, background: 'linear-gradient(180deg,#EACB7E,#C29A4E)', color: '#1B1408', fontWeight: 600, letterSpacing: '.04em', fontSize: 15, padding: '15px 28px', border: 'none', borderRadius: 2, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1, boxShadow: '0 16px 40px -16px rgba(194,160,90,.7)' }}>
                      {submitting ? 'Enviando…' : appStep === 2 ? t.formSubmit : 'Continuar →'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
          )}
        </section>

        {/* ===== FAQ (after the form) ===== */}
        <section id="faq" style={{ borderTop: '1px solid rgba(194,160,90,.14)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: 'var(--v3-pad)' }}>
            <div style={{ textAlign: 'center', marginBottom: 46 }}>
              <div style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 12, letterSpacing: '.3em', color: '#C2A05A', marginBottom: 18 }}>{t.faqLabel}</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 500, fontSize: 'clamp(32px,4.2vw,52px)', lineHeight: 1.08, color: '#F2EAD6', margin: 0 }}>{t.faqTitle}</h2>
            </div>
            <div>
              {t.faqs.map((item, i) => (
                <div key={i} style={{ borderTop: '1px solid rgba(194,160,90,.16)' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, padding: '22px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant), serif', fontWeight: 600, fontSize: 21, color: '#EFE6D0' }}>{item.q}</span>
                    <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 26, color: '#C2A05A', transition: 'transform .3s', flexShrink: 0, transform: `rotate(${openFaq === i ? 45 : 0}deg)`, display: 'inline-block' }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 4px 24px', fontSize: 15.5, lineHeight: 1.72, color: '#A99C80', maxWidth: 700 }}>{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="ci-footer" style={{ borderTop: '1px solid rgba(194,160,90,.16)', background: '#080705' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px 60px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 30, alignItems: 'flex-start', borderBottom: '1px solid rgba(194,160,90,.12)', paddingBottom: 40, marginBottom: 28 }}>
              <div style={{ maxWidth: 360 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
                    <circle cx="32" cy="32" r="29" fill="none" stroke="url(#goldNav)" strokeWidth="1.4"/>
                    <text x="32" y="41" textAnchor="middle" fontFamily="var(--font-cormorant),serif" fontWeight="600" fontSize="26" fill="url(#goldNav)">CI</text>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 13, letterSpacing: '.2em', color: '#EBD9AC' }}>CÓDIGO INTERNACIONAL</span>
                </div>
                <p style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: '#9D9279', margin: 0 }}>{t.footerTagline}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11.5, lineHeight: 1.6, color: '#5F594A', margin: 0, maxWidth: 680 }}>{t.footerDisclaimer}</p>
              <span style={{ fontSize: 11.5, color: '#5F594A' }}>{t.footerRights}</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
