import { PAYWALL_ENABLED } from './features.js';
import { supabase } from './supabase.js';

export const FREE_ANALYSIS_LIMIT = 3;

export class PaywallError extends Error {
  constructor(message = 'Free plan limit reached') {
    super(message);
    this.name = 'PaywallError';
    this.code = 'PAYWALL';
  }
}

// Persist one analysis. RLS ensures user_id === auth.uid() on insert.
// `mode` is 'actual' | 'planned' — stored as `type` in the DB.
//
// Throws PaywallError if the user is on the free plan and already at limit.
export async function saveAnalysis({ user, inputs, result, mode = 'actual' }) {
  if (!user) throw new Error('Not signed in');

  // Paywall gate — count current rows, block if free and over the limit.
  // Skipped entirely when the paywall feature flag is off.
  if (PAYWALL_ENABLED) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('is_premium').eq('id', user.id).maybeSingle(),
      supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const isPremium = !!profile?.is_premium;
    if (!isPremium && (count ?? 0) >= FREE_ANALYSIS_LIMIT) {
      throw new PaywallError(
        `You've reached the free plan limit of ${FREE_ANALYSIS_LIMIT} saved analyses.`
      );
    }
  }

  const { data, error } = await supabase
    .from('analyses')
    .insert([
      {
        user_id: user.id,
        spend: Number(inputs.spend),
        impressions: Number(inputs.impressions),
        clicks: Number(inputs.clicks),
        conversions: Number(inputs.conversions),
        revenue: Number(inputs.revenue),
        cpm: result.metrics.cpm,
        ctr: result.metrics.ctr,
        cpc: result.metrics.cpc,
        cvr: result.metrics.cvr,
        roas: result.metrics.roas,
        biggest_issue: result.biggestIssue ?? null,
        money_impact: result.moneyImpact ?? null,
        platform: inputs.platform?.trim() || null,
        industry: inputs.industry?.trim() || null,
        type: mode === 'planned' ? 'planned' : 'actual',
      },
    ])
    .select('id')
    .single();
  if (error) throw error;
  return data; // { id }
}

// RLS handles filtering by user_id — no explicit .eq() needed.
export async function listRecentAnalyses(limit = 10) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Generate a public share link for an existing analysis owned by the user.
// Idempotent — reuses the existing share_id if one already exists.
export async function publishAnalysis(analysisId) {
  // Read whatever's already there so we can reuse the share_id.
  const { data: existing, error: readErr } = await supabase
    .from('analyses')
    .select('share_id, is_public')
    .eq('id', analysisId)
    .single();
  if (readErr) throw readErr;

  const shareId = existing.share_id || crypto.randomUUID();

  if (!existing.is_public || !existing.share_id) {
    const { error } = await supabase
      .from('analyses')
      .update({ share_id: shareId, is_public: true })
      .eq('id', analysisId);
    if (error) throw error;
  }

  return { shareId, url: buildShareUrl(shareId) };
}

export function buildShareUrl(shareId) {
  if (typeof window === 'undefined') return `/report/${shareId}`;
  return `${window.location.origin}/report/${shareId}`;
}

// Public fetch — works with the anon key because RLS permits `is_public = true`.
export async function fetchPublicAnalysis(shareId) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
