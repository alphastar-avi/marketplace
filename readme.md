# Campus Marketplace

A full-stack, real-time marketplace platform designed exclusively for college students. Students can securely buy, sell, and request items within their university ecosystem, with built-in carpooling and real-time chat features.

---

## Features

* **University-Gated Access**: JWT-based authentication ensuring only verified students from the same college can interact.
* **Real-time Chat**: Integrated messaging system allowing buyers and sellers to negotiate securely.
* **Carpooling**: A dedicated section for students to offer or request rides to/from campus.
* **Smart Filtering**: Distinct separation between "My Listings" and the global marketplace to prevent self-purchasing confusion.
* **Purchase Requests**: Streamlined workflow for buyers to formally request an item.

---

## Tech Stack

**Frontend**
* React 19 + Vite
* TailwindCSS v4
* Framer Motion (Animations)
* React Three Fiber (3D Elements)
* React Router DOM

**Backend**
* Go (Golang)
* Gin Web Framework
* GORM (Object Relational Mapping)
* PostgreSQL (Deployed via Azure)
* JWT Authentication

---

## Local Setup

### 1. Database & Backend Configuration

Make sure you have a PostgreSQL instance running. 

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file (use `.env.example` as a reference if available) and add your database credentials and JWT Secret:
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=yourpassword
   DB_NAME=marketplace
   DB_PORT=5432
   JWT_SECRET=your_super_secret_key
   ```
3. Run the Go server (this will automatically migrate the database schema on port 8080):
   ```bash
   go run main.go
   ```

### 2. Frontend Configuration

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## Project Structure

* `/backend/handlers` - Core API logic (Products, Auth, Chats, Carpools)
* `/backend/models` - GORM database schemas 
* `/frontend/src/components` - Reusable UI widgets and pages
* `/frontend/src/api` - Axios interceptors and backend communication services
* `/frontend/src/state` - Global React Context management
