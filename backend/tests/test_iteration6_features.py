"""
Iteration 6 Feature Tests: Chat, Marketplace, and Games
Tests for:
- Chat: contacts, conversations CRUD, messages, unread count
- Marketplace: listings CRUD, inquire, my-listings
- Games: breed quiz, daily checkin, leaderboard
- Feed: promoted posts sorting
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
FREE_USER_EMAIL = "freeuser@test.com"
FREE_USER_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        """Get free user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL,
            "password": FREE_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Free user login failed: {response.status_code} - {response.text}")
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print(f"✓ Admin login successful")
    
    def test_free_user_login(self, free_user_token):
        """Verify free user can login"""
        assert free_user_token is not None
        print(f"✓ Free user login successful")


class TestChatEndpoints:
    """Chat system endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL, "password": FREE_USER_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    def test_get_contacts(self, admin_token):
        """GET /api/chat/contacts - returns list of other users"""
        response = requests.get(
            f"{BASE_URL}/api/chat/contacts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "contacts" in data
        assert isinstance(data["contacts"], list)
        print(f"✓ GET /api/chat/contacts - returned {len(data['contacts'])} contacts")
    
    def test_get_contacts_requires_auth(self):
        """GET /api/chat/contacts - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/contacts")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ GET /api/chat/contacts - correctly requires auth")
    
    def test_get_conversations(self, admin_token):
        """GET /api/chat/conversations - returns user's conversations"""
        response = requests.get(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        print(f"✓ GET /api/chat/conversations - returned {len(data['conversations'])} conversations")
    
    def test_create_conversation(self, admin_token, free_user_token):
        """POST /api/chat/conversations - creates or retrieves existing direct conversation"""
        # First get free user's user_id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert me_response.status_code == 200
        free_user_id = me_response.json().get("user_id")
        
        # Create conversation from admin to free user
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"participant_id": free_user_id}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "conversation_id" in data
        assert "other_user" in data
        print(f"✓ POST /api/chat/conversations - conversation created/retrieved: {data['conversation_id']}")
        return data["conversation_id"]
    
    def test_send_message(self, admin_token, free_user_token):
        """POST /api/chat/conversations/{conv_id}/messages - sends a message"""
        # Get free user id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        free_user_id = me_response.json().get("user_id")
        
        # Create/get conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"participant_id": free_user_id}
        )
        conv_id = conv_response.json().get("conversation_id")
        
        # Send message
        test_message = f"TEST_MSG_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"content": test_message}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message_id" in data
        assert data["content"] == test_message
        print(f"✓ POST /api/chat/conversations/{conv_id}/messages - message sent: {data['message_id']}")
    
    def test_get_messages(self, admin_token, free_user_token):
        """GET /api/chat/conversations/{conv_id}/messages - returns messages and marks as read"""
        # Get free user id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        free_user_id = me_response.json().get("user_id")
        
        # Create/get conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"participant_id": free_user_id}
        )
        conv_id = conv_response.json().get("conversation_id")
        
        # Get messages
        response = requests.get(
            f"{BASE_URL}/api/chat/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"✓ GET /api/chat/conversations/{conv_id}/messages - returned {len(data['messages'])} messages")
    
    def test_get_unread_count(self, admin_token):
        """GET /api/chat/unread-count - returns total unread messages"""
        response = requests.get(
            f"{BASE_URL}/api/chat/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ GET /api/chat/unread-count - unread count: {data['unread_count']}")
    
    def test_cannot_chat_with_self(self, admin_token):
        """POST /api/chat/conversations - cannot create conversation with self"""
        # Get admin's user_id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_user_id = me_response.json().get("user_id")
        
        # Try to create conversation with self
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"participant_id": admin_user_id}
        )
        assert response.status_code == 400, f"Expected 400 for self-chat, got {response.status_code}"
        print(f"✓ POST /api/chat/conversations - correctly rejects self-chat")
    
    def test_empty_message_rejected(self, admin_token, free_user_token):
        """POST /api/chat/conversations/{conv_id}/messages - rejects empty message"""
        # Get free user id
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        free_user_id = me_response.json().get("user_id")
        
        # Create/get conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"participant_id": free_user_id}
        )
        conv_id = conv_response.json().get("conversation_id")
        
        # Try to send empty message
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"content": "   "}
        )
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print(f"✓ POST /api/chat/conversations/{conv_id}/messages - correctly rejects empty message")


