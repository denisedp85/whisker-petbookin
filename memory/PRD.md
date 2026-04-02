# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, old-Facebook-style chat, and live streaming with tips. User is preparing to go live on petbookin.com.

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
- [x] Eligibility: 50 likes + 100 points OR paid subscription
- [x] Tier-based time limits (Free=5min → Mega=480min)
- [x] Buy extra time with points or card
- [x] Two categories: General Feed & Marketplace
- [x] Live chat with emoji, camera/mic toggle, viewer count, timer
- [x] Recording via MediaRecorder → Object Storage for replay

### Phase 11 - Tip/Donate System (NEW)
- [x] Points-based tips: 10/25/50/100 pts (instant via WebSocket)
- [x] Card-based tips: $0.99/$1.99/$2.99/$4.99 (Stripe checkout in new tab)
- [x] Points deducted from tipper, credited to broadcaster
- [x] Animated tip notification overlay on stream (slide-in + fade-out)
- [x] Tip menu popup (star icon) in viewer view
- [x] Webhook handles card tips, converts to points for broadcaster
- [x] Tips tracked per stream + broadcaster totals
- [x] My Tips Received dashboard for broadcasters

## Remaining Backlog

### P1 - Go Live Deployment
- [ ] Swap Stripe test keys for live keys (user provides)
- [ ] Deploy to petbookin.com (DNS guidance)

### P1 - Upcoming
- [ ] VIP Tournaments (weekly breeder competitions)
- [ ] MySpace Profile enhancements

### P2 - Lower Priority
- [ ] User blocking/reporting
- [ ] Push notifications
- [ ] Chat media sharing
- [ ] Marketplace direct payment

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases, tips
