# API & WebSocket Contract Specifications - ChatConnect

This document details the REST HTTP API routes and WebSocket events used for real-time messaging synchronization.

---

## 1. Authentication REST Endpoints

### 1.1 User Registration
* **Endpoint:** `POST /api/auth/register`
* **Request Body:**
  ```json
  {
    "username": "alice",
    "password": "securepassword123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "u-873f-42da",
      "username": "alice"
    }
  }
  ```

### 1.2 User Login
* **Endpoint:** `POST /api/auth/login`
* **Request Body:**
  ```json
  {
    "username": "alice",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u-873f-42da",
      "username": "alice"
    }
  }
  ```

### 1.3 User Logout
* **Endpoint:** `POST /api/auth/logout`
* **Headers:** `Authorization: Bearer <token>`
* **Success Response (200 OK):**
  ```json
  {
    "message": "Logout successful"
  }
  ```

---

## 2. Chats/Rooms Endpoints (Requires Auth Header)

### 2.1 Create Chat (1-to-1 or Group)
* **Endpoint:** `POST /api/rooms`
* **Request Body:**
  ```json
  {
    "name": "Design Team", // Null for 1-to-1 chats
    "isGroup": true,
    "recipientId": "u-994c-88ae" // Required only if isGroup is false
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": "r-442a-99fb",
    "name": "Design Team",
    "isGroup": true,
    "createdAt": "2026-06-28T14:00:00Z"
  }
  ```

### 2.2 Fetch Chats
Retrieves list of rooms that the authenticated user is currently a member of.
* **Endpoint:** `GET /api/rooms`
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": "r-442a-99fb",
      "name": "Design Team",
      "isGroup": true,
      "lastMessage": {
        "content": "Meeting starts in 5 mins",
        "sentAt": "2026-06-28T14:05:00Z"
      }
    }
  ]
  ```

---

## 3. Group Membership Endpoints (Requires Auth Header)

### 3.1 Join Group Room
Allows standard users to join an active public group.
* **Endpoint:** `POST /api/rooms/:roomId/join`
* **Success Response (200 OK):**
  ```json
  {
    "message": "Successfully joined the group",
    "roomId": "r-442a-99fb"
  }
  ```

### 3.2 Leave Group Room
* **Endpoint:** `POST /api/rooms/:roomId/leave`
* **Success Response (200 OK):**
  ```json
  {
    "message": "Successfully left the group"
  }
  ```

### 3.3 Get Members List
* **Endpoint:** `GET /api/rooms/:roomId/members`
* **Success Response (200 OK):**
  ```json
  [
    {
      "userId": "u-873f-42da",
      "username": "alice",
      "isAdmin": true
    },
    {
      "userId": "u-994c-88ae",
      "username": "bob",
      "isAdmin": false
    }
  ]
  ```

---

## 4. Message History Endpoints (Requires Auth Header)

### 4.1 Fetch Messages
Retrieves messages belonging to a specified room.
* **Endpoint:** `GET /api/rooms/:roomId/messages`
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": "m-552a-bc32",
      "roomId": "r-442a-99fb",
      "sender": {
        "id": "u-873f-42da",
        "username": "alice"
      },
      "content": "Hello Team!",
      "sentAt": "2026-06-28T13:58:00Z"
    }
  ]
  ```

---

## 5. WebSocket Events
All WebSocket events authenticate using the client's JWT query parameter on handshake connection: `io("ws://localhost:5000", { query: { token } })`.

### 5.1 System Events
* **`connect`**: Triggered when client establishes connection. Server updates user presence as `online` and broadcasts to active contacts.
* **`disconnect`**: Triggered when client disconnects. Server registers `last_seen_at` timestamp and broadcasts `offline` presence event.

### 5.2 Communication Events
* **`send_message` (Client -> Server):**
  Sends a message payload to a specific room.
  ```json
  {
    "roomId": "r-442a-99fb",
    "content": "We are live!"
  }
  ```
* **`receive_message` (Server -> Client):**
  Dispatched by the server to all room subscribers.
  ```json
  {
    "id": "m-887e-fa22",
    "roomId": "r-442a-99fb",
    "senderId": "u-873f-42da",
    "senderName": "alice",
    "content": "We are live!",
    "sentAt": "2026-06-28T14:10:00Z"
  }
  ```

### 5.3 Interaction Events
* **`typing` (Client -> Server -> Client):**
  Broadcasts typing states inside a room.
  * **Payload:** `{ "roomId": "r-442a-99fb", "isTyping": true }`
* **`presence` (Server -> Client):**
  Broadcasts user status updates to other users.
  * **Payload:** `{ "userId": "u-873f-42da", "status": "online" }`
