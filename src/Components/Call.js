import React, { useEffect, useRef, useState } from 'react';
import { 
  Phone, 
  CallEnd, 
  Videocam, 
  VideocamOff, 
  Mic, 
  MicOff 
} from '@mui/icons-material';

const CallInterface = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  isIncoming = false, 
  initialCallType = 'video',
  callData = null,
  socket
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === 'video');
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'initializing');
  const [error, setError] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentCallId = useRef(null);
  const cleanupPerformed = useRef(false);
  const socketRef = useRef(socket);
  const isOfferSent = useRef(false);
  const isAnswerSent = useRef(false);
  const callTimeoutRef = useRef(null);
  const mediaSetupComplete = useRef(false);
  const connectionTimeoutRef = useRef(null);
  
  const userData = JSON.parse(localStorage.getItem("userData"));
  
  // FIXED: More reliable ICE servers configuration
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Free TURN servers with different credentials
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  // FIXED: Reset everything when component opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('📞 CallInterface: Opening - resetting state');
      // Reset all state when opening
      cleanupPerformed.current = false;
      isOfferSent.current = false;
      isAnswerSent.current = false;
      currentCallId.current = null;
      mediaSetupComplete.current = false;
      setError(null);
      setCallStatus(isIncoming ? 'incoming' : 'initializing');
      setConnectionInfo('');
      setLocalStream(null);
      setRemoteStream(null);
      setPeerConnection(null);
      setIsMuted(false);
      setIsVideoEnabled(initialCallType === 'video');
      
      // Clear any existing timeouts
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    } else {
      console.log('📞 CallInterface: Closing - performing cleanup');
      performCleanup();
    }
  }, [isOpen, isIncoming, initialCallType]);

  useEffect(() => {
    if (!isOpen || cleanupPerformed.current) return;

    console.log('📞 CallInterface: Initializing call interface');
    console.log('📞 Props:', { 
      recipientId, 
      recipientName, 
      isIncoming, 
      initialCallType,
      hasSocket: !!socket,
      callData 
    });

    // FIXED: Better socket reference handling
    if (socket) {
      socketRef.current = socket;
    } else {
      console.error('📞 CallInterface: No socket provided');
      handleError(new Error('No socket connection available'));
      return;
    }

    const initializeCall = async () => {
      try {
        if (!userData?.data?.token || (!userData?.data?._id && !userData?.data?.id)) {
          throw new Error('Authentication token or user ID not found');
        }

        const currentUserId = userData.data._id || userData.data.id;

        // FIXED: Better validation for outgoing calls
        if (!isIncoming) {
          if (!recipientId) {
            throw new Error('Recipient ID is required for outgoing calls');
          }
          if (recipientId === currentUserId) {
            throw new Error('Cannot call yourself');
          }
        }

        console.log('📞 CallInterface: Socket connection ready');
        setConnectionInfo('Setting up media...');
        
        setupCallSocketListeners();
        
        // FIXED: Always setup media and peer connection first
        await setupMediaAndPeerConnection();
        
        if (!isIncoming && recipientId) {
          console.log('📞 CallInterface: Starting outgoing call to:', recipientId);
          await handleStartCall();
        } else if (isIncoming) {
          console.log('📞 CallInterface: Handling incoming call');
          setCallStatus('incoming');
          setConnectionInfo('Incoming call - media ready');
        }
        
      } catch (error) {
        console.error('📞 CallInterface: Failed to initialize:', error);
        handleError(error);
      }
    };

    initializeCall();

    return () => {
      console.log('📞 CallInterface: useEffect cleanup');
    };
  }, [isOpen, recipientId, isIncoming]);

  const setupCallSocketListeners = () => {
    if (!socketRef.current) {
      console.error('📞 CallInterface: No socket for listeners');
      return;
    }

    console.log('📞 CallInterface: Setting up socket listeners');

    // FIXED: More thorough listener cleanup
    const eventsToClean = [
      'call-accepted', 'call-rejected', 'call-ended', 'call-failed',
      'offer', 'answer', 'ice-candidate', 'start-webrtc-offer'
    ];
    
    eventsToClean.forEach(event => {
      socketRef.current.off(event);
    });

    socketRef.current.on('call-accepted', async (data) => {
      console.log('📞 CallInterface: Call accepted:', data);
      if (cleanupPerformed.current) return;
      
      setCallStatus('connecting');
      setConnectionInfo('Call accepted, establishing connection...');
      
      // FIXED: Start connection timeout
      startConnectionTimeout();
    });

    socketRef.current.on('call-rejected', (data) => {
      console.log('📞 CallInterface: Call rejected:', data);
      if (cleanupPerformed.current) return;
      
      setCallStatus('rejected');
      setConnectionInfo('Call was rejected');
      setTimeout(() => {
        if (!cleanupPerformed.current) {
          performCleanup();
          onClose();
        }
      }, 2000);
    });

    socketRef.current.on('call-ended', (data) => {
      console.log('📞 CallInterface: Call ended:', data);
      if (cleanupPerformed.current) return;
      
      setCallStatus('ended');
      setConnectionInfo('Call ended');
      setTimeout(() => {
        if (!cleanupPerformed.current) {
          performCleanup();
          onClose();
        }
      }, 2000);
    });

    socketRef.current.on('call-failed', (data) => {
      console.log('📞 CallInterface: Call failed:', data);
      if (cleanupPerformed.current) return;
      
      setError(data.message || 'Call failed');
      setCallStatus('failed');
      setTimeout(() => {
        if (!cleanupPerformed.current) {
          performCleanup();
          onClose();
        }
      }, 4000);
    });

    // FIXED: Handle WebRTC offer initiation with proper timing
    socketRef.current.on('start-webrtc-offer', async (data) => {
      console.log('📞 CallInterface: Server requests WebRTC offer:', data);
      if (cleanupPerformed.current) return;
      
      // Wait a bit more to ensure everything is setup
      setTimeout(async () => {
        if (peerConnection && !isOfferSent.current && !cleanupPerformed.current) {
          console.log('📞 CallInterface: Creating offer after server request');
          await createAndSendOffer();
        } else {
          console.log('📞 CallInterface: Cannot create offer - PC:', !!peerConnection, 'OfferSent:', isOfferSent.current, 'Cleanup:', cleanupPerformed.current);
        }
      }, 1000); // Increased delay for better reliability
    });

    // WebRTC signaling events
    socketRef.current.on('offer', async (data) => {
      console.log('📞 CallInterface: Received WebRTC offer from:', data.from);
      if (cleanupPerformed.current) return;
      await handleOffer(data);
    });

    socketRef.current.on('answer', async (data) => {
      console.log('📞 CallInterface: Received WebRTC answer from:', data.from);
      if (cleanupPerformed.current) return;
      await handleAnswer(data);
    });

    socketRef.current.on('ice-candidate', async (data) => {
      console.log('📞 CallInterface: Received ICE candidate from:', data.from);
      if (cleanupPerformed.current) return;
      await handleIceCandidate(data);
    });
  };

  // FIXED: Start connection timeout to detect failed connections
  const startConnectionTimeout = () => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    connectionTimeoutRef.current = setTimeout(() => {
      if (callStatus === 'connecting' && !cleanupPerformed.current) {
        console.error('📞 CallInterface: Connection timeout - WebRTC failed to establish');
        setError('Connection timeout. Please try again.');
        setCallStatus('failed');
        setTimeout(() => {
          if (!cleanupPerformed.current) {
            performCleanup();
            onClose();
          }
        }, 3000);
      }
    }, 30000); // 30 second timeout
  };

  // FIXED: Much better media and peer connection setup
  const setupMediaAndPeerConnection = async () => {
    try {
      if (cleanupPerformed.current || mediaSetupComplete.current) return;
      
      console.log('📞 CallInterface: Setting up media and peer connection');
      setConnectionInfo('Accessing camera and microphone...');
      
      // First create peer connection
      const pc = await createPeerConnection();
      
      // Then setup media
      const stream = await setupMedia();
      
      // Add local stream to peer connection
      if (stream && pc && !cleanupPerformed.current) {
        console.log('📞 CallInterface: Adding local stream tracks to peer connection');
        
        for (const track of stream.getTracks()) {
          try {
            const sender = pc.addTrack(track, stream);
            console.log('📞 CallInterface: Successfully added', track.kind, 'track:', track.id);
            console.log('📞 CallInterface: Sender created:', sender);
          } catch (trackError) {
            console.error('📞 CallInterface: Failed to add track:', trackError);
          }
        }
        
        // FIXED: Verify tracks were added and log detailed info
        const senders = pc.getSenders();
        console.log('📞 CallInterface: Total senders after adding tracks:', senders.length);
        senders.forEach((sender, index) => {
          const track = sender.track;
          if (track) {
            console.log(`📞 CallInterface: Sender ${index}: ${track.kind} track ${track.id} (enabled: ${track.enabled})`);
          } else {
            console.log(`📞 CallInterface: Sender ${index}: No track`);
          }
        });
        
        // Log local stream details
        console.log('📞 CallInterface: Local stream details:', {
          id: stream.id,
          active: stream.active,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length
        });
      }
      
      mediaSetupComplete.current = true;
      setConnectionInfo('Media setup complete');
      console.log('📞 CallInterface: Media and peer connection setup complete');
      
    } catch (error) {
      console.error('📞 CallInterface: Failed to setup media and peer connection:', error);
      handleError(error);
    }
  };

  // FIXED: Simplified but robust media setup
  const setupMedia = async () => {
    try {
      if (cleanupPerformed.current) return null;
      
      // FIXED: Start with very basic constraints for maximum compatibility
      let constraints = {
        audio: true,
        video: isVideoEnabled
      };
      
      console.log('📞 CallInterface: Requesting media access with basic constraints');
      let stream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.warn('📞 CallInterface: Basic constraints failed, trying audio only:', error);
        // Fallback to audio only
        constraints = { audio: true, video: false };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        setIsVideoEnabled(false);
      }
      
      if (cleanupPerformed.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      
      setLocalStream(stream);
      
      // FIXED: Better video element handling with error catching
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          console.log('📞 CallInterface: Local video playing successfully');
        } catch (playError) {
          console.warn('📞 CallInterface: Local video autoplay failed (this is often normal):', playError);
        }
      }
      
      // FIXED: Enhanced track logging
      console.log('📞 CallInterface: Media access granted');
      stream.getTracks().forEach((track, index) => {
        console.log(`📞 CallInterface: Track ${index}: ${track.kind}`, {
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings ? track.getSettings() : 'N/A'
        });
        
        // Add track event listeners
        track.onended = () => {
          console.log(`📞 CallInterface: Track ${track.kind} ended`);
        };
        
        track.onmute = () => {
          console.log(`📞 CallInterface: Track ${track.kind} muted`);
        };
        
        track.onunmute = () => {
          console.log(`📞 CallInterface: Track ${track.kind} unmuted`);
        };
      });
      
      setConnectionInfo('Media ready');
      return stream;
    } catch (error) {
      console.error('📞 CallInterface: Failed to get media:', error);
      let errorMessage = 'Failed to access camera/microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please check your devices.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // FIXED: Enhanced peer connection setup with detailed logging
  const createPeerConnection = async () => {
    if (cleanupPerformed.current) return null;
    
    console.log('📞 CallInterface: Creating peer connection with config:', pcConfig);
    const pc = new RTCPeerConnection(pcConfig);
    
    // FIXED: Enhanced ICE candidate handling with better logging
    pc.onicecandidate = (event) => {
      if (cleanupPerformed.current) return;
      
      if (event.candidate) {
        const candidate = event.candidate;
        console.log('📞 CallInterface: ICE candidate generated:', {
          candidate: candidate.candidate.substring(0, 50) + '...',
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
          type: candidate.candidate.includes('typ host') ? 'host' : 
                candidate.candidate.includes('typ srflx') ? 'srflx' :
                candidate.candidate.includes('typ relay') ? 'relay' : 'other'
        });
        
        const targetId = isIncoming ? (callData?.from || recipientId) : recipientId;
        socketRef.current.emit('ice-candidate', {
          to: targetId,
          candidate: candidate,
          callId: currentCallId.current
        });
      } else {
        console.log('📞 CallInterface: ICE gathering complete');
      }
    };

    // FIXED: Much better track handling for receiving remote media
    pc.ontrack = (event) => {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: ===== REMOTE TRACK RECEIVED =====');
      console.log('📞 CallInterface: Track kind:', event.track.kind);
      console.log('📞 CallInterface: Track details:', {
        id: event.track.id,
        label: event.track.label,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState
      });
      
      const [stream] = event.streams;
      console.log('📞 CallInterface: Remote stream received:', {
        id: stream.id,
        active: stream.active,
        trackCount: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      // Log all tracks in the stream
      stream.getTracks().forEach((track, index) => {
        console.log(`📞 CallInterface: Stream track ${index}:`, track.kind, track.id);
      });
      
      setRemoteStream(stream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        console.log('📞 CallInterface: Remote stream assigned to video element');
        
        // FIXED: Force play remote video with better error handling
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('📞 CallInterface: Remote video playing successfully');
            })
            .catch(error => {
              console.warn('📞 CallInterface: Remote video autoplay failed:', error);
              // Try to play again after a short delay
              setTimeout(() => {
                if (remoteVideoRef.current && !cleanupPerformed.current) {
                  remoteVideoRef.current.play().catch(e => {
                    console.warn('📞 CallInterface: Remote video second play attempt failed:', e);
                  });
                }
              }, 500);
            });
        }
      }
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      setCallStatus('connected');
      setConnectionInfo('Connected - media streaming');
      console.log('📞 CallInterface: ===== CALL CONNECTED =====');
    };

    // FIXED: Enhanced connection state monitoring
    pc.onconnectionstatechange = () => {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: Connection state changed:', pc.connectionState);
      
      switch (pc.connectionState) {
        case 'new':
          console.log('📞 CallInterface: Connection state: new');
          break;
        case 'connecting':
          console.log('📞 CallInterface: Connection state: connecting');
          setConnectionInfo('Establishing connection...');
          break;
        case 'connected':
          console.log('📞 CallInterface: Connection state: connected');
          setCallStatus('connected');
          setConnectionInfo('Connected successfully');
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          break;
        case 'disconnected':
          console.log('📞 CallInterface: Connection state: disconnected');
          if (callStatus === 'connected') {
            setCallStatus('ended');
            setConnectionInfo('Connection lost');
            setTimeout(() => {
              if (!cleanupPerformed.current) {
                performCleanup();
                onClose();
              }
            }, 2000);
          }
          break;
        case 'failed':
          console.error('📞 CallInterface: Connection state: failed');
          setCallStatus('failed');
          setError('Connection failed. Please try again.');
          setTimeout(() => {
            if (!cleanupPerformed.current) {
              performCleanup();
              onClose();
            }
          }, 3000);
          break;
        case 'closed':
          console.log('📞 CallInterface: Connection state: closed');
          break;
      }
    };

    // FIXED: Enhanced ICE connection state monitoring
    pc.oniceconnectionstatechange = () => {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: ICE connection state:', pc.iceConnectionState);
      
      switch (pc.iceConnectionState) {
        case 'new':
          console.log('📞 CallInterface: ICE state: new');
          break;
        case 'checking':
          console.log('📞 CallInterface: ICE state: checking');
          setConnectionInfo('Checking network connectivity...');
          break;
        case 'connected':
          console.log('📞 CallInterface: ICE state: connected');
          break;
        case 'completed':
          console.log('📞 CallInterface: ICE state: completed');
          break;
        case 'failed':
          console.error('📞 CallInterface: ICE state: failed');
          setError('Network connection failed. Please check your internet connection.');
          break;
        case 'disconnected':
          console.warn('📞 CallInterface: ICE state: disconnected');
          setConnectionInfo('Network connection unstable...');
          break;
        case 'closed':
          console.log('📞 CallInterface: ICE state: closed');
          break;
      }
    };

    // FIXED: ICE gathering state monitoring
    pc.onicegatheringstatechange = () => {
      console.log('📞 CallInterface: ICE gathering state:', pc.iceGatheringState);
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleStartCall = async () => {
    try {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: Starting call to:', recipientId);
      
      const currentUserId = userData.data._id || userData.data.id;
      
      if (!recipientId) {
        throw new Error('Recipient ID is required');
      }
      
      if (recipientId === currentUserId) {
        throw new Error('Cannot call yourself');
      }
      
      setCallStatus('calling');
      setConnectionInfo('Initiating call...');
      
      currentCallId.current = `call-${currentUserId}-${recipientId}-${Date.now()}`;
      
      console.log('📞 CallInterface: Emitting initiate-call event');
      socketRef.current.emit('initiate-call', {
        to: recipientId,
        from: currentUserId,
        fromName: userData.data.name,
        isVideo: isVideoEnabled,
        callId: currentCallId.current
      });
      
      setConnectionInfo('Call sent, waiting for answer...');
      
    } catch (error) {
      console.error('📞 CallInterface: Failed to start call:', error);
      handleError(error);
    }
  };

  const handleAnswerCall = async () => {
    try {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: Answering call');
      
      setCallStatus('connecting');
      setConnectionInfo('Answering call...');
      
      const callerId = callData?.from || recipientId;
      const acceptCallId = callData?.callId || currentCallId.current;
      
      if (!callerId) {
        throw new Error('Caller ID not found');
      }
      
      currentCallId.current = acceptCallId;
      
      console.log('📞 CallInterface: Emitting accept-call event');
      socketRef.current.emit('accept-call', {
        to: callerId,
        from: userData.data._id || userData.data.id,
        isVideo: callData?.isVideo || isVideoEnabled,
        callId: acceptCallId
      });
      
      setConnectionInfo('Call answered, establishing connection...');
      startConnectionTimeout();
    } catch (error) {
      console.error('📞 CallInterface: Failed to answer call:', error);
      handleError(error);
    }
  };

  // FIXED: Enhanced offer creation with detailed logging
  const createAndSendOffer = async () => {
    try {
      if (!peerConnection || isOfferSent.current || cleanupPerformed.current) {
        console.log('📞 CallInterface: Cannot create offer - PC:', !!peerConnection, 'OfferSent:', isOfferSent.current, 'Cleanup:', cleanupPerformed.current);
        return;
      }
      
      console.log('📞 CallInterface: ===== CREATING WEBRTC OFFER =====');
      
      // FIXED: Check if we have tracks before creating offer
      const senders = peerConnection.getSenders();
      console.log('📞 CallInterface: Senders before offer:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`📞 CallInterface: Sender ${index}:`, sender.track?.kind || 'no track');
      });
      
      const transceivers = peerConnection.getTransceivers();
      console.log('📞 CallInterface: Transceivers before offer:', transceivers.length);
      transceivers.forEach((transceiver, index) => {
        console.log(`📞 CallInterface: Transceiver ${index}:`, {
          direction: transceiver.direction,
          sender: !!transceiver.sender.track,
          receiver: !!transceiver.receiver.track
        });
      });
      
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true
      };
      
      const offer = await peerConnection.createOffer(offerOptions);
      console.log('📞 CallInterface: Offer created');
      console.log('📞 CallInterface: Offer SDP preview:', offer.sdp.substring(0, 200) + '...');
      
      await peerConnection.setLocalDescription(offer);
      console.log('📞 CallInterface: Local description set');
      
      isOfferSent.current = true;
      
      const targetId = isIncoming ? (callData?.from || recipientId) : recipientId;
      console.log('📞 CallInterface: Sending offer to:', targetId);
      
      socketRef.current.emit('offer', {
        to: targetId,
        from: userData.data._id || userData.data.id,
        offer: offer,
        callId: currentCallId.current
      });
      
      console.log('📞 CallInterface: ===== OFFER SENT =====');
      setConnectionInfo('Offer sent, waiting for answer...');
      
    } catch (error) {
      console.error('📞 CallInterface: Failed to create offer:', error);
      handleError(error);
    }
  };

  // FIXED: Enhanced offer handling with detailed logging
  const handleOffer = async (data) => {
    try {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: ===== HANDLING WEBRTC OFFER =====');
      console.log('📞 CallInterface: Offer from:', data.from);
      console.log('📞 CallInterface: Offer SDP preview:', data.offer.sdp.substring(0, 200) + '...');
      
      if (!peerConnection) {
        console.error('📞 CallInterface: No peer connection for offer');
        return;
      }
      
      console.log('📞 CallInterface: Setting remote description...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('📞 CallInterface: Remote description set successfully');
      
      // FIXED: Check transceivers after setting remote description
      const transceivers = peerConnection.getTransceivers();
      console.log('📞 CallInterface: Transceivers after setting remote description:', transceivers.length);
      transceivers.forEach((transceiver, index) => {
        console.log(`📞 CallInterface: Transceiver ${index}:`, {
          direction: transceiver.direction,
          mid: transceiver.mid,
          sender: !!transceiver.sender.track,
          receiver: !!transceiver.receiver.track
        });
      });
      
      if (isAnswerSent.current) {
        console.log('📞 CallInterface: Answer already sent, skipping answer creation');
        return;
      }
      
      console.log('📞 CallInterface: Creating answer...');
      const answerOptions = {
        voiceActivityDetection: true
      };
      
      const answer = await peerConnection.createAnswer(answerOptions);
      console.log('📞 CallInterface: Answer created');
      console.log('📞 CallInterface: Answer SDP preview:', answer.sdp.substring(0, 200) + '...');
      
      await peerConnection.setLocalDescription(answer);
      console.log('📞 CallInterface: Local description set for answer');
      
      isAnswerSent.current = true;
      
      console.log('📞 CallInterface: Sending answer to:', data.from);
      socketRef.current.emit('answer', {
        to: data.from,
        from: userData.data._id || userData.data.id,
        answer: answer,
        callId: data.callId
      });
      
      console.log('📞 CallInterface: ===== ANSWER SENT =====');
      setConnectionInfo('Answer sent, connecting...');
    } catch (error) {
      console.error('📞 CallInterface: Failed to handle offer:', error);
      handleError(error);
    }
  };

  const handleAnswer = async (data) => {
    try {
      if (cleanupPerformed.current) return;
      
      console.log('📞 CallInterface: ===== HANDLING WEBRTC ANSWER =====');
      console.log('📞 CallInterface: Answer from:', data.from);
      console.log('📞 CallInterface: Answer SDP preview:', data.answer.sdp.substring(0, 200) + '...');
      
      if (!peerConnection) {
        console.error('📞 CallInterface: No peer connection for answer');
        return;
      }
      
      console.log('📞 CallInterface: Setting remote description from answer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('📞 CallInterface: Remote description set from answer successfully');
      console.log('📞 CallInterface: Connection state after answer:', peerConnection.connectionState);
      console.log('📞 CallInterface: ICE connection state after answer:', peerConnection.iceConnectionState);
      
      setConnectionInfo('Establishing media connection...');
      console.log('📞 CallInterface: ===== ANSWER PROCESSED =====');
    } catch (error) {
      console.error('📞 CallInterface: Failed to handle answer:', error);
      handleError(error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (peerConnection && data.candidate && !cleanupPerformed.current) {
        console.log('📞 CallInterface: Adding ICE candidate:', {
          candidate: data.candidate.candidate.substring(0, 50) + '...',
          sdpMLineIndex: data.candidate.sdpMLineIndex,
          sdpMid: data.candidate.sdpMid
        });
        
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('📞 CallInterface: ICE candidate added successfully');
      }
    } catch (error) {
      console.error('📞 CallInterface: Failed to handle ICE candidate:', error);
    }
  };

  const handleRejectCall = () => {
    if (cleanupPerformed.current) return;
    
    console.log('📞 CallInterface: Rejecting call');
    const targetId = callData?.from || recipientId;
    
    if (socketRef.current && targetId) {
      socketRef.current.emit('reject-call', {
        to: targetId,
        from: userData.data._id || userData.data.id,
        callId: currentCallId.current
      });
    }
    setCallStatus('rejected');
    setConnectionInfo('Call rejected');
    setTimeout(() => {
      if (!cleanupPerformed.current) {
        performCleanup();
        onClose();
      }
    }, 1000);
  };

  const handleEndCall = () => {
    if (cleanupPerformed.current) return;
    
    console.log('📞 CallInterface: Ending call');
    const targetId = isIncoming ? (callData?.from || recipientId) : recipientId;
    
    if (socketRef.current && targetId) {
      socketRef.current.emit('end-call', {
        to: targetId,
        from: userData.data._id || userData.data.id,
        callId: currentCallId.current
      });
    }
    
    setCallStatus('ended');
    setConnectionInfo('Ending call...');
    setTimeout(() => {
      if (!cleanupPerformed.current) {
        performCleanup();
        onClose();
      }
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream && !cleanupPerformed.current) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('📞 CallInterface: Audio track', audioTrack.enabled ? 'unmuted' : 'muted');
        setConnectionInfo(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
        
        setTimeout(() => {
          if (callStatus === 'connected' && !cleanupPerformed.current) {
            setConnectionInfo('Connected successfully');
          }
        }, 2000);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && !cleanupPerformed.current) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('📞 CallInterface: Video track', videoTrack.enabled ? 'enabled' : 'disabled');
        setConnectionInfo(videoTrack.enabled ? 'Camera enabled' : 'Camera disabled');
        
        setTimeout(() => {
          if (callStatus === 'connected' && !cleanupPerformed.current) {
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
    } else if (error.message.includes('Invalid recipient') || error.message.includes('Recipient ID')) {
      errorMessage = 'Cannot call this user. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    setCallStatus('failed');
    setTimeout(() => {
      if (!cleanupPerformed.current) {
        performCleanup();
        onClose();
      }
    }, 4000);
  };
  const performCleanup = () => {
    if (cleanupPerformed.current) return;
    
    console.log('📞 CallInterface: ===== STARTING COMPREHENSIVE CLEANUP =====');
    cleanupPerformed.current = true;
    
    // Clear any timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Stop local stream
    if (localStream) {
      console.log('📞 CallInterface: Stopping local stream');
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('📞 CallInterface: Stopped local track:', track.kind, track.id);
      });
      setLocalStream(null);
    }
    
    // Clear local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      console.log('📞 CallInterface: Cleared local video element');
    }
    
    // Stop remote stream
    if (remoteStream) {
      console.log('📞 CallInterface: Stopping remote stream');
      remoteStream.getTracks().forEach(track => {
        track.stop();
        console.log('📞 CallInterface: Stopped remote track:', track.kind, track.id);
      });
      setRemoteStream(null);
    }
    
    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      console.log('📞 CallInterface: Cleared remote video element');
    }
    
    // Close peer connection
    if (peerConnection) {
      console.log('📞 CallInterface: Closing peer connection');
      peerConnection.close();
      setPeerConnection(null);
    }
    
    // Remove socket listeners
    if (socketRef.current) {
      console.log('📞 CallInterface: Removing call listeners');
      const eventsToClean = [
        'call-accepted', 'call-rejected', 'call-ended', 'call-failed',
        'offer', 'answer', 'ice-candidate', 'start-webrtc-offer'
      ];
      
      eventsToClean.forEach(event => {
        socketRef.current.off(event);
      });
    }
    
    // Reset refs
    currentCallId.current = null;
    isOfferSent.current = false;
    isAnswerSent.current = false;
    mediaSetupComplete.current = false;
    
    console.log('📞 CallInterface: ===== COMPREHENSIVE CLEANUP COMPLETED =====');
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'initializing':
        return 'Initializing call...';
      case 'incoming':
        return `Incoming ${callData?.isVideo || initialCallType === 'video' ? 'video' : 'audio'} call from ${recipientName}`;
      case 'calling':
        return `Calling ${recipientName}...`;
      case 'connecting':
        return `Connecting to ${recipientName}...`;
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
                    You {isMuted && '(Muted)'}
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
                        Setting up call...
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