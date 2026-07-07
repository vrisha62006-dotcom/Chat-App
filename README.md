# Chat App 💬

A real-time Chat Application built with React (Vite) on the frontend, and Node.js/Express with Socket.io and Prisma (SQLite) on the backend.

---

## 🚀 How to Setup and Run

Since `node_modules` (dependency files) and `.env` (secrets configuration) are ignored in Git (to keep the repository clean and secure), you must install dependencies and configure your environment variables before running the application.

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

---

### 🛠️ Setup Instructions

#### 1. Install Dependencies
You need to install dependencies for the root, the backend, and the frontend. Open your terminal in the project root directory and run:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### 2. Configure Environment Variables
1. Copy the `.env.example` files to `.env`:
   * **In the project root:**
     ```bash
     cp .env.example .env
     ```
   * **In the backend directory:**
     ```bash
     cp backend/.env.example backend/.env
     ```
2. Open `.env` and `backend/.env` files and customize the variables if needed (e.g., change `JWT_SECRET`).

#### 3. Database Setup (Prisma & SQLite)
Generate the Prisma Client database schema and set up the SQLite local database:
```bash
# From the root directory, generate the client and sync schema
npx prisma generate --schema=./database/schema.prisma
```

---

### ⚡ Running the Application

To run the application, you need to start both the backend and frontend servers:

#### 1. Start the Backend Server
Open a terminal in the project root and run:
```bash
cd backend
npm run dev
```
The backend server will run on `http://localhost:5001`.

#### 2. Start the Frontend App
Open a **new** terminal in the project root and run:
```bash
cd frontend
npm run dev
```
Open the URL shown in the terminal (usually `http://localhost:5173`) in your web browser to use the Chat App!

---

## 🛠️ Tech Stack
* **Frontend:** React, Vite, Socket.io-client
* **Backend:** Node.js, Express, Socket.io
* **Database & ORM:** SQLite, Prisma ORM