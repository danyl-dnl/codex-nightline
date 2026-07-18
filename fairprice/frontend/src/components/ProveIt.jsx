import React, { useState } from 'react';
import { Check, ImageUp, Link as LinkIcon, LoaderCircle } from 'lucide-react';

export default function ProveIt({ onRunLive, isRunning }) {
  const [product, setProduct] = useState('');
  const [price, setPrice] = useState('');
  const [sellerRating, setSellerRating] = useState('');
  const [condition, setCondition] = useState('unknown');
  const [warranty, setWarranty] = useState('');
  const [details, setDetails] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [importStatus, setImportStatus] = useState('idle');
  const [importError, setImportError] = useState('');
  const [importedFrom, setImportedFrom] = useState('');
  const [showExtras, setShowExtras] = useState(false);

  const applyImportedListing = (listing, source) => {
    setProduct(listing.product);
    setPrice(String(listing.price));
    setSellerRating(listing.sellerRating == null ? '' : String(listing.sellerRating));
    setCondition(listing.listingDetails?.condition ?? 'unknown');
    setWarranty(listing.listingDetails?.warranty ?? '');
    setDetails(listing.listingDetails?.details ?? '');
    setImportedFrom(source);
  };

  const importListing = async (payload, source) => {
    setImportStatus('loading');
    setImportError('');
    try {
      const response = await fetch('/api/import-listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not import this listing.');
      applyImportedListing(body.listing, source);
      setImportStatus('done');
    } catch (error) {
      setImportStatus('error');
      setImportError(error.message || 'Could not import this listing.');
    }
  };

  const handleImageImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setImportStatus('error'); setImportError('Use a PNG, JPEG, WEBP, or GIF screenshot.'); return;
    }
    if (file.size > 2_500_000) {
      setImportStatus('error'); setImportError('Choose an image smaller than 2.5 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => importListing({ imageDataUrl: reader.result }, 'screenshot');
    reader.onerror = () => { setImportStatus('error'); setImportError('The screenshot could not be read.'); };
    reader.readAsDataURL(file);
  };

  const handleUrlImport = (event) => {
    event.preventDefault();
    if (listingUrl.trim()) importListing({ listingUrl: listingUrl.trim() }, 'listing link');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product || !price) return;
    
    onRunLive(
      product,
      Number(price),
      sellerRating ? Number(sellerRating) : null,
      { condition, warranty, details }
    );
  };

  const suggestedCases = [
    ['Used iPhone 12', 24500, 4.4],
    ['Office chair', 12999, 4.0],
    ['Logo design', 4500, 4.8],
  ];

  const applySuggestion = ([nextProduct, nextPrice, nextRating]) => {
    setProduct(nextProduct);
    setPrice(String(nextPrice));
    setSellerRating(String(nextRating));
    setCondition(nextProduct.toLowerCase().startsWith('used') ? 'used' : 'unknown');
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-accent-gold/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-accent-gold/20 text-accent-gold text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg">
        Live Mode
      </div>
      
      <h2 className="text-xl font-bold mb-2 text-white">Check a price</h2>
      <p className="text-sm text-gray-400 mb-6">
        Tell us what you found and how much it costs. We will do the hard thinking.
      </p>

      <details className="mb-6 rounded-xl border border-accent-blue/20 bg-accent-blue/[0.05] p-4">
        <summary className="cursor-pointer text-sm font-bold text-white">Have a listing screenshot or link? <span className="font-normal text-gray-400">(optional)</span></summary>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">We can fill in the form for you. Always check the details before you continue.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-200 transition hover:bg-white/[0.09]">
            {importStatus === 'loading' ? <LoaderCircle size={15} className="animate-spin text-accent-blue" /> : <ImageUp size={15} className="text-accent-blue" />}
            Upload screenshot
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageImport} disabled={isRunning || importStatus === 'loading'} className="sr-only" />
          </label>
          <form onSubmit={handleUrlImport} className="flex min-w-0 flex-1 gap-2">
            <input type="url" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="Public listing URL" disabled={isRunning || importStatus === 'loading'} className="min-w-0 flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60" />
            <button type="submit" disabled={!listingUrl.trim() || isRunning || importStatus === 'loading'} className="inline-flex items-center gap-1 rounded-lg bg-accent-blue/80 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><LinkIcon size={14} />Import</button>
          </form>
        </div>
        {importStatus === 'loading' && <p className="mt-3 text-xs text-accent-blue">Reading listing evidence…</p>}
        {importStatus === 'error' && <p className="mt-3 text-xs text-accent-red">{importError}</p>}
        {importStatus === 'done' && <p className="mt-3 flex items-center gap-1 text-xs text-green-400"><Check size={14} />We filled in details from the {importedFrom}. Please check them.</p>}
      </details>

      <div className="mb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Need an idea? Try one</p>
        <div className="flex flex-wrap gap-2">
          {suggestedCases.map((suggestion) => (
            <button key={suggestion[0]} type="button" disabled={isRunning} onClick={() => applySuggestion(suggestion)} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400 transition hover:border-accent-gold/40 hover:text-accent-gold disabled:opacity-50">
              {suggestion[0]}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
            <span className="mr-1 text-accent-gold">1.</span> What are you buying?
          </label>
          <input
            type="text"
            required
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Example: Used iPhone 12"
            disabled={isRunning}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
              <span className="mr-1 text-accent-gold">2.</span> How much does it cost?
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
              <span className="mr-1 text-accent-gold">3.</span> Seller stars <span className="text-gray-600 lowercase normal-case">(optional)</span>
            </label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={sellerRating}
              onChange={(e) => setSellerRating(e.target.value)}
              placeholder="Out of 5"
              disabled={isRunning}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all"
            />
          </div>
        </div>

        <button type="button" onClick={() => setShowExtras((value) => !value)} className="-mb-1 text-left text-xs font-bold text-gray-500 hover:text-gray-300">
          {showExtras ? '− Hide extra details' : '+ Add extra details (optional)'}
        </button>

        {showExtras && <><div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Is it new or used?</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} disabled={isRunning} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all">
              <option value="unknown">Not specified</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Warranty <span className="text-gray-600 lowercase normal-case">(optional)</span></label>
            <input type="text" maxLength="80" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="e.g. 6 months remaining" disabled={isRunning} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Anything else we should know? <span className="text-gray-600 lowercase normal-case">(optional)</span></label>
          <textarea rows="3" maxLength="500" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Example: It has 85% battery health and a charger is included." disabled={isRunning} className="w-full resize-y bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/60 focus:ring-1 focus:ring-accent-gold/60 transition-all" />
          <p className="mt-1 text-right text-[10px] text-gray-600">{details.length}/500</p>
        </div></>}

        <button
          type="submit"
          disabled={isRunning || !product || !price}
          className="glass-button mt-2 w-full bg-accent-gold/80 text-black font-bold py-3 rounded-xl shadow-lg hover:bg-accent-gold flex items-center justify-center gap-2"
        >
          {isRunning ? 'Checking the price…' : 'Check this price'}
        </button>
      </form>
    </div>
  );
}
