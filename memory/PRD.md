# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace, gaming, MySpace-style profiles, and old-Facebook-style chat.

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

### Phase 4 - Content & Customization
- [x] TikTok-style video posts (Ultra+ gated) + Suno-style audio posts (Pro+ gated)
- [x] YouTube iframe embeds + HTML5 audio player in feed
- [x] MySpace-style Profile: 6 presets, 6 avatar borders, music URL, bg image, custom colors
- [x] Custom Role Management (admin creates roles with colors/badges)

### Phase 5 - Chat System
- [x] Old Facebook-style chat popup at bottom-right
- [x] Direct messaging with contacts panel, search, unread badges
- [x] Group chat (create groups, send messages, member list)
- [x] Chat windows (max 3, minimize/close)
- [x] Polling-based real-time messaging

### Phase 6 - Marketplace
- [x] Create/browse/delete listings (pets, accessories, services, food)
- [x] Category filters, search, sort, inquiry system, My Listings view

### Phase 7 - Gaming & Points
- [x] Breed Quiz (5 questions, 10 pts each)
- [x] Treat Catcher (arcade, max 15 pts)
- [x] Pet Puzzle (sliding tiles, max 20 pts)
- [x] Pet Show Champion (pet judging, max 25 pts)
- [x] Daily Check-in with streaks (5 pts/day, max 50)
- [x] Global Leaderboard, post promotion display logic

### Phase 8 - Notifications & File Upload
- [x] Notification bell in sidebar with dropdown panel
- [x] Real-time notification count badge
- [x] Auto-notifications on new messages
- [x] Native file upload via Emergent Object Storage (video, audio, images)
- [x] Feed posts support both URL and file upload for media

## Remaining Backlog

### P2 - Lower Priority
- VIP Features (tournaments, group gatherings for verified breeders)
- User blocking/reporting
- Push notifications (browser/mobile)
- Chat media sharing (images in chat)
- Marketplace payment integration (buy directly)

## Key Routes
- Auth, Pets, Feed, Chat (direct + groups), Marketplace, Games, Breeder, Admin, AI, Certificates, Stripe, Webhook, Notifications, Uploads, Places, Search

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files
