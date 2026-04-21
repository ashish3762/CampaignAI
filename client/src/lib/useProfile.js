import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { PAYWALL_ENABLED } from './features.js';
import { supabase } from './supabase.js';

// Small hook that owns the "is this user premium + how many rows have they saved"
// question for any page that needs it. Kept deliberately simple — no caching,
// callers can refresh after save/upgrade via the returned refresh() fn.
export function useProfile() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setAnalysisCount(0);
      setLoading(false);
      return;
    }
    // Paywall disabled — everyone is premium, skip the profile/count fetch
    // so we don't require the profiles table to exist yet.
    if (!PAYWALL_ENABLED) {
      setIsPremium(true);
      setAnalysisCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('is_premium').eq('id', user.id).maybeSingle(),
      supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setIsPremium(!!profile?.is_premium);
    setAnalysisCount(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { isPremium, analysisCount, loading, refresh: load };
}
