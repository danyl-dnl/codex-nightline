import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Clipboard, ExternalLink, Info, Scale, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

const formatPrice = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

function TrialProgress({ prosecutorDone, defenseDone, judgeDone }) {
  const steps = [
    ['Look for a warning', prosecutorDone],
    ['Look for a good reason', defenseDone],
    ['Make the call', judgeDone],
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
      <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Your price check</p><p className="mt-1 font-semibold text-white">{caseDetails.product}</p></div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${caseDetails.confidence === 'high' ? 'bg-green-500/10 text-green-400' : caseDetails.confidence === 'medium' ? 'bg-yellow-400/10 text-yellow-300' : 'bg-white/5 text-gray-400'}`}>{caseDetails.confidence === 'high' ? 'Good match' : caseDetails.confidence === 'medium' ? 'Close match' : 'Best guess'}</span>
    </div>
    <div className="flex items-baseline justify-between text-sm"><span><span className="text-xs text-gray-500">Your price </span><strong className="text-accent-gold">{formatPrice(caseDetails.price)}</strong></span><span className="text-xs text-gray-500">{caseDetails.sellerRating ? `${caseDetails.sellerRating}/5 seller stars` : 'No seller stars added'}</span></div>
    {benchmark ? <>
      <div className="mt-4 flex justify-between text-[11px] text-gray-500"><span>Similar items usually cost</span><span>{formatPrice(low)} – {formatPrice(high)}</span></div>
      <div className="relative mt-2 h-2 rounded-full bg-gray-800"><div className="absolute inset-y-0 rounded-full bg-accent-blue/60" style={{ left: `${((low - minimum) / (maximum - minimum)) * 100}%`, right: `${100 - ((high - minimum) / (maximum - minimum)) * 100}%` }} /><span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gold shadow-[0_0_10px_#c5a880]" style={{ left: `${position}%` }} /></div>
      <p className="mt-3 text-xs text-gray-500">We compared it with: {benchmark.category}</p>
      {caseDetails.listingDetails?.condition && caseDetails.listingDetails.condition !== 'unknown' && <p className="mt-2 text-xs text-gray-400">You said it is: <span className="capitalize text-gray-200">{caseDetails.listingDetails.condition}</span>{caseDetails.listingDetails.warranty ? ` · Warranty: ${caseDetails.listingDetails.warranty}` : ''}</p>}
      {caseDetails.listingDetails?.details && <p className="mt-2 text-xs leading-relaxed text-gray-500">Your note: {caseDetails.listingDetails.details}</p>}
      {caseDetails.liveResearch && <div className="mt-4 border-t border-white/5 pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-blue">Live comparable sources</p><div className="space-y-1.5">{caseDetails.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 text-xs text-gray-300 transition hover:bg-white/[0.07] hover:text-white"><span className="truncate">{source.title}</span><ExternalLink className="shrink-0 text-accent-blue" size={13} /></a>)}</div></div>}
    </> : <p className="mt-3 text-xs text-gray-500">We could not find a very similar item, so this is only a helpful guess.</p>}
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
  return <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-black/40 p-6 text-center animate-slide-up md:p-8"><Sparkles className="absolute right-5 top-5 text-accent-gold/40" size={22} /><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Our answer</p><div className={`mt-4 text-6xl font-black md:text-7xl ${color.split(' ')[0]}`}>{score}<span className="ml-1 text-xl text-gray-500">/100</span></div><p className="mt-1 text-sm font-bold uppercase tracking-widest text-white">{verdict.label ?? 'Price assessment'}</p><p className="mt-1 text-xs text-gray-500">Higher means the price looks more fair.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-800"><div className={`h-full rounded-full transition-all duration-1000 ${color.split(' ')[1]}`} style={{ width: `${score}%` }} /></div><p className="mx-auto mt-5 max-w-lg text-base font-medium text-white md:text-lg">“{verdict.verdict}”</p>{verdict.actions?.length > 0 && <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-accent-gold/25 bg-accent-gold/[0.06] p-4 text-left"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-gold">What would make this fair?</p>{verdict.targetPrice != null ? <p className="mt-2 text-sm text-gray-200"><span className="font-bold text-white">{verdict.targetMessage}:</span> ₹{Number(verdict.targetPrice).toLocaleString('en-IN')}</p> : <p className="mt-2 text-sm text-gray-300">{verdict.targetMessage}</p>}<ul className="mt-3 space-y-2">{verdict.actions.map((action) => <li key={action} className="flex gap-2 text-xs leading-relaxed text-gray-400"><Check size={14} className="mt-0.5 shrink-0 text-accent-gold" />{action}</li>)}</ul></div>}{verdict.breakdown?.length > 0 && <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400"><Info size={13} /> Why did we say this?</p><div className="mt-3 space-y-2">{verdict.breakdown.map((item) => <div key={item.label} className="flex items-start justify-between gap-4 text-xs"><span className="text-gray-500">{item.label}</span><span className="max-w-[62%] text-right font-medium text-gray-200">{item.detail}</span></div>)}</div><p className="mt-3 text-[10px] leading-relaxed text-gray-600">This is a useful clue, not a promise. Check the item carefully before paying.</p></div>}<div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-200 transition hover:bg-white/10">{copied ? <Check size={13} className="text-green-400" /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy this answer'}</button></div>{verdict.fallback && <p className="mt-3 text-xs text-gray-500">We used similar-item prices because the full answer was unavailable.</p>}</section>;
}

export default function Courtroom({ status, errorMsg, prosecutor, prosecutorDone, defense, defenseDone, judge, judgeDone, verdict, caseDetails, onRetry }) {
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [prosecutor, defense, judge, verdict]);
  if (status === 'idle') return <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-black/20 p-8 text-center text-gray-500"><div><Scale size={48} className="mx-auto mb-4 opacity-20" /><p className="font-medium text-gray-200">How it works</p><div className="mt-5 grid gap-3 text-left text-sm sm:grid-cols-3"><p className="rounded-xl bg-white/[0.03] p-3"><b className="text-accent-gold">1.</b> Tell us the item and price.</p><p className="rounded-xl bg-white/[0.03] p-3"><b className="text-accent-gold">2.</b> We compare similar items.</p><p className="rounded-xl bg-white/[0.03] p-3"><b className="text-accent-gold">3.</b> Get a simple answer.</p></div></div></div>;
  if (status === 'error') return <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-accent-red/30 glass-panel p-12 text-center"><div><AlertCircle size={48} className="mx-auto mb-4 text-accent-red" /><h3 className="text-xl font-bold text-white">Something went wrong</h3><p className="mb-6 mt-2 text-gray-400">{errorMsg}</p><button onClick={onRetry} className="rounded-lg bg-white/10 px-6 py-2 font-medium text-white transition hover:bg-white/20">Try again</button></div></div>;
  return <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-[#0d1117]/80 shadow-2xl glass-panel"><div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-4"><div className="flex items-center gap-2"><Scale className="text-accent-gold" size={20} /><span className="font-semibold tracking-wide text-white">Your price check</span></div>{status === 'running' && <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400"><span className="h-2 w-2 animate-pulse rounded-full bg-accent-red" />Working</div>}</div><TrialProgress prosecutorDone={prosecutorDone} defenseDone={defenseDone} judgeDone={judgeDone} /><EvidenceCard caseDetails={caseDetails} /><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 pt-6 scroll-smooth custom-scrollbar md:p-8"><Bubble align="left" color="red" title="Why you may want to be careful" icon={ShieldAlert} text={prosecutor} isSpeaking={status === 'running' && !prosecutorDone} isVisible={prosecutor.length > 0} /><Bubble align="right" color="blue" title="Why the price may be okay" icon={ShieldCheck} text={defense} isSpeaking={status === 'running' && prosecutorDone && !defenseDone} isVisible={prosecutorDone && (defense.length > 0 || status === 'running')} /><Bubble align="center" color="gold" title="The simple answer" icon={Scale} text={judge} isSpeaking={status === 'running' && defenseDone && !judgeDone} isVisible={defenseDone && (judge.length > 0 || status === 'running')} /><VerdictBanner verdict={verdict} caseDetails={caseDetails} /></div></div>;
}
