import React from 'react';

export default function CaseInput({ onRunDemo, isRunning }) {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold mb-2 text-white">See It In Action</h2>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        Watch our AI agents debate the fairness of a pair of wireless earbuds priced at ₹2,499.
      </p>
      
      <button
        onClick={() => onRunDemo('Wireless earbuds', 2499, 4.1)}
        disabled={isRunning}
        className="glass-button bg-accent-blue/80 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:bg-accent-blue flex items-center gap-2"
      >
        {isRunning ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Trial in Progress...
          </>
        ) : (
          'Run Demo Case'
        )}
      </button>
    </div>
  );
}
