import React from 'react';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

function ErrorPopup({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'error' // 'error', 'success', 'warning', 'info'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon style={{ color: '#4caf50', fontSize: '24px' }} />;
      case 'warning':
        return <WarningIcon style={{ color: '#ff9800', fontSize: '24px' }} />;
      case 'info':
        return <InfoIcon style={{ color: '#2196f3', fontSize: '24px' }} />;
      default:
        return <ErrorIcon style={{ color: '#f44336', fontSize: '24px' }} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#e8f5e8', border: '#4caf50', text: '#2e7d32' };
      case 'warning':
        return { bg: '#fff3e0', border: '#ff9800', text: '#e65100' };
      case 'info':
        return { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' };
      default:
        return { bg: '#ffebee', border: '#f44336', text: '#c62828' };
    }
  };

  const colors = getColors();

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '20px',
          margin: '20px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: 'rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px',
          animation: 'slideIn 0.3s ease-out',
          border: `0px solid ${colors.border}`,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {getIcon()}
            <h3 style={{ 
              margin: 0, 
              color: colors.text,
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              {title}
            </h3>
          </div>
          <IconButton 
            onClick={onClose}
            style={{ 
              color: '#666',
              padding: '4px'
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
        
        <div style={{
          backgroundColor: colors.bg,
          padding: '15px',
          borderRadius: '10px',
          border: `0px solid ${colors.border}`,
          marginBottom: '15px'
        }}>
          <p style={{ 
            margin: 0, 
            color: colors.text,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'darkorchid',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#8a2be2'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'darkorchid'}
          >
            OK
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ErrorPopup;