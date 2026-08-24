import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

const ACTIVITY_REFRESH_MS = 60_000;

export function useDashboardData(period = '30d') {
  const [kpis, setKpis] = useState(null);
  const [tsRevenue, setTsRevenue] = useState(null);
  const [tsOrders, setTsOrders] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [operations, setOperations] = useState(null);
  const [inventoryHealth, setInventoryHealth] = useState(null);
  const [workQueue, setWorkQueue] = useState(null);
  const [insights, setInsights] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Activity feed — lazy, separate from main batch
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityCursor, setActivityCursor] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState(null);
  const [myActivity, setMyActivity] = useState(null);

  const activityTimerRef = useRef(null);

  const fetchMain = useCallback(async () => {
    setLoading(true);
    setError(null);
    const p = period;

    const results = await Promise.allSettled([
      api.get(`/api/analytics/kpis?period=${p}`),
      api.get(`/api/analytics/timeseries?metric=revenue&period=${p}`),
      api.get(`/api/analytics/timeseries?metric=orders&period=${p}`),
      api.get(`/api/analytics/operations?period=${p}`),
      api.get(`/api/analytics/inventory-health`),
      api.get(`/api/analytics/work-queue`),
      api.get(`/api/analytics/insights`),
      api.get(`/api/analytics/breakdown?period=${p}&dimension=product&limit=10`),
      api.get(`/api/analytics/forecast/revenue?horizon=30`),
    ]);

    const [kpisR, tsRevR, tsOrdR, opsR, invR, wqR, insR, bkR, fcR] = results;

    if (kpisR.status === 'fulfilled')   setKpis(kpisR.value.data?.data || null);
    if (tsRevR.status === 'fulfilled')  setTsRevenue(tsRevR.value.data?.data || null);
    if (tsOrdR.status === 'fulfilled')  setTsOrders(tsOrdR.value.data?.data || null);
    if (opsR.status === 'fulfilled')    setOperations(opsR.value.data?.data || null);
    if (invR.status === 'fulfilled')    setInventoryHealth(invR.value.data?.data || null);
    if (wqR.status === 'fulfilled')     setWorkQueue(wqR.value.data?.data || null);
    if (insR.status === 'fulfilled')    setInsights(insR.value.data?.data || null);
    if (bkR.status === 'fulfilled')     setBreakdown(bkR.value.data?.data || null);
    if (fcR.status === 'fulfilled')     setForecast(fcR.value.data?.data || null);

    const critical = [kpisR, opsR, invR];
    const anyFailed = critical.some(r => r.status === 'rejected');
    if (anyFailed) setError('Some data could not be loaded. Results may be partial.');

    setLoading(false);
  }, [period]);

  const fetchActivity = useCallback(async (cursor = null, append = false) => {
    if (document.visibilityState !== 'visible') return;
    setActivityLoading(true);
    const params = cursor ? `?before=${encodeURIComponent(cursor)}&limit=20` : '?limit=20';

    const [actR, teamR, myR] = await Promise.allSettled([
      api.get(`/api/analytics/activity${params}`),
      api.get(`/api/analytics/team-performance`),
      api.get(`/api/analytics/my-activity`),
    ]);

    if (actR.status === 'fulfilled') {
      const d = actR.value.data;
      const items = d.data || [];
      const nextCursor = d.nextCursor || null;
      setActivity(prev => append && prev
        ? { items: [...prev.items, ...items], nextCursor }
        : { items, nextCursor }
      );
      setActivityCursor(nextCursor);
    }
    if (teamR.status === 'fulfilled') setTeamPerformance(teamR.value.data?.data || null);
    if (myR.status === 'fulfilled')   setMyActivity(myR.value.data?.data || null);

    setActivityLoading(false);
  }, []);

  const loadMoreActivity = useCallback(() => {
    if (activityCursor) fetchActivity(activityCursor, true);
  }, [activityCursor, fetchActivity]);

  // Main fetch on period change
  useEffect(() => {
    fetchMain();
  }, [fetchMain]);

  // Activity — lazy after main data loads, then poll every 60s on visible tabs only
  useEffect(() => {
    if (loading) return;
    fetchActivity();
    activityTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchActivity();
    }, ACTIVITY_REFRESH_MS);
    return () => clearInterval(activityTimerRef.current);
  }, [loading, fetchActivity]);

  return {
    kpis, tsRevenue, tsOrders, forecast, operations, inventoryHealth, workQueue,
    insights, breakdown, loading, error,
    activity, activityLoading, loadMoreActivity, activityCursor,
    teamPerformance, myActivity,
    refresh: fetchMain,
  };
}
