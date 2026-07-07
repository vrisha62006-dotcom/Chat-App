# Software Requirements Specification (SRS) - ChatConnect

## 1. Project Overview
ChatConnect is a lightweight, real-time messaging application designed to facilitate seamless communication between users. The application supports direct one-to-one messaging as well as collaborative group chats. Built with a responsive, modern interface, ChatConnect functions across desktop and mobile browsers, ensuring a consistent user experience.

## 2. Objectives
* Provide a fast, responsive, and secure real-time chatting interface.
* Support instant delivery of text messages in direct and group contexts.
* Implement intuitive group management controls (create, join, leave).
* Deliver a robust architectural baseline that can scale from a single host to a distributed layout.

## 3. Scope
**In-Scope:**
* User authentication: Registration, login, and logout.
* Direct Chat: One-to-one real-time text messaging between users.
* Group Chat: Multi-user rooms for text conversation with membership management (create, join, leave).
* Real-time notifications and presence (online/offline indicators).
* Device-agnostic mobile-responsive web user interface.

**Out-of-Scope (Future Versions):**
* Voice and video calls.
* File/media attachments and message search.
* End-to-end message encryption.

## 4. User Roles
* **Guest User:** Unauthenticated visitor who can register or log in.
* **Standard User:** Authenticated user who can chat one-to-one, create groups, join groups, and leave groups.
* **Group Admin:** The creator of a group who holds permissions to manage group membership.

## 5. Functional Requirements
* **FR-1.0: User Management**
  * **FR-1.1:** Guest must be able to register with a unique username and a password.
  * **FR-1.2:** Registered user must be able to log in securely.
  * **FR-1.3:** Authenticated user must be able to log out, terminating their session.
* **FR-2.0: One-to-One Chat**
  * **FR-2.1:** User must be able to search for other registered users and initiate a chat.
  * **FR-2.2:** Messages must be delivered in real-time if both users are online.
  * **FR-2.3:** System must save and load historical messages when a chat is opened.
  * **FR-2.4:** Every message must display a timestamp indicating when it was sent.
* **FR-3.0: Group Chat**
  * **FR-3.1:** User must be able to create a group chat with a specified name.
  * **FR-3.2:** Creator of the group is designated as the Group Admin.
  * **FR-3.3:** Group Admin must be able to invite or add users to the group.
  * **FR-3.4:** Users must be able to voluntarily leave any group they are part of.
  * **FR-3.5:** Messages sent inside a group must distribute to all current active members in real-time.
* **FR-4.0: User Presence & UI**
  * **FR-4.1:** System should display whether a user is online or offline.
  * **FR-4.2:** UI must adapt dynamically to desktop, tablet, and mobile screens.

## 6. Non-Functional Requirements
* **NFR-1.0: Latency & Speed:** Real-time message distribution must take less than 500 milliseconds under standard network conditions.
* **NFR-2.0: Security:** Passwords must be hashed using bcrypt on the server. Active WebSockets must be authenticated via tokens (JWT).
* **NFR-3.0: Reliability:** The system must reconnect automatically to the WebSocket server upon transient network loss.
* **NFR-4.0: Usability:** The user interface must be clean, modern, and accessible, adhering to basic contrast and sizing standards.

## 7. Assumptions
* Users have access to modern web browsers that support CSS Flexbox/Grid, Fetch API, and WebSockets.
* A persistent network connection is available to the clients during application use.

## 8. Constraints
* Application relies on single-node deployment initially, limiting maximum initial scale to server hardware.
* All chats are stored in text format; binary attachments are restricted for storage efficiency in V1.

## 9. User Stories
* **US-1:** As a new visitor, I want to register a new account with a simple username so I can start using the application.
* **US-2:** As a registered user, I want to securely log in with my password to retrieve my active conversations.
* **US-3:** As a user, I want to send an instant message to a friend so that we can converse in real-time.
* **US-4:** As a project team member, I want to create a group chat and add my teammates so that we can coordinate project tasks together.
* **US-5:** As a group participant, I want to leave a group chat when I am no longer involved in the topic.

## 10. Success Criteria
* 100% of registration and login requests are processed securely.
* Messages are successfully synchronized in real-time across multiple active browser windows.
* Refreshing the browser preserves chat logs and membership lists correctly.
