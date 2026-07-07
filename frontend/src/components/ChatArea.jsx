import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// Helper to format message timestamps
const formatMessageTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatArea = ({ activeRoom, onBack, onLeaveRoom }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // { [userId]: username }
  const [recipient, setRecipient] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Extract recipient user details from room participants (only for 1-to-1)
  useEffect(() => {
    if (!activeRoom || !user) return;
    if (activeRoom.isGroup) {
      setRecipient(null);
    } else {
      const rec = activeRoom.participants.find((p) => p.id !== user.id);
      setRecipient(rec || null);
    }
    setTypingUsers({});
  }, [activeRoom, user]);

  // Fetch message history when active room changes
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await api.get(`/rooms/${activeRoom.id}/messages`);
        setMessages(data);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load message logs:', err.message);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeRoom]);

  // Scroll message log container to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Scroll to bottom whenever messages list is updated
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Listen to WebSocket events (incoming messages, typing flags, presence status updates)
  useEffect(() => {
    if (!socket || !activeRoom) return;

    // Handle real-time incoming message
    const handleReceiveMessage = (msg) => {
      if (msg.roomId === activeRoom.id) {
        setMessages((prev) => [...prev, msg]);
        // Clear typing indicator for the sender if they sent a message
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[msg.senderId];
          return next;
        });
      }
    };

    // Handle typing indicator updates
    const handleTyping = ({ roomId, userId, username, isTyping }) => {
      if (roomId === activeRoom.id && userId !== user.id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = username;
          } else {
            delete next[userId];
          }
          return next;
        });
      }
    };

    // Handle dynamic presence updates for the active recipient
    const handlePresence = ({ userId, status }) => {
      if (!activeRoom.isGroup && recipient && userId === recipient.id) {
        setRecipient((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isOnline: status === 'online',
            lastSeenAt: status === 'online' ? null : new Date().toISOString()
          };
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('presence', handlePresence);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('presence', handlePresence);
    };
  }, [socket, activeRoom, recipient, user.id]);

  // Emit typing event to WebSocket when user types
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !activeRoom) return;

    // Broadcast isTyping: true
    socket.emit('typing', { roomId: activeRoom.id, isTyping: true });

    // Clear previous timeout and set a new one to turn off typing indicator after 2.5s
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoom.id, isTyping: false });
    }, 2500);
  };

  // Send message handler
  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !activeRoom) return;

    // Emit send_message via WebSocket
    socket.emit('send_message', {
      roomId: activeRoom.id,
      content: newMessage.trim()
    });

    // Clear local inputs and typing indicators immediately
    setNewMessage('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing', { roomId: activeRoom.id, isTyping: false });
  };

  // Fetch group members list
  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await api.get(`/rooms/${activeRoom.id}/members`);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load group members:', err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle leave group action
  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/rooms/${activeRoom.id}/leave`);
      if (onLeaveRoom) {
        onLeaveRoom();
      } else {
        onBack();
      }
    } catch (err) {
      console.error('Failed to leave group:', err.message);
      alert(err.message || 'Failed to leave group');
    }
  };

  const handleOpenMembers = () => {
    if (activeRoom.isGroup) {
      setShowMembersModal(true);
      fetchMembers();
    }
  };

  // Format typing text helper
  const getTypingText = () => {
    const typers = Object.values(typingUsers);
    if (typers.length === 0) return '';
    if (typers.length === 1) return `${typers[0]} is typing...`;
    if (typers.length === 2) return `${typers[0]} and ${typers[1]} are typing...`;
    return 'Several people are typing...';
  };
  const typingText = getTypingText();

  // If no active chat room selected, show welcoming placeholder
  if (!activeRoom) {
    return (
      <div className="chat-window-placeholder">
        <div className="placeholder-icon">💬</div>
        <p className="placeholder-text">Welcome to ChatConnect!</p>
        <p className="placeholder-subtext">Select an active contact or start a new chat from the sidebar list.</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header bar */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="btn-back" onClick={onBack} title="Back to Chats">
            ←
          </button>
          <div className="chat-header-info">
            {activeRoom.isGroup ? (
              <>
                <h3 className="chat-header-name">{activeRoom.name}</h3>
                <span className="chat-header-status" style={{ cursor: 'pointer' }} onClick={handleOpenMembers} title="View group members">
                  👥 Group • Click to view members
                </span>
              </>
            ) : (
              <>
                <h3 className="chat-header-name">{recipient ? recipient.username : 'Loading...'}</h3>
                <span className="chat-header-status">
                  <span className={`status-indicator-dot ${recipient?.isOnline ? 'online' : 'offline'}`} />
                  {recipient?.isOnline ? 'Online' : 'Offline'}
                </span>
              </>
            )}
          </div>
        </div>
        {activeRoom.isGroup && (
          <button className="btn-leave-group" onClick={handleLeaveGroup} title="Leave Group" style={{
            background: 'rgba(224, 82, 99, 0.1)',
            border: '1px solid rgba(224, 82, 99, 0.25)',
            color: '#e05263',
            padding: '6px 12px',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            transition: 'var(--transition-smooth)'
          }}>
            Leave Group
          </button>
        )}
      </div>

      {/* Message Feed list */}
      <div className="messages-feed">
        {loadingMessages ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
            Loading message log...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', opacity: 0.7 }}>
            No messages here yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isSentByMe = msg.senderId === user.id;
            const senderName = msg.sender?.username || msg.senderName || 'Unknown User';
            return (
              <div
                key={msg.id}
                className={`message-bubble-wrapper ${isSentByMe ? 'sent' : 'received'}`}
              >
                <div className="message-bubble" style={{ display: 'flex', flexDirection: 'column' }}>
                  {!isSentByMe && activeRoom.isGroup && (
                    <span className="message-sender-name" style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#e0aaff',
                      marginBottom: '4px',
                      alignSelf: 'flex-start'
                    }}>
                      {senderName}
                    </span>
                  )}
                  <div className="message-text">{msg.content}</div>
                  <span className="message-time">{formatMessageTime(msg.sentAt)}</span>
                </div>
              </div>
            );
          })
        )}

        {/* Dynamic typing indicator bubble */}
        {typingText && (
          <div className="message-bubble-wrapper received">
            <div className="message-bubble" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px' }}>
              {activeRoom.isGroup && <span className="message-sender-name" style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '2px' }}>{typingText}</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                {!activeRoom.isGroup && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>typing...</span>}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Textarea Input area */}
      <div className="chat-input-bar">
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input-textarea"
            placeholder="Type your message..."
            value={newMessage}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="btn-send-message"
            disabled={!newMessage.trim()}
            title="Send Message"
          >
            ➔
          </button>
        </form>
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Group Members</h3>
              <button className="btn-close-modal" onClick={() => setShowMembersModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="directory-list">
              {loadingMembers ? (
                <div className="directory-empty">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="directory-empty">No members found</div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="directory-item" style={{ cursor: 'default' }}>
                    <div className="chat-item-avatar-wrapper">
                      <div className="chat-item-avatar" style={{ width: '38px', height: '38px', fontSize: '0.9rem' }}>
                        {member.username.slice(0, 2)}
                      </div>
                      <span className={`status-dot ${member.isOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div className="directory-item-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="directory-item-name">{member.username}</span>
                        {member.isAdmin && (
                          <span style={{
                            background: 'rgba(157, 78, 221, 0.2)',
                            color: '#e0aaff',
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>Admin</span>
                        )}
                        {member.id === user.id && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>You</span>
                        )}
                      </div>
                      <span className="directory-item-status">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
