#!/usr/bin/env python3
"""
Admin user seed script for Petbookin
Creates a default admin user if it doesn't exist
"""
import asyncio
import os
import sys
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Admin credentials from environment
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@petbookin.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "PetbookinAdmin2026!")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Petbookin Admin")

async def seed_admin():
    """Create admin user if it doesn't exist"""
    try:
        # Connect to MongoDB
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        if not mongo_url or not db_name:
            print("❌ Missing MONGO_URL or DB_NAME environment variables")
            sys.exit(1)
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Check if admin already exists
        existing_admin = await db.users.find_one({"email": ADMIN_EMAIL})
        
        if existing_admin:
            print(f"✅ Admin user already exists: {ADMIN_EMAIL}")
            # Update to ensure admin flag is set
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"is_admin": True}}
            )
            print(f"✅ Admin privileges confirmed for {ADMIN_EMAIL}")
        else:
            # Hash password
            hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create admin user
            import uuid
            from datetime import datetime, timezone
            
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            admin_user = {
                "user_id": user_id,
                "email": ADMIN_EMAIL,
                "password": hashed_password,
                "name": ADMIN_NAME,
                "is_admin": True,
                "email_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "date_of_birth": "",
                "sex": "",
                "phone": "",
                "location": "",
                "bio": "System Administrator",
                "profile_picture": "",
                "cover_photo": "",
                "account_type": "pet_owner",
                "backup_phone": "",
                "backup_email": "",
                "owner_bio": "Platform Administrator",
                "owner_hobbies": "",
                "owner_interests": "",
                "website": "",
                "kennel_club": "",
                "kennel_registration": "",
                "petbookin_breeder_id": "",
                "membership_tier": "mega",
                "membership_status": "active",
                "stripe_customer_id": "",
                "auth_type": "jwt",
                "is_banned": False,
                "ban_reason": "",
                "breeder_points": 0
            }
            
            await db.users.insert_one(admin_user)
            print("✅ Admin user created successfully!")
            print(f"📧 Email: {ADMIN_EMAIL}")
            print(f"🔑 Password: {ADMIN_PASSWORD}")
            print("\n⚠️  IMPORTANT: Change this password after first login!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error seeding admin: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(seed_admin())
