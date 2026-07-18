import React, { useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Scale, AlertCircle } from 'lucide-react';

const Bubble = ({ align = 'left', color = 'red', title, icon: Icon, text, isSpeaking, isVisible }) => {
  if (!isVisible) return null;

  const isLeft = align === 'left';
  const isCenter = align === 'center';
  
  let alignClass = 'items-start';
  if (isCenter) alignClass = 'items-center';
  else if (!isLeft) alignClass = 'items-end';

  let colorClasses = {
    red: 'bg-accent-red/10 border-accent-red/30 text-accent-red',
    blue: 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
    gold: 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
  }[color];

  return (
    <div className={`flex flex-col ${alignClass} w-full animate-slide-up mb-6`}>
      <div className={`flex items-center gap-2 mb-1 ${colorClasses.split(' ')[2]}`}>
        {Icon && <Icon size={16} />}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div 
        className={`glass-panel p-4 md:p-5 rounded-2xl max-w-[85%] md:max-w-[70%] border ${colorClasses.split(' ')[1]} ${
          isLeft ? 'rounded-tl-none' : isCenter ? '' : 'rounded-tr-none'
        }`}
      >
        <p className="text-gray-200 leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium">
          {text}
          {isSpeaking && (
            <span className="inline-block w-2 h-4 ml-1 bg-white/70 animate-pulse-slow align-middle"></span>
          )}
        </p>
      </div>
    </div>
  );
};

const VerdictBanner = ({ verdict }) => {
  if (!verdict) return null;
  
  const score = verdict.score;
  let scoreColor = 'text-green-400';
  let gaugeColor = 'bg-green-500';
  
  if (score < 40) {
    scoreColor = 'text-accent-red';
    gaugeColor = 'bg-accent-red';
  } else if (score < 70) {
    scoreColor = 'text-yellow-400';
    gaugeColor = 'bg-yellow-400';
  }

  return (
    <div className="w-full mt-8 animate-slide-up glass-panel p-8 rounded-3xl border-t-4 border-t-white/20 text-center relative overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-lg">
        <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 font-bold mb-4">Final Verdict</h3>
        
        <div className="flex flex-col items-center justify-center mb-6">
          <div className={`text-6xl md:text-7xl font-black ${scoreColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
            {score}
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full ${gaugeColor} transition-all duration-1000 ease-out`} 
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        
        <p className="text-lg md:text-xl font-medium text-white italic">
          "{verdict.verdict}"
        </p>
      </div>
    </div>
  );
};

export default function Courtroom({
  status,
  errorMsg,
  prosecutor,
  prosecutorDone,
  defense,
  defenseDone,
  judge,
  judgeDone,
  verdict,
  caseDetails,
  onRetry
}) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [prosecutor, defense, judge, verdict]);

  if (status === 'idle') {
    return (
      <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 text-center text-gray-500 bg-black/20">
        <div>
          <Scale size={48} className="mx-auto mb-4 opacity-20" />
          <p>Submit a case to start the trial.</p>
        </div>
      </div>
    );
  }

  const activeSpeaker = !prosecutorDone
    ? 'Prosecutor is presenting the case'
    : !defenseDone
      ? 'Defense is responding'
      : !judgeDone
        ? 'Judge is weighing the evidence'
        : 'Court adjourned';

  if (status === 'error') {
    return (
      <div className="h-full w-full flex items-center justify-center glass-panel rounded-3xl p-12 text-center border-accent-red/30 relative overflow-hidden">
         <div className="absolute inset-0 bg-accent-red/5"></div>
         <div className="relative z-10">
          <AlertCircle size={48} className="mx-auto mb-4 text-accent-red" />
          <h3 className="text-xl font-bold text-white mb-2">Objection! (Error)</h3>
          <p className="text-gray-400 mb-6">{errorMsg}</p>
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
          >
            Dismiss & Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl bg-[#0d1117]/80">
      <div className="bg-black/40 p-4 border-b border-white/10 flex justify-between items-center gap-4 z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="text-accent-gold shrink-0" size={20} />
            <span className="font-semibold tracking-wide text-white">Court is in Session</span>
          </div>
          {caseDetails && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {caseDetails.product} · ₹{Number(caseDetails.price).toLocaleString('en-IN')}
              {caseDetails.sellerRating !== null && ` · ${caseDetails.sellerRating}/5 seller`}
            </p>
          )}
        </div>
        {status === 'running' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red"></span>
            </span>
            LIVE
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] text-xs text-gray-500">
        {activeSpeaker}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scroll-smooth"
      >
        <Bubble 
          align="left" 
          color="red" 
          title="Prosecutor" 
          icon={ShieldAlert}
          text={prosecutor}
          isSpeaking={status === 'running' && !prosecutorDone}
          isVisible={prosecutor.length > 0}
        />

        <Bubble 
          align="right" 
          color="blue" 
          title="Defense" 
          icon={ShieldCheck}
          text={defense}
          isSpeaking={status === 'running' && prosecutorDone && !defenseDone}
          isVisible={prosecutorDone && (defense.length > 0 || status === 'running')}
        />

        <Bubble 
          align="center" 
          color="gold" 
          title="Judge" 
          icon={Scale}
          text={judge}
          isSpeaking={status === 'running' && defenseDone && !judgeDone}
          isVisible={defenseDone && (judge.length > 0 || status === 'running')}
        />

        <VerdictBanner verdict={verdict} />
      </div>
    </div>
  );
}
