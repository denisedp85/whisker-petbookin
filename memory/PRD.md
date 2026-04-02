# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A complete social network platform for pets. Features include breeder registry, tiered subscriptions, AI-generated pet bios, social feed with video/audio, marketplace, gaming, MySpace-style profiles, and old-Facebook-style chat.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB
- Integrations: Emergent Google Auth, Emergent LLM (AI bios), Stripe (subscriptions + a la carte), Leaflet/Overpass (maps)

## Completed Features

### Phase 1 - Core Platform
- [x] JWT + Google OAuth auth, Pet CRUD, Social feed, Breeder Registry (12 species, 19 registries)
- [x] Admin Dashboard, Search, Settings with theme customization
- [x] Left sidebar navigation, Coral/Mustard theme, Error boundaries

### Phase 2 - Premium Features
- [x] Pet of the Week, Petbookin Certification (individual, litter, pedigree, transfer)
- [x] Pet-Friendly Places Map (Leaflet, Overpass API)

### Phase 3 - Monetization
- [x] Stripe subscriptions (Prime/Pro/Ultra/Mega) + webhook + auto-upgrade
- [x] Payment History in Settings > Billing tab
- [x] A La Carte purchases (10/50 AI gens, post promotions)

### Phase 4 - Content & Customization
- [x] TikTok-style video posts (Ultra+ tier-gated creation)
- [x] Suno-style audio posts (Pro+ tier-gated creation)
- [x] YouTube iframe embeds + HTML5 audio player in feed
- [x] MySpace-style Profile: 6 presets, 6 avatar borders, music URL, bg image URL, custom colors
- [x] Custom Role Management (admin creates roles with colors/badges)

### Phase 5 - Chat System
- [x] Old Facebook-style chat popup at bottom-right corner
- [x] Contacts panel with search and conversation previews
- [x] Individual chat windows (max 3 open, minimize/close)
- [x] Real-time-like messaging via polling (4s messages, 8s conversations)
- [x] Unread count badge on chat toggle button
- [x] Read receipts and message marking

### Phase 6 - Marketplace
- [x] Create/browse/delete listings (pets, accessories, services, food)
- [x] Category filters, search, sort (newest, price low/high)
- [x] Listing detail with view counter and seller info
- [x] Inquiry system (send message to seller)
- [x] My Listings view

### Phase 7 - Gaming & Points
- [x] Breed Quiz game (5 random questions, 10 pts per correct answer)
- [x] Daily Check-in with streak system (5 pts/day, max 50)
- [x] Global Leaderboard (ranked by points)
- [x] 4 game slots (Quiz playable, 3 coming soon: Treat Catcher, Pet Puzzle, Pet Show)
- [x] Points balance displayed in header
- [x] Post promotion display logic (promoted posts shown first)

## Remaining Backlog

### P1
- Chat: Group chat support
- More mini-games (Treat Catcher, Pet Puzzle, Pet Show Champion)
- Native file upload for video/audio (object storage)

### P2
- VIP Features (tournaments, group gatherings for verified breeders)
- Notification system (push/in-app)
- User blocking/reporting

## Key API Endpoints
- Auth: /api/auth/{register, login, google-session, me, profile, theme, logout}
- Pets: /api/pets, /api/pets/mine, /api/pets/{id}, /api/pets/{id}/photo
- Feed: /api/feed/posts (post_type=text|video|audio), /api/feed/posts/{id}/like, /api/feed/posts/{id}/comments, /api/feed/pet-of-the-week
- Chat: /api/chat/{contacts, conversations, conversations/{id}/messages, unread-count}
- Marketplace: /api/marketplace/{listings, listings/{id}, listings/{id}/inquire, my-listings}
- Games: /api/games/{available, leaderboard, breed-quiz/start, breed-quiz/submit, daily-checkin}
- Breeder: /api/breeder/{register, credential/external, credential/petbookin, verify, directory}
- Admin: /api/admin/{stats, users, assign-role, assign-tier, custom-roles}
- Stripe: /api/stripe/{create-checkout-session, checkout-status/{id}, publishable-key, payment-history, purchase-pack, pack-checkout-status/{id}}
- Webhook: /api/webhook/stripe
- Certificates: /api/certificates/{register-pet, register-litter, transfer, mine, verify/{cert_id}, fees}
- Places: /api/places/search

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins
