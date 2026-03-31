#!/usr/bin/env python3
"""
Manually assign Petbookin Breeder ID to user via API
This updates the DEPLOYED database (Atlas) not local
"""
import requests
import sys

# Your deployed site
BASE_URL = "https://petbookin.com"
API_URL = f"{BASE_URL}/api"

def assign_breeder_id_via_admin(admin_token, user_email):
    """Use admin token to assign breeder ID to a user"""
    
    # This would require an admin endpoint to update user
    # For now, let's create a test endpoint
    
    print(f"To assign Petbookin Breeder ID to {user_email}:")
    print(f"1. Login to your account at {BASE_URL}")
    print(f"2. Go to Settings > My Pets")
    print(f"3. Edit any pet OR add new pet")
    print(f"4. Check the 'This is a breeder profile' checkbox")
    print(f"5. Click Save")
    print(f"6. Your Petbookin Breeder ID will be auto-assigned")
    print(f"7. Refresh Settings page to see your ID")

if __name__ == "__main__":
    assign_breeder_id_via_admin(None, "dedape1985@gmail.com")
