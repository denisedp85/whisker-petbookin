"""
Iteration 7 Feature Tests - New Features:
1. Notifications (GET /api/notifications, POST /api/notifications/mark-read)
2. Group Chat (POST /api/chat/groups, GET /api/chat/groups)
3. New Games (treat-catcher/submit, pet-puzzle/submit, pet-show/submit)
4. File Upload (POST /api/uploads/file)
5. Message notifications (sending message creates notification for recipient)
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
    """Get auth tokens for testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        """Login as free user and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL,
            "password": FREE_USER_PASSWORD
        })
        assert response.status_code == 200, f"Free user login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def free_user_headers(self, free_user_token):
        return {"Authorization": f"Bearer {free_user_token}", "Content-Type": "application/json"}


class TestNotifications(TestAuth):
    """Test notification endpoints"""
    
    def test_get_notifications_requires_auth(self):
        """GET /api/notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
    
    def test_get_notifications_success(self, admin_headers):
        """GET /api/notifications returns notifications and unread count"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        print(f"Admin has {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_with_limit(self, admin_headers):
        """GET /api/notifications?limit=5 respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/notifications?limit=5", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["notifications"]) <= 5
    
    def test_mark_all_read_requires_auth(self):
        """POST /api/notifications/mark-read requires authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/mark-read")
        assert response.status_code == 401
    
    def test_mark_all_read_success(self, free_user_headers):
        """POST /api/notifications/mark-read marks all notifications as read"""
        response = requests.post(f"{BASE_URL}/api/notifications/mark-read", headers=free_user_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify unread count is now 0
        check_response = requests.get(f"{BASE_URL}/api/notifications", headers=free_user_headers)
        assert check_response.status_code == 200
        assert check_response.json()["unread_count"] == 0
        print("All notifications marked as read successfully")
    
    def test_notification_structure(self, admin_headers):
        """Verify notification object structure"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["notifications"]:
            notif = data["notifications"][0]
            # Check expected fields
            expected_fields = ["notification_id", "user_id", "type", "title", "body", "read", "created_at"]
            for field in expected_fields:
                assert field in notif, f"Missing field: {field}"
            print(f"Notification structure valid: {list(notif.keys())}")


class TestGroupChat(TestAuth):
    """Test group chat endpoints"""
    
    def test_create_group_requires_auth(self):
        """POST /api/chat/groups requires authentication"""
        response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": "Test Group",
            "participant_ids": []
        })
        assert response.status_code == 401
    
    def test_create_group_requires_name(self, admin_headers):
        """POST /api/chat/groups requires group name"""
        response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": "",
            "participant_ids": ["user_123"]
        }, headers=admin_headers)
        assert response.status_code == 400
        assert "name" in response.json().get("detail", "").lower()
    
    def test_create_group_requires_participants(self, admin_headers):
        """POST /api/chat/groups requires at least 1 participant"""
        response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": "Test Group",
            "participant_ids": []
        }, headers=admin_headers)
        assert response.status_code == 400
        assert "participant" in response.json().get("detail", "").lower()
    
    def test_list_groups_requires_auth(self):
        """GET /api/chat/groups requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/groups")
        assert response.status_code == 401
    
    def test_list_groups_success(self, admin_headers):
        """GET /api/chat/groups returns user's groups"""
        response = requests.get(f"{BASE_URL}/api/chat/groups", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        assert isinstance(data["groups"], list)
        print(f"Admin has {len(data['groups'])} groups")
        
        # Check group structure if any exist
        if data["groups"]:
            group = data["groups"][0]
            assert "conversation_id" in group
            assert "group_name" in group
            assert "type" in group
            assert group["type"] == "group"
            assert "members" in group
            print(f"First group: {group['group_name']} with {len(group.get('members', []))} members")
    
    def test_create_group_with_valid_participants(self, admin_headers, free_user_headers):
        """POST /api/chat/groups creates group with valid participants"""
        # First get free user's ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=free_user_headers)
        assert me_response.status_code == 200
        free_user_id = me_response.json()["user_id"]
        
        # Create group
        group_name = f"TEST_Group_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": group_name,
            "participant_ids": [free_user_id]
        }, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["group_name"] == group_name
        assert data["type"] == "group"
        assert "conversation_id" in data
        assert "members" in data
        assert len(data["members"]) >= 2  # Admin + free user
        print(f"Created group: {group_name} with {len(data['members'])} members")
        
        return data["conversation_id"]
    
    def test_group_appears_in_list(self, admin_headers, free_user_headers):
        """Created group appears in both users' group lists"""
        # Get free user ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=free_user_headers)
        free_user_id = me_response.json()["user_id"]
        
        # Create a new group
        group_name = f"TEST_ListCheck_{int(time.time())}"
        create_response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": group_name,
            "participant_ids": [free_user_id]
        }, headers=admin_headers)
        assert create_response.status_code == 200
        
        # Check admin's groups
        admin_groups = requests.get(f"{BASE_URL}/api/chat/groups", headers=admin_headers)
        assert admin_groups.status_code == 200
        admin_group_names = [g["group_name"] for g in admin_groups.json()["groups"]]
        assert group_name in admin_group_names
        
        # Check free user's groups
        free_groups = requests.get(f"{BASE_URL}/api/chat/groups", headers=free_user_headers)
        assert free_groups.status_code == 200
        free_group_names = [g["group_name"] for g in free_groups.json()["groups"]]
        assert group_name in free_group_names
        print(f"Group {group_name} visible to both users")


