"""
Iteration 17 - Testing bug fixes for:
1. Password visibility toggle on login/signup
2. Theme preset changes feed appearance
3. Background preset auto-saves
4. File upload buttons exist
5. Post deletion works for admin
6. Chat widget settings
7. API: PUT /api/auth/theme
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@petbookin.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "PetbookinAdmin2026!")


class TestAuthThemeAPI:
    """Test theme API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_login_returns_token(self):
        """Test that login returns a valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 0
        print(f"SUCCESS: Login returned token")
    
    def test_get_user_profile(self, auth_headers):
        """Test getting user profile with theme data"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        # Check if profile_theme exists (may be empty initially)
        print(f"SUCCESS: Got user profile, profile_theme: {data.get('profile_theme', 'not set')}")
    
    def test_update_theme_preset(self, auth_headers):
        """Test updating theme with a preset (Midnight theme)"""
        midnight_theme = {
            "name": "Midnight",
            "bg_color": "#1A1B2E",
            "card_bg": "#252640",
            "text_color": "#E0E0F0",
            "accent_color": "#A78BFA"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/theme",
            json=midnight_theme,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Theme update failed: {response.text}"
        print(f"SUCCESS: Theme updated to Midnight")
        
        # Verify theme was saved by getting profile
        profile_response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert profile_response.status_code == 200
        profile = profile_response.json()
        saved_theme = profile.get("profile_theme", {})
        
        # Verify theme values
        assert saved_theme.get("bg_color") == "#1A1B2E", f"bg_color mismatch: {saved_theme.get('bg_color')}"
        assert saved_theme.get("card_bg") == "#252640", f"card_bg mismatch: {saved_theme.get('card_bg')}"
        print(f"SUCCESS: Theme persisted correctly")
    
    def test_update_theme_with_background_url(self, auth_headers):
        """Test updating theme with a background image URL"""
        theme_with_bg = {
            "name": "Custom",
            "bg_color": "#FFFDF9",
            "card_bg": "#FFFFFF",
            "text_color": "#28211E",
            "accent_color": "#FF7A6A",
            "video_bg_url": "https://images.unsplash.com/photo-1655718568512-ace6b87166ac?w=800"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/theme",
            json=theme_with_bg,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Theme update with bg failed: {response.text}"
        print(f"SUCCESS: Theme updated with background URL")
        
        # Verify background URL was saved
        profile_response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert profile_response.status_code == 200
        profile = profile_response.json()
        saved_theme = profile.get("profile_theme", {})
        
        assert saved_theme.get("video_bg_url") == theme_with_bg["video_bg_url"]
        print(f"SUCCESS: Background URL persisted correctly")
    
    def test_update_theme_with_music_url(self, auth_headers):
        """Test updating theme with a music URL"""
        theme_with_music = {
            "name": "Custom",
            "bg_color": "#FFFDF9",
            "card_bg": "#FFFFFF",
            "text_color": "#28211E",
            "accent_color": "#FF7A6A",
            "music_url": "https://example.com/music.mp3"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/theme",
            json=theme_with_music,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Theme update with music failed: {response.text}"
        print(f"SUCCESS: Theme updated with music URL")
        
        # Verify music URL was saved
        profile_response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert profile_response.status_code == 200
        profile = profile_response.json()
        saved_theme = profile.get("profile_theme", {})
        
        assert saved_theme.get("music_url") == theme_with_music["music_url"]
        print(f"SUCCESS: Music URL persisted correctly")


class TestFeedPostsAPI:
    """Test feed posts API - creation and deletion"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_create_post(self, auth_headers):
        """Test creating a new post"""
        post_content = f"TEST_post_iteration17_{int(time.time())}"
        
        response = requests.post(
            f"{BASE_URL}/api/feed/posts",
            json={"content": post_content},
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Post creation failed: {response.text}"
        data = response.json()
        assert "post_id" in data
        print(f"SUCCESS: Post created with ID: {data['post_id']}")
        return data["post_id"]
    
    def test_get_posts(self, auth_headers):
        """Test getting feed posts"""
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        print(f"SUCCESS: Got {len(data['posts'])} posts")
    
    def test_delete_post_as_admin(self, auth_headers):
        """Test that admin can delete posts"""
        # First create a post
        post_content = f"TEST_delete_post_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/feed/posts",
            json={"content": post_content},
            headers=auth_headers
        )
        assert create_response.status_code in [200, 201]
        post_id = create_response.json()["post_id"]
        print(f"Created post {post_id} for deletion test")
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/feed/posts/{post_id}",
            headers=auth_headers
        )
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Admin deleted post {post_id}")
        
        # Verify post is gone
        get_response = requests.get(f"{BASE_URL}/api/feed/posts", headers=auth_headers)
        posts = get_response.json().get("posts", [])
        post_ids = [p["post_id"] for p in posts]
        assert post_id not in post_ids, "Post still exists after deletion"
        print(f"SUCCESS: Post {post_id} no longer in feed")


class TestChatAPI:
    """Test chat API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_contacts(self, auth_headers):
        """Test getting chat contacts"""
        response = requests.get(f"{BASE_URL}/api/chat/contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        print(f"SUCCESS: Got {len(data['contacts'])} contacts")
    
    def test_get_conversations(self, auth_headers):
        """Test getting conversations"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"SUCCESS: Got {len(data['conversations'])} conversations")
    
    def test_get_unread_count(self, auth_headers):
        """Test getting unread message count"""
        response = requests.get(f"{BASE_URL}/api/chat/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        print(f"SUCCESS: Unread count: {data['unread_count']}")
    
    def test_get_groups(self, auth_headers):
        """Test getting chat groups"""
        response = requests.get(f"{BASE_URL}/api/chat/groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        print(f"SUCCESS: Got {len(data['groups'])} groups")


class TestUploadAPI:
    """Test file upload API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_upload_endpoint_exists(self, auth_headers):
        """Test that upload endpoint exists (without actually uploading)"""
        # Just check the endpoint responds (even with error for missing file)
        response = requests.post(
            f"{BASE_URL}/api/uploads/file",
            headers=auth_headers
        )
        # Should get 422 (validation error) or 400 (bad request) - not 404
        assert response.status_code != 404, "Upload endpoint not found"
        print(f"SUCCESS: Upload endpoint exists (status: {response.status_code})")


# Reset theme to default after tests
class TestCleanup:
    """Cleanup after tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get auth headers with token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_reset_theme_to_default(self, auth_headers):
        """Reset theme to default after tests"""
        default_theme = {
            "name": "Default",
            "bg_color": "#FFFDF9",
            "card_bg": "#FFFFFF",
            "text_color": "#28211E",
            "accent_color": "#FF7A6A",
            "video_bg_url": "",
            "music_url": ""
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/theme",
            json=default_theme,
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"SUCCESS: Theme reset to default")
