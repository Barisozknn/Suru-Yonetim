import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Yeniden kullanılabilir Web Worker hook'u.
 *
 * @example
 * const AutomationsWorker = () => new Worker(
 *   new URL('../workers/automations.worker.ts', import.meta.url),
 *   { type: 'module' }
 * );
 * const { run, result, loading } = useWorker<InputType, OutputType>(AutomationsWorker);
 * useEffect(() => { run(inputData); }, [inputData]);
 */
export function useWorker<TInput, TOutput>(
  WorkerFactory: () => Worker
) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((data: TInput) => {
    // Önceki worker'ı temizle
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      const worker = WorkerFactory();
      workerRef.current = worker;
      setLoading(true);
      setError(null);

      worker.onmessage = (e: MessageEvent<TOutput>) => {
        setResult(e.data);
        setLoading(false);
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (err) => {
        console.error('[Worker] Hata:', err);
        setError(err.message);
        setLoading(false);
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage(data);
    } catch (err) {
      console.error('[Worker] Başlatma hatası:', err);
      setError('Worker başlatılamadı');
      setLoading(false);
    }
  }, [WorkerFactory]);

  // Bileşen unmount olunca worker'ı temizle (memory leak önleme)
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return { run, result, loading, error };
}
