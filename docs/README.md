# ChatConnect - Real-Time Chat Application

ChatConnect is a responsive web-based chat application designed to support fast, real-time messaging between users. It features secure user registration, persistent message history, direct one-to-one messaging, and fully managed group chat rooms.

---

## Features
* **User Accounts:** Secure registration and login with encrypted credentials.
* **Direct Chat:** Instantly start direct one-to-one message sessions.
* **Group Chat:** Create group chats, add members, leave groups, and view participant logs.
* **Real-time Synchronicity:** Immediate message distribution, typing indicators, and online status.
* **Premium UX/UI:** Mobile-responsive design, visual transitions, and intuitive layouts.

---

## Tech Stack
* **Frontend:** React, Vite, Vanilla CSS, Socket.io-client
* **Backend:** Node.js, Express, Socket.io, Prisma ORM
* **Database:** SQLite (self-contained file storage)

---

## Folder Structure
```text
chat-app/
├── backend/                  # Server-side application logic
│   ├── src/                  # Express endpoints & WebSocket handlers
│   └── prisma/               # DB Schema definition & SQLite migrations
├── frontend/                 # Client UI application
│   └── src/                  # Components, contexts, and API hooks
└── README.md                 # Project documentation
```

---

## Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+)
* [npm](https://www.npmjs.com/)

### 1. Clone the repository and configure dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key-change-in-production"
```

### 3. Initialize SQLite database
In the `backend/` directory, execute Prisma migrations:
```bash
npx prisma migrate dev --name init
```

---

## Running Locally

### Start Backend Server
```bash
cd backend
npm run dev
```
The server starts on `http://localhost:5000` (including WebSockets).

### Start Frontend Client
```bash
cd frontend
npm run dev
```
The Vite development server will run on `http://localhost:5173`. Open this URL in multiple browser windows to test real-time communication.

---

## Future Improvements
* **End-to-End Encryption (E2EE):** Secure direct messages from interception.
* **Media Attachment support:** Upload images, audio clips, and generic document files.
* **Push Notifications:** Configure background notifications using FCM/APNs.
* **Active Call Integration:** Establish audio and video calls via WebRTC channels.

---

## Screenshots
*Screenshots of the Chat Window, Group Configuration Dialog, and mobile viewport views will be added here during Phase 6.*

---

## License
Distributed under the MIT License. See `LICENSE` for more information.
