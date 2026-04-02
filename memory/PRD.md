# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, old-Facebook-style chat, live streaming with tips, weekly tournaments, and top contributor system. User is preparing to go live on petbookin.com.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth + WebSocket
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB
- Integrations: Emergent Google Auth, Emergent LLM (AI bios), Stripe (subscriptions + a la carte + tips), Leaflet/Overpass (maps), Emergent Object Storage (file uploads)

## Completed Features

### Phase 1 - Core Platform
- [x] JWT + Google OAuth auth, Pet CRUD, Social feed, 12-Species Breeder Registry
- [x] Admin Dashboard, Search, Settings, Left sidebar, Error boundaries

### Phase 2 - Premium Features
- [x] Pet of the Week, Certification System, Pet-Friendly Places Map

### Phase 3 - Monetization
- [x] Stripe subscriptions (Prime/Pro/Ultra/Mega) + webhook + auto-upgrade
- [x] Payment History, A La Carte (AI gens, promotions, live time)
- [x] 7-Day Free Trial, Tier-based Cancellation Fees, VIP Pass ($4.99/week)

### Phase 4 - Content & Customization
- [x] TikTok-style video + Suno audio posts (tier-gated)
- [x] MySpace-style Profile (presets, 10 avatar borders), Live Emojis everywhere

### Phase 5 - Chat System
- [x] Old Facebook-style chat popup, DMs, Group chat, emoji picker

### Phase 6 - Marketplace
- [x] Listings CRUD, Category filters, search, sort, inquiry system

### Phase 7 - Gaming & Points
- [x] Breed Quiz, Treat Catcher, Pet Puzzle, Pet Show Champion
- [x] Daily Check-in, streaks, Global Leaderboard

### Phase 8 - Notifications & File Upload
- [x] Notification bell, Emergent Object Storage uploads

### Phase 9 - VIP & Engagement
- [x] VIP Breeder Directory (puppies.com style), 1-Week VIP Pass
- [x] Premium Avatar Borders (9 premium for subscribers)

### Phase 10 - Live Streaming
- [x] WebRTC live video with WebSocket signaling
- [x] Tier-based time limits, buy extra time, recording/replay
- [x] Live chat with emoji, camera/mic toggle, viewer count, timer

### Phase 11 - Tip/Donate System
- [x] Points-based tips + Card-based tips via Stripe
- [x] Animated tip overlays, tip tracking, My Tips dashboard

### Phase 12 - Weekly Tournaments & Top Contributor (NEW - Apr 2, 2026)
- [x] 3 tournament types: Breed Show, Pet Show, Breed Quiz Battle
- [x] 3-day tournament duration, multiple per week
- [x] Entry submission with title, description, media, pet tagging
- [x] Community voting on entries (toggle votes, no self-voting)
- [x] Auto-finalization: winners get 500/250/100 pts + Champion badge + 1-week tier upgrade
- [x] Auto-seed 3 initial tournaments if none exist
- [x] Admin tournament creation endpoint
- [x] Top Contributor of the Week (points from games + check-ins + posts + likes)
- [x] Weekly leaderboard (Top 10) with caching
- [x] Top Contributor featured banner on Feed page
- [x] Tournament notifications for winners
- [x] Hall of Fame for past champions
- [x] Sidebar & Mobile nav with Tournaments link (NEW badge)

## Remaining Backlog

### P1 - Go Live Deployment
- [x] Swap Stripe test keys for live keys
- [ ] Deploy to petbookin.com (DNS configured, awaiting propagation)

### P1 - Upcoming
- [ ] MySpace Profile enhancements (custom backgrounds, music, themes)

### P2 - Lower Priority
- [ ] User blocking/reporting
- [ ] Push notifications
- [ ] Chat media sharing
- [ ] Marketplace direct payment
- [ ] VIP Tournaments (special events)

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases, tips, tournaments, tournament_entries, weekly_top_contributors
