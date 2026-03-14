# Campus Marketplace

**Campus Marketplace**

*BUY! SELL! RIDE! COMPUTE!*

CI status | GitHub release | Discord | MIT License

Campus Marketplace is a comprehensive, full-stack platform designed exclusively for college students. It connects you with your peers within a verified university ecosystem to securely buy, sell, request items, organize carpools, and even share idle GPU resources for distributed machine learning. The Azure-backed infrastructure handles the heavy lifting — the product is the seamless campus connection.

If you want a safe, student-focused marketplace that feels local, fast, and always-on, this is it.

[Website](#) · [Docs](#) · [Vision](#) · [Getting Started](#) · [Infrastructure](#) · [FAQ](#)

---

## Preferred setup

To get started with local development, ensure you have **Go ≥1.23** and **Node ≥20** installed. The project is split into distinct backend and frontend application layers, with infrastructure managed via Terraform.

New install? Start here: [Getting started](#)

---

## Subscriptions & Integrations

**Cloud & Databases (Azure):**
- **Azure Container Apps**: Serverless container hosting for the API.
- **Azure Database for PostgreSQL Flexible Server**: Primary relational database.
- **Azure Blob Storage**: Cloud storage for product images and assets.

**Core Services:**
- Google OAuth (Authentication)
- Groq API (AI features)

*Note: For the best experience and to deploy your own instance, ensure you have an active Azure subscription with the required resource providers registered.*

---

## Install (recommended)

### Backend (Go / Gin / GORM)

Runtime: Go ≥1.23.

```bash
git clone https://github.com/alphastar-avi/marketplace.git
cd marketplace/backend

# Set up your environment variables
cp .env.example .env

# Run the Go server (automatically runs standard DB migrations)
go run main.go
```

The backend API will start on `http://localhost:8080`.

### Frontend (React / Vite / TailwindCSS)

Runtime: Node ≥20.

```bash
cd marketplace/frontend

npm install
# or: pnpm install / bun install

npm run dev
```

The frontend application will start on `http://localhost:5173`.

---

## Development branches

- **`main`**: The active development branch. All new features, bug fixes, and continuous integration target this branch.
- **`prod`**: The production branch. This branch is directly linked to Terraform and Azure deployments.
- **Switch channels**: `git checkout main|prod`. Details: [Development branches](#)

---

## Security defaults (University-Gated Access)

Campus Marketplace connects real students. Treat inbound requests seriously.

- **Authentication**: JWT-based authentication ensures only verified students can interact.
- **Authorization**: Students can only view and interact with products and users within their specific `.edu` college ecosystem.
- **Smart Filtering**: Distinct separation between "My Listings" and the global marketplace to prevent self-purchasing confusion or malicious manipulation.

---

## Highlights

- **University-Gated Access** — secure JWT authentication enforcing college-specific interactions.
- **Real-time Chat** — integrated WebSocket/polling messaging system for buyers and sellers.
- **Carpooling** — a dedicated module for students to offer or request rides to and from campus.
- **Purchase Requests** — formalized, trackable workflow for buyers to request items.
- **ComputeShare (Federated Learning)** — a distributed PyTorch module allowing users to share idle Mac GPU resources (MPS) to exponentially accelerate machine learning tasks.
- **Live 3D Canvas** — interactive 3D elements powered by React Three Fiber.

---

## Everything we built so far

### Core platform
- **Database schemas (GORM)** for Users, Colleges, Products, Chats, Messages, PurchaseRequests, and Favorites.
- **RESTful API endpoints** with strict ownership and payload validation.
- **Authentication middleware** handling token verification and college context injection.

### Frontend Client
- **Marketplace feed** with smart filtering.
- **User profiles** with dedicated "My Listings" management.
- **Chat interfaces** for direct negotiation.
- **Carpool board** for ride coordination.

### Cloud Infrastructure
- **Terraform configurations** (`/terraform`) for declarative IaC.
- **Azure Container Apps environment** provisioning.
- **Azure PostgreSQL server** and firewall rules initialization.
- **Blob Storage containers** for asset management.

### ComputeShare (PyTorch)
- **Parameter Server** utilizing the Linear Scaling Rule.
- **Distributed Workers** capable of local gzip tensor compression.
- **Stale Gradients Rejection** logic to protect global weights.

---

## How it works (short)

```text
       Frontend (React/Vite)
               │
               ▼
┌───────────────────────────────┐
│        Go Gin Backend         │
│         (Azure App)           │
│    https://api.domain.com     │
└──────────────┬────────────────┘
               │
               ├─ Azure PostgreSQL (Data)
               ├─ Azure Blob Storage (Assets)
               └─ ComputeShare Nodes (MPS GPUs)
```

---

## Ops + packaging

- **Infrastructure as Code**: Terraform scripts automatically manage the Azure environment.
- **Containerization**: Multi-stage `Dockerfile` and `Dockerfile.scratch` builds minimize the backend image payload.
- **CD/CI**: Pushes to the `prod` branch automatically trigger Azure deployments.

---

## Docs

Use these when you’re past the onboarding flow and want the deeper reference.

- Start with the `/backend/models` to understand the database ERD.
- Read the `/terraform/main.tf` for the infrastructure overview.
- Use the `/frontend/src/api/services.ts` to see all available frontend-to-backend hooks.
- For AI training, read the `/computeShare/README.md` operational runbook.

---

## Molty

Campus Marketplace was built to connect students effortlessly. 🎓 
by the community.
