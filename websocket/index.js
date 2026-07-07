const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../database/db');
const config = require('../config');

let io;

const init = (server) => {
  io = socketIo(server, {
    cors: {
      origin: config.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Token can be passed in query parameters or auth headers/options
      const token = socket.handshake.query?.token || socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user details to socket instance
      socket.user = {
        id: user.id,
        username: user.username
      };
      
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.username})`);

    // Join a private socket room for this user so we can send messages directly to this user ID
    socket.join(`user_${userId}`);

    try {
      // Set user status to online
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true }
      });

      // Broadcast online status to all other users
      socket.broadcast.emit('presence', {
        userId,
        status: 'online'
      });
    } catch (err) {
      console.error(`Error updating user status to online for ${userId}:`, err);
    }

    // Handle incoming message
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content } = data;

        if (!roomId || !content || content.trim() === '') {
          return socket.emit('error_message', { error: 'Room ID and message content are required' });
        }

        // Verify that the user is a participant of the room
        const participant = await prisma.roomParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId
            }
          }
        });

        if (!participant) {
          return socket.emit('error_message', { error: 'You are not a participant of this chat room' });
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            roomId,
            senderId: userId,
            content: content.trim()
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true
              }
            }
          }
        });

        // Find all participants of the room
        const roomParticipants = await prisma.roomParticipant.findMany({
          where: { roomId }
        });

        const messagePayload = {
          id: message.id,
          roomId: message.roomId,
          senderId: message.senderId,
          senderName: message.sender.username,
          content: message.content,
          sentAt: message.sentAt
        };

        // Broadcast message to all room participants via their user-specific rooms
        roomParticipants.forEach((p) => {
          io.to(`user_${p.userId}`).emit('receive_message', messagePayload);
        });

      } catch (err) {
        console.error('Error handling send_message:', err);
        socket.emit('error_message', { error: 'Failed to process message' });
      }
    });

    // Handle typing status updates
    socket.on('typing', async (data) => {
      try {
        const { roomId, isTyping } = data;

        if (!roomId) return;

        // Find other participants in the room
        const otherParticipants = await prisma.roomParticipant.findMany({
          where: {
            roomId,
            NOT: {
              userId
            }
          }
        });

        // Emit typing status to the other participants
        otherParticipants.forEach((p) => {
          io.to(`user_${p.userId}`).emit('typing', {
            roomId,
            userId,
            username: socket.user.username,
            isTyping: !!isTyping
          });
        });

      } catch (err) {
        console.error('Error handling typing:', err);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${socket.user.username})`);

      try {
        // Update user status to offline and record last seen
        await prisma.user.update({
          where: { id: userId },
          data: {
            isOnline: false,
            lastSeenAt: new Date()
          }
        });

        // Broadcast offline presence status to all other users
        socket.broadcast.emit('presence', {
          userId,
          status: 'offline'
        });
      } catch (err) {
        console.error(`Error updating user status to offline for ${userId}:`, err);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  init,
  getIO
};
