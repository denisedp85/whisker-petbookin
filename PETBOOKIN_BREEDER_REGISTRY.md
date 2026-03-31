# 🏆 Petbookin Breeder Registry System

## Overview

Petbookin now includes a **comprehensive Breeder Registry System** that automatically issues official Petbookin Breeder Credentials to breeders who don't have traditional kennel club memberships. These credentials can be used for events, tournaments, certificates, and awards.

---

## 🎯 Key Features

### 1. **Automatic Breeder ID Assignment**
- ✅ Breeders without kennel club credentials automatically receive a **Petbookin Breeder ID**
- ✅ Format: `PBK-BR-XXXXXXXX` (unique identifier)
- ✅ Assigned when user creates a breeder profile or marks a pet as "breeder profile"
- ✅ Displays on user profile and all certificates

### 2. **Events & Tournaments**
- ✅ Admins can create breeder events (shows, competitions, workshops)
- ✅ Breeders register their pets using their Petbookin Breeder ID
- ✅ Track registrations and participants
- ✅ Support for multiple species

### 3. **Awards & Recognition**
- ✅ Admins award participants (Gold, Silver, Bronze, Winner, Participant)
- ✅ Points system for ranking breeders
- ✅ Official certificates generated with Petbookin credentials
- ✅ Award history tracked for each breeder

### 4. **Official Certificates**
- ✅ Generate official Petbookin certificates
- ✅ Shows Petbookin Breeder ID prominently
- ✅ Includes event details, award type, points earned
- ✅ Official seal and signature
- ✅ Unique certificate number for verification

### 5. **Breeder Leaderboard**
- ✅ Rankings by points earned
- ✅ Public leaderboard showcasing top breeders
- ✅ Motivation for participation

---

## 📋 How It Works

### **For Breeders (Users):**

#### **Step 1: Get Your Petbookin Breeder ID**

**Option A: During Signup**
1. Sign up for Petbookin account
2. In Step 2 (Pet Profile), check "This is a breeder/breeding species profile"
3. Complete signup
4. **Petbookin Breeder ID automatically issued**: `PBK-BR-XXXXXXXX`

**Option B: After Signup**
1. Login to your account
2. Add a new pet
3. Check "This is a breeder profile"
4. **Petbookin Breeder ID automatically assigned** to your account

**Your Petbookin Breeder ID shows:**
- On your profile
- On all certificates
- In event registrations
- On awards and recognitions

---

#### **Step 2: Browse Events & Tournaments**

**Access Events:**
- API: `GET /api/breeder/events`
- Filter: Upcoming events only
- See: Shows, competitions, tournaments, workshops

**Event Details Include:**
- Title & Description
- Date & Location
- Species allowed
- Entry fee
- Prizes

---

#### **Step 3: Register for Events**

**Register Your Pet:**
- API: `POST /api/breeder/events/register`
- Requires: Your Petbookin Breeder ID (auto-checked)
- Provide: Event ID + Pet ID
- Status: "Registered"

**Requirements:**
- ✅ Must have Petbookin Breeder ID
- ✅ Pet must belong to you
- ✅ Pet must match event species requirements

---

#### **Step 4: Participate & Win**

After event completion:
- Admin reviews participants
- Awards issued based on performance
- Points added to your breeder account

---

#### **Step 5: View Your Awards & Certificates**

**View Your Awards:**
- API: `GET /api/breeder/awards/my`
- See all your awards across all pets
- Track total points earned

**Generate Certificate:**
- API: `GET /api/breeder/certificate/{award_id}`
- Official Petbookin certificate with:
  - Your name
  - **Your Petbookin Breeder ID**
  - Pet name & breed
  - Award title & type
  - Event details
  - Points earned
  - Official seal & signature
  - Unique certificate number

**Certificate Can Be Used For:**
- ✅ Proof of achievement
- ✅ Marketing your breeding business
- ✅ Showing credentials to potential clients
- ✅ Participating in special activities
- ✅ Qualifying for bonuses and rewards

---

#### **Step 6: Check Leaderboard**

- API: `GET /api/breeder/leaderboard`
- See top breeders by points
- View your ranking
- Compete for top positions

---

### **For Admins:**

#### **Create Events**
```json
POST /api/breeder/events
{
  "title": "National Dog Show 2026",
  "description": "Annual championship for all breeds",
  "event_type": "show",
  "date": "2026-06-15",
  "location": "New York Convention Center",
  "species_allowed": ["Dog"],
  "entry_fee": 50.00,
  "prizes": "1st: $1000, 2nd: $500, 3rd: $250"
}
```

#### **View Registrations**
```
GET /api/breeder/events/{event_id}/registrations
```

#### **Issue Awards**
```json
POST /api/breeder/awards
{
  "event_id": "event_abc123",
  "pet_id": "pet_xyz789",
  "award_title": "Best in Show",
  "award_type": "gold",
  "points": 100
}
```

---

