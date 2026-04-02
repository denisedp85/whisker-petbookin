# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A social network for pets with breeder registry, tiered subscriptions, AI bios, video/audio feed, marketplace with payments, gaming, MySpace-style profiles, old-Facebook-style chat, live streaming with tips, weekly tournaments, top contributor system, user blocking/reporting, and custom profile backgrounds/music.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth + WebSocket
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB
- Integrations: Emergent Google Auth, Emergent LLM (AI bios), Stripe (subscriptions + a la carte + tips + marketplace), Leaflet/Overpass (maps), Emergent Object Storage (file uploads)

## All Completed Features

### Core Platform
- [x] JWT + Google OAuth auth, Pet CRUD, Social feed, 12-Species Breeder Registry
- [x] Admin Dashboard, Search, Settings, Left sidebar, Error boundaries

### Premium & Monetization
- [x] Stripe subscriptions (Prime/Pro/Ultra/Mega) + webhook + auto-upgrade
- [x] Payment History, A La Carte, 7-Day Trial, Cancellation Fees, VIP Pass
- [x] Marketplace Direct Payments (10% platform fee, seller dashboard)

### Content & Social
- [x] TikTok-style video + Suno audio posts (tier-gated)
- [x] Old Facebook-style chat popup (now draggable), DMs, Group chat
- [x] Pet of the Week, Certification System, Pet-Friendly Places Map (cached)

### Engagement
- [x] Weekly Tournaments (3 types, 3-day rounds, auto-finalize, prizes)
- [x] Top Contributor of the Week (leaderboard, featured on Feed)
- [x] Breed Quiz, Treat Catcher, Pet Puzzle, Pet Show Champion
- [x] Daily Check-in, streaks, Global Leaderboard

### Live & VIP
- [x] WebRTC live streaming + tips + animated overlays
- [x] VIP Breeder Directory, Premium Avatar Borders

### Phase 14 - MySpace Profiles + Blocking/Reporting (Apr 2, 2026)
- [x] 8 background presets for profile covers (nature, pets, gradients)
- [x] Custom background URL input
- [x] Profile music URL with audio preview player
- [x] Music plays on profile visit (toggle button)
- [x] Custom backgrounds render on profile cover
- [x] Silent user blocking (hides their content from your feed)
- [x] Block notifications sent to admins only
- [x] User/post reporting with 5 reason categories
- [x] Admin reports queue with resolve actions (dismiss, warn, ban)
- [x] Feed filters out blocked users' posts
- [x] Logout button on Settings page Account tab
- [x] Profile page block/report buttons for non-owners

## Remaining Backlog

### P1 - Go Live Deployment
- [ ] Deploy to petbookin.com (DNS configured, fix ENABLE_HEALTH_CHECK + Stripe live keys)

### P2 - Future Ideas
- [ ] Push notifications (browser)
- [ ] Chat media sharing (images in chat)
- [ ] Seller payout request system
- [ ] Stripe Connect upgrade (direct seller payouts)

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases, tips, tournaments, tournament_entries, weekly_top_contributors, blocked_users, reports, places_cache, friendships
