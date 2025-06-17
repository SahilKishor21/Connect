import React, { useState, useEffect } from 'react';

const SocketDebugPanel = ({ socket, userData, onlineUsers, recipientUserId, recipientName, isRecipientOnline }) => {
  const [debugInfo, setDebugInfo] = useState({});
  const [isVisible, setIsVisible] = useState(false); // Start hidden
  const [testCallId, setTestCallId] = useState('');

  useEffect(() => {
    if (socket) {
      socket.on("online-users-debug", (data) => {
        setDebugInfo(data);
      });

      socket.on("call-sent", (data) => {
        console.log("Debug: Call sent event received", data);
      });

      socket.on("call-failed", (data) => {
        console.log("Debug: Call failed event received", data);
      });

      return () => {
        socket.off("online-users-debug");
        socket.off("call-sent");
        socket.off("call-failed");
      };
    }
  }, [socket]);

  const requestDebugInfo = () => {
    if (socket) {
      console.log("Requesting debug info from server...");
      socket.emit("get-online-users");
    }
  };

  const testCall = () => {
    if (socket && recipientUserId) {
      const callId = `test-${Date.now()}`;
      setTestCallId(callId);
      
      console.log('=== TESTING CALL FROM DEBUG PANEL ===');
      console.log('From:', userData.data._id);
      console.log('From name:', userData.data.name);
      console.log('To:', recipientUserId);
      console.log('To name:', recipientName);
      console.log('Call ID:', callId);
      console.log('Is recipient online:', isRecipientOnline);
      
      socket.emit('initiate-call', {
        to: recipientUserId,
        from: userData.data._id,
        fromName: userData.data.name,
        isVideo: false,
        callId: callId
      });
    } else {
      console.log("Cannot test call - missing socket or recipient ID");
      console.log("Socket:", !!socket);
      console.log("Recipient ID:", recipientUserId);
    }
  };

  const checkConnection = () => {
    if (socket) {
      console.log("=== CONNECTION CHECK ===");
      console.log("Socket connected:", socket.connected);
      console.log("Socket ID:", socket.id);
      console.log("User ID:", userData?.data?._id);
      console.log("User name:", userData?.data?.name);
      console.log("Recipient ID:", recipientUserId);
      console.log("Recipient name:", recipientName);
      console.log("Is recipient online:", isRecipientOnline);
      console.log("Online users array:", onlineUsers);
      console.log("========================");
    }
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '5px 10px',
          fontSize: '12px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          zIndex: 10000,
          cursor: 'pointer'
        }}
      >
        Show Debug
      </button>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #007bff', 
      padding: '10px', 
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '350px',
      zIndex: 10000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#007bff' }}>🔍 Socket Debug Panel</h4>
        <button 
          onClick={() => setIsVisible(false)} 
          style={{ 
            background: 'red', 
            color: 'white', 
            border: 'none', 
            borderRadius: '3px', 
            padding: '2px 6px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Connection Status:</strong>
        <div style={{ color: socket?.connected ? 'green' : 'red' }}>
          {socket?.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
      
      <div style={{ marginBottom: '5px' }}><strong>Socket ID:</strong> {socket?.id || 'N/A'}</div>
      <div style={{ marginBottom: '5px' }}><strong>User ID:</strong> {userData?.data?._id || 'N/A'}</div>
      <div style={{ marginBottom: '5px' }}><strong>User Name:</strong> {userData?.data?.name || 'N/A'}</div>
      <div style={{ marginBottom: '5px' }}><strong>Recipient ID:</strong> {recipientUserId || 'N/A'}</div>
      <div style={{ marginBottom: '5px' }}><strong>Recipient Name:</strong> {recipientName || 'N/A'}</div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Recipient Status:</strong> 
        <span style={{ color: isRecipientOnline ? 'green' : 'red' }}>
          {isRecipientOnline ? ' 🟢 Online' : ' 🔴 Offline'}
        </span>
      </div>
      <div style={{ marginBottom: '10px' }}><strong>Online Users Count:</strong> {onlineUsers?.length || 0}</div>
      
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <button 
          onClick={requestDebugInfo} 
          style={{ 
            padding: '5px 8px', 
            fontSize: '11px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Debug Info
        </button>
        <button 
          onClick={checkConnection} 
          style={{ 
            padding: '5px 8px', 
            fontSize: '11px', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🔍 Check Connection
        </button>
        <button 
          onClick={testCall} 
          style={{ 
            padding: '5px 8px', 
            fontSize: '11px', 
            background: recipientUserId ? '#dc3545' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '3px',
            cursor: recipientUserId ? 'pointer' : 'not-allowed'
          }} 
          disabled={!recipientUserId}
        >
          📞 Test Call
        </button>
      </div>
      
      {debugInfo.onlineUsers && (
        <div style={{ marginBottom: '10px' }}>
          <strong>🌐 Server Online Users:</strong>
          <div style={{ background: '#f8f9fa', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
            {debugInfo.onlineUsers.length === 0 ? (
              <em>No users online</em>
            ) : (
              <ul style={{ margin: '0', paddingLeft: '15px' }}>
                {debugInfo.onlineUsers.map(userId => (
                  <li key={userId} style={{ color: userId === userData?.data?._id ? 'blue' : 'black' }}>
                    {userId === userData?.data?._id ? `${userId} (YOU)` : userId}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {debugInfo.userSocketMap && (
        <div style={{ marginBottom: '10px' }}>
          <strong>🔗 Socket Mappings:</strong>
          <div style={{ background: '#f8f9fa', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
            {debugInfo.userSocketMap.map(mapping => (
              <div key={mapping.socketId} style={{ 
                padding: '2px 0',
                color: mapping.connected ? 'green' : 'red',
                borderBottom: '1px solid #eee'
              }}>
                <strong>{mapping.name}</strong> ({mapping.userId.slice(-6)})
                <br />
                <small>Socket: {mapping.socketId.slice(-6)} {mapping.connected ? '🟢' : '🔴'}</small>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {debugInfo.activeCalls && debugInfo.activeCalls.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <strong>📞 Active Calls:</strong>
          <div style={{ background: '#fff3cd', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
            <ul style={{ margin: '0', paddingLeft: '15px' }}>
              {debugInfo.activeCalls.map(callId => (
                <li key={callId} style={{ fontSize: '10px' }}>{callId}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {testCallId && (
        <div style={{ marginTop: '10px', padding: '5px', background: '#e7f3ff', borderRadius: '3px' }}>
          <strong>🧪 Last Test Call ID:</strong>
          <div style={{ fontSize: '10px', wordBreak: 'break-all' }}>{testCallId}</div>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SocketDebugPanel;

// TO USE THIS DEBUG PANEL:
// 1. Save this as SocketDebugPanel.js in your components folder
// 2. Add this import to your ChatArea.js:
//    import SocketDebugPanel from './SocketDebugPanel';
// 3. Add this component in your ChatArea return statement:
//    <SocketDebugPanel 
//      socket={socketRef.current}
//      userData={userData}
//      onlineUsers={onlineUsers}
//      recipientUserId={recipientUserId}
//      recipientName={recipientName}
//      isRecipientOnline={isRecipientOnline}
//    />