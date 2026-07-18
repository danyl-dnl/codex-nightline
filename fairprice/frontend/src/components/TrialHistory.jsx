import React from 'react';
import { History, RotateCcw } from 'lucide-react';

export default function TrialHistory({ items, onSelect, onClear, isRunning }) {
  if (!items.length) return null;

  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-white"><History size={16} className="text-accent-gold" /> Your past price checks</div>
        <button onClick={onClear} disabled={isRunning} className="text-xs text-gray-500 hover:text-white">Clear list</button>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map((item) => (
          <button key={item.id} disabled={isRunning} onClick={() => onSelect(item)} className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/5 disabled:opacity-50">
            <span className="min-w-0"><span className="block truncate text-sm text-gray-200">{item.product}</span><span className="text-xs text-gray-500">₹{Number(item.price).toLocaleString('en-IN')} · {item.label}</span></span>
            <span className="ml-3 text-sm font-black text-accent-gold">{item.score}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-gray-600"><RotateCcw size={11} /> Saved only on this device</p>
    </section>
  );
}
