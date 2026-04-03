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

### Phase 15 - Bug Fixes (Apr 3, 2026)
- [x] Chat widget drag fix (useRef-based stable event handlers, didDrag prevents click-after-drag)
- [x] Map data expanded (added 6 new OSM tags, result limit 50→500, radius 15km→25km, cache 24h→6h)
- [x] New "Pet-Friendly" place category + Refresh button on map
- [x] Stale places cache auto-cleared on startup
- [x] dedape1985@gmail.com permanently deleted from system (startup script + DB cleanup)
- [x] Stripe live keys updated in preview .env

### Phase 16 - Comprehensive Audit & Post Deletion Fix (Apr 3, 2026)
- [x] Fixed PostCard.js: changed owner_id to author_id (delete button was NEVER showing)
- [x] Added admin check to PostCard delete visibility (admins can now delete any post)
- [x] Added "Data Management" tab in Admin Dashboard (Clean Up Test Data + Delete All Posts)
- [x] Full E2E audit: signup, login, logout, post CRUD, admin, settings, map, marketplace, chat — ALL passing

### Phase 18 - Code Quality Audit Fixes (Apr 3, 2026)
- [x] Security: Replaced MD5 with SHA-256 in places.py cache key hashing
- [x] Security: Moved hardcoded credentials to env vars in seed_admin.py and all test files
- [x] Security: Fixed undefined variable safety in uploads.py (result initialization)
- [x] Lint: Removed unused variables in admin.py (3) and webhook.py (1)
- [x] Lint: Fixed f-strings without placeholders in seed_admin.py and chat.py
- [x] React: Fixed empty catch blocks in 6 pages (added console.error logging)
- [x] React: Replaced index-as-key with stable keys in 7 files (VIPDirectory, Tournaments, SignUp, Live, Games, PetbookinSeal)
- [x] Note: React hooks deps reviewed - existing deps are correct (useState setters are stable refs)

### Phase 19 - Games Expansion, Lives & Coin System (Apr 3, 2026)
- [x] 3 new games: Paw Match (match-3, 7x7 grid, 60s timer), Pet Memory (12-card flip), Breed Scramble (5-word rounds)
- [x] Lives system: 5 max lives, regenerate 1 every 30 min, each game costs 1 life
- [x] Coin system: earn from games, spend on extra lives (20 coins each)
- [x] Coin Shop: 3 Stripe packages ($0.99/100, $3.99/500, $9.99/1500 coins)
- [x] Weekly Awards tab: auto-aggregated leaderboard with champion recognition
- [x] All game submissions award points that track in user.points
- [x] Coin purchases handled via Stripe webhook (type=coin_purchase)
- [x] Theme presets now apply globally: AppLayout applies bg_color/video_bg_url, FeedPage applies card_bg/text_color/accent to cards
- [x] Background presets auto-save on click (no more needing Save button)
- [x] File upload buttons for backgrounds AND music (uses Emergent Object Storage)
- [x] URL inputs auto-save on blur
- [x] Password visibility toggle (Eye/EyeOff) on login and signup forms
- [x] Chat widget enhanced: Tab Bar mode, Floating Bubble mode, Lock/Unlock position, Snap to corners (BR/BL/TR/TL)
- [x] Chat settings persist in localStorage

## Remaining Backlog

### P1 - Go Live Deployment
- [ ] Deploy to petbookin.com (user to update Deployment Secrets with live Stripe keys and hit Re-Deploy)

### P2 - Future Ideas
- [ ] Push notifications (browser)
- [ ] Chat media sharing (images in chat)
- [ ] Seller payout request system
- [ ] Stripe Connect upgrade (direct seller payouts)

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles, conversations, messages, marketplace_listings, marketplace_inquiries, game_sessions, daily_checkins, notifications, files, vip_passes, trials, live_streams, live_time_purchases, tips, tournaments, tournament_entries, weekly_top_contributors, blocked_users, reports, places_cache, friendships
