# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, old-Facebook-style chat, live streaming with tips, weekly tournaments, top contributor system, and marketplace direct payments.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth + WebSocket
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB
- Integrations: Emergent Google Auth, Emergent LLM (AI bios), Stripe (subscriptions + a la carte + tips + marketplace), Leaflet/Overpass (maps), Emergent Object Storage (file uploads)

## Completed Features

### Phase 1-11 (Previously Complete)
- [x] JWT + Google OAuth auth, Pet CRUD, Social feed, 12-Species Breeder Registry
- [x] Admin Dashboard, Search, Settings, Left sidebar, Error boundaries
- [x] Pet of the Week, Certification System, Pet-Friendly Places Map
- [x] Stripe subscriptions (Prime/Pro/Ultra/Mega) + webhook + auto-upgrade
- [x] Payment History, A La Carte (AI gens, promotions, live time)
- [x] 7-Day Free Trial, Tier-based Cancellation Fees, VIP Pass ($4.99/week)
- [x] TikTok-style video + Suno audio posts (tier-gated)
- [x] MySpace-style Profile (presets, 10 avatar borders), Live Emojis
- [x] Old Facebook-style chat popup, DMs, Group chat, emoji picker
- [x] Marketplace listings CRUD, Category filters, search, sort, inquiry system
- [x] Breed Quiz, Treat Catcher, Pet Puzzle, Pet Show Champion, Daily Check-in
- [x] Notification bell, Emergent Object Storage uploads
- [x] VIP Breeder Directory, 1-Week VIP Pass, Premium Avatar Borders
- [x] WebRTC live video + WebSocket signaling + tier-based time limits
- [x] Points-based + Card-based tips, animated overlays, tip tracking

### Phase 12 - Weekly Tournaments & Top Contributor (Apr 2, 2026)
- [x] 3 tournament types: Breed Show, Pet Show, Breed Quiz Battle
- [x] 3-day duration, community voting, auto-finalization
- [x] Winners: 500/250/100 pts + Champion badge + 1-week tier upgrade
- [x] Top Contributor of the Week (points from all activities)
- [x] Weekly leaderboard (Top 10), Hall of Fame
- [x] Top Contributor banner on Feed page

### Phase 13 - Marketplace Direct Payments (Apr 2, 2026)
- [x] Seller setup (one-click activation)
- [x] Buy Now button on marketplace listings → Stripe Checkout
- [x] 10% platform commission, 90% to seller
- [x] Automatic listing marked as SOLD after purchase
- [x] Seller Dashboard with earnings, balance, total sales
- [x] Buyer purchase history
- [x] Admin marketplace transactions view with revenue tracking
- [x] Webhook handling for marketplace purchases (seller balance credit, notifications)
- [x] Purchase status polling modal

## Remaining Backlog

### P1 - Go Live Deployment
- [ ] Deploy to petbookin.com (DNS configured, awaiting Re-Deploy with Live Stripe keys)
- [ ] Set Live Stripe keys in Deployment Secrets

### P2 - Upcoming
- [ ] MySpace Profile enhancements (custom backgrounds, music, themes)
- [ ] Stripe Connect upgrade (when user gets valid Stripe key for direct seller payouts)

### P2 - Lower Priority
- [ ] User blocking/reporting
- [ ] Push notifications
- [ ] Chat media sharing
- [ ] Seller payout request system

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases, tips, tournaments, tournament_entries, weekly_top_contributors

## Key Notes
- Stripe in preview: uses `sk_test_emergent` (Emergent proxy). Live keys go in Deployment Secrets.
- Previous agent's live Stripe key was invalid (expired/rotated). User needs to verify their Stripe API key when deploying.
- Health check: GET /health (root, no /api prefix) for Kubernetes
