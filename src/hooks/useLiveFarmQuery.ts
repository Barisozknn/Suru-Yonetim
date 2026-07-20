import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../store/useStore';

export function useLiveFarmQuery<T>(querier: () => Promise<T> | T, deps: any[] = []): T | undefined {
  const activeCiftlikId = useStore(state => state.activeCiftlikId);
  
  const result = useLiveQuery(querier, [...deps, activeCiftlikId]);
  
  if (result === undefined) return undefined;
  
  if (Array.isArray(result)) {
    return result.filter(r => (r as any).ciftlikId === activeCiftlikId) as any;
  }
  
  if (result && typeof result === 'object') {
    if ((result as any).ciftlikId !== activeCiftlikId) {
      return undefined;
    }
  }
  
  return result;
}
