import React, { useState } from 'react';

export default function ProveIt({ onRunLive, isRunning }) {
  const [product, setProduct] = useState('');
  const [price, setPrice] = useState('');
  const [sellerRating, setSellerRating] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product || !price) return;
    
    onRunLive(
      product,
      Number(price),
      sellerRating ? Number(sellerRating) : null
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-accent-gold/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-accent-gold/20 text-accent-gold text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg">
        Live Mode
      </div>
      
      <h2 className="text-xl font-bold mb-2 text-white">Put It on Trial</h2>
      <p className="text-sm text-gray-400 mb-6">
        Don't take our word for it that the price is fair — type your own case in right now.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
            Product / Item
          </label>
          <input
            type="text"
            required
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. Used Herman Miller Chair"
            disabled={isRunning}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={isRunning}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
              Seller Rating <span className="text-gray-600 lowercase normal-case">(opt)</span>
            </label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={sellerRating}
              onChange={(e) => setSellerRating(e.target.value)}
              placeholder="1.0 - 5.0"
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isRunning || !product || !price}
          className="glass-button mt-2 w-full bg-accent-gold/80 text-black font-bold py-3 rounded-xl shadow-lg hover:bg-accent-gold flex items-center justify-center gap-2"
        >
          {isRunning ? 'Court is in Session...' : 'Submit Case'}
        </button>
      </form>
    </div>
  );
}
