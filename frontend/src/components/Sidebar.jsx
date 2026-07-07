import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// Helper to format date timestamps
const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  
  // Check if same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Return date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const Sidebar = ({ activeRoomId, onSelectRoom, refreshTrigger }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeModalTab, setActiveModalTab] = useState('direct');
  const [newGroupName, setNewGroupName] = useState('');
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Fetch rooms on component mount
  const fetchRooms = async () => {
    try {
      const data = await api.get('/rooms');
      setRooms(data);
    } catch (err) {
      console.error('Failed to load chats:', err.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [refreshTrigger]);

  // Listen for real-time changes (presence and receive_message updates)
  useEffect(() => {
    if (!socket) return;

    // Handle real-time presence change
    const handlePresence = ({ userId, status }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const updatedParticipants = room.participants.map((p) => {
            if (p.id === userId) {
              return { ...p, isOnline: status === 'online', lastSeenAt: status === 'online' ? null : new Date().toISOString() };
            }
            return p;
          });
          return { ...room, participants: updatedParticipants };
        })
      );

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.id === userId) {
            return { ...u, isOnline: status === 'online', lastSeenAt: status === 'online' ? null : new Date().toISOString() };
          }
          return u;
        })
      );
    };

    // Handle real-time message received
    const handleReceiveMessage = (msg) => {
      // Find room in current rooms list
      const roomExists = rooms.some((r) => r.id === msg.roomId);

      if (roomExists) {
        // Update the last message for the room and sort rooms
        setRooms((prevRooms) => {
          const updatedRooms = prevRooms.map((r) => {
            if (r.id === msg.roomId) {
              return {
                ...r,
                lastMessage: {
                  id: msg.id,
                  content: msg.content,
                  sentAt: msg.sentAt,
                  sender: {
                    id: msg.senderId,
                    username: msg.senderName
                  }
                }
              };
            }
            return r;
          });
          
          // Re-sort rooms by last message time
          return [...updatedRooms].sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.sentAt) : new Date(a.createdAt);
            const timeB = b.lastMessage ? new Date(b.lastMessage.sentAt) : new Date(b.createdAt);
            return timeB - timeA;
          });
        });
      } else {
        // If room is new or not loaded, fetch all rooms again to sync
        fetchRooms();
      }
    };

    socket.on('presence', handlePresence);
    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('presence', handlePresence);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, rooms]);

  // Fetch all users when the "New Chat" modal opens
  const openNewChatModal = async () => {
    setShowNewChatModal(true);
    setActiveModalTab('direct');
    setModalSearchQuery('');
    setNewGroupName('');
    setModalError('');
    try {
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load user directory:', err.message);
    }
  };

  // Fetch groups user is not in
  const fetchDiscoverGroups = async () => {
    setLoadingDiscover(true);
    setModalError('');
    try {
      const data = await api.get('/rooms/groups/discover');
      setDiscoverGroups(data);
    } catch (err) {
      console.error('Failed to load discoverable groups:', err.message);
      setModalError('Failed to load available groups.');
    } finally {
      setLoadingDiscover(false);
    }
  };

  // Create or open room with selected user
  const handleStartChat = async (recipientId) => {
    try {
      const room = await api.post('/rooms', { recipientId });
      setShowNewChatModal(false);
      
      // Update local rooms state
      await fetchRooms();
      
      // Notify parent component of selected room
      onSelectRoom(room);
    } catch (err) {
      console.error('Failed to start chat:', err.message);
    }
  };

  // Handle creating group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setModalError('');
    try {
      const room = await api.post('/rooms/group', { name: newGroupName.trim() });
      setShowNewChatModal(false);
      setNewGroupName('');
      await fetchRooms();
      onSelectRoom(room);
    } catch (err) {
      console.error('Failed to create group:', err.message);
      setModalError(err.message || 'Failed to create group.');
    }
  };

  // Handle joining group
  const handleJoinGroup = async (roomId) => {
    setModalError('');
    try {
      const room = await api.post(`/rooms/${roomId}/join`);
      setShowNewChatModal(false);
      await fetchRooms();
      onSelectRoom(room);
    } catch (err) {
      console.error('Failed to join group:', err.message);
      setModalError(err.message || 'Failed to join group.');
    }
  };

  // Helper to resolve the other participant in 1-to-1 rooms
  const getRecipientUser = (room) => {
    return room.participants.find((p) => p.id !== user.id) || { username: 'Unknown User', isOnline: false };
  };

  // Filter direct and group chats by search query
  const directChats = rooms.filter((room) => !room.isGroup);
  const groupChats = rooms.filter((room) => room.isGroup);

  const filteredDirectChats = directChats.filter((room) => {
    const recipient = getRecipientUser(room);
    return recipient.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredGroupChats = groupChats.filter((room) => {
    return room.name && room.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter users inside "New Chat" directory modal
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* Header with App Title and Profile tag */}
      <div className="sidebar-header">
        <h1 className="sidebar-brand">ChatConnect</h1>
        <div className="sidebar-user-section">
          <div className="user-tag" title={`Logged in as ${user.username}`} onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
            <span className="user-tag-avatar">{user.username.charAt(0).toUpperCase()}</span>
            <span>{user.username}</span>
          </div>
          <button className="btn-icon-logout" onClick={logout} title="Sign Out">
            🚪
          </button>
        </div>
      </div>

      {/* Filter search bar */}
      <div className="sidebar-search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search chats or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Active Chats list */}
      <div className="chats-list-container">
        <h2 className="chats-section-title">Direct Chats</h2>
        {loadingRooms ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Loading conversations...
          </div>
        ) : filteredDirectChats.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No active direct chats.
          </div>
        ) : (
          filteredDirectChats.map((room) => {
            const recipient = getRecipientUser(room);
            const isActive = activeRoomId === room.id;
            const initials = recipient.username.slice(0, 2);
            
            return (
              <div
                key={room.id}
                className={`chat-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectRoom(room)}
              >
                <div className="chat-item-avatar-wrapper">
                  <div className="chat-item-avatar">
                    {initials}
                  </div>
                  <span className={`status-dot ${recipient.isOnline ? 'online' : 'offline'}`} />
                </div>
                
                <div className="chat-item-info">
                  <div className="chat-item-header">
                    <span className="chat-item-name">{recipient.username}</span>
                    <span className="chat-item-time">
                      {room.lastMessage ? formatTime(room.lastMessage.sentAt) : ''}
                    </span>
                  </div>
                  <div className="chat-item-preview">
                    {room.lastMessage ? (
                      room.lastMessage.sender.id === user.id ? (
                        `You: ${room.lastMessage.content}`
                      ) : (
                        room.lastMessage.content
                      )
                    ) : (
                      <em style={{ color: 'var(--text-muted)' }}>No messages yet</em>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <h2 className="chats-section-title" style={{ marginTop: '24px' }}>Group Chats</h2>
        {loadingRooms ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Loading groups...
          </div>
        ) : filteredGroupChats.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No joined groups.
          </div>
        ) : (
          filteredGroupChats.map((room) => {
            const isActive = activeRoomId === room.id;
            const initials = room.name.slice(0, 2);
            
            return (
              <div
                key={room.id}
                className={`chat-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectRoom(room)}
              >
                <div className="chat-item-avatar-wrapper">
                  <div className="chat-item-avatar" style={{ background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)' }}>
                    {initials}
                  </div>
                </div>
                
                <div className="chat-item-info">
                  <div className="chat-item-header">
                    <span className="chat-item-name">{room.name}</span>
                    <span className="chat-item-time">
                      {room.lastMessage ? formatTime(room.lastMessage.sentAt) : ''}
                    </span>
                  </div>
                  <div className="chat-item-preview">
                    {room.lastMessage ? (
                      room.lastMessage.sender.id === user.id ? (
                        `You: ${room.lastMessage.content}`
                      ) : (
                        `${room.lastMessage.sender.username}: ${room.lastMessage.content}`
                      )
                    ) : (
                      <em style={{ color: 'var(--text-muted)' }}>No messages yet</em>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New chat action footer button */}
      <div className="sidebar-footer">
        <button className="btn-new-chat" onClick={openNewChatModal}>
          <span>💬</span> Start New Chat / Group
        </button>
      </div>

      {/* New Chat Contacts Directory Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Conversation</h3>
              <button className="btn-close-modal" onClick={() => setShowNewChatModal(false)}>
                &times;
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab-btn ${activeModalTab === 'direct' ? 'active' : ''}`}
                onClick={() => { setActiveModalTab('direct'); setModalError(''); }}
              >
                Direct Message
              </button>
              <button
                className={`modal-tab-btn ${activeModalTab === 'create' ? 'active' : ''}`}
                onClick={() => { setActiveModalTab('create'); setModalError(''); }}
              >
                Create Group
              </button>
              <button
                className={`modal-tab-btn ${activeModalTab === 'discover' ? 'active' : ''}`}
                onClick={() => { setActiveModalTab('discover'); setModalError(''); fetchDiscoverGroups(); }}
              >
                Join Group
              </button>
            </div>
            
            {activeModalTab === 'direct' && (
              <>
                <div className="modal-search-wrapper">
                  <input
                    type="text"
                    className="modal-search-input"
                    placeholder="Search users..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="directory-list">
                  {filteredUsers.length === 0 ? (
                    <div className="directory-empty">No other registered users found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="directory-item"
                        onClick={() => handleStartChat(u.id)}
                      >
                        <div className="chat-item-avatar-wrapper">
                          <div className="chat-item-avatar">
                            {u.username.slice(0, 2)}
                          </div>
                          <span className={`status-dot ${u.isOnline ? 'online' : 'offline'}`} />
                        </div>
                        <div className="directory-item-info">
                          <span className="directory-item-name">{u.username}</span>
                          <span className="directory-item-status">
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeModalTab === 'create' && (
              <form onSubmit={handleCreateGroup} className="modal-form">
                {modalError && <div className="error-message">{modalError}</div>}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Group Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Project Discussion, General Talk"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={!newGroupName.trim()}>
                  Create Group
                </button>
              </form>
            )}

            {activeModalTab === 'discover' && (
              <div className="directory-list" style={{ marginTop: '10px' }}>
                {modalError && <div className="error-message">{modalError}</div>}
                {loadingDiscover ? (
                  <div className="directory-empty">Loading groups...</div>
                ) : discoverGroups.length === 0 ? (
                  <div className="directory-empty">No public groups available to join</div>
                ) : (
                  discoverGroups.map((group) => (
                    <div key={group.id} className="directory-item" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="chat-item-avatar" style={{ background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)', width: '38px', height: '38px', fontSize: '0.9rem' }}>
                          {group.name.slice(0, 2)}
                        </div>
                        <div className="directory-item-info">
                          <span className="directory-item-name">{group.name}</span>
                          <span className="directory-item-status">
                            {group.participants.length} member{group.participants.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button className="btn-join-group" style={{
                        padding: '6px 16px',
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        borderRadius: 'var(--border-radius-sm)',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }} onClick={() => handleJoinGroup(group.id)}>
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Profile</h3>
              <button className="btn-close-modal" onClick={() => setShowProfileModal(false)}>
                &times;
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
              <div className="chat-item-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '8px' }}>{user.username}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px',
                background: 'rgba(56, 176, 0, 0.1)',
                borderRadius: '20px',
                border: '1px solid rgba(56, 176, 0, 0.2)'
              }}>
                <span className={`status-dot ${true ? 'online' : 'offline'}`} style={{ position: 'relative', bottom: 0, right: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#38b000', fontWeight: '500' }}>Connected</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
