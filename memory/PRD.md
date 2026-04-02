# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, and old-Facebook-style chat. The user is now preparing to transition to production (Live Stripe keys) and deploy to their custom domain (`petbookin.com`).

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB
- Integrations: Emergent Google Auth, Emergent LLM (AI bios), Stripe (subscriptions + a la carte), Leaflet/Overpass (maps), Emergent Object Storage (file uploads)

## Completed Features

### Phase 1 - Core Platform
- [x] JWT + Google OAuth auth, Pet CRUD, Social feed, 12-Species Breeder Registry (19 registries)
- [x] Admin Dashboard, Search, Settings, Left sidebar navigation, Error boundaries

### Phase 2 - Premium Features
- [x] Pet of the Week, Petbookin Certification System (individual, litter, pedigree, transfer)
- [x] Pet-Friendly Places Map (Leaflet, Overpass API, geocoding)

### Phase 3 - Monetization
- [x] Stripe subscriptions (Prime/Pro/Ultra/Mega) + webhook + auto-upgrade
- [x] Payment History, A La Carte purchases (AI gens, promotions, live time)
- [x] 7-Day Free Trial (no card, any tier, one-time)
- [x] Tier-based Cancellation Fees (Prime $1.99, Pro $4.99, Ultra $9.99, Mega $14.99)
- [x] VIP Pass ($4.99/week for breeder contact info access)

### Phase 4 - Content & Customization
- [x] TikTok-style video posts + Suno-style audio posts (tier-gated)
- [x] MySpace-style Profile: presets, 10 avatar borders (1 free + 9 premium), music, bg image
- [x] Custom Role Management, Live Emojis everywhere (posts, chat, bios)

### Phase 5 - Chat System
- [x] Old Facebook-style chat popup, DMs, Group chat, emoji picker in chat

### Phase 6 - Marketplace
- [x] Create/browse/delete listings, Category filters, search, sort, inquiry system

### Phase 7 - Gaming & Points
- [x] Breed Quiz, Treat Catcher, Pet Puzzle, Pet Show Champion
- [x] Daily Check-in with streaks, Global Leaderboard

### Phase 8 - Notifications & File Upload
- [x] Notification bell, real-time count badge, Emergent Object Storage

### Phase 9 - VIP & Engagement
- [x] VIP Breeder Directory (puppies.com style), 1-Week VIP Pass ($4.99)
- [x] Premium Avatar Borders (9 premium for subscribers)

### Phase 10 - Live Streaming (NEW)
- [x] WebRTC-based real live video streaming with signaling via WebSocket
- [x] Eligibility system: 50 likes + 100 points OR any paid subscription
- [x] Tier-based time limits: Free=5min, Prime=15min, Pro=30min, Ultra=60min, Mega=480min
- [x] Buy extra time with points (50pts=15min, 100pts=30min, 180pts=60min) or card ($1.99/30min, $3.99/60min)
- [x] Two categories: General Feed and Marketplace (breeders/sellers showcase)
- [x] Live chat with emoji support during streams
- [x] Camera/mic toggle, viewer count, timer, like button
- [x] Stream recording via MediaRecorder, saved to Object Storage for replay
- [x] Browse Live Now, Recordings, My Streams tabs
- [x] WebSocket signaling for WebRTC offer/answer/ICE candidate exchange

## Remaining Backlog

### P1 - Go Live Deployment
- [ ] Swap Stripe test keys for live keys (user must provide)
- [ ] Deploy to petbookin.com (DNS configuration guidance)

### P1 - Upcoming
- [ ] VIP Tournaments (weekly competitions for verified breeders)
- [ ] MySpace-style Profile Customization enhancements

### P2 - Lower Priority
- [ ] User blocking/reporting
- [ ] Push notifications
- [ ] Chat media sharing
- [ ] Marketplace payment integration

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases
