"""
Test suite for Petbookin Certification System (Phase 2)
Tests: Pet of Week, Certificate Registration, Litter Registration, Transfer, Verification
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"


class TestHealthAndSetup:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestAdminLogin:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful, tier: {data['user'].get('membership_tier')}")
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print("✓ Admin token obtained")
    
    def test_admin_is_breeder(self, admin_token):
        """Verify admin is registered as breeder"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        user = response.json()
        assert user.get("breeder_info") is not None, "Admin should be registered as breeder"
        print(f"✓ Admin is breeder: {user['breeder_info'].get('kennel_name')}")


class TestCertificateFees:
    """Test certificate fee structure"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_fees_mega_tier(self, admin_token):
        """MEGA tier should get all fees free"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/fees", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "fees" in data
        assert "tier" in data
        assert "base_fees" in data
        
        # MEGA tier = all free
        assert data["tier"] == "mega", f"Expected mega tier, got {data['tier']}"
        assert data["fees"]["individual"] == 0, "MEGA tier should have free individual certs"
        assert data["fees"]["litter"] == 0, "MEGA tier should have free litter registration"
        assert data["fees"]["transfer"] == 0, "MEGA tier should have free transfers"
        
        # Verify base fees are correct
        assert data["base_fees"]["individual"] == 12.99
        assert data["base_fees"]["litter"] == 29.99
        assert data["base_fees"]["transfer"] == 9.99
        
        print(f"✓ Fees endpoint working - tier: {data['tier']}, fees: {data['fees']}")


class TestPetOfTheWeek:
    """Test Pet of the Week feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_pet_of_the_week_endpoint(self, admin_token):
        """Test pet-of-the-week endpoint returns data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/feed/pet-of-the-week", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have pet and post keys (may be null if no posts with pets)
        assert "pet" in data
        assert "post" in data
        
        if data["pet"]:
            assert "name" in data["pet"]
            assert "owner" in data
            print(f"✓ Pet of the Week: {data['pet']['name']}")
        else:
            print("✓ Pet of the Week endpoint working (no pet data yet)")


class TestCertificateRegistration:
    """Test certificate registration flow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_register_pet_certificate(self, admin_token):
        """Test registering a new pet certificate"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a unique test pet certificate
        test_pet_name = f"TEST_CertPet_{uuid.uuid4().hex[:6]}"
        cert_data = {
            "pet_name": test_pet_name,
            "breed": "Golden Retriever",
            "species": "dog",
            "dob": "2024-01-15",
            "gender": "male",
            "color_markings": "Golden with white chest",
            "microchip_id": f"CHIP-{uuid.uuid4().hex[:8].upper()}",
            "sire_name": "Champion Duke",
            "sire_breed": "Golden Retriever",
            "dam_name": "Lady Bella",
            "dam_breed": "Golden Retriever"
        }
        
        response = requests.post(f"{BASE_URL}/api/certificates/register-pet", 
                                json=cert_data, headers=headers)
        assert response.status_code == 200, f"Certificate registration failed: {response.text}"
        
        cert = response.json()
        assert "certificate_id" in cert
        assert cert["certificate_id"].startswith("PBK-CERT-")
        assert cert["pet_info"]["name"] == test_pet_name
        assert cert["pet_info"]["breed"] == "Golden Retriever"
        assert cert["pedigree"]["sire"]["name"] == "Champion Duke"
        assert cert["pedigree"]["dam"]["name"] == "Lady Bella"
        assert cert["status"] == "active"
        assert cert["fee_paid"] == 0  # MEGA tier = free
        
        print(f"✓ Certificate registered: {cert['certificate_id']}")
        return cert["certificate_id"]
    
    def test_get_my_certificates(self, admin_token):
        """Test getting user's certificates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/mine", headers=headers)
        assert response.status_code == 200
        
        certs = response.json()
        assert isinstance(certs, list)
        print(f"✓ My certificates: {len(certs)} found")
    
    def test_get_issued_certificates(self, admin_token):
        """Test getting certificates issued by breeder"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/issued", headers=headers)
        assert response.status_code == 200
        
        certs = response.json()
        assert isinstance(certs, list)
        print(f"✓ Issued certificates: {len(certs)} found")