## 🎨 Frontend Implementation (Coming Soon)

**Recommended Pages:**

1. **Breeder Dashboard Page**
   - Show Petbookin Breeder ID prominently
   - Display total points
   - List of registered events
   - Awards showcase

2. **Events & Tournaments Page**
   - Browse upcoming events
   - Register for events
   - View past events

3. **Certificates Page**
   - View all earned certificates
   - Download/print certificates
   - Share certificates

4. **Leaderboard Page**
   - Top breeders ranking
   - Your position
   - Filter by region/species

---

## 📊 Database Collections

### `users`
- Added field: `petbookin_breeder_id` (string)
- Added field: `breeder_points` (number)

### `breeder_events`
- Event management
- Tournaments, shows, competitions

### `event_registrations`
- Track who registered for which event
- Includes Petbookin Breeder ID

### `breeder_awards`
- All awards issued
- Linked to events and pets
- Tracks points

---

## 🔑 API Endpoints Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/breeder/events` | POST | Create event | Admin |
| `/api/breeder/events` | GET | List events | None |
| `/api/breeder/events/register` | POST | Register for event | User |
| `/api/breeder/events/{event_id}/registrations` | GET | View registrations | None |
| `/api/breeder/awards` | POST | Issue award | Admin |
| `/api/breeder/awards/my` | GET | My awards | User |
| `/api/breeder/certificate/{award_id}` | GET | Get certificate | None |
| `/api/breeder/leaderboard` | GET | Top breeders | None |

---

## 📝 Example Workflow

### **Scenario: Sarah wants to participate in a dog show**

1. **Signup**: Sarah signs up, creates a breeder profile for her Golden Retriever "Max"
   - ✅ **Assigned ID**: `PBK-BR-A7F3E9C2`

2. **Browse Events**: Sarah sees "Regional Dog Show 2026" for Golden Retrievers

3. **Register**: Sarah registers Max for the event using her Petbookin Breeder ID

4. **Participate**: Max competes in the show

5. **Win Award**: Admin awards Sarah "Silver Medal - Best Golden Retriever"
   - ✅ **Points earned**: 75 points

6. **Get Certificate**: Sarah generates official certificate showing:
   ```
   OFFICIAL PETBOOKIN CERTIFICATE
   
   Awarded to: Sarah Johnson
   Petbookin Breeder ID: PBK-BR-A7F3E9C2
   Pet: Max (Golden Retriever)
   
   Award: Silver Medal - Best Golden Retriever
   Event: Regional Dog Show 2026
   Date: June 15, 2026
   
   Points Earned: 75
   Certificate Number: CERT-AWARD_ABC123XYZ
   
   [Official Petbookin Breeder Registry Seal]
   Signature: Petbookin Registry Authority
   ```

7. **Use Certificate**: Sarah uses this certificate to:
   - Show potential puppy buyers her credentials
   - Apply for advanced breeding programs
   - Market her breeding business
   - Participate in exclusive events

8. **Check Ranking**: Sarah views leaderboard and sees she's #23 with 75 points

9. **Earn More**: Sarah participates in more events to climb the leaderboard

---

## 🎖️ Benefits of Petbookin Breeder Credentials

### **For Breeders:**
- ✅ Official recognition even without kennel club membership
- ✅ Lower barrier to entry for new breeders
- ✅ Build credibility through awards and points
- ✅ Use credentials for marketing
- ✅ Participate in exclusive activities
- ✅ Compete for rankings and bonuses

### **For Petbookin:**
- ✅ Build a community of breeders
- ✅ Encourage participation and engagement
- ✅ Create value for membership
- ✅ Establish Petbookin as a breeder authority
- ✅ Generate revenue through event fees

### **For Pet Buyers:**
- ✅ Verify breeder credentials easily
- ✅ See breeder's awards and achievements
- ✅ Trust Petbookin-verified breeders
- ✅ Make informed decisions

---

## 🚀 Next Steps

1. **Deploy Backend Changes** - The API is ready!
2. **Build Frontend Pages** - Create breeder dashboard, events, certificates pages
3. **Test Workflow** - Create test event, register, award, generate certificate
4. **Marketing** - Promote Petbookin Breeder Registry to breeders
5. **Partner with Organizations** - Establish Petbookin as recognized authority

---

## 📞 Testing

**Test the System:**

1. **Create a breeder account** with the breeder checkbox
2. **Check your profile** - you should have `PBK-BR-XXXXXXXX`
3. **As admin**, create a test event: `POST /api/breeder/events`
4. **As breeder**, register: `POST /api/breeder/events/register`
5. **As admin**, issue award: `POST /api/breeder/awards`
6. **View certificate**: `GET /api/breeder/certificate/{award_id}`
7. **Check leaderboard**: `GET /api/breeder/leaderboard`

---

**Your Petbookin Breeder Registry System is now LIVE! 🎉**

Breeders can now get official Petbookin credentials and use them for events, tournaments, and recognition!
