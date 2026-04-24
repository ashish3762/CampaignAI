import { z } from 'zod';

const score100 = z.number({ coerce: true }).int().min(1).max(100);

export const simulateInputSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  industry: z.enum(['E-commerce', 'SaaS', 'Finance', 'Education', 'Health', 'Gaming', 'Travel']),
  geo: z.enum(['US', 'India']),
  budget: z.number({ coerce: true }).positive(),
  durationDays: z.number({ coerce: true }).int().positive().optional(),
  averageOrderValue: z.number({ coerce: true }).positive(),
  audienceSize: z.number({ coerce: true }).int().positive(),
  competition: z.enum(['low', 'medium', 'high', 'very_high']),
  placements: z
    .array(
      z.object({
        placement: z.enum([
          'feed', 'reels', 'stories', 'in_stream',
          'audience_network', 'right_column', 'search',
        ]),
        weight: z.number({ coerce: true }).positive(),
      })
    )
    .min(1),
  creative: z.object({
    hook: score100,
    visual: score100,
    offerClarity: score100,
    ctaClarity: score100,
  }),
  format: z.enum(['video', 'carousel', 'image', 'text']),
  landingPage: z.object({
    speed: score100,
    mobileFriendliness: score100,
    messageMatch: score100,
    trustSignals: score100,
    friction: z.number({ coerce: true }).int().min(0).max(100),
  }),
});
