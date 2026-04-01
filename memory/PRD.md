# Petbookin - Product Requirements Document

## Original Problem Statement
Build "Petbookin" - A complete social network platform for pets. The platform serves pet owners, breeders (verified and hobby), and admins. Features include breeder registry with club credentials (AKC/CKC/UKC + Petbookin), tiered subscriptions (Free/Prime/Pro/Ultra/Mega), AI-generated pet bios, social feed, marketplace, gaming, TikTok-style video/audio content, and MySpace-style profile customization.

## Core Requirements
- Email/Password + Google OAuth authentication
- Pet profiles with species, breeds, photos
- Social feed with posts, likes, comments
- Breeder Registry with external credentials (AKC, CKC, UKC, FCI, KC, ANKC) and Petbookin official credentials
- Verified Breeder Badge for subscribed breeders with credentials
- Admin dashboard with role management (user/moderator/manager)
- Tiered AI bio generation (quality/features scale with tier)
- MySpace-style profile theme customization
- Left sidebar navigation with grouped sections
- Coral (#FF7A6A) + Mustard (#F2B824) color theme
- Real/professional pet imagery (no cartoon/comic)

## Architecture
- Backend: FastAPI + Motor (Async MongoDB) + JWT Auth
- Frontend: React + Tailwind CSS + Shadcn UI
- Database: MongoDB (test_database)
- Integrations: Emergent Google Auth, Emergent LLM (GPT-5.2 for AI bios), Stripe (subscriptions)
- Object Storage: Emergent Object Storage for uploads

## What's Been Implemented (Phase 1) - April 1, 2026
- [x] Clean modular backend architecture (routes/auth, routes/pets, routes/breeder, routes/feed, routes/admin, routes/ai, routes/search, routes/certificates)
- [x] Email/password registration and login
- [x] Google OAuth (Emergent-managed)
- [x] JWT + session token authentication
- [x] Pet CRUD (create, read, update, delete, photo upload)
- [x] Social feed (posts, likes, comments, delete)
- [x] Breeder Registry (register, add AKC/CKC/UKC credentials, get Petbookin credentials, verification)
- [x] Breeder Directory
- [x] Admin Dashboard (stats, user management, role assignment, tier assignment)
- [x] Search (pets, users, breeders, posts)
- [x] Settings (profile update, MySpace-style theme customization with presets + custom colors)
- [x] Membership page (tier display, placeholder for Stripe)
- [x] Left sidebar navigation with grouped sections
- [x] Coral + mustard theme applied
- [x] Error boundaries for crash prevention
- [x] Mobile responsive with bottom tab bar

## What's Been Implemented (Phase 1.5) - April 1, 2026
- [x] Pet of the Week spotlight banner on feed (auto-highlights most-liked pet weekly)
- [x] Petbookin Certification System (AKC-style, cheaper pricing):
  - [x] Individual pet registration with certificate (PBK-CERT-YYYY-XXXXXX)
  - [x] Litter registration (PBK-LTR-YYYY-XXXXXX)
  - [x] Pedigree tracking (sire, dam, bloodline)
  - [x] Ownership transfer (like AKC does when selling a puppy)
  - [x] Tiered fees: $12.99/pet, $29.99/litter, $9.99/transfer (Mega=FREE, Ultra=50% off, Pro=25% off)
  - [x] Professional digital certificate with Petbookin seal/stamp
  - [x] Certificate verification endpoint
- [x] Professional Petbookin SVG seal/logo stamp for certificates

## What's Been Implemented (Phase 2) - April 1, 2026
- [x] Elegant certificate redesign: gold borders, ornate corners, embossed-style stamp, serif typography, pedigree section
- [x] All-species breeder support: 12 species (dog, cat, bird, horse, rabbit, reptile, fish, hamster, ferret, guinea pig, exotic, other)
- [x] Species-specific registries: 19 total (AKC, CKC, UKC, FCI, KC, TICA, CFA, GCCF, ACF, AFA, ABS, AQHA, APHA, USEF, ARBA, BRC, USARK, ANKC, Other)
- [x] Pet-Friendly Places Map:
  - [x] Interactive Leaflet map with OpenStreetMap tiles
  - [x] Geocoding (city/zip/address search via Nominatim)
  - [x] Place search via Overpass API (vets, pet stores, dog parks, groomers, parks)
  - [x] Clickable place cards with phone, website, hours
  - [x] Auto-detect user location

## What's Been Implemented (Phase 3) - April 1, 2026
- [x] Stripe Subscription Integration (Sandbox):
  - [x] POST /api/stripe/create-checkout-session - tier-specific checkout with fixed server-side pricing
  - [x] GET /api/stripe/checkout-status/{session_id} - payment polling with auto tier upgrade
  - [x] POST /api/webhook/stripe - webhook event handler for checkout.session.completed
  - [x] GET /api/stripe/publishable-key - frontend key endpoint
  - [x] payment_transactions collection tracking all payment activity
  - [x] Frontend Membership page with Subscribe buttons, Stripe redirect, and payment polling
  - [x] Tier pricing: Prime $4.99/week, Pro $14.99/month, Ultra $24.99/month, Mega $39.99/month
  - [x] Prevents downgrades, shows current plan status
  - [x] Duplicate payment protection (idempotent status updates)

## Admin Credentials
- Email: admin@petbookin.com
- Password: PetbookinAdmin2026!

## Remaining Backlog

### P0 - High Priority
- A la carte purchases (extra AI gens, promotions)

### P1 - Medium Priority
- TikTok-style video posts (tiered access - view for all, create for higher tiers)
- Suno-style audio clips (tiered access)
- MySpace-style profile customization enhancements (custom backgrounds, music/video backgrounds, avatar system, custom borders)
- Role making system (admin assigns custom site roles and titles)
- Micro-transactions (extra AI generations, post promotions)
- Chat/Messaging system (real-time, pet-to-pet, group)

### P2 - Lower Priority
- Marketplace (buy/sell pets, accessories, services - separate subscription)
- Point system for pet owners
- Mini-games (Pet Puzzle, Treat Catcher, Breed Quiz, Pet Show Champion)
- Gaming section with separate subscription
- VIP Features (tournaments, group gatherings)
- Music/video background for profiles (MySpace-style)
- Daily calendar check-ins

## DB Collections
- users, pets, posts, comments, user_sessions, certificates, litters, payment_transactions

## Key API Endpoints
- Auth: /api/auth/register, /api/auth/login, /api/auth/google-session, /api/auth/me, /api/auth/profile, /api/auth/theme, /api/auth/logout
- Pets: /api/pets, /api/pets/mine, /api/pets/{id}, /api/pets/{id}/photo
- Feed: /api/feed/posts, /api/feed/posts/{id}/like, /api/feed/posts/{id}/comments, /api/feed/pet-of-the-week
- Breeder: /api/breeder/register, /api/breeder/credential/external, /api/breeder/credential/petbookin, /api/breeder/verify, /api/breeder/directory
- Admin: /api/admin/stats, /api/admin/users, /api/admin/assign-role, /api/admin/assign-tier
- AI: /api/ai/generate-bio, /api/ai/limits
- Certificates: /api/certificates/register-pet, /api/certificates/register-litter, /api/certificates/transfer, /api/certificates/mine, /api/certificates/issued, /api/certificates/litters, /api/certificates/verify/{cert_id}, /api/certificates/fees
- Stripe: /api/stripe/create-checkout-session, /api/stripe/checkout-status/{session_id}, /api/stripe/publishable-key
- Webhook: /api/webhook/stripe
- Places: /api/places/search
