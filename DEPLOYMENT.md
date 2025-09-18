# Marketplace Deployment Guide

## Quick Setup

### 1. GitHub Secrets (Required)
Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
```
DOCKERHUB_USERNAME = alphastar59
DOCKERHUB_TOKEN = <your-docker-hub-access-token>
AZURE_CLIENT_ID = <your-azure-client-id>
AZURE_CLIENT_SECRET = <your-azure-client-secret>
AZURE_TENANT_ID = <your-azure-tenant-id>
AZURE_SUBSCRIPTION_ID = (run: az account show --query id -o tsv)
DB_PASSWORD = <your-secure-database-password>
```

### 2. Create Static Web App (One-time setup)
1. Go to Azure Portal → Create Resource → Static Web Apps
2. Choose GitHub as source
3. Select your repository and `prod` branch
4. Set build details:
   - App location: `./frontend`
   - Output location: `dist`
5. Copy the deployment token to GitHub secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`

### 3. Deploy
```bash
# Push to main branch (builds images)
git push origin main

# Push to prod branch (full deployment)
git push origin prod
```

## Branch Workflow

### Main Branch
- **Triggers**: Push to `main`
- **Actions**: 
  - Build backend Docker image → Push as `latest`
  - Build frontend → Store artifacts
- **No deployment**

### Prod Branch  
- **Triggers**: Push to `prod`
- **Actions**:
  1. Pull `latest` backend image → Tag with version → Push versioned tag
  2. Run Terraform → Create/update Azure resources
  3. Deploy backend to Container Apps
  4. Get backend URL from Terraform
  5. Build frontend with backend URL → Deploy to Static Web Apps

## URLs After Deployment

- **Frontend**: `https://<static-web-app-name>.azurestaticapps.net`
- **Backend**: `https://ca-marketplace-backend-dev.<region>.azurecontainerapps.io`
- **Database**: `psql-marketplace-dev-<random>.postgres.database.azure.com`

## Troubleshooting

### Build Failures
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure Docker image builds locally

### Deployment Failures
- Check Terraform logs in GitHub Actions
- Verify Azure credentials have correct permissions
- Check resource naming conflicts

### Database Connection Issues
- Verify firewall rules allow Azure services
- Check connection string format
- Ensure database exists and user has permissions

### Frontend API Calls
- Check if `VITE_API_URL` is set correctly
- Verify CORS settings in backend
- Check network connectivity between Static Web Apps and Container Apps

## Manual Commands

### Local Development
```bash
# Backend
cd backend
go run main.go

# Frontend  
cd frontend
npm run dev
```

### Manual Terraform
```bash
cd terraform
terraform init
terraform plan -var="db_admin_password=Marketplace_Azure_1234*"
terraform apply -var="db_admin_password=Marketplace_Azure_1234*"
```

### Docker Commands
```bash
# Build locally
docker build -t marketplace-backend ./backend

# Run locally
docker run -p 8080:8080 marketplace-backend
```
