// Central feature flags.
//
// PAYWALL_ENABLED — when false, the app behaves as if every user is premium:
//   · saveAnalysis skips the row-count check
//   · useProfile reports isPremium: true
//   · The Upgrade button, free-plan banner, and Pro badge on Share are hidden
//   · UpgradeModal is never opened
// Flip to true to re-enable the Stripe paywall. No other code changes needed.
export const PAYWALL_ENABLED = false;