class TestGroupMessages(TestAuth):
    """Test sending messages in group chats"""
    
    def test_send_message_to_group(self, admin_headers, free_user_headers):
        """Messages can be sent to group conversations"""
        # Get free user ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=free_user_headers)
        free_user_id = me_response.json()["user_id"]
        
        # Create a group
        group_name = f"TEST_MsgGroup_{int(time.time())}"
        create_response = requests.post(f"{BASE_URL}/api/chat/groups", json={
            "name": group_name,
            "participant_ids": [free_user_id]
        }, headers=admin_headers)
        assert create_response.status_code == 200
        conv_id = create_response.json()["conversation_id"]
        
        # Send message to group
        msg_content = f"Test group message {int(time.time())}"
        msg_response = requests.post(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages", json={
            "content": msg_content
        }, headers=admin_headers)
        assert msg_response.status_code == 200
        msg_data = msg_response.json()
        assert msg_data["content"] == msg_content
        assert "message_id" in msg_data
        print(f"Sent message to group: {msg_content[:30]}...")
        
        # Verify message appears in conversation
        get_msgs = requests.get(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages", headers=admin_headers)
        assert get_msgs.status_code == 200
        messages = get_msgs.json()["messages"]
        assert any(m["content"] == msg_content for m in messages)
        print("Message verified in group conversation")


class TestMessageNotifications(TestAuth):
    """Test that sending messages creates notifications"""
    
    def test_message_creates_notification(self, admin_headers, free_user_headers):
        """Sending a message creates notification for recipient"""
        # Get admin user ID
        admin_me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        admin_id = admin_me.json()["user_id"]
        
        # Create or get conversation between admin and free user
        conv_response = requests.post(f"{BASE_URL}/api/chat/conversations", json={
            "participant_id": admin_id
        }, headers=free_user_headers)
        assert conv_response.status_code == 200
        conv_id = conv_response.json()["conversation_id"]
        
        # Mark all notifications as read first
        requests.post(f"{BASE_URL}/api/notifications/mark-read", headers=admin_headers)
        
        # Free user sends message to admin
        msg_content = f"Notification test message {int(time.time())}"
        msg_response = requests.post(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages", json={
            "content": msg_content
        }, headers=free_user_headers)
        assert msg_response.status_code == 200
        
        # Check admin's notifications
        time.sleep(0.5)  # Small delay for notification to be created
        notif_response = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert notif_response.status_code == 200
        notifications = notif_response.json()["notifications"]
        
        # Should have at least one unread notification
        unread = [n for n in notifications if not n["read"]]
        assert len(unread) > 0, "Expected at least one unread notification"
        
        # Check if it's a message notification
        message_notifs = [n for n in unread if n["type"] == "message"]
        assert len(message_notifs) > 0, "Expected message notification"
        print(f"Message notification created: {message_notifs[0]['title']}")


