export const SAMPLE_PRD = `Product: PulseBoard — a lightweight SaaS analytics dashboard for early-stage startups.

Problem: Founders juggle Stripe, Mixpanel, and spreadsheets and miss weekly revenue trends until it is too late.

Solution: PulseBoard connects Stripe and a simple CSV upload, then shows MRR, churn, and top plans on one screen with email digests every Monday.

Target users: Solo founders and teams under 20 people who already use Stripe.

Key features:
- One-click Stripe OAuth
- Weekly email digest with MRR delta and churn alerts
- Shareable read-only links for investors
- Free plan for under $10k MRR; Pro at $29/month

Success metrics: Time-to-first-insight under 10 minutes; 40% of free users convert to Pro within 60 days.

Constraints: Must ship an MVP in 8 weeks; GDPR-friendly EU data residency optional later.`;

export type Tone = "casual" | "technical";
export type WordCount = 300 | 600 | 1000;
