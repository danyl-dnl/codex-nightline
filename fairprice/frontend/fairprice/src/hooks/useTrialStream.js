import { useState, useCallback } from 'react';

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

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMsg('');
    setProsecutor('');
    setProsecutorDone(false);
    setDefense('');
    setDefenseDone(false);
    setJudge('');
    setJudgeDone(false);
    setVerdict(null);
  }, []);

  const runTrial = useCallback(async (product, price, sellerRating) => {
    reset();
    setStatus('running');

    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, price, sellerRating: sellerRating || null }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
            case 'judge_done':
              setJudgeDone(true); // although 'verdict' and 'done' follow, we might want this
              break;
            case 'verdict':
              setVerdict(data);
              break;
            case 'error':
              setStatus('error');
              setErrorMsg(data.message || 'An unknown error occurred.');
              return;
            case 'done':
              setStatus('done');
              return;
            default:
              console.warn("Unknown event:", eventName);
          }
        }
      }
      
      setStatus('done');

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to the trial stream.');
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
    runTrial,
    reset
  };
}
