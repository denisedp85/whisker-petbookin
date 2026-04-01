# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A complete social network platform for pets. The platform serves pet owners, breeders (verified and hobby), and admins. Features include breeder registry with club credentials (AKC/CKC/UKC + Petbookin), tiered subscriptions (Free/Prime/Pro/Ultra/Mega), AI-generated pet bios, social feed, marketplace, gaming, TikTok-style video/audio content, and MySpace-style profile customization.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB (test_database)
- Integrations: Emergent Google Auth, Emergent LLM (GPT-5.2 for AI bios), Stripe (subscriptions + a la carte)
- Maps: Leaflet + Overpass API (OSM)

## Completed Features

### Phase 1 - Core Platform (April 1, 2026)
- [x] Clean modular backend (routes/auth, pets, breeder, feed, admin, ai, search, certificates, places, stripe, webhook)
- [x] Email/password registration and login + Google OAuth (Emergent-managed)
- [x] JWT + session token authentication
- [x] Pet CRUD with photo upload
- [x] Social feed (posts, likes, comments, delete)
- [x] 12-Species Breeder Registry with AKC/CKC/UKC credentials + Petbookin credentials
- [x] Breeder Directory + Verification
- [x] Admin Dashboard (stats, user management, role assignment, tier assignment)
- [x] Search (pets, users, breeders, posts)
- [x] Settings (profile update, theme customization)
- [x] Left sidebar navigation with grouped sections
- [x] Coral (#FF7A6A) + Mustard (#F2B824) theme
- [x] Error boundaries

### Phase 2 - Premium Features (April 1, 2026)
- [x] Pet of the Week spotlight banner
- [x] Petbookin Certification System (individual, litter, pedigree, ownership transfer)
- [x] Professional SVG seal/logo stamp for certificates
- [x] Elegant certificate redesign: gold borders, ornate corners, embossed stamp, serif typography
- [x] Pet-Friendly Places Map (Leaflet, Overpass API, geocoding, place search)

### Phase 3 - Monetization (April 1, 2026)
- [x] Stripe Sandbox integration (4 tier subscriptions)
- [x] POST /api/stripe/create-checkout-session + GET checkout-status
- [x] POST /api/webhook/stripe (handles both subscriptions + a la carte)
- [x] Frontend Membership page with Subscribe buttons + polling
- [x] Tier pricing: Prime $4.99/wk, Pro $14.99/mo, Ultra $24.99/mo, Mega $39.99/mo

### Phase 4 - Features Expansion (April 1, 2026)
- [x] Payment History (Settings > Billing tab)
- [x] Custom Role Management System (admin creates/assigns roles with colors/badges)
- [x] TikTok-style Video Posts (tier-gated: Ultra+ to create, everyone can view)
- [x] Suno-style Audio Posts (tier-gated: Pro+ to create, everyone can view)
- [x] YouTube iframe embeds + HTML5 audio player rendering in feed
- [x] MySpace-style Profile Customization:
  - [x] 6 Preset themes (Default, Ocean, Forest, Sunset, Midnight, Rose Gold)
  - [x] 6 Avatar border styles (Default, Gold Ring, Rainbow, Coral Glow, Purple Aura, Diamond)
  - [x] Profile Music URL (plays for visitors)
  - [x] Background Image URL
  - [x] Custom color picker (bg, card, text, accent)
- [x] A La Carte Micro-transactions:
  - [x] 10 AI Generations ($2.99)
  - [x] 50 AI Generations ($9.99)
  - [x] Post Promotion 1 Week ($4.99)

## Remaining Backlog

### P1 - Medium Priority
- Chat/Messaging system (real-time, pet-to-pet, group)
- File upload for videos/audio (currently URL-based, needs object storage)
- Post promotion display logic (promoted posts shown higher in feed)

### P2 - Lower Priority
- Marketplace (buy/sell pets, accessories, services)
- Point system for pet owners (earn from activities)
- Mini-games (Pet Puzzle, Treat Catcher, Breed Quiz, Pet Show Champion)
- Gaming section
- VIP Features (tournaments, group gatherings for verified breeders)
- Daily calendar check-ins

## Key API Endpoints
- Auth: /api/auth/register, /api/auth/login, /api/auth/google-session, /api/auth/me, /api/auth/profile, /api/auth/theme, /api/auth/logout
- Pets: /api/pets, /api/pets/mine, /api/pets/{id}, /api/pets/{id}/photo
- Feed: /api/feed/posts (supports post_type=text|video|audio + media_url), /api/feed/posts/{id}/like, /api/feed/posts/{id}/comments, /api/feed/pet-of-the-week
- Breeder: /api/breeder/register, /api/breeder/credential/external, /api/breeder/credential/petbookin, /api/breeder/verify, /api/breeder/directory
- Admin: /api/admin/stats, /api/admin/users, /api/admin/assign-role, /api/admin/assign-tier, /api/admin/custom-roles (GET/POST/DELETE)
- AI: /api/ai/generate-bio, /api/ai/limits
- Certificates: /api/certificates/register-pet, /api/certificates/register-litter, /api/certificates/transfer, /api/certificates/mine, /api/certificates/verify/{cert_id}, /api/certificates/fees
- Stripe: /api/stripe/create-checkout-session, /api/stripe/checkout-status/{session_id}, /api/stripe/publishable-key, /api/stripe/payment-history, /api/stripe/purchase-pack, /api/stripe/pack-checkout-status/{session_id}
- Webhook: /api/webhook/stripe
- Places: /api/places/search

## DB Collections
users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions, custom_roles
