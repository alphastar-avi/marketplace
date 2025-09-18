# Marketplace - Azure Deployment

Complete CI/CD deployment for marketplace application with frontend and backend.

## Architecture

- **Frontend**: React app deployed to Azure Static Web Apps (Free tier)
- **Backend**: Go API deployed to Azure Container Apps (Basic tier)
- **Database**: PostgreSQL Flexible Server (Basic tier)

## Prerequisites

1. **Azure CLI & Terraform**
   ```bash
   brew install azure-cli terraform
   az login
   ```

2. **GitHub Secrets Setup**
   Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):
   
   **Docker Hub:**
   - `DOCKERHUB_USERNAME`: alphastar59
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token
   
   **Azure:**
   - `AZURE_CLIENT_ID`: Service principal app ID
   - `AZURE_CLIENT_SECRET`: Service principal password
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
   - `AZURE_TENANT_ID`: Your Azure tenant ID
   
   **Database:**
   - `DB_PASSWORD`: Marketplace_Azure_1234*
   
   **Static Web Apps:**
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: (Generated when creating Static Web App)

## Deployment Workflow

### Branch Strategy
- **`main`**: Build only (Docker images pushed to Docker Hub)
- **`prod`**: Full deployment (Backend + Frontend deployed to Azure)

### Automatic Deployment
1. Push to `main` → Builds Docker images
2. Push to `prod` → Deploys entire application to Azure

### Manual Deployment
```bash
cd terraform
terraform init
terraform plan -var="db_admin_password=Marketplace_Azure_1234*"
terraform apply -var="db_admin_password=Marketplace_Azure_1234*"
```

## Resources Created

- **Resource Group**: `rg-marketplace-dev`
- **Container Apps Environment**: Serverless container platform
- **PostgreSQL Flexible Server**: Managed database (B_Standard_B1ms)
- **Container App**: Backend API (0.25 vCPU, 0.5Gi memory, 0-10 replicas)
- **Static Web App**: Frontend hosting (Free tier)

## Environment Variables

**Backend Container:**
- `DB_HOST`: PostgreSQL server FQDN
- `DB_PORT`: 5432
- `DB_NAME`: marketplace
- `DB_USER`: marketplace_admin
- `DB_PASSWORD`: From GitHub secrets
- `PORT`: 8080
- `GIN_MODE`: release

**Frontend Build:**
- `VITE_API_URL`: Backend URL (automatically set during deployment)

## Monitoring & Logs

- **Container Apps**: Azure Portal → Container Apps → Log stream
- **Database**: Azure Portal → PostgreSQL servers → Monitoring
- **Static Web Apps**: Azure Portal → Static Web Apps → Functions

## Cost Estimate (Azure Student Account)

- Container Apps: ~$5-15/month
- PostgreSQL Flexible Server: ~$15-25/month
- Static Web Apps: Free
- **Total: ~$20-40/month**

## Cleanup

```bash
terraform destroy -var="db_admin_password=Marketplace_Azure_1234*"
```
