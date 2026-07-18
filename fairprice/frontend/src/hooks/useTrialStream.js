import { useState, useCallback, useEffect, useRef } from 'react';

export function useTrialStream() {
  const [status, setStatus] = useState('idle'); // 'idle', 'running', 'error', 'done'
  const [errorMsg, setErrorMsg] = useState('');
  
  const [prosecutor, setProsecutor] = useState('');
  const [prosecutorDone, setProsecutorDone] = useState(false);
  
  const [defense, setDefense] = useState('');
  const [defenseDone, setDefenseDone] = useState(false);
  
  const [judge, setJudge] = useState('');
  const [judgeDone, setJudgeDone] = useState(false);
  
  const [verdict, setVerdict] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const controllerRef = useRef(null);

  const cancelTrial = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => cancelTrial, [cancelTrial]);

  const reset = useCallback(() => {
    cancelTrial();
    setStatus('idle');
    setErrorMsg('');
    setProsecutor('');
    setProsecutorDone(false);
    setDefense('');
    setDefenseDone(false);
    setJudge('');
    setJudgeDone(false);
    setVerdict(null);
    setCaseDetails(null);
  }, [cancelTrial]);

  const runTrial = useCallback(async (product, price, sellerRating) => {
    reset();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('running');
    setCaseDetails({ product, price, sellerRating: sellerRating ?? null });

    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, price, sellerRating: sellerRating ?? null }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `The court could not start (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.trim()) continue;
          
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          
          if (!eventMatch || !dataMatch) continue;
          
          const eventName = eventMatch[1].trim();
          let data;
          try {
            data = JSON.parse(dataMatch[1].trim());
          } catch (err) {
            console.error("Failed to parse SSE JSON data:", dataMatch[1], err);
            continue;
          }

          switch (eventName) {
            case 'case':
              setCaseDetails({
                product: data.product,
                price: data.price,
                sellerRating: data.sellerRating ?? null,
                benchmark: data.benchmark ?? null,
                confidence: data.confidence ?? 'low',
                cached: Boolean(data.cached),
                liveResearch: Boolean(data.liveResearch),
                sources: Array.isArray(data.sources) ? data.sources : [],
              });
              break;
            case 'prosecutor':
              setProsecutor(prev => prev + data.chunk);
              break;
            case 'prosecutor_done':
              setProsecutorDone(true);
              break;
            case 'defense':
              setDefense(prev => prev + data.chunk);
              break;
            case 'defense_done':
              setDefenseDone(true);
              break;
            case 'judge':
              setJudge(prev => prev + data.chunk);
              break;
            case 'verdict':
              setJudgeDone(true);
              setVerdict(data);
              break;
            case 'error':
              setStatus('error');
              setErrorMsg(data.message || 'An unknown error occurred.');
              controllerRef.current = null;
              return;
            case 'done':
              setJudgeDone(true);
              setStatus('done');
              controllerRef.current = null;
              return;
            default:
              console.warn("Unknown event:", eventName);
          }
        }
      }
      
      setJudgeDone(true);
      setStatus('done');

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to the trial stream.');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [reset]);

  return {
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
    runTrial,
    reset
  };
}
