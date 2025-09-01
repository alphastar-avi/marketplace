# Azure Full-Stack Deployment Memory

## Overview
This memory contains all the knowledge gained from successfully deploying a Go/React full-stack application to Azure using Terraform and GitHub Actions CI/CD.

## Deployment Stack
- **Backend**: Go + Gin framework with GORM PostgreSQL ORM
- **Frontend**: React with axios API client  
- **Database**: Azure PostgreSQL Flexible Server with SSL encryption
- **Infrastructure**: Azure Container Apps + Static Web Apps
- **CI/CD**: GitHub Actions with Terraform automation
- **Containerization**: Docker with multi-stage builds

## Critical Learnings & Solutions

### 1. CORS Configuration (Most Common Issue)
**Problem**: Frontend gets 403 preflight errors
**Solution**: Add exact Static Web App domain to backend CORS configuration
```go
AllowOrigins: []string{
    "http://localhost:3000",
    "https://your-exact-domain.azurestaticapps.net", // Must be exact
    "https://*.azurestaticapps.net", // Wildcards unreliable
}
```
**Fix Process**: Update code → rebuild Docker → push to ACR → update Container App

### 2. Docker Platform Compatibility
**Problem**: ARM Mac images fail on Azure x86 servers
**Solution**: Always use `--platform linux/amd64` when building
```bash
docker build --platform linux/amd64 -t your-app .
```

### 3. Database SSL Requirements
**Problem**: Connection failures to Azure PostgreSQL
**Solution**: Always set `sslmode=require` in connection string
```go
dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=require TimeZone=UTC",
    host, user, password, dbname, port)
```

### 4. Environment Variable Handling
**Problem**: Special characters in passwords break CLI commands
**Solution**: Use single quotes around values
```bash
--env-vars DB_PASSWORD='MyPassword123!'
```

### 5. Container Registry Authentication
**Problem**: Container Apps can't pull images
**Solution**: Enable admin user on ACR
```bash
az acr update --name myregistry --admin-enabled true
```

### 6. Static Web Apps Region Limitations
**Problem**: "location not available" errors
**Available Regions**: East US 2, Central US, West US 2, West Europe, East Asia

## Terraform Best Practices

### File Structure
```
terraform/
├── main.tf              # Resource definitions
├── variables.tf         # Input variables  
├── outputs.tf          # Output values
├── terraform.tfvars    # Your values (gitignored)
└── terraform.tfvars.example # Template
```

### Key Principles
- Use variables for all configurable values
- Store secrets in GitHub Secrets, not tfvars files
- Tag all resources with Environment/Project
- Use remote state for team collaboration
- Separate environments with workspaces

### Resource Tagging
```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}
```

## CI/CD Pipeline Structure

### Simple Pipeline (Recommended)
1. **Test**: Frontend build + Backend tests
2. **Infrastructure**: Terraform apply with secrets
3. **Backend**: `az acr build` + container app update
4. **Frontend**: npm build + Static Web Apps deploy

### Required GitHub Secrets
```
AZURE_CREDENTIALS     # Service principal JSON
POSTGRES_PASSWORD     # Strong database password
JWT_SECRET           # Random string for JWT tokens
```

### Service Principal Creation
```bash
az ad sp create-for-rbac \
  --name "myapp-github-actions" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth
```

## Common Errors & Troubleshooting

### Container App Won't Start
```bash
# Check logs
az containerapp logs show --name myapp-backend --resource-group myapp-rg

# Common causes:
# - Wrong environment variables
# - Image platform mismatch
# - Port configuration mismatch
# - Database connection failures
```

### Database Connection Issues
```bash
# Test connection locally first
psql "host=mydb.postgres.database.azure.com port=5432 dbname=postgres user=admin sslmode=require"

# Check firewall rules
az postgres flexible-server firewall-rule list --resource-group myapp-rg --name mydb
```

### CORS Debugging
```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://your-frontend.azurestaticapps.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://your-backend.azurecontainerapps.io/api/auth/login -v

# Expected: HTTP 204 with CORS headers
```

## Cost Optimization

### Monthly Estimates (Small Production App)
- **PostgreSQL Flexible Server**: ~$15 (B_Standard_B1ms)
- **Container Apps**: ~$0-5 (pay-per-use, scales to zero)
- **Static Web Apps**: Free tier (100GB bandwidth)
- **Container Registry**: ~$5 (Basic tier)
- **Total**: ~$20-25/month

### Cost-Saving Tips
- Use Basic tier for non-critical resources
- Enable auto-scaling with min replicas = 0
- Use Free tier Static Web Apps for small apps
- Monitor usage with Azure Cost Management

## Security Best Practices

### Development
- Never hardcode credentials in source code
- Use environment variables for all sensitive data
- Enable SSL/TLS for all connections
- Use `.env.example` files as templates

### Production
- Restrict database firewall to specific IP ranges
- Use Azure Key Vault for secrets management
- Enable Azure Monitor for security alerts
- Regular security scans with tools like Trivy

## Deployment Flow

### Initial Setup
1. Create Azure service principal with Contributor role
2. Add GitHub secrets (AZURE_CREDENTIALS, passwords)
3. Update `terraform.tfvars` with globally unique names
4. Configure CORS with placeholder domains

### Deployment Process
1. Push to main branch triggers GitHub Actions
2. Tests run (frontend build + backend tests)
3. Terraform creates/updates infrastructure
4. Backend builds in Azure ACR and deploys
5. Frontend builds and deploys to Static Web Apps
6. Update CORS with actual Static Web App URL
7. Verify health endpoints and functionality

### Post-Deployment
1. Test all API endpoints
2. Verify CORS configuration
3. Check application logs
4. Monitor performance metrics
5. Set up alerts for errors

## Framework Adaptations

### Backend Frameworks
- **Go**: Use GORM with PostgreSQL driver, Gin for HTTP
- **Node.js**: Use Prisma/TypeORM, Express with cors middleware
- **Python**: Use SQLAlchemy/Django ORM, FastAPI/Flask
- **Java**: Use Spring Boot with JPA, built-in CORS support

### Frontend Frameworks
- **React**: `REACT_APP_API_URL` environment variable
- **Vue.js**: `VUE_APP_API_URL` environment variable  
- **Angular**: Update `environment.prod.ts` with API URL
- **Next.js**: Use `NEXT_PUBLIC_API_URL` for client-side

## Quick Reference Commands

### Terraform
```bash
terraform init                    # Initialize
terraform plan                   # Preview changes
terraform apply                  # Deploy
terraform output                 # Get outputs
terraform destroy               # Clean up
```

### Azure CLI
```bash
az account show --query id -o tsv                    # Get subscription ID
az containerapp logs show --name app --resource-group rg  # View logs
az staticwebapp secrets list --name app --resource-group rg  # Get token
```

### Docker
```bash
docker build --platform linux/amd64 -t app .        # Build for Azure
docker tag app registry.azurecr.io/app:latest       # Tag for ACR
docker push registry.azurecr.io/app:latest          # Push to ACR
```

---

## For Next Session Prompt

Use this prompt when starting a new Azure deployment session:

**"I have a [TECH_STACK] application that I want to deploy to Azure. I have a MEMORY.md file with comprehensive Azure deployment knowledge from a previous project. Please read the MEMORY.md file to understand the deployment patterns, common issues, and best practices I've learned. Then help me adapt this knowledge to deploy my new [TECH_STACK] application using the same Terraform + CI/CD approach, avoiding the common pitfalls documented in the memory."**

Replace [TECH_STACK] with your actual stack (e.g., "Python/Django + React", "Node.js/Express + Vue.js", etc.)
