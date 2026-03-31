# PawBook - Pet Social Network PRD

## Original Problem Statement
Build a community-based social site that looks and feels like the early stages of Facebook, but that is all about their pet even when signing up and interacting with each other. The member profile can be of one pet or of their breeding species.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **Database**: MongoDB (test_database)
- **Storage**: Emergent Object Storage (for pet photos, post images)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (pet bio generation)
- **Auth**: JWT + Emergent Google OAuth

## User Personas
1. **Pet Owner** - Casual user with 1+ pets, wants to share pet moments
2. **Breeder** - Professional with kennel club registration, breeding species profiles
3. **Pet Lover** - Browsing community, engaging with content

## Core Requirements
- Pet-first social profiles (pets are the main identity)
- Owner/breeder mini bio with hobbies and interests
- Kennel club verification (AKC, CKC, UKC, FCI, KC)
- News feed with text + photo posts
- Comments and likes system
- Friend/follow system between pets
- AI-generated pet bios
- Photo uploads via object storage
- Multi-step signup flow (Account → Pet → Kennel Club)

## What's Been Implemented (March 2026)
### Backend
- [x] JWT auth (register, login, token validation)
- [x] Google OAuth via Emergent Auth
- [x] Pet CRUD with extended profiles
- [x] Posts with image upload support
- [x] Comments and likes (with toggle)
- [x] Friend request/accept/reject system
- [x] Pet search with species/breed filters
- [x] Object storage integration for file uploads
- [x] AI bio generation via GPT-5.2
- [x] Owner/breeder profile management
- [x] Kennel club verification fields

### Frontend
- [x] Landing page (early Facebook aesthetic)
- [x] Multi-step signup (Account → Pet → Kennel Club)
- [x] 3-column feed page (Holy Grail layout)
- [x] Post creation with photo upload + AI write
- [x] Post cards with likes, comments
- [x] Pet profile page with About/Posts/Friends tabs
- [x] Friends page with request management
- [x] Search page with species filter
- [x] Settings page (owner profile + pet editing)
- [x] Navbar with pet switcher + user menu
- [x] Google OAuth callback handling

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✅

### P1 (High)
- [ ] Photo albums page (upload and organize by album)
- [ ] Notification system (friend requests, likes, comments)
- [ ] Pet profile photo display in avatars throughout app
- [ ] Infinite scroll for feed

### P2 (Medium)
- [ ] Kennel club verification process (admin approval)
- [ ] Pet breed identification via AI image analysis
- [ ] Direct messaging between pet owners
- [ ] Share posts functionality
- [ ] Pet birthday/event calendar

### P3 (Nice-to-have)
- [ ] Pet matchmaking for playdates
- [ ] Breeder marketplace
- [ ] Pet health tracking dashboard
- [ ] Community groups by breed/species

## Next Tasks
1. Photo albums page with gallery view
2. Notification system with real-time updates
3. Infinite scroll feed
4. Direct messaging
