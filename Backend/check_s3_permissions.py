#!/usr/bin/env python3
"""
Utility to check S3 bucket and object permissions.
This helps diagnose why uploaded files might still be private.
"""

import boto3
import json
import sys
from app.config import get_settings

def check_s3_permissions():
    """Check S3 bucket and object permissions."""
    settings = get_settings()
    
    s3_client = boto3.client(
        's3',
        endpoint_url=settings.s3_origin_endpoint,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_key,
        region_name='nyc3'
    )
    
    bucket_name = settings.bucket_name
    
    print(f"Checking permissions for bucket: {bucket_name}")
    print(f"Endpoint: {settings.s3_origin_endpoint}")
    print("-" * 50)
    
    # Check bucket policy
    try:
        policy_response = s3_client.get_bucket_policy(Bucket=bucket_name)
        policy = json.loads(policy_response['Policy'])
        print("✅ Bucket Policy Found:")
        print(json.dumps(policy, indent=2))
    except s3_client.exceptions.NoSuchBucketPolicy:
        print("❌ No bucket policy found (this might be the issue)")
    except Exception as e:
        print(f"❌ Error getting bucket policy: {e}")
    
    print("-" * 50)
    
    # Check bucket ACL
    try:
        acl_response = s3_client.get_bucket_acl(Bucket=bucket_name)
        print("✅ Bucket ACL:")
        for grant in acl_response.get('Grants', []):
            grantee = grant.get('Grantee', {})
            permission = grant.get('Permission')
            grantee_type = grantee.get('Type')
            if grantee_type == 'Group':
                grantee_id = grantee.get('URI', 'Unknown')
            else:
                grantee_id = grantee.get('ID', grantee.get('DisplayName', 'Unknown'))
            print(f"  - {grantee_type}: {grantee_id} -> {permission}")
    except Exception as e:
        print(f"❌ Error getting bucket ACL: {e}")
    
    print("-" * 50)
    
    # List some objects and check their ACLs
    try:
        objects_response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
        objects = objects_response.get('Contents', [])
        
        if objects:
            print("Checking ACLs for recent objects:")
            for obj in objects[:3]:  # Check first 3 objects
                object_key = obj['Key']
                try:
                    obj_acl = s3_client.get_object_acl(Bucket=bucket_name, Key=object_key)
                    print(f"\n📄 Object: {object_key}")
                    for grant in obj_acl.get('Grants', []):
                        grantee = grant.get('Grantee', {})
                        permission = grant.get('Permission')
                        grantee_type = grantee.get('Type')
                        if grantee_type == 'Group':
                            grantee_id = grantee.get('URI', 'Unknown')
                            if 'AllUsers' in grantee_id:
                                print(f"  ✅ PUBLIC: {permission}")
                            else:
                                print(f"  🔒 GROUP: {grantee_id} -> {permission}")
                        else:
                            grantee_id = grantee.get('ID', grantee.get('DisplayName', 'Unknown'))
                            print(f"  👤 USER: {grantee_id} -> {permission}")
                except Exception as obj_e:
                    print(f"  ❌ Error getting ACL for {object_key}: {obj_e}")
        else:
            print("No objects found in bucket")
            
    except Exception as e:
        print(f"❌ Error listing objects: {e}")

if __name__ == "__main__":
    try:
        check_s3_permissions()
    except Exception as e:
        print(f"Failed to check permissions: {e}")
        sys.exit(1)
