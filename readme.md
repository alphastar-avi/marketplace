# Campus Marketplace

A full-stack, real-time marketplace platform designed exclusively for college students. Students can securely buy, sell, and request items within their university ecosystem, with built-in carpooling and real-time chat features.

---

## Features

* **University-Gated Access**: Authentication ensuring only verified students from the same college can interact.
* **Real-time Chat**: Integrated messaging system allowing buyers and sellers to negotiate securely.
* **Carpooling**: A dedicated section for students to offer or request rides to and from campus.
* **Smart Filtering**: Distinct separation between "My Listings" and the global marketplace to prevent self-purchasing confusion.
* **Purchase Requests**: Streamlined workflow for buyers to formally request an item.

---

## Tech Stack

### Frontend
* React 19 + Vite
* TailwindCSS v4
* Framer Motion (Animations)
* React Three Fiber (3D Elements)
* React Router DOM

### Backend
* Go (Golang)
* Gin Web Framework
* GORM (Object Relational Mapping)
* JWT Authentication

### Cloud & Infra
* **Microsoft Azure**: Primary cloud provider.
* **Azure Container Apps**: Serverless container hosting for the backend application.
* **Azure Database for PostgreSQL Flexible Server**: Primary relational database.
* **Azure Blob Storage**: Cloud storage for product images and assets.
* **Terraform**: Infrastructure as Code (IaC) for provisioning and managing all Azure resources.

---

## Repository Structure

### Folders
* `/backend` - Core Go API logic (Products, Auth, Chats, Carpools).
* `/frontend` - React SPA (Single Page Application) with 3D components and Tailwind styling.
* `/terraform` - Azure infrastructure configurations.
* `/computeShare` - Standalone PyTorch federated learning module.

### Branching Strategy
* **`main`**: The active development branch. All new features and bug fixes are merged here first.
* **`prod`**: The production branch. This branch is directly linked to Terraform and Azure deployments. Code pushed or merged into `prod` automatically triggers the CI/CD pipeline to provision infrastructure and deploy the application.
