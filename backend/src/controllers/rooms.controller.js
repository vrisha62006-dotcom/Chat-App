const prisma = require('../../../database/db');

const createOrGetRoom = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'Cannot start a chat with yourself' });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Check if 1-to-1 room already exists
    const existingRooms = await prisma.room.findMany({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId: recipientId } } }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    if (existingRooms.length > 0) {
      // Clean up response format to match requirements
      const room = existingRooms[0];
      return res.status(200).json({
        id: room.id,
        name: room.name,
        isGroup: room.isGroup,
        createdAt: room.createdAt,
        participants: room.participants.map(p => p.user)
      });
    }

    // Create a new 1-to-1 room
    const newRoom = await prisma.room.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: req.user.id },
            { userId: recipientId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      id: newRoom.id,
      name: newRoom.name,
      isGroup: newRoom.isGroup,
      createdAt: newRoom.createdAt,
      participants: newRoom.participants.map(p => p.user)
    });
  } catch (err) {
    next(err);
  }
};

const getRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        participants: {
          some: {
            userId: req.user.id
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            sentAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Map rooms to standard response format and sort by last message timestamp (or creation date)
    const formattedRooms = rooms.map(room => {
      const lastMessage = room.messages[0] || null;
      return {
        id: room.id,
        name: room.name,
        isGroup: room.isGroup,
        createdAt: room.createdAt,
        participants: room.participants.map(p => p.user),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sentAt: lastMessage.sentAt,
          sender: lastMessage.sender
        } : null
      };
    }).sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.sentAt) : new Date(a.createdAt);
      const timeB = b.lastMessage ? new Date(b.lastMessage.sentAt) : new Date(b.createdAt);
      return timeB - timeA;
    });

    res.status(200).json(formattedRooms);
  } catch (err) {
    next(err);
  }
};

const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Check if requesting user is a participant
    const isParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant of this chat room' });
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId
      },
      orderBy: {
        sentAt: 'asc'
      },
      take: limit,
      skip: offset,
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.status(200).json(messages);
  } catch (err) {
    next(err);
  }
};
const createGroupRoom = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create group room
    const newRoom = await prisma.room.create({
      data: {
        isGroup: true,
        name: name.trim(),
        participants: {
          create: [
            {
              userId: req.user.id,
              isAdmin: true
            }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      id: newRoom.id,
      name: newRoom.name,
      isGroup: newRoom.isGroup,
      createdAt: newRoom.createdAt,
      participants: newRoom.participants.map(p => p.user)
    });
  } catch (err) {
    next(err);
  }
};

const getDiscoverGroups = async (req, res, next) => {
  try {
    // Find groups the user is not currently participating in
    const rooms = await prisma.room.findMany({
      where: {
        isGroup: true,
        NOT: {
          participants: {
            some: {
              userId: req.user.id
            }
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.status(200).json(rooms);
  } catch (err) {
    next(err);
  }
};

const joinGroupRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isGroup) {
      return res.status(400).json({ error: 'Cannot join a private room' });
    }

    // Check if already a participant
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'Already a participant of this group' });
    }

    // Create participant
    await prisma.roomParticipant.create({
      data: {
        roomId,
        userId: req.user.id
      }
    });

    // Fetch updated room with participants
    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isOnline: true,
                lastSeenAt: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      id: updatedRoom.id,
      name: updatedRoom.name,
      isGroup: updatedRoom.isGroup,
      createdAt: updatedRoom.createdAt,
      participants: updatedRoom.participants.map(p => p.user)
    });
  } catch (err) {
    next(err);
  }
};

const leaveGroupRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isGroup) {
      return res.status(400).json({ error: 'Cannot leave a private room' });
    }

    // Verify user is participant
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    if (!participant) {
      return res.status(400).json({ error: 'You are not a participant of this group' });
    }

    // Remove participant
    await prisma.roomParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    res.status(200).json({ message: 'Successfully left the group' });
  } catch (err) {
    next(err);
  }
};

const getRoomMembers = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Check if requesting user is participant
    const isParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant of this room' });
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isOnline: true,
            lastSeenAt: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    // Format response
    const members = participants.map(p => ({
      id: p.user.id,
      username: p.user.username,
      isOnline: p.user.isOnline,
      lastSeenAt: p.user.lastSeenAt,
      isAdmin: p.isAdmin,
      joinedAt: p.joinedAt
    }));

    res.status(200).json(members);
  } catch (err) {
    next(err);
  }
};

const addMemberToGroup = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify room exists and is a group
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isGroup) {
      return res.status(400).json({ error: 'Cannot add members to a private room' });
    }

    // Verify requesting user is admin
    const adminParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user.id
        }
      }
    });

    if (!adminParticipant || !adminParticipant.isAdmin) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add user to group
    await prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        isAdmin: false
      }
    });

    res.status(200).json({ message: 'Member added successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrGetRoom,
  getRooms,
  getRoomMessages,
  createGroupRoom,
  getDiscoverGroups,
  joinGroupRoom,
  leaveGroupRoom,
  getRoomMembers,
  addMemberToGroup
};
