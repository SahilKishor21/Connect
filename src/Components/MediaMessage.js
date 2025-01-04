// MediaMessage.js
import React, { useState } from 'react';

const MediaMessage = ({ content, fileType }) => {
  const [isModalOpen, setModalOpen] = useState(false); 
  const [modalType, setModalType] = useState(null); 

  const handleMediaClick = (type) => {
    setModalOpen(true); 
    setModalType(type); 
  };

  const closeModal = () => {
    setModalOpen(false); 
    setModalType(null); 
  };

  // detecting media type from URL
  const getMediaType = (url) => {
    if (url.includes('/image/')) return 'image';
    if (url.includes('/video/')) return 'video';
    if (url.includes('/webm/')) return 'audio';
    return 'other';
  };

  const mediaType = getMediaType(content);

  const messageStyle = {
    maxWidth: '300px',
    padding: '10px',
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '20px',
    right: '30px',
    fontSize: '30px',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 1001,
  };

  switch (mediaType) {
    case 'image':
      return (
        <>
          <div style={messageStyle}>
            <img
              src={content}
              alt="Shared media"
              onClick={() => handleMediaClick('image')}
              style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer' }}
            />
          </div>
          {isModalOpen && modalType === 'image' && (
            <div style={modalStyle} onClick={closeModal}>
              <span style={closeButtonStyle}>&times;</span>
              <img
                src={content}
                alt="Enlarged media"
                style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }}
              />
            </div>
          )}
        </>
      );

    case 'video':
      return (
        <>
          <div style={messageStyle}>
            <video
              src={content}
              controls
              onClick={() => handleMediaClick('video')}
              style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer' }}
            />
          </div>
          {isModalOpen && modalType === 'video' && (
            <div style={modalStyle} onClick={closeModal}>
              <span style={closeButtonStyle}>&times;</span>
              <video
                src={content}
                controls
                autoPlay
                style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }}
              />
            </div>
          )}
        </>
      );
      case 'audio':
        return (
          <div style={messageStyle}>
          <audio controls style={{ maxWidth: '100%' }}>
            <source src={content} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
        </div>
        );

    default:
      return <div style={messageStyle}>{content}</div>;
  }
};

export default MediaMessage;
