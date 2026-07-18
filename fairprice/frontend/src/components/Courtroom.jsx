import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Clipboard, Scale, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

function TrialProgress({ prosecutorDone, defenseDone, judgeDone }) {
  const steps = [
    ['Prosecutor', prosecutorDone],
    ['Defense', defenseDone],
    ['Judge', judgeDone],
  ];
  const activeIndex = steps.findIndex(([, complete]) => !complete);
  return <div className="shrink-0 grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
    {steps.map(([label, complete], index) => {
      const active = !complete && index === activeIndex;
      return <div key={label} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className={`grid h-5 w-5 place-items-center rounded-full border ${complete ? 'border-accent-gold bg-accent-gold text-black' : active ? 'border-accent-gold text-accent-gold animate-pulse' : 'border-white/15 text-gray-600'}`}>{complete ? <Check size={12} /> : index + 1}</span>
        <span className={complete || active ? 'text-gray-200' : 'text-gray-600'}>{label}</span>
      </div>;
    })}
  </div>;
}

function EvidenceCard({ caseDetails }) {
  const benchmark = caseDetails?.benchmark;
  if (!caseDetails) return null;
  const [low, high] = benchmark?.typicalPriceRange ?? [0, Math.max(caseDetails.price * 1.35, 1)];
  const padding = Math.max((high - low) * 0.2, 1);
  const minimum = Math.max(0, low - padding);
  const maximum = Math.max(high + padding, caseDetails.price);
  const position = Math.min(100, Math.max(0, ((caseDetails.price - minimum) / (maximum - minimum)) * 100));

  return <section className="mx-4 mt-4 shrink-0 rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Case file</p><p className="mt-1 font-semibold text-white">{caseDetails.product}</p></div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${caseDetails.confidence === 'high' ? 'bg-green-500/10 text-green-400' : caseDetails.confidence === 'medium' ? 'bg-yellow-400/10 text-yellow-300' : 'bg-white/5 text-gray-400'}`}>{caseDetails.confidence} confidence</span>
    </div>
    <div className="flex items-baseline justify-between text-sm"><span className="font-bold text-accent-gold">{formatPrice(caseDetails.price)}</span><span className="text-xs text-gray-500">{caseDetails.sellerRating ? `${caseDetails.sellerRating}/5 seller` : 'Seller rating unknown'}</span></div>
    {benchmark ? <>
      <div className="mt-4 flex justify-between text-[11px] text-gray-500"><span>Typical range</span><span>{formatPrice(low)} – {formatPrice(high)}</span></div>
      <div className="relative mt-2 h-2 rounded-full bg-gray-800"><div className="absolute inset-y-0 rounded-full bg-accent-blue/60" style={{ left: `${((low - minimum) / (maximum - minimum)) * 100}%`, right: `${100 - ((high - minimum) / (maximum - minimum)) * 100}%` }} /><span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gold shadow-[0_0_10px_#c5a880]" style={{ left: `${position}%` }} /></div>
      <p className="mt-3 text-xs text-gray-500">Evidence: {benchmark.category} · {benchmark.notes}</p>
      {caseDetails.liveResearch && <p className="mt-2 text-xs text-accent-blue">Live research · {caseDetails.sources.length} public comparables verified</p>}
    </> : <p className="mt-3 text-xs text-gray-500">No close benchmark match—arguments will rely on broad comparables.</p>}
  </section>;
}

function Bubble({ align = 'left', color = 'red', title, icon: Icon, text, isSpeaking, isVisible }) {
  if (!isVisible) return null;
  const position = align === 'center' ? 'items-center' : align === 'left' ? 'items-start' : 'items-end';
  const colors = { red: 'border-accent-red/30 text-accent-red', blue: 'border-accent-blue/30 text-accent-blue', gold: 'border-accent-gold/30 text-accent-gold' }[color];
  return <div className={`flex w-full flex-col ${position} mb-6 animate-slide-up`}><div className={`mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${colors.split(' ')[1]}`}><Icon size={16} />{title}</div><div className={`glass-panel max-w-[92%] border p-4 md:max-w-[75%] md:p-5 rounded-2xl ${colors.split(' ')[0]} ${align === 'left' ? 'rounded-tl-none' : align === 'right' ? 'rounded-tr-none' : ''}`}><p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-200 md:text-base">{text}{isSpeaking && <span className="ml-1 inline-block h-4 w-2 animate-pulse-slow bg-white/70 align-middle" />}</p></div></div>;
}

function VerdictBanner({ verdict, caseDetails }) {
  const [copied, setCopied] = useState(false);
  if (!verdict) return null;
  const score = verdict.score;
  const color = score < 40 ? 'text-accent-red bg-accent-red' : score < 70 ? 'text-yellow-300 bg-yellow-400' : 'text-green-400 bg-green-500';
  const share = async () => {
    const text = `Fair Price verdict: ${caseDetails?.product ?? 'Listing'} at ${formatPrice(caseDetails?.price ?? 0)} scored ${score}/100 — ${verdict.label ?? 'Price assessment'}. ${verdict.verdict}`;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-black/40 p-6 text-center animate-slide-up md:p-8"><Sparkles className="absolute right-5 top-5 text-accent-gold/40" size={22} /><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Final verdict</p><div className={`mt-4 text-6xl font-black md:text-7xl ${color.split(' ')[0]}`}>{score}</div><p className="mt-1 text-sm font-bold uppercase tracking-widest text-white">{verdict.label ?? 'Price assessment'}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-800"><div className={`h-full rounded-full transition-all duration-1000 ${color.split(' ')[1]}`} style={{ width: `${score}%` }} /></div><p className="mx-auto mt-5 max-w-lg text-base font-medium text-white md:text-lg">“{verdict.verdict}”</p><div className="mt-5 flex flex-wrap justify-center gap-2"><span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-gray-400">{verdict.confidence ?? caseDetails?.confidence ?? 'low'} confidence</span><button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-200 transition hover:bg-white/10">{copied ? <Check size={13} className="text-green-400" /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy result'}</button></div>{verdict.fallback && <p className="mt-3 text-xs text-gray-500">Generated from benchmark rules while the final model verdict was unavailable.</p>}</section>;
}

export default function Courtroom({ status, errorMsg, prosecutor, prosecutorDone, defense, defenseDone, judge, judgeDone, verdict, caseDetails, onRetry }) {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [prosecutor, defense, judge, verdict]);
  if (status === 'idle') return <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-black/20 p-12 text-center text-gray-500"><div><Scale size={48} className="mx-auto mb-4 opacity-20" /><p className="font-medium text-gray-400">Your evidence chamber is ready.</p><p className="mt-1 text-sm">Submit a case to start the trial.</p></div></div>;
  if (status === 'error') return <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-accent-red/30 glass-panel p-12 text-center"><div><AlertCircle size={48} className="mx-auto mb-4 text-accent-red" /><h3 className="text-xl font-bold text-white">Objection! The court paused.</h3><p className="mb-6 mt-2 text-gray-400">{errorMsg}</p><button onClick={onRetry} className="rounded-lg bg-white/10 px-6 py-2 font-medium text-white transition hover:bg-white/20">Dismiss & retry</button></div></div>;
  return <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-[#0d1117]/80 shadow-2xl glass-panel"><div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-4"><div className="flex items-center gap-2"><Scale className="text-accent-gold" size={20} /><span className="font-semibold tracking-wide text-white">Courtroom</span>{caseDetails?.cached && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">Cached</span>}</div>{status === 'running' && <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400"><span className="h-2 w-2 animate-pulse rounded-full bg-accent-red" />Live</div>}</div><TrialProgress prosecutorDone={prosecutorDone} defenseDone={defenseDone} judgeDone={judgeDone} /><EvidenceCard caseDetails={caseDetails} /><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 pt-6 scroll-smooth custom-scrollbar md:p-8"><Bubble align="left" color="red" title="Prosecutor" icon={ShieldAlert} text={prosecutor} isSpeaking={status === 'running' && !prosecutorDone} isVisible={prosecutor.length > 0} /><Bubble align="right" color="blue" title="Defense" icon={ShieldCheck} text={defense} isSpeaking={status === 'running' && prosecutorDone && !defenseDone} isVisible={prosecutorDone && (defense.length > 0 || status === 'running')} /><Bubble align="center" color="gold" title="Judge" icon={Scale} text={judge} isSpeaking={status === 'running' && defenseDone && !judgeDone} isVisible={defenseDone && (judge.length > 0 || status === 'running')} /><VerdictBanner verdict={verdict} caseDetails={caseDetails} /></div></div>;
}