class TestLitterRegistration:
    """Test litter registration"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_register_litter(self, admin_token):
        """Test registering a new litter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        litter_data = {
            "breed": "Golden Retriever",
            "species": "dog",
            "whelp_date": "2025-12-01",
            "puppy_count": 6,
            "sire_name": "Champion Duke",
            "sire_breed": "Golden Retriever",
            "dam_name": "Lady Bella",
            "dam_breed": "Golden Retriever"
        }
        
        response = requests.post(f"{BASE_URL}/api/certificates/register-litter",
                                json=litter_data, headers=headers)
        assert response.status_code == 200, f"Litter registration failed: {response.text}"
        
        litter = response.json()
        assert "litter_id" in litter
        assert litter["litter_id"].startswith("PBK-LTR-")
        assert litter["breed"] == "Golden Retriever"
        assert litter["puppy_count"] == 6
        assert litter["sire"]["name"] == "Champion Duke"
        assert litter["dam"]["name"] == "Lady Bella"
        assert litter["fee_paid"] == 0  # MEGA tier = free
        
        print(f"✓ Litter registered: {litter['litter_id']}")
    
    def test_get_my_litters(self, admin_token):
        """Test getting breeder's litters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/litters", headers=headers)
        assert response.status_code == 200
        
        litters = response.json()
        assert isinstance(litters, list)
        print(f"✓ My litters: {len(litters)} found")


class TestCertificateVerification:
    """Test certificate verification"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_verify_existing_certificate(self, admin_token):
        """Test verifying an existing certificate"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a certificate to verify
        response = requests.get(f"{BASE_URL}/api/certificates/mine", headers=headers)
        certs = response.json()
        
        if len(certs) > 0:
            cert_id = certs[0]["certificate_id"]
            
            # Verify the certificate (public endpoint)
            verify_response = requests.get(f"{BASE_URL}/api/certificates/verify/{cert_id}")
            assert verify_response.status_code == 200
            
            data = verify_response.json()
            assert "certificate" in data
            assert "owner" in data
            assert "breeder" in data
            assert "is_valid" in data
            assert data["certificate"]["certificate_id"] == cert_id
            
            print(f"✓ Certificate verified: {cert_id}, valid: {data['is_valid']}")
        else:
            print("⚠ No certificates to verify")
    
    def test_verify_nonexistent_certificate(self):
        """Test verifying a non-existent certificate returns 404"""
        response = requests.get(f"{BASE_URL}/api/certificates/verify/PBK-CERT-FAKE-123456")
        assert response.status_code == 404
        print("✓ Non-existent certificate returns 404")


class TestCertificateTransfer:
    """Test certificate transfer functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_user(self, admin_token):
        """Create a test user for transfer"""
        test_email = f"test_transfer_{uuid.uuid4().hex[:6]}@test.com"
        test_password = "TestPass123!"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": "Test Transfer User"
        })
        
        if response.status_code == 200:
            print(f"✓ Test user created: {test_email}")
            return {"email": test_email, "password": test_password}
        else:
            # User might already exist, try login
            print(f"⚠ Could not create test user: {response.text}")
            return None
    
    def test_transfer_certificate(self, admin_token, test_user):
        """Test transferring a certificate to another user"""
        if not test_user:
            pytest.skip("No test user available for transfer test")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a certificate to transfer
        cert_data = {
            "pet_name": f"TEST_TransferPet_{uuid.uuid4().hex[:6]}",
            "breed": "Labrador",
            "species": "dog",
            "gender": "female"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/certificates/register-pet",
                                       json=cert_data, headers=headers)
        assert create_response.status_code == 200
        cert_id = create_response.json()["certificate_id"]
        print(f"✓ Created certificate for transfer: {cert_id}")
        
        # Transfer to test user
        transfer_data = {
            "certificate_id": cert_id,
            "new_owner_email": test_user["email"]
        }
        
        transfer_response = requests.post(f"{BASE_URL}/api/certificates/transfer",
                                         json=transfer_data, headers=headers)
        assert transfer_response.status_code == 200, f"Transfer failed: {transfer_response.text}"
        
        result = transfer_response.json()
        assert "message" in result
        assert "transfer" in result
        assert result["transfer"]["to_name"] == "Test Transfer User"
        
        print(f"✓ Certificate transferred to {test_user['email']}")
    
    def test_transfer_nonexistent_certificate(self, admin_token, test_user):
        """Test transferring a non-existent certificate"""
        if not test_user:
            pytest.skip("No test user available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        transfer_data = {
            "certificate_id": "PBK-CERT-FAKE-999999",
            "new_owner_email": test_user["email"]
        }
        
        response = requests.post(f"{BASE_URL}/api/certificates/transfer",
                                json=transfer_data, headers=headers)
        assert response.status_code == 404
        print("✓ Transfer of non-existent certificate returns 404")
    
    def test_transfer_to_nonexistent_user(self, admin_token):
        """Test transferring to a non-existent user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get an existing certificate
        certs_response = requests.get(f"{BASE_URL}/api/certificates/mine", headers=headers)
        certs = certs_response.json()
        
        if len(certs) == 0:
            pytest.skip("No certificates available for test")
        
        transfer_data = {
            "certificate_id": certs[0]["certificate_id"],
            "new_owner_email": "nonexistent_user_12345@fake.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/certificates/transfer",
                                json=transfer_data, headers=headers)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        print("✓ Transfer to non-existent user returns 404")


class TestNonBreederAccess:
    """Test that non-breeders cannot issue certificates"""
    
    def test_non_breeder_cannot_register_cert(self):
        """Non-breeder should get 403 when trying to register certificate"""
        # Create a new user (not a breeder)
        test_email = f"test_nonbreeder_{uuid.uuid4().hex[:6]}@test.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Non Breeder User"
        })
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to register a certificate
        cert_data = {
            "pet_name": "Test Pet",
            "breed": "Mixed",
            "species": "dog"
        }
        
        response = requests.post(f"{BASE_URL}/api/certificates/register-pet",
                                json=cert_data, headers=headers)
        assert response.status_code == 403
        assert "breeder" in response.json()["detail"].lower()
        print("✓ Non-breeder correctly blocked from registering certificates")


class TestRegressionPhase1:
    """Quick regression tests for Phase 1 features"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_feed_posts_still_work(self, admin_token):
        """Verify feed posts endpoint still works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=headers)
        assert response.status_code == 200
        assert "posts" in response.json()
        print("✓ Feed posts endpoint working")
    
    def test_pets_endpoint_still_works(self, admin_token):
        """Verify pets endpoint still works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/pets/mine", headers=headers)
        assert response.status_code == 200
        print("✓ Pets endpoint working")
    
    def test_breeder_directory_still_works(self, admin_token):
        """Verify breeder directory still works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/breeder/directory", headers=headers)
        assert response.status_code == 200
        print("✓ Breeder directory working")
    
    def test_search_still_works(self, admin_token):
        """Verify search endpoint still works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=headers)
        assert response.status_code == 200
        print("✓ Search endpoint working")
    
    def test_admin_stats_still_work(self, admin_token):
        """Verify admin stats endpoint still works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        print("✓ Admin stats endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
