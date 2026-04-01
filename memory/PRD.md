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
- Integrations: Emergent Google Auth, Emergent LLM (GPT-5.2 for AI bios)
- Object Storage: Emergent Object Storage for uploads

## What's Been Implemented (Phase 1) - April 1, 2026
- [x] Clean modular backend architecture (routes/auth, routes/pets, routes/breeder, routes/feed, routes/admin, routes/ai, routes/search)
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

## Admin Credentials
- Email: admin@petbookin.com
- Password: PetbookinAdmin2026!

## Remaining Backlog

### P0 - High Priority
- Stripe integration for subscriptions (waiting for user's new Stripe keys)
- A la carte purchases (extra AI gens, promotions)

### P1 - Medium Priority
- Chat/Messaging system (real-time, pet-to-pet, group)
- Marketplace (buy/sell pets, accessories, services - separate subscription)
- TikTok-style video posts (tiered access - view for all, create for higher tiers)
- Suno-style audio clips (tiered access)
- Profile picture upload + avatar system + custom borders

### P2 - Lower Priority
- Point system for pet owners
- Mini-games (Pet Puzzle, Treat Catcher, Breed Quiz, Pet Show Champion)
- Gaming section with separate subscription
- VIP Features
- Music/video background for profiles (MySpace-style)
- Daily calendar check-ins

## DB Collections
- users, pets, posts, comments, user_sessions

## Key API Endpoints
- Auth: /api/auth/register, /api/auth/login, /api/auth/google-session, /api/auth/me, /api/auth/profile, /api/auth/theme, /api/auth/logout
- Pets: /api/pets, /api/pets/mine, /api/pets/{id}, /api/pets/{id}/photo
- Feed: /api/feed/posts, /api/feed/posts/{id}/like, /api/feed/posts/{id}/comments
- Breeder: /api/breeder/register, /api/breeder/credential/external, /api/breeder/credential/petbookin, /api/breeder/verify, /api/breeder/directory
- Admin: /api/admin/stats, /api/admin/users, /api/admin/assign-role, /api/admin/assign-tier
- AI: /api/ai/generate-bio, /api/ai/limits
- Search: /api/search
