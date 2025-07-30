#!/usr/bin/env python3
"""
DNS check script for MongoDB SRV records
This script helps diagnose DNS resolution issues with MongoDB Atlas connections
"""

import socket
import sys
import time
from urllib.parse import urlparse
import asyncio

async def check_dns_resolution(hostname):
    """Check if a hostname can be resolved"""
    try:
        result = socket.getaddrinfo(hostname, None)
        print(f"✓ DNS resolution successful for {hostname}")
        for addr in result[:3]:  # Show first 3 results
            print(f"  - {addr[4][0]}")
        return True
    except socket.gaierror as e:
        print(f"✗ DNS resolution failed for {hostname}: {e}")
        return False

async def check_srv_record(hostname):
    """Check SRV record resolution"""
    try:
        import dns.resolver
        srv_hostname = f"_mongodb._tcp.{hostname}"
        answers = dns.resolver.resolve(srv_hostname, 'SRV')
        print(f"✓ SRV record found for {srv_hostname}")
        for answer in answers:
            print(f"  - {answer.target}:{answer.port} (priority: {answer.priority})")
        return True
    except Exception as e:
        print(f"✗ SRV record lookup failed for {hostname}: {e}")
        return False

async def test_mongodb_connection():
    """Test MongoDB connection from environment"""
    try:
        from app.config import get_settings
        from motor.motor_asyncio import AsyncIOMotorClient
        
        settings = get_settings()
        if not settings.db_url:
            print("✗ DB_URL not configured")
            return False
            
        print(f"Testing MongoDB connection to: {settings.db_url[:50]}...")
        
        # Parse the MongoDB URL to extract hostname
        parsed = urlparse(settings.db_url)
        hostname = parsed.hostname
        
        if hostname:
            # Test basic DNS resolution
            await check_dns_resolution(hostname)
            
            # If it looks like an SRV connection, test SRV records
            if '+srv' in settings.db_url:
                # Extract the actual hostname for SRV lookup
                srv_hostname = hostname
                await check_srv_record(srv_hostname)
        
        # Test actual MongoDB connection
        client = AsyncIOMotorClient(settings.db_url, serverSelectionTimeoutMS=10000)
        await asyncio.wait_for(client.admin.command('ismaster'), timeout=10.0)
        print("✓ MongoDB connection successful")
        client.close()
        return True
        
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False

async def main():
    """Main function to run all checks"""
    print("🔍 Running DNS and MongoDB connectivity checks...")
    print("=" * 50)
    
    # Test basic DNS servers
    dns_servers = ['8.8.8.8', '8.8.4.4', '1.1.1.1']
    for dns_server in dns_servers:
        await check_dns_resolution(dns_server)
    
    print("\n" + "=" * 50)
    
    # Test MongoDB connection
    success = await test_mongodb_connection()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All checks passed!")
        sys.exit(0)
    else:
        print("❌ Some checks failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
