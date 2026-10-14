'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './client';
import type { LocationDTO, StockRow } from './types';

// Stock levels for all items; qty(productId, locationId) for quick lookups.
export function useStock() {
  const [data, setData] = useState<{ locations: LocationDTO[]; rows: StockRow[] } | null>(null);
  const reload = useCallback(async () => setData(await api('/api/stock')), []);
  useEffect(() => { reload(); }, [reload]);
  const qty = (productId: string, locationId: string) =>
    data?.rows.find((r) => r.id === productId)?.byLocation[locationId] ?? 0;
  return { data, reload, qty };
}

// In-stock serials at a location, grouped by product.
export function useSerials(locationId: string | null | undefined) {
  const [map, setMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!locationId) { setMap({}); return; }
    api<{ productId: string; serial: string }[]>(`/api/stock/serials?locationId=${locationId}`).then((rows) => {
      const m: Record<string, string[]> = {};
      for (const r of rows) (m[r.productId] ||= []).push(r.serial);
      setMap(m);
    });
  }, [locationId]);
  return map;
}
