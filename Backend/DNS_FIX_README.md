# MongoDB DNS Resolution Fix for Ubuntu

## Problem
When running the application in Ubuntu (especially in Docker containers), you may encounter DNS resolution errors for MongoDB Atlas SRV records:

```
dns.resolver.NoAnswer: The DNS response does not contain an answer to the question: _mongodb._tcp.ts4u-prod-db-1fe5ed1f.mongo.ondigitalocean.com. IN SRV
```

## Root Cause
This issue occurs because:
1. Docker containers in Ubuntu may not inherit the host's DNS configuration properly
2. The default DNS servers in the container may not be able to resolve MongoDB SRV records
3. Network policies or firewall rules may block certain DNS queries

## Solutions Applied

### 1. DNS Configuration in Docker Compose
Added explicit DNS servers to both development and production Docker Compose files:

```yaml
dns:
  - 8.8.8.8
  - 8.8.4.4
  - 1.1.1.1
```

### 2. Enhanced MongoDB Connection Logic
- Added retry logic with exponential backoff
- Increased connection timeouts
- Added better error handling and logging
- Added DNS resolution debugging

### 3. Added DNS Utilities to Docker Images
- Added `dnsutils` and `iputils-ping` packages
- Added `dnspython` Python package for better DNS handling

### 4. DNS Check Script
Created `check_dns.py` to diagnose DNS issues:

```bash
python check_dns.py
```

## Testing the Fix

1. **Rebuild your containers:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up
   ```

2. **Check DNS resolution manually:**
   ```bash
   docker exec -it backend nslookup _mongodb._tcp.ts4u-prod-db-1fe5ed1f.mongo.ondigitalocean.com
   ```

3. **Run the DNS check script:**
   ```bash
   docker exec -it backend python check_dns.py
   ```

## Alternative Solutions (if issue persists)

### Option 1: Use Direct Connection String
Instead of SRV connection, use a direct connection string format:
```
mongodb://username:password@host1:port1,host2:port2/database?options
```

### Option 2: Add to /etc/hosts
If you know the specific IP addresses, you can add them to the container's hosts file.

### Option 3: Use Host Networking
As a last resort, you can use host networking mode:
```yaml
network_mode: "host"
```

### Option 4: Custom DNS Container
Set up a local DNS resolver container if the environment has specific DNS requirements.

## Monitoring
After applying the fixes, monitor the logs for:
- Successful MongoDB connections
- DNS resolution success messages
- Any remaining timeout or connection errors

## Environment-Specific Notes
- **Windows**: Usually works out of the box
- **Ubuntu/Linux**: May require the DNS configuration fixes
- **Cloud environments**: May have additional network restrictions
- **Corporate networks**: May require specific DNS servers or proxy settings
