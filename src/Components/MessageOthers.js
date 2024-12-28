// MessageOthers.js
import React from 'react';
import './OthersMessages.css';
import MediaMessage from './MediaMessage';

function MessageOthers({ props }) {
  return (
    <div className="other-message-container">
      <div className="messageBox">
        <MediaMessage content={props.content} fileType={props.fileType} />
        <div className="other-timeStamp">
          {new Date(props.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default MessageOthers;