class TestMarketplaceEndpoints:
    """Marketplace endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL, "password": FREE_USER_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    def test_get_listings(self, admin_token):
        """GET /api/marketplace/listings - returns active listings"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listings" in data
        assert isinstance(data["listings"], list)
        print(f"✓ GET /api/marketplace/listings - returned {len(data['listings'])} listings")
    
    def test_get_listings_with_category_filter(self, admin_token):
        """GET /api/marketplace/listings?category=accessories - filters by category"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings?category=accessories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listings" in data
        # All returned listings should be accessories
        for listing in data["listings"]:
            assert listing.get("category") == "accessories", f"Expected accessories, got {listing.get('category')}"
        print(f"✓ GET /api/marketplace/listings?category=accessories - filter working")
    
    def test_get_listings_with_search(self, admin_token):
        """GET /api/marketplace/listings?search=dog - searches listings"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings?search=dog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listings" in data
        print(f"✓ GET /api/marketplace/listings?search=dog - search working, found {len(data['listings'])} results")
    
    def test_get_listings_with_sort(self, admin_token):
        """GET /api/marketplace/listings?sort=price_low - sorts by price"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings?sort=price_low",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listings" in data
        # Verify sorting (if multiple listings)
        if len(data["listings"]) > 1:
            prices = [l.get("price", 0) for l in data["listings"]]
            assert prices == sorted(prices), "Listings not sorted by price ascending"
        print(f"✓ GET /api/marketplace/listings?sort=price_low - sort working")
    
    def test_create_listing(self, admin_token):
        """POST /api/marketplace/listings - creates a new listing"""
        test_listing = {
            "title": f"TEST_LISTING_{int(time.time())}",
            "description": "Test listing for automated testing",
            "price": 19.99,
            "category": "accessories",
            "condition": "new",
            "location": "Test City"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listing_id" in data
        assert data["title"] == test_listing["title"]
        assert data["price"] == test_listing["price"]
        assert data["category"] == test_listing["category"]
        print(f"✓ POST /api/marketplace/listings - listing created: {data['listing_id']}")
        return data["listing_id"]
    
    def test_get_listing_detail(self, admin_token):
        """GET /api/marketplace/listings/{id} - returns listing detail with seller info"""
        # First create a listing
        test_listing = {
            "title": f"TEST_DETAIL_{int(time.time())}",
            "description": "Test listing for detail view",
            "price": 29.99,
            "category": "pets"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        listing_id = create_response.json().get("listing_id")
        
        # Get listing detail
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["listing_id"] == listing_id
        assert "seller" in data
        assert data["seller"] is not None
        print(f"✓ GET /api/marketplace/listings/{listing_id} - detail with seller info returned")
    
    def test_get_listing_increments_views(self, admin_token):
        """GET /api/marketplace/listings/{id} - increments views"""
        # Create a listing
        test_listing = {
            "title": f"TEST_VIEWS_{int(time.time())}",
            "description": "Test listing for view count",
            "price": 9.99,
            "category": "food"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        listing_id = create_response.json().get("listing_id")
        initial_views = create_response.json().get("views", 0)
        
        # View the listing
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # View again to check increment
        response2 = requests.get(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Views should have incremented
        assert response2.json().get("views", 0) > initial_views, "Views should increment"
        print(f"✓ GET /api/marketplace/listings/{listing_id} - views incremented correctly")
    
    def test_delete_own_listing(self, admin_token):
        """DELETE /api/marketplace/listings/{id} - deletes own listing"""
        # Create a listing
        test_listing = {
            "title": f"TEST_DELETE_{int(time.time())}",
            "description": "Test listing to delete",
            "price": 5.99,
            "category": "services"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        listing_id = create_response.json().get("listing_id")
        
        # Delete the listing
        response = requests.delete(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404, "Deleted listing should return 404"
        print(f"✓ DELETE /api/marketplace/listings/{listing_id} - listing deleted successfully")
    
    def test_cannot_delete_others_listing(self, admin_token, free_user_token):
        """DELETE /api/marketplace/listings/{id} - cannot delete others' listing"""
        # Create a listing as admin
        test_listing = {
            "title": f"TEST_NODELETE_{int(time.time())}",
            "description": "Test listing that free user cannot delete",
            "price": 15.99,
            "category": "accessories"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        listing_id = create_response.json().get("listing_id")
        
        # Try to delete as free user
        response = requests.delete(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for unauthorized delete, got {response.status_code}"
        print(f"✓ DELETE /api/marketplace/listings/{listing_id} - correctly rejects unauthorized delete")
    
    def test_send_inquiry(self, admin_token, free_user_token):
        """POST /api/marketplace/listings/{id}/inquire - sends inquiry message to seller"""
        # Create a listing as admin
        test_listing = {
            "title": f"TEST_INQUIRY_{int(time.time())}",
            "description": "Test listing for inquiry",
            "price": 49.99,
            "category": "pets"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json=test_listing
        )
        listing_id = create_response.json().get("listing_id")
        
        # Send inquiry as free user
        response = requests.post(
            f"{BASE_URL}/api/marketplace/listings/{listing_id}/inquire",
            headers={"Authorization": f"Bearer {free_user_token}", "Content-Type": "application/json"},
            json={"message": "Is this still available?"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/marketplace/listings/{listing_id}/inquire - inquiry sent successfully")
    
    def test_get_my_listings(self, admin_token):
        """GET /api/marketplace/my-listings - returns user's own listings"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/my-listings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "listings" in data
        assert isinstance(data["listings"], list)
        print(f"✓ GET /api/marketplace/my-listings - returned {len(data['listings'])} listings")


class TestGamesEndpoints:
    """Games endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL, "password": FREE_USER_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    def test_get_available_games(self, admin_token):
        """GET /api/games/available - returns 4 games and user points"""
        response = requests.get(
            f"{BASE_URL}/api/games/available",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "games" in data
        assert "user_points" in data
        assert len(data["games"]) == 4, f"Expected 4 games, got {len(data['games'])}"
        game_ids = [g["game_id"] for g in data["games"]]
        assert "breed_quiz" in game_ids
        print(f"✓ GET /api/games/available - returned {len(data['games'])} games, user has {data['user_points']} points")
    
    def test_get_leaderboard(self, admin_token):
        """GET /api/games/leaderboard - returns top players by points"""
        response = requests.get(
            f"{BASE_URL}/api/games/leaderboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        # Verify sorted by points descending
        if len(data["leaderboard"]) > 1:
            points = [p.get("points", 0) for p in data["leaderboard"]]
            assert points == sorted(points, reverse=True), "Leaderboard not sorted by points descending"
        print(f"✓ GET /api/games/leaderboard - returned {len(data['leaderboard'])} players")
    
    def test_start_breed_quiz(self, free_user_token):
        """POST /api/games/breed-quiz/start - starts quiz with 5 random questions"""
        response = requests.post(
            f"{BASE_URL}/api/games/breed-quiz/start",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data
        assert "questions" in data
        assert "total" in data
        assert len(data["questions"]) == 5, f"Expected 5 questions, got {len(data['questions'])}"
        # Verify questions don't include answers
        for q in data["questions"]:
            assert "answer" not in q, "Questions should not include answers"
            assert "question" in q
            assert "options" in q
        print(f"✓ POST /api/games/breed-quiz/start - quiz started with session {data['session_id']}")
        return data
    
    def test_submit_breed_quiz(self, free_user_token):
        """POST /api/games/breed-quiz/submit - submits answers, calculates score, awards points"""
        # Start a quiz
        start_response = requests.post(
            f"{BASE_URL}/api/games/breed-quiz/start",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        quiz_data = start_response.json()
        session_id = quiz_data["session_id"]
        
        # Submit random answers (0 for all)
        answers = [0, 0, 0, 0, 0]
        response = requests.post(
            f"{BASE_URL}/api/games/breed-quiz/submit",
            headers={"Authorization": f"Bearer {free_user_token}", "Content-Type": "application/json"},
            json={"session_id": session_id, "answers": answers}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "score" in data
        assert "total" in data
        assert "points_earned" in data
        assert "results" in data
        assert data["total"] == 5
        assert data["points_earned"] == data["score"] * 10
        print(f"✓ POST /api/games/breed-quiz/submit - score: {data['score']}/{data['total']}, earned {data['points_earned']} points")
    
    def test_get_checkin_status(self, admin_token):
        """GET /api/games/daily-checkin - returns checkin status and streak"""
        response = requests.get(
            f"{BASE_URL}/api/games/daily-checkin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "checked_in_today" in data
        assert "streak" in data
        assert "points" in data
        print(f"✓ GET /api/games/daily-checkin - checked_in: {data['checked_in_today']}, streak: {data['streak']}")
    
    def test_daily_checkin_free_user(self, free_user_token):
        """POST /api/games/daily-checkin - checks in and awards streak-based points"""
        # First check status
        status_response = requests.get(
            f"{BASE_URL}/api/games/daily-checkin",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        status = status_response.json()
        
        # Try to check in
        response = requests.post(
            f"{BASE_URL}/api/games/daily-checkin",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        if status.get("checked_in_today"):
            # Already checked in today
            assert response.status_code == 400, f"Expected 400 for already checked in, got {response.status_code}"
            print(f"✓ POST /api/games/daily-checkin - correctly rejects duplicate checkin")
        else:
            # Should succeed
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "streak" in data
            assert "points_earned" in data
            assert "message" in data
            print(f"✓ POST /api/games/daily-checkin - checked in! streak: {data['streak']}, earned {data['points_earned']} points")
    
    def test_invalid_quiz_session(self, admin_token):
        """POST /api/games/breed-quiz/submit - rejects invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/games/breed-quiz/submit",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"session_id": "invalid_session_123", "answers": [0, 0, 0, 0, 0]}
        )
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
        print(f"✓ POST /api/games/breed-quiz/submit - correctly rejects invalid session")


class TestFeedPromotedPosts:
    """Feed endpoint tests for promoted posts sorting"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json().get("token") if response.status_code == 200 else None
    
    def test_feed_posts_sorted_by_promoted(self, admin_token):
        """GET /api/feed/posts - promoted posts should appear first"""
        response = requests.get(
            f"{BASE_URL}/api/feed/posts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "posts" in data
        
        # Check if any promoted posts exist and verify sorting
        posts = data["posts"]
        promoted_found = False
        non_promoted_found = False
        
        for i, post in enumerate(posts):
            if post.get("is_promoted"):
                promoted_found = True
                # After finding a promoted post, all subsequent promoted posts should come before non-promoted
                if non_promoted_found:
                    # This would be a sorting error
                    assert False, "Promoted post found after non-promoted post - sorting incorrect"
            else:
                non_promoted_found = True
        
        print(f"✓ GET /api/feed/posts - returned {len(posts)} posts, promoted posts sorted first")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
