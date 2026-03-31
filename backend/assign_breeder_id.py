#!/usr/bin/env python3
"""
Assign Petbookin Breeder ID to existing user
"""
import asyncio
import os
import sys
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def assign_breeder_id(email: str):
    """Assign Petbookin Breeder ID to a user"""
    try:
        # Connect to MongoDB
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        if not mongo_url or not db_name:
            print("❌ Missing MONGO_URL or DB_NAME environment variables")
            sys.exit(1)
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Find user
        user = await db.users.find_one({"email": email})
        
        if not user:
            print(f"❌ User not found: {email}")
            sys.exit(1)
        
        # Check if already has breeder ID
        if user.get("petbookin_breeder_id"):
            print(f"✅ User already has Petbookin Breeder ID: {user['petbookin_breeder_id']}")
            client.close()
            return
        
        # Generate Petbookin Breeder ID
        breeder_id = f"PBK-BR-{uuid.uuid4().hex[:8].upper()}"
        
        # Update user
        await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "petbookin_breeder_id": breeder_id,
                    "ai_generations_used": 0,  # Initialize AI usage counter
                    "breeder_points": 0  # Initialize breeder points
                }
            }
        )
        
        print(f"✅ Assigned Petbookin Breeder ID: {breeder_id}")
        print(f"📧 Email: {email}")
        print(f"👤 Name: {user.get('name', 'N/A')}")
        print(f"🎖️ Tier: {user.get('membership_tier', 'free')}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error assigning breeder ID: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = "dedape1985@gmail.com"  # Default to your email
    
    asyncio.run(assign_breeder_id(email))
