"""
Iteration 14 Tests: User Blocking, Reporting, and MySpace Profile Features
Tests for:
- POST /api/users/block/{user_id} - block a user (silent)
- DELETE /api/users/block/{user_id} - unblock a user
- GET /api/users/blocked - list blocked users
- GET /api/users/blocked-ids - get just blocked user IDs
- POST /api/users/report - report a user/post with reason
- GET /api/users/admin/reports - admin view of all reports
- POST /api/users/admin/reports/{report_id}/resolve - admin resolve report
- GET /api/feed/posts - filters out blocked users posts from feed
- PUT /api/auth/theme - save profile theme (MySpace settings)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"

# Test user for blocking tests
TEST_USER_EMAIL = f"blocktest_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "Test1234!"
TEST_USER_NAME = "Block Test User"

# Second test user (to be blocked)
TARGET_USER_EMAIL = f"targetuser_{uuid.uuid4().hex[:8]}@test.com"
TARGET_USER_PASSWORD = "Test1234!"
TARGET_USER_NAME = "Target User"


class TestSetup:
    """Setup test users for blocking tests"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for blocking tests"""
        # Register test user
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        if res.status_code not in [200, 201, 400]:  # 400 if already exists
            pytest.fail(f"Failed to create test user: {res.text}")
        
        # Login to get token
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        data = login_res.json()
        return {
            "token": data["token"],
            "user_id": data["user"]["user_id"],
            "email": TEST_USER_EMAIL
        }
    
    @pytest.fixture(scope="class")
    def target_user(self):
        """Create a target user to be blocked"""
        # Register target user
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TARGET_USER_EMAIL,
            "password": TARGET_USER_PASSWORD,
            "name": TARGET_USER_NAME
        })
        if res.status_code not in [200, 201, 400]:
            pytest.fail(f"Failed to create target user: {res.text}")
        
        # Login to get user_id
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TARGET_USER_EMAIL,
            "password": TARGET_USER_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        data = login_res.json()
        return {
            "token": data["token"],
            "user_id": data["user"]["user_id"],
            "email": TARGET_USER_EMAIL
        }
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        return res.json()["token"]


class TestBlockUser(TestSetup):
    """Test user blocking functionality"""
    
    def test_block_user_success(self, test_user, target_user):
        """Test blocking a user"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/block/{target_user['user_id']}",
            headers=headers
        )
        assert res.status_code == 200, f"Block failed: {res.text}"
        data = res.json()
        assert data["status"] == "blocked"
        assert data["blocked_id"] == target_user["user_id"]
        print(f"✓ Successfully blocked user {target_user['user_id']}")
    
    def test_cannot_block_self(self, test_user):
        """Test that user cannot block themselves"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/block/{test_user['user_id']}",
            headers=headers
        )
        assert res.status_code == 400
        assert "yourself" in res.json().get("detail", "").lower()
        print("✓ Cannot block self - correct error returned")
    
    def test_block_nonexistent_user(self, test_user):
        """Test blocking a non-existent user"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/block/nonexistent_user_id",
            headers=headers
        )
        assert res.status_code == 404
        print("✓ Cannot block non-existent user - 404 returned")
    
    def test_list_blocked_users(self, test_user, target_user):
        """Test listing blocked users"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.get(f"{BASE_URL}/api/users/blocked", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "blocked_users" in data
        blocked_ids = [b["blocked_id"] for b in data["blocked_users"]]
        assert target_user["user_id"] in blocked_ids
        print(f"✓ Listed blocked users: {len(data['blocked_users'])} users")
    
    def test_get_blocked_ids(self, test_user, target_user):
        """Test getting just blocked user IDs"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.get(f"{BASE_URL}/api/users/blocked-ids", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "blocked_ids" in data
        assert target_user["user_id"] in data["blocked_ids"]
        print(f"✓ Got blocked IDs: {data['blocked_ids']}")
    
    def test_unblock_user(self, test_user, target_user):
        """Test unblocking a user"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.delete(
            f"{BASE_URL}/api/users/block/{target_user['user_id']}",
            headers=headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unblocked"
        print(f"✓ Successfully unblocked user {target_user['user_id']}")
    
    def test_unblock_not_blocked_user(self, test_user, target_user):
        """Test unblocking a user that wasn't blocked"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.delete(
            f"{BASE_URL}/api/users/block/{target_user['user_id']}",
            headers=headers
        )
        assert res.status_code == 404
        print("✓ Cannot unblock user that wasn't blocked - 404 returned")


class TestReportUser(TestSetup):
    """Test user/post reporting functionality"""
    
    def test_report_user_success(self, test_user, target_user):
        """Test reporting a user"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/report",
            headers=headers,
            json={
                "report_type": "user",
                "target_id": target_user["user_id"],
                "reason": "Spam",
                "details": "Test report for spam behavior"
            }
        )
        assert res.status_code == 200, f"Report failed: {res.text}"
        data = res.json()
        assert "report_id" in data
        assert data["status"] == "pending"
        assert data["reason"] == "Spam"
        print(f"✓ Report created: {data['report_id']}")
        return data["report_id"]
    
    def test_report_requires_reason(self, test_user, target_user):
        """Test that report requires a reason"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/report",
            headers=headers,
            json={
                "report_type": "user",
                "target_id": target_user["user_id"],
                "reason": "",
                "details": ""
            }
        )
        assert res.status_code == 400
        print("✓ Report requires reason - correct error returned")
    
    def test_report_requires_target(self, test_user):
        """Test that report requires a target ID"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.post(
            f"{BASE_URL}/api/users/report",
            headers=headers,
            json={
                "report_type": "user",
                "target_id": "",
                "reason": "Spam"
            }
        )
        assert res.status_code == 400
        print("✓ Report requires target ID - correct error returned")


