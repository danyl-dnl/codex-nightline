import React from 'react';
import CaseInput from './components/CaseInput';
import ProveIt from './components/ProveIt';
import Courtroom from './components/Courtroom';
import { useTrialStream } from './hooks/useTrialStream';
import { Scale } from 'lucide-react';

function App() {
  const trialStream = useTrialStream();
  const isRunning = trialStream.status === 'running';

  return (
    <div className="min-h-screen bg-[#06080b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#06080b] to-black text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 h-[calc(100vh-4rem)]">
        
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
        <main className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Left Column: Inputs */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 lg:pr-4 shrink-0">
            <CaseInput 
              onRunDemo={trialStream.runTrial} 
              isRunning={isRunning} 
            />
            
            <div className="flex items-center gap-4 px-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">OR</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

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
          </div>

          {/* Right Column: Courtroom */}
          <div className="w-full lg:w-2/3 h-[600px] lg:h-full shrink-0 lg:shrink">
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
