# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, and old-Facebook-style chat. User is preparing to go live on petbookin.com with real Stripe keys.

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
- [x] Payment History in Settings > Billing tab
- [x] A La Carte purchases (10/50 AI gens, post promotions)
- [x] 7-Day Free Trial (no card required, any tier, one-time use)
- [x] Tier-based Cancellation Fees (Prime $1.99, Pro $4.99, Ultra $9.99, Mega $14.99)
- [x] VIP Pass ($4.99/week access to breeder contact info)

### Phase 4 - Content & Customization
- [x] TikTok-style video posts (Ultra+ gated) + Suno-style audio posts (Pro+ gated)
- [x] YouTube iframe embeds + HTML5 audio player in feed
- [x] MySpace-style Profile: 6 presets, 10 avatar borders (1 free + 9 premium), music URL, bg image, custom colors
- [x] Custom Role Management (admin creates roles with colors/badges)

### Phase 5 - Chat System
- [x] Old Facebook-style chat popup at bottom-right
- [x] Direct messaging with contacts panel, search, unread badges
- [x] Group chat (create groups, send messages, member list)
- [x] Chat windows (max 3, minimize/close)
- [x] Polling-based real-time messaging
- [x] Emoji picker in chat input

### Phase 6 - Marketplace
- [x] Create/browse/delete listings (pets, accessories, services, food)
- [x] Category filters, search, sort, inquiry system, My Listings view

### Phase 7 - Gaming & Points
- [x] Breed Quiz, Treat Catcher, Pet Puzzle, Pet Show Champion
- [x] Daily Check-in with streaks, Global Leaderboard

### Phase 8 - Notifications & File Upload
- [x] Notification bell, real-time count badge, auto-notifications
- [x] Native file upload via Emergent Object Storage

### Phase 9 - VIP & Engagement Features (NEW)
- [x] VIP Breeder Directory (puppies.com style) - search/filter breeders, contact info gated
- [x] 1-Week VIP Access Pass ($4.99) for non-subscribers
- [x] Live Emojis - Animated emoji picker in posts, chat, and bios (free for everyone)
- [x] Premium Avatar Borders (9 premium styles for subscribers, 1 default free)
- [x] 7-Day Free Trial activation (no credit card)
- [x] Subscription cancellation with tier-based fees via Stripe checkout

## Remaining Backlog

### P1 - Go Live
- [ ] Swap Stripe test keys for live keys (user must provide)
- [ ] Deploy to petbookin.com (DNS configuration guidance)

### P1 - Upcoming
- [ ] VIP Tournaments (weekly competitions for verified breeders)
- [ ] MySpace-style Profile Customization enhancements

### P2 - Lower Priority
- [ ] User blocking/reporting
- [ ] Push notifications (browser/mobile)
- [ ] Chat media sharing (images in chat)
- [ ] Marketplace payment integration (buy directly)

## Key Routes
Auth, Pets, Feed, Chat (direct + groups), Marketplace, Games, Breeder, Admin, AI, Certificates, Stripe, Webhook, Notifications, Uploads, Places, Search, VIP Directory

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials
