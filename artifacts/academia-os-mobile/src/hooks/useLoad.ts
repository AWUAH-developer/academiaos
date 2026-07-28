import { useCallback, useEffect, useState } from 'react';
export function useLoad<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (refresh = false) => { refresh ? setRefreshing(true) : setLoading(true); setError(null); try { setData(await loader()); } catch (err) { setError(err instanceof Error ? err.message : 'The request failed.'); } finally { setLoading(false); setRefreshing(false); } }, dependencies);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refreshing, error, reload: () => load(true) };
}