class TestNewGames(TestAuth):
    """Test new game submission endpoints"""
    
    def test_treat_catcher_submit_requires_auth(self):
        """POST /api/games/treat-catcher/submit requires authentication"""
        response = requests.post(f"{BASE_URL}/api/games/treat-catcher/submit", json={"score": 50})
        assert response.status_code == 401
    
    def test_treat_catcher_submit_success(self, admin_headers):
        """POST /api/games/treat-catcher/submit awards points correctly"""
        # Get current points
        me_before = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_before = me_before.json().get("points", 0)
        
        # Submit score
        score = 75
        response = requests.post(f"{BASE_URL}/api/games/treat-catcher/submit", json={
            "score": score
        }, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "points_earned" in data
        assert data["score"] == score
        # Points should be min(score, 15)
        expected_points = min(score, 15)
        assert data["points_earned"] == expected_points
        print(f"Treat Catcher: score={score}, points_earned={data['points_earned']}")
        
        # Verify points were added
        me_after = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_after = me_after.json().get("points", 0)
        assert points_after == points_before + expected_points
    
    def test_treat_catcher_score_capped(self, admin_headers):
        """Treat catcher score is capped at 100"""
        response = requests.post(f"{BASE_URL}/api/games/treat-catcher/submit", json={
            "score": 150  # Over cap
        }, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 100  # Capped
        assert data["points_earned"] == 15  # Max points
    
    def test_pet_puzzle_submit_requires_auth(self):
        """POST /api/games/pet-puzzle/submit requires authentication"""
        response = requests.post(f"{BASE_URL}/api/games/pet-puzzle/submit", json={"moves": 10, "time": 30})
        assert response.status_code == 401
    
    def test_pet_puzzle_submit_success(self, admin_headers):
        """POST /api/games/pet-puzzle/submit awards points based on moves and time"""
        # Get current points
        me_before = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_before = me_before.json().get("points", 0)
        
        moves = 15
        time_taken = 45
        response = requests.post(f"{BASE_URL}/api/games/pet-puzzle/submit", json={
            "moves": moves,
            "time": time_taken
        }, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "moves" in data
        assert "time" in data
        assert "points_earned" in data
        assert data["moves"] == moves
        assert data["time"] == time_taken
        # Points formula: max(1, min(20, 20 - moves/5 - time/30))
        expected_points = max(1, min(20, 20 - (moves // 5) - (time_taken // 30)))
        assert data["points_earned"] == expected_points
        print(f"Pet Puzzle: moves={moves}, time={time_taken}, points_earned={data['points_earned']}")
        
        # Verify points were added
        me_after = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_after = me_after.json().get("points", 0)
        assert points_after == points_before + expected_points
    
    def test_pet_show_submit_requires_auth(self):
        """POST /api/games/pet-show/submit requires authentication"""
        response = requests.post(f"{BASE_URL}/api/games/pet-show/submit", json={"score": 80})
        assert response.status_code == 401
    
    def test_pet_show_submit_success(self, admin_headers):
        """POST /api/games/pet-show/submit awards points correctly"""
        # Get current points
        me_before = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_before = me_before.json().get("points", 0)
        
        score = 80
        response = requests.post(f"{BASE_URL}/api/games/pet-show/submit", json={
            "score": score
        }, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "points_earned" in data
        assert data["score"] == score
        # Points formula: min(score/4, 25)
        expected_points = min(score // 4, 25)
        assert data["points_earned"] == expected_points
        print(f"Pet Show: score={score}, points_earned={data['points_earned']}")
        
        # Verify points were added
        me_after = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        points_after = me_after.json().get("points", 0)
        assert points_after == points_before + expected_points
    
    def test_pet_show_score_capped(self, admin_headers):
        """Pet show score is capped at 100"""
        response = requests.post(f"{BASE_URL}/api/games/pet-show/submit", json={
            "score": 150  # Over cap
        }, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 100  # Capped
        assert data["points_earned"] == 25  # Max points (100/4 = 25)
    
    def test_all_games_available(self, admin_headers):
        """GET /api/games/available returns all 4 games"""
        response = requests.get(f"{BASE_URL}/api/games/available", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "games" in data
        games = data["games"]
        assert len(games) == 4
        
        game_ids = [g["game_id"] for g in games]
        assert "breed_quiz" in game_ids
        assert "treat_catcher" in game_ids
        assert "pet_puzzle" in game_ids
        assert "pet_show" in game_ids
        print(f"All 4 games available: {game_ids}")


class TestFileUpload(TestAuth):
    """Test file upload endpoint"""
    
    def test_upload_requires_auth(self):
        """POST /api/uploads/file requires authentication"""
        # Create a small test file
        files = {"file": ("test.txt", b"test content", "text/plain")}
        response = requests.post(f"{BASE_URL}/api/uploads/file", files=files)
        assert response.status_code == 401
    
    def test_upload_rejects_invalid_type(self, admin_headers):
        """POST /api/uploads/file rejects non-allowed file types"""
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": admin_headers["Authorization"]}
        files = {"file": ("test.txt", b"test content", "text/plain")}
        response = requests.post(f"{BASE_URL}/api/uploads/file", files=files, headers=headers)
        assert response.status_code == 400
        assert "not allowed" in response.json().get("detail", "").lower()
    
    def test_upload_image_success(self, admin_headers):
        """POST /api/uploads/file accepts image files"""
        # Create a minimal valid PNG (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        headers = {"Authorization": admin_headers["Authorization"]}
        files = {"file": ("test_image.png", png_data, "image/png")}
        response = requests.post(f"{BASE_URL}/api/uploads/file", files=files, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert "storage_path" in data
        assert "media_type" in data
        assert data["media_type"] == "image"
        assert data["content_type"] == "image/png"
        print(f"Image uploaded: file_id={data['file_id']}, path={data['storage_path']}")
    
    def test_upload_returns_correct_media_type(self, admin_headers):
        """Upload correctly identifies media type (image/video/audio)"""
        # Test with JPEG
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        headers = {"Authorization": admin_headers["Authorization"]}
        files = {"file": ("test.jpg", jpeg_data, "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/uploads/file", files=files, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["media_type"] == "image"
        print(f"JPEG upload: media_type={data['media_type']}")


class TestExistingFeatures(TestAuth):
    """Verify existing features still work"""
    
    def test_health_check(self):
        """Health check endpoint works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_auth_login(self):
        """Login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        assert "token" in response.json()
    
    def test_feed_posts(self, admin_headers):
        """Feed posts endpoint works"""
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=admin_headers)
        assert response.status_code == 200
        assert "posts" in response.json()
    
    def test_marketplace_listings(self, admin_headers):
        """Marketplace listings endpoint works"""
        response = requests.get(f"{BASE_URL}/api/marketplace/listings", headers=admin_headers)
        assert response.status_code == 200
        assert "listings" in response.json()
    
    def test_chat_contacts(self, admin_headers):
        """Chat contacts endpoint works"""
        response = requests.get(f"{BASE_URL}/api/chat/contacts", headers=admin_headers)
        assert response.status_code == 200
        assert "contacts" in response.json()
    
    def test_chat_conversations(self, admin_headers):
        """Chat conversations endpoint works"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=admin_headers)
        assert response.status_code == 200
        assert "conversations" in response.json()
    
    def test_games_leaderboard(self, admin_headers):
        """Games leaderboard endpoint works"""
        response = requests.get(f"{BASE_URL}/api/games/leaderboard", headers=admin_headers)
        assert response.status_code == 200
        assert "leaderboard" in response.json()
    
    def test_breed_quiz_start(self, admin_headers):
        """Breed quiz start endpoint works"""
        response = requests.post(f"{BASE_URL}/api/games/breed-quiz/start", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "questions" in data
        assert len(data["questions"]) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
