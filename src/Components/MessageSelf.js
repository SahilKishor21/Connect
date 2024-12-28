// MessageSelf.js
import React from 'react';
import './MyMessages.css';
import MediaMessage from './MediaMessage';

function MessageSelf({ props }) {
  return (
    <div className="self-message-container">
      <div className="messageBox">
        <MediaMessage content={props.content} fileType={props.fileType} />
        <div className="self-timeStamp">
          {new Date(props.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default MessageSelf;