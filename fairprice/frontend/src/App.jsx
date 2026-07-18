import React, { useEffect, useState } from 'react';
import ProveIt from './components/ProveIt';
import Courtroom from './components/Courtroom';
import TrialHistory from './components/TrialHistory';
import { useTrialStream } from './hooks/useTrialStream';
import { Scale } from 'lucide-react';

function App() {
  const trialStream = useTrialStream();
  const isRunning = trialStream.status === 'running';
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fair-price-history') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (trialStream.status !== 'done' || !trialStream.verdict || !trialStream.caseDetails) return;
    const item = { id: `${Date.now()}-${Math.random()}`, ...trialStream.caseDetails, ...trialStream.verdict };
    setHistory((previous) => {
      const next = [item, ...previous].slice(0, 8);
      localStorage.setItem('fair-price-history', JSON.stringify(next));
      return next;
    });
  }, [trialStream.status, trialStream.verdict, trialStream.caseDetails]);

  const clearHistory = () => {
    localStorage.removeItem('fair-price-history');
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#06080b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#06080b] to-black text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 lg:h-[calc(100vh-4rem)]">
        
        {/* Header Area */}
        <header className="flex flex-col items-center justify-center text-center mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent-gold/20 rounded-full">
              <Scale className="text-accent-gold" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
              Fair<span className="text-accent-gold">Price</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-xl">
            Don't take our word for it that the price is fair — put it on trial.
          </p>
        </header>

        {/* Main Content Layout */}
        <main className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:flex-1 lg:min-h-0">
          
          {/* Left Column: Inputs */}
          <div className="w-full lg:w-auto flex flex-col gap-6 lg:overflow-y-auto lg:[&>*]:shrink-0 custom-scrollbar pr-0 lg:pr-4 shrink-0">
            <ProveIt 
              onRunLive={trialStream.runTrial} 
              isRunning={isRunning} 
            />

            {(trialStream.status === 'done' || trialStream.status === 'error') && (
              <button
                onClick={trialStream.reset}
                className="mt-4 px-6 py-3 w-full border border-white/20 hover:bg-white/5 text-gray-300 font-medium rounded-xl transition-all"
              >
                Start New Trial
              </button>
            )}

            <TrialHistory
              items={history}
              isRunning={isRunning}
              onClear={clearHistory}
              onSelect={(item) => trialStream.runTrial(item.product, item.price, item.sellerRating)}
            />
          </div>

          {/* Right Column: Courtroom */}
          <div className="w-full lg:col-span-2 lg:w-auto h-[600px] lg:h-full min-w-0 shrink-0">
            <Courtroom 
              {...trialStream}
              onRetry={trialStream.reset}
            />
          </div>

        </main>
      </div>
    </div>
  );
}

export default App;
