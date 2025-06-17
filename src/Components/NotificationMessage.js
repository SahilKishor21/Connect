import React from "react";
import { useSelector } from "react-redux";

function NotificationMessage({ message }) {
  const lightTheme = useSelector((state) => state.themeKey);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'group_leave':
        return '👋';
      case 'group_join':
        return '👋';
      case 'group_created':
        return '🎉';
      case 'user_added':
        return '➕';
      case 'user_removed':
        return '➖';
      case 'admin_changed':
        return '👑';
      default:
        return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffHours < 1) {
      return "now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div 
      className="notification-message"
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '10px 0',
        width: '100%'
      }}
    >
      <div 
        style={{
          backgroundColor: lightTheme ? '#f0f0f0' : '#3a3a3a',
          color: lightTheme ? '#666' : '#ccc',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          maxWidth: '70%',
          textAlign: 'center',
          border: lightTheme ? '1px solid #e0e0e0' : '1px solid #555',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <span style={{ fontSize: '14px' }}>
          {getNotificationIcon(message.notificationType)}
        </span>
        <span>{message.content}</span>
        <span style={{ 
          fontSize: '11px', 
          opacity: 0.7,
          marginLeft: '4px'
        }}>
          {formatTimestamp(message.createdAt || message.updatedAt)}
        </span>
      </div>
    </div>
  );
}

export default NotificationMessage;