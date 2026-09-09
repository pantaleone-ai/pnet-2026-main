# Analytics Validation Agent

## Purpose

Validates and monitors the analytics implementation for pantaleone.net, tracking Google Analytics 4, PostHog, and Meta Pixel events.

## Responsibilities

### 1. Track Missing Events

- Page title tracking (GA4 + PostHog)
- CTA button clicks (GA4 + PostHog)
- Contact form submissions (GA4 + PostHog)
- Scroll/engagement tracking (GA4)
- Outbound link clicks (GA4)

### 2. Monitor Implementation Status

- Validate all analytics events fire correctly
- Check consent management integration
- Verify e-commerce funnel tracking
- Ensure SPA route changes are tracked

### 3. Audit Rules

#### Must Track (Priority 1)

- [ ] Page views with titles
- [ ] CTA button clicks (buy now, contact me)
- [ ] E-commerce: view_item, add_to_cart, begin_checkout, purchase
- [ ] Search events

#### Should Track (Priority 2)

- [ ] Blog post views and engagement
- [ ] Social link clicks
- [ ] Outbound link clicks
- [ ] Generate lead (contact form when live)

#### Could Track (Priority 3)

- [ ] Video engagement
- [ ] File downloads
- [ ] Error tracking

### 4. Validation Checks

- GA4 DebugView shows events in real-time
- PostHog shows events after consent
- No console errors related to analytics
- Consent banner properly gates PostHog/Meta

## Configuration

- Langfuse host: https://langfuse.rapigent.com
- Sync direction: bidirectional
- Auto-sync on code changes

## Current Status

- Last updated: 2026-04-06
- Priority focus: Page titles + CTA tracking
