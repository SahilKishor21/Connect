import React, { useEffect, useRef, useState } from 'react';
import { 
  Phone, 
  CallEnd, 
  Videocam, 
  VideocamOff, 
  Mic, 
  MicOff 
} from '@mui/icons-material';
import io from 'socket.io-client';

const CallInterface = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  isIncoming = false, 
  initialCallType = 'video',
  callData = null
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'initializing');
  const [error, setError] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState('');
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentCallId = useRef(null);
  
  // Get user data
  const userData = JSON.parse(localStorage.getItem("userData"));
  
  // WebRTC configuration
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!isOpen) return;

    console.log('CallInterface: Opening call interface');
    console.log('CallInterface: Props:', { recipientId, recipientName, isIncoming, initialCallType });

    const initializeCall = async () => {
      try {
        // Validate required data
        if (!userData?.data?.token || !userData?.data?._id) {
          throw new Error('Authentication token or user ID not found');
        }

        // Validate recipient for outgoing calls
        if (!isIncoming && (!recipientId || recipientId === userData.data._id)) {
          throw new Error('Invalid recipient ID for outgoing call');
        }

        // Initialize socket connection
        setConnectionInfo('Connecting...');
        const socketInstance = io("http://localhost:5000", {
          auth: { token: userData.data.token },
          transports: ['websocket', 'polling'],
          forceNew: false // Use existing connection if available
        });
        
        setSocket(socketInstance);
        
        // Setup socket event listeners
        setupSocketListeners(socketInstance);
        
        // Wait for socket connection
        socketInstance.on('connect', async () => {
          console.log('CallInterface: Socket connected successfully');
          setConnectionInfo('Connected');
          
          // Setup user
          socketInstance.emit("setup", userData.data);
          
          try {
            // Get user media
            await setupMedia();
            
            // Initialize call if outgoing
            if (!isIncoming && recipientId) {
              await handleStartCall(socketInstance);
            } else if (isIncoming) {
              setCallStatus('incoming');
              setConnectionInfo('Incoming call');
            }
          } catch (mediaError) {
            console.error('CallInterface: Media setup failed:', mediaError);
            handleError(mediaError);
          }
        });

        socketInstance.on('connect_error', (error) => {
          console.error('CallInterface: Socket connection error:', error);
          handleError(new Error('Failed to connect to call server'));
        });
        
      } catch (error) {
        console.error('CallInterface: Failed to initialize:', error);
        handleError(error);
      }
    };

    initializeCall();

    return () => {
      console.log('CallInterface: Component unmounting, cleaning up');
      cleanup();
    };
  }, [isOpen]);

  const setupSocketListeners = (socketInstance) => {
    socketInstance.on('call-accepted', (data) => {
      console.log('CallInterface: Call accepted:', data);
      setCallStatus('connecting');
      setConnectionInfo('Call accepted, establishing connection...');
      // Don't close interface here - wait for WebRTC connection
    });

    socketInstance.on('call-rejected', (data) => {
      console.log('CallInterface: Call rejected:', data);
      setCallStatus('rejected');
      setConnectionInfo('Call was rejected');
      setTimeout(() => onClose(), 2000);
    });

    socketInstance.on('call-ended', (data) => {
      console.log('CallInterface: Call ended:', data);
      setCallStatus('ended');
      setConnectionInfo('Call ended');
      setTimeout(() => onClose(), 2000);
    });

    socketInstance.on('call-failed', (data) => {
      console.log('CallInterface: Call failed:', data);
      setError(data.message || 'Call failed');
      setCallStatus('failed');
      setTimeout(() => onClose(), 4000);
    });

    // WebRTC signaling events
    socketInstance.on('offer', async (data) => {
      console.log('CallInterface: Received offer from:', data.from);
      await handleOffer(data, socketInstance);
    });

    socketInstance.on('answer', async (data) => {
      console.log('CallInterface: Received answer from:', data.from);
      await handleAnswer(data);
    });

    socketInstance.on('ice-candidate', async (data) => {
      console.log('CallInterface: Received ICE candidate from:', data.from);
      await handleIceCandidate(data);
    });
  };

  const setupMedia = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };
      
      console.log('CallInterface: Requesting media access');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setConnectionInfo('Camera and microphone ready');
      console.log('CallInterface: Media access granted');
      return stream;
    } catch (error) {
      console.error('CallInterface: Failed to get media:', error);
      throw error;
    }
  };

  const createPeerConnection = (socketInstance) => {
    console.log('CallInterface: Creating peer connection');
    const pc = new RTCPeerConnection(pcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('CallInterface: Sending ICE candidate');
        const targetId = isIncoming ? (callData?.from || recipientId) : recipientId;
        socketInstance.emit('ice-candidate', {
          to: targetId,
          candidate: event.candidate,
          callId: currentCallId.current
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('CallInterface: Received remote stream');
      const [stream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setCallStatus('connected');
      setConnectionInfo('Connected successfully');
    };

    pc.onconnectionstatechange = () => {
      console.log('CallInterface: Connection state changed:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          setConnectionInfo('Connected successfully');
          break;
        case 'connecting':
          setConnectionInfo('Establishing connection...');
          break;
        case 'failed':
          setCallStatus('failed');
          setError('Connection failed. Please try again.');
          setTimeout(() => onClose(), 3000);
          break;
        case 'disconnected':
          if (callStatus === 'connected') {
            setCallStatus('ended');
            setConnectionInfo('Connection lost');
            setTimeout(() => onClose(), 2000);
          }
          break;
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleStartCall = async (socketInstance) => {
    try {
      console.log('CallInterface: Starting call to:', recipientId);
      
      if (!recipientId || recipientId === userData.data._id) {
        throw new Error('Invalid recipient ID');
      }
      
      setCallStatus('calling');
      setConnectionInfo('Initiating call...');
      
      // Generate call ID
      currentCallId.current = `call-${userData.data._id}-${recipientId}-${Date.now()}`;
      
      // Create peer connection and add local stream
      const pc = createPeerConnection(socketInstance);
      
      if (localStream) {
        console.log('CallInterface: Adding local stream to peer connection');
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      // Emit call initiation with call ID
      console.log('CallInterface: Emitting initiate-call event with ID:', currentCallId.current);
      socketInstance.emit('initiate-call', {
        to: recipientId,
        isVideo: isVideoEnabled,
        callId: currentCallId.current
      });
      
      setConnectionInfo('Call sent, waiting for answer...');
      
    } catch (error) {
      console.error('CallInterface: Failed to start call:', error);
      handleError(error);
    }
  };

  const handleAnswerCall = async () => {
    try {
      console.log('CallInterface: Answering call');
      console.log('CallInterface: callData:', callData);
      console.log('CallInterface: recipientId:', recipientId);
      
      setCallStatus('connecting');
      setConnectionInfo('Answering call...');
      
      const callerId = callData?.from || recipientId;
      const acceptCallId = callData?.callId;
      
      console.log('CallInterface: Answering call with:');
      console.log('  - callerId:', callerId);
      console.log('  - callId:', acceptCallId);
      console.log('  - isVideo:', callData?.isVideo);
      
      if (!callerId) {
        throw new Error('Caller ID not found');
      }
      
      if (!acceptCallId) {
        console.warn('CallInterface: No callId in callData, this may cause issues');
      }
      
      // Store the call ID for later use
      currentCallId.current = acceptCallId;
      
      // Create peer connection and add local stream
      const pc = createPeerConnection(socket);
      
      if (localStream) {
        console.log('CallInterface: Adding local stream to peer connection');
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      const acceptData = {
        to: callerId,
        isVideo: callData?.isVideo || isVideoEnabled,
        callId: acceptCallId
      };
      
      console.log('CallInterface: Emitting accept-call with data:', acceptData);
      socket.emit('accept-call', acceptData);
      
      setConnectionInfo('Call answered, waiting for connection...');
    } catch (error) {
      console.error('CallInterface: Failed to answer call:', error);
      handleError(error);
    }
  };

  const handleOffer = async (data, socketInstance) => {
    try {
      console.log('CallInterface: Handling offer from:', data.from);
      
      if (!peerConnection) {
        // Create peer connection if it doesn't exist (for incoming calls)
        const pc = createPeerConnection(socketInstance);
        
        if (localStream) {
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
          });
        }
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('CallInterface: Remote description set, creating answer');
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('CallInterface: Sending answer to:', data.from);
      socketInstance.emit('answer', {
        to: data.from,
        answer: answer,
        callId: data.callId
      });
      
      setConnectionInfo('Connecting...');
    } catch (error) {
      console.error('CallInterface: Failed to handle offer:', error);
      handleError(error);
    }
  };

  const handleAnswer = async (data) => {
    try {
      console.log('CallInterface: Handling answer from:', data.from);
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('CallInterface: Remote description set from answer');
        
        // Create and send offer after accepting call
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('offer', {
          to: data.from,
          offer: offer,
          callId: currentCallId.current
        });
        
        setConnectionInfo('Establishing connection...');
      } else {
        console.error('CallInterface: No peer connection found for answer');
      }
    } catch (error) {
      console.error('CallInterface: Failed to handle answer:', error);
      handleError(error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('CallInterface: ICE candidate added');
      }
    } catch (error) {
      console.error('CallInterface: Failed to handle ICE candidate:', error);
    }
  };

  const handleRejectCall = () => {
    console.log('CallInterface: Rejecting call');
    if (socket && callData) {
      socket.emit('reject-call', {
        to: callData.from,
        callId: callData.callId
      });
    }
    setCallStatus('rejected');
    setConnectionInfo('Call rejected');
    setTimeout(() => onClose(), 1000);
  };

  const handleEndCall = () => {
    console.log('CallInterface: Ending call');
    const targetId = isIncoming ? (callData?.from || recipientId) : recipientId;
    
    if (socket && targetId) {
      socket.emit('end-call', {
        to: targetId,
        callId: currentCallId.current
      });
    }
    
    setCallStatus('ended');
    setConnectionInfo('Ending call...');
    setTimeout(() => onClose(), 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        setConnectionInfo(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
        
        setTimeout(() => {
          if (callStatus === 'connected') {
            setConnectionInfo('Connected successfully');
          }
        }, 2000);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        setConnectionInfo(videoTrack.enabled ? 'Camera enabled' : 'Camera disabled');
        
        setTimeout(() => {
          if (callStatus === 'connected') {
            setConnectionInfo('Connected successfully');
          }
        }, 2000);
      }
    }
  };

  const handleError = (error) => {
    let errorMessage = 'An error occurred during the call.';
    
    if (error.message.includes('token') || error.message.includes('Authentication')) {
      errorMessage = 'Authentication failed. Please refresh and try again.';
    } else if (error.message.includes('timeout') || error.message.includes('connection')) {
      errorMessage = 'Connection error. Please check your internet connection.';
    } else if (error.name === 'NotAllowedError' || error.message.includes('access denied')) {
      errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
    } else if (error.name === 'NotFoundError' || error.message.includes('No camera')) {
      errorMessage = 'No camera or microphone found. Please check your devices.';
    } else if (error.message.includes('Invalid recipient')) {
      errorMessage = 'Cannot call this user. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    setCallStatus('failed');
    setTimeout(() => onClose(), 4000);
  };

  const cleanup = () => {
    console.log('CallInterface: Starting cleanup');
    
    if (localStream) {
      console.log('CallInterface: Stopping local stream');
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (peerConnection) {
      console.log('CallInterface: Closing peer connection');
      peerConnection.close();
      setPeerConnection(null);
    }
    
    if (socket) {
      console.log('CallInterface: Disconnecting socket');
      socket.disconnect();
      setSocket(null);
    }
    
    // Reset refs
    currentCallId.current = null;
    
    console.log('CallInterface: Cleanup completed');
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'initializing':
        return 'Initializing call...';
      case 'incoming':
        return `Incoming ${callData?.isVideo ? 'video' : 'audio'} call`;
      case 'calling':
        return `Calling ${recipientName}...`;
      case 'connecting':
        return `Connecting...`;
      case 'connected':
        return `${callData?.isVideo || initialCallType === 'video' ? 'Video' : 'Audio'} call with ${recipientName}`;
      case 'ended':
        return 'Call ended';
      case 'rejected':
        return 'Call rejected';
      case 'failed':
        return 'Call failed';
      default:
        return `Call with ${recipientName}`;
    }
  };

  // Get current user's name for display
  const currentUserName = userData?.data?.name || 'You';
  const currentUserInitial = currentUserName.charAt(0).toUpperCase();

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .spinner {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '20px', 
              fontWeight: '600',
              color: '#333'
            }}>
              {getStatusText()}
            </h2>
            
            {connectionInfo && (
              <p style={{ 
                margin: '0', 
                fontSize: '14px', 
                color: callStatus === 'connected' ? '#4caf50' : '#666'
              }}>
                {connectionInfo}
              </p>
            )}
            
            {error && (
              <p style={{ 
                color: '#f44336', 
                fontSize: '14px', 
                margin: '8px 0 0 0',
                backgroundColor: '#ffebee',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                {error}
              </p>
            )}
          </div>

          {/* Video Container */}
          <div style={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            position: 'relative',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {(callStatus === 'connected' || callStatus === 'connecting') && (
              <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                padding: '16px'
              }}>
                {/* Local Video */}
                <div style={{
                  position: 'relative',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: '200px'
                }}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: isVideoEnabled ? 'block' : 'none'
                    }}
                  />
                  {!isVideoEnabled && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#2a2a2a'
                    }}>
                      <div style={{ color: 'white', textAlign: 'center' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          backgroundColor: '#555',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                          fontSize: '24px',
                          fontWeight: '600'
                        }}>
                          {currentUserInitial}
                        </div>
                        <span style={{ fontSize: '14px', opacity: 0.8 }}>Camera off</span>
                      </div>
                    </div>
                  )}
                  <span style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    color: 'white',
                    fontSize: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    You
                  </span>
                </div>

                {/* Remote Video */}
                <div style={{
                  position: 'relative',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: '200px'
                }}>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    color: 'white',
                    fontSize: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {recipientName}
                  </span>
                  
                  {callStatus === 'connecting' && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(42, 42, 42, 0.8)'
                    }}>
                      <div style={{ color: 'white', textAlign: 'center' }}>
                        <div className="spinner" style={{
                          width: '32px',
                          height: '32px',
                          border: '3px solid #fff',
                          borderTop: '3px solid transparent',
                          borderRadius: '50%',
                          margin: '0 auto 12px'
                        }}></div>
                        <span style={{ fontSize: '14px' }}>Connecting...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status screens for non-connected states */}
            {(callStatus === 'initializing' || callStatus === 'incoming' || callStatus === 'calling' || callStatus === 'ended' || callStatus === 'rejected' || callStatus === 'failed') && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px'
              }}>
                <div style={{ color: 'white', textAlign: 'center' }}>
                  {callStatus === 'initializing' ? (
                    <div>
                      <div className="spinner" style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #fff',
                        borderTop: '3px solid transparent',
                        borderRadius: '50%',
                        margin: '0 auto 20px'
                      }}></div>
                      <p style={{ color: '#ccc', margin: 0, fontSize: '16px' }}>
                        Initializing call...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#555',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        fontSize: '48px',
                        fontWeight: '600'
                      }}>
                        {recipientName ? recipientName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <h3 style={{ 
                        fontSize: '24px', 
                        fontWeight: '600', 
                        margin: '0 0 8px 0',
                        color: '#fff'
                      }}>
                        {recipientName}
                      </h3>
                      <p style={{ 
                        color: '#ccc', 
                        margin: 0, 
                        fontSize: '16px'
                      }}>
                        {callStatus === 'calling' && 'Calling...'}
                        {callStatus === 'incoming' && 'Incoming call'}
                        {callStatus === 'ended' && 'Call ended'}
                        {callStatus === 'rejected' && 'Call was rejected'}
                        {callStatus === 'failed' && 'Call failed'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e0e0e0'
          }}>
            {/* Incoming call buttons */}
            {callStatus === 'incoming' && (
              <>
                <button
                  onClick={handleAnswerCall}
                  style={{
                    padding: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Answer Call"
                >
                  <Phone style={{ width: '28px', height: '28px' }} />
                </button>
                <button
                  onClick={handleRejectCall}
                  style={{
                    padding: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Reject Call"
                >
                  <CallEnd style={{ width: '28px', height: '28px' }} />
                </button>
              </>
            )}

            {/* Active call controls */}
            {(callStatus === 'connected' || callStatus === 'connecting' || callStatus === 'calling') && (
              <>
                <button
                  onClick={toggleMute}
                  style={{
                    padding: '14px',
                    borderRadius: '50%',
                    backgroundColor: isMuted ? '#f44336' : '#e0e0e0',
                    color: isMuted ? 'white' : '#666',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? 
                    <MicOff style={{ width: '24px', height: '24px' }} /> : 
                    <Mic style={{ width: '24px', height: '24px' }} />
                  }
                </button>
                
                {(initialCallType === 'video' || callData?.isVideo) && (
                  <button
                    onClick={toggleVideo}
                    style={{
                      padding: '14px',
                      borderRadius: '50%',
                      backgroundColor: !isVideoEnabled ? '#f44336' : '#e0e0e0',
                      color: !isVideoEnabled ? 'white' : '#666',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoEnabled ? 
                      <Videocam style={{ width: '24px', height: '24px' }} /> : 
                      <VideocamOff style={{ width: '24px', height: '24px' }} />
                    }
                  </button>
                )}

                <button
                  onClick={handleEndCall}
                  style={{
                    padding: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="End Call"
                >
                  <CallEnd style={{ width: '28px', height: '28px' }} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CallInterface;