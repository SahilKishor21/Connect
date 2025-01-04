// MediaMessage.js
import React from 'react';

const MediaMessage = ({ content, fileType }) => {
  // Helper function to detect media type from URL
  const getMediaType = (url) => {
    if (url.includes('/image/')) return 'image';
    if (url.includes('/video/')) return 'video';
    return 'other';
  };

  const mediaType = getMediaType(content);

  const messageStyle = {
    maxWidth: '300px',
    padding: '10px'
  };

  switch (mediaType) {
    case 'image':
      return (
        <div style={messageStyle}>
          <img src={content} alt="Shared media" style={{ maxWidth: '100%', borderRadius: '8px' }} />
        </div>
      );
    case 'video': 
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