class TestAdminReports(TestSetup):
    """Test admin reports queue functionality"""
    
    def test_admin_view_reports(self, admin_token):
        """Test admin viewing reports queue"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/users/admin/reports", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "reports" in data
        assert "total" in data
        print(f"✓ Admin viewed reports: {data['total']} pending reports")
    
    def test_admin_view_all_reports(self, admin_token):
        """Test admin viewing all reports (not just pending)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.get(f"{BASE_URL}/api/users/admin/reports?status=all", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "reports" in data
        print(f"✓ Admin viewed all reports: {len(data['reports'])} total")
    
    def test_non_admin_cannot_view_reports(self, test_user):
        """Test that non-admin cannot view reports"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        res = requests.get(f"{BASE_URL}/api/users/admin/reports", headers=headers)
        assert res.status_code == 403
        print("✓ Non-admin cannot view reports - 403 returned")
    
    def test_admin_resolve_report(self, admin_token, test_user, target_user):
        """Test admin resolving a report"""
        # First create a report
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        report_res = requests.post(
            f"{BASE_URL}/api/users/report",
            headers=headers,
            json={
                "report_type": "user",
                "target_id": target_user["user_id"],
                "reason": "Harassment",
                "details": "Test report for resolution"
            }
        )
        assert report_res.status_code == 200
        report_id = report_res.json()["report_id"]
        
        # Now resolve it as admin
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        res = requests.post(
            f"{BASE_URL}/api/users/admin/reports/{report_id}/resolve",
            headers=admin_headers,
            json={"action": "dismiss"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "resolved"
        assert data["action"] == "dismiss"
        print(f"✓ Admin resolved report {report_id} with action: dismiss")


class TestFeedFiltering(TestSetup):
    """Test that blocked users' posts are filtered from feed"""
    
    def test_feed_filters_blocked_users(self, test_user, target_user):
        """Test that feed filters out blocked users' posts"""
        # First block the target user
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        block_res = requests.post(
            f"{BASE_URL}/api/users/block/{target_user['user_id']}",
            headers=headers
        )
        assert block_res.status_code == 200
        
        # Get feed - should not include blocked user's posts
        feed_res = requests.get(f"{BASE_URL}/api/feed/posts", headers=headers)
        assert feed_res.status_code == 200
        data = feed_res.json()
        
        # Check that no posts from blocked user appear
        blocked_posts = [p for p in data.get("posts", []) if p.get("author_id") == target_user["user_id"]]
        assert len(blocked_posts) == 0, "Blocked user's posts should not appear in feed"
        print(f"✓ Feed correctly filters blocked users' posts (checked {len(data.get('posts', []))} posts)")
        
        # Cleanup: unblock
        requests.delete(f"{BASE_URL}/api/users/block/{target_user['user_id']}", headers=headers)


class TestMySpaceTheme(TestSetup):
    """Test MySpace profile theme settings"""
    
    def test_save_profile_theme(self, test_user):
        """Test saving profile theme with background and music"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        theme_data = {
            "bg_color": "#1A1B2E",
            "card_bg": "#252640",
            "text_color": "#E0E0F0",
            "accent_color": "#A78BFA",
            "video_bg_url": "https://images.unsplash.com/photo-1655718568512-ace6b87166ac?w=800",
            "music_url": "https://example.com/music.mp3",
            "avatar_border": "gold"
        }
        res = requests.put(
            f"{BASE_URL}/api/auth/theme",
            headers=headers,
            json=theme_data
        )
        assert res.status_code == 200, f"Theme update failed: {res.text}"
        print("✓ Profile theme saved successfully")
        
        # Verify theme was saved
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        user_data = me_res.json()
        saved_theme = user_data.get("profile_theme", {})
        assert saved_theme.get("video_bg_url") == theme_data["video_bg_url"]
        assert saved_theme.get("music_url") == theme_data["music_url"]
        print(f"✓ Theme verified: bg_url={saved_theme.get('video_bg_url')[:50]}...")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self):
        """Cleanup test users created during tests"""
        # Login as admin
        admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code != 200:
            pytest.skip("Admin login failed - skipping cleanup")
        
        admin_token = admin_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Cleanup test data
        cleanup_res = requests.post(
            f"{BASE_URL}/api/admin/cleanup-test-data",
            headers=headers
        )
        if cleanup_res.status_code == 200:
            print(f"✓ Cleanup completed: {cleanup_res.json()}")
        else:
            print(f"⚠ Cleanup may have failed: {cleanup_res.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
