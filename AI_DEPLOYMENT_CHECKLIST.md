# AI Feature Deployment Checklist

## ✅ Code Changes Made

All code changes for the AI description generation feature have been implemented:

### Backend Files
- ✅ `backend/handlers/ai_description.go` - AI description handlers (already exists)
- ✅ `backend/config/gemini_service.go` - Gemini API integration (already exists)
- ✅ `backend/routes/routes.go` - API routes (already configured)
- ✅ Temp directory now uses `/tmp/ai-analysis` in production containers

### Frontend Files
- ✅ `frontend/src/components/listing/ListItemPage.tsx` - AI button integration
- ✅ `frontend/src/api/services.ts` - API methods
- ✅ `frontend/src/api/client.ts` - Fixed FormData handling for multipart uploads

### Deployment Configuration
- ✅ `terraform/main.tf` - Added GEMINI_API_KEY environment variable
- ✅ `terraform/variables.tf` - Added gemini_api_key variable
- ✅ `.github/workflows/prod.yml` - Updated to pass GEMINI_API_KEY to Terraform
- ✅ `DEPLOYMENT.md` - Updated with GEMINI_API_KEY instructions

## 📋 Manual Steps Required

### 1. Get Google Gemini API Key (Optional but Recommended)

**If you want AI-powered descriptions:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (you'll need it in step 2)

**If you skip this step:** The AI feature will still work but will use template-based descriptions instead of AI-generated ones.

### 2. Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secret:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key from step 1 (or leave empty if not using AI)
5. Click **"Add secret"**

**Note**: If you don't add this secret or leave it empty, the system will use template-based descriptions. The deployment will still work, but AI features will be disabled.

### 3. Update Existing Container App (If Already Deployed)

If your container app is already running, you need to update it with the new environment variable:

**Option A: Using Azure Portal**
1. Go to Azure Portal → Container Apps
2. Select your container app: `ca-marketplace-backend-dev`
3. Go to **Settings** → **Secrets and environment variables**
4. Click **"Edit and deploy new revision"**
5. Under **Environment variables**, add:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (or leave empty)
6. Click **"Save"**

**Option B: Using Terraform (Recommended)**
1. Make sure you've added `GEMINI_API_KEY` to GitHub secrets (step 2)
2. Push to `prod` branch - Terraform will automatically update the container app

**Option C: Using Azure CLI**
```bash
az containerapp update \
  --name ca-marketplace-backend-dev \
  --resource-group rg-marketplace-dev \
  --set-env-vars GEMINI_API_KEY="<your-api-key>"
```

### 4. Deploy

**Automated Deployment (Recommended):**
```bash
# Push to main branch (builds Docker image with AI feature)
git add .
git commit -m "Add AI description generation feature"
git push origin main

# Push to prod branch (deploys everything)
git checkout prod
git merge main
git push origin prod
```

The GitHub Actions workflow will:
- Build the backend Docker image with AI features
- Run Terraform to update the container app with GEMINI_API_KEY
- Deploy frontend with updated API client

**Manual Deployment (If needed):**
```bash
# Build and push Docker image
cd backend
docker build --platform linux/amd64 -t alphastar59/marketplace-backend-alpine-amd64:latest .
docker push alphastar59/marketplace-backend-alpine-amd64:latest

# Update Terraform
cd ../terraform
terraform init
terraform apply \
  -var="db_admin_password=$DB_PASSWORD" \
  -var="gemini_api_key=$GEMINI_API_KEY" \
  -var="container_image_tag=latest"
```

### 5. Verify Deployment

**Test the AI Feature:**
1. Go to your deployed frontend
2. Click "List Item"
3. Upload product images
4. Enter title and category
5. Click the **"AI"** button next to the description field
6. Verify:
   - If `GEMINI_API_KEY` is set: Should see "Generated with Gemini AI" alert
   - If not set: Should see "Generated with template" alert

**Test Backend API:**
```bash
# Check AI status
curl https://ca-marketplace-backend-dev.jollydesert-5443c3db.eastasia.azurecontainerapps.io/api/ai/status

# Expected response if configured:
# {"gemini_configured": true, "status": "available"}

# Expected response if not configured:
# {"gemini_configured": false, "status": "template_only"}
```

## 🔧 Troubleshooting

### AI Button Not Working
- Check browser console for errors
- Verify FormData is being sent (check Network tab)
- Ensure backend is accessible from frontend

### "Template Only" Responses
- Check if `GEMINI_API_KEY` is set in container app
- Verify API key is valid (test it directly with curl)
- Check backend logs for Gemini API errors

### File Upload Errors
- Verify temp directory is writable (`/tmp/ai-analysis` in containers)
- Check file size limits (32MB max per upload)
- Ensure images are valid formats (JPEG, PNG, WebP, GIF)

### Container App Won't Start
- Check container logs in Azure Portal
- Verify all environment variables are set correctly
- Ensure GEMINI_API_KEY secret exists (even if empty)

## 📝 Environment Variables Reference

The following environment variables are now used:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI descriptions | No | "" (uses templates) |
| `GIN_MODE` | Gin framework mode | No | "release" (production) |
| `TMPDIR` | Temp directory (not used currently) | No | `/tmp` |

## 🎯 Feature Summary

The AI description generation feature:
- ✅ Generates product descriptions using Google Gemini 2.0 Flash
- ✅ Falls back to template-based descriptions if API key not configured
- ✅ Processes uploaded images (up to 4 images)
- ✅ Returns processing time and model used
- ✅ Works with both file uploads and image URLs
- ✅ Automatically cleans up temp files after processing

