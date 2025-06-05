# Production Deployment Check Script
Write-Host "=== AI Lesson Maker Production Deployment Check ===" -ForegroundColor Green

# Check if Docker is running
Write-Host "`nChecking Docker status..." -ForegroundColor Yellow
docker --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not installed or not running!" -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# Build and start the production containers
Write-Host "`nBuilding and starting production containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for containers to start
Write-Host "`nWaiting for containers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check container status
Write-Host "`nChecking container status..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

# Check if ports are accessible
Write-Host "`nChecking port accessibility..." -ForegroundColor Yellow
Write-Host "Backend (port 8000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "✓ Backend is accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Frontend (port 4001):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4001" -TimeoutSec 5
    Write-Host "✓ Frontend is accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Show container logs
Write-Host "`nContainer logs (last 20 lines):" -ForegroundColor Yellow
Write-Host "=== Backend Logs ===" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml logs --tail=20 backend

Write-Host "`n=== Frontend Logs ===" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml logs --tail=20 frontend

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "If everything is working locally, make sure your server:" -ForegroundColor Yellow
Write-Host "1. Has ports 8000 and 4001 open in firewall/security groups" -ForegroundColor Yellow
Write-Host "2. Is accessible from external IPs" -ForegroundColor Yellow
Write-Host "3. Has Docker and Docker Compose installed" -ForegroundColor Yellow
Write-Host "4. Has sufficient resources (CPU/Memory)" -ForegroundColor Yellow
