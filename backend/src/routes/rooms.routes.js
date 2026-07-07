const express = require('express');
const {
  createOrGetRoom,
  getRooms,
  getRoomMessages,
  createGroupRoom,
  getDiscoverGroups,
  joinGroupRoom,
  leaveGroupRoom,
  getRoomMembers,
  addMemberToGroup
} = require('../controllers/rooms.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticate, createOrGetRoom);
router.get('/', authenticate, getRooms);
router.post('/group', authenticate, createGroupRoom);
router.get('/groups/discover', authenticate, getDiscoverGroups);
router.get('/:roomId/messages', authenticate, getRoomMessages);
router.post('/:roomId/join', authenticate, joinGroupRoom);
router.post('/:roomId/leave', authenticate, leaveGroupRoom);
router.get('/:roomId/members', authenticate, getRoomMembers);
router.post('/:roomId/members', authenticate, addMemberToGroup);

module.exports = router;
