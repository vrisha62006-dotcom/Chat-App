import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import './App.css';

const Dashboard = () => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' or 'chat'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    setMobileView('chat');
  };

  const handleBack = () => {
    setMobileView('sidebar');
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setMobileView('sidebar');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className={`chat-container ${mobileView === 'sidebar' ? 'sidebar-view' : 'chat-view'}`}>
      <Sidebar activeRoomId={activeRoom?.id} onSelectRoom={handleSelectRoom} refreshTrigger={refreshTrigger} />
      <ChatArea activeRoom={activeRoom} onBack={handleBack} onLeaveRoom={handleLeaveRoom} />
    </div>
  );
};

const MainApp = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        background: 'var(--bg-gradient)'
      }}>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading ChatConnect...</div>
      </div>
    );
  }

  if (user) {
    return (
      <SocketProvider>
        <Dashboard />
      </SocketProvider>
    );
  }

  return showRegister ? (
    <Register onToggleView={() => setShowRegister(false)} />
  ) : (
    <Login onToggleView={() => setShowRegister(true)} />
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
