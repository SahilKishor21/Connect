import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import CallService from '../Services/Calling';
import CallIcon from '@mui/icons-material/Call';

const CallInterface = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  isIncoming = false, 
  initialCallType = 'video' 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;

    CallService.setCallbacks({
      onLocalStream: (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onCallEnded: () => {
        onClose();
      }
    });

    // Initialize call if outgoing
    if (!isIncoming && recipientId) {
      handleStartCall();
    }

    return () => {
      CallService.cleanup();
    };
  }, [isOpen, recipientId, isIncoming]);

  const handleStartCall = async () => {
    try {
      await CallService.startCall(recipientId, isVideoEnabled);
    } catch (error) {
      console.error('Failed to start call:', error);
      onClose();
    }
  };

  const handleAnswerCall = async () => {
    try {
      await CallService.answerCall({
        from: recipientId,
        isVideo: isVideoEnabled
      });
    } catch (error) {
      console.error('Failed to answer call:', error);
      onClose();
    }
  };

  const handleEndCall = () => {
    CallService.endCall();
    onClose();
  };

  const toggleMute = () => {
    if (CallService.localStream) {
      const audioTrack = CallService.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (CallService.localStream) {
      const videoTrack = CallService.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">
            {isIncoming ? `Incoming ${initialCallType} call from ${recipientName}` : 
             `${initialCallType} call with ${recipientName}`}
          </h2>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full bg-gray-900 rounded"
            />
            <span className="absolute bottom-2 left-2 text-white">You</span>
          </div>
          <div className="relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full bg-gray-900 rounded"
            />
            <span className="absolute bottom-2 left-2 text-white">{recipientName}</span>
          </div>
        </div>

        <div className="p-4 flex justify-center space-x-4">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          {initialCallType === 'video' && (
            <button
              onClick={toggleVideo}
              className="p-3 rounded-full bg-gray-200 hover:bg-gray-300"
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {isIncoming ? (
            <button
              onClick={handleAnswerCall}
              className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white"
            >
              <Phone className="w-6 h-6" />
            </button>
          ) : null}

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;