// Zod schemas for every inbound API body.
//
// Validation runs in app.js before reaching the domain layer (analyze.js).
// This catches bad types, missing fields, and impossible values early so
// the engine only ever sees clean numbers.

import { z } from 'zod';

export const analyzeInputSchema = z.object({
  spend:       z.number({ coerce: true }).nonnegative('spend must be >= 0'),
  impressions: z.number({ coerce: true }).nonnegative('impressions must be >= 0'),
  clicks:      z.number({ coerce: true }).nonnegative('clicks must be >= 0'),
  conversions: z.number({ coerce: true }).nonnegative('conversions must be >= 0'),
  revenue:     z.number({ coerce: true }).nonnegative('revenue must be >= 0'),
  industry:    z.string().optional(),
  platform:    z.string().optional(),
}).refine(
  (d) => d.clicks <= d.impressions,
  { message: 'Clicks cannot exceed impressions', path: ['clicks'] }
).refine(
  (d) => d.conversions <= d.clicks,
  { message: 'Conversions cannot exceed clicks', path: ['conversions'] }
);

export const scenarioInputSchema = analyzeInputSchema;
