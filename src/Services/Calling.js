// src/Services/Calling.js
import io from 'socket.io-client';

class CallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.socket = null;
    this.isInitiator = false;
    this.currentCallRecipient = null;
    this.isSocketConnected = false;
    this.connectionPromise = null;
    this.callbacks = {
      onLocalStream: null,
      onRemoteStream: null,
      onCallEnded: null,
      onIncomingCall: null,
      onCallAccepted: null,
      onCallRejected: null
    };
    
    // WebRTC configuration
    this.pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
  }

  // Initialize socket connection for call signaling
  initializeSocket(token) {
    if (this.socket && this.isSocketConnected) {
      console.log('CallService: Socket already connected');
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      console.log('CallService: Connection already in progress');
      return this.connectionPromise;
    }
    
    console.log('CallService: Initializing socket connection...');
    
    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = io("https://connect-server-1a2y.onrender.com", {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      const connectionTimeout = setTimeout(() => {
        console.error('CallService: Socket connection timeout');
        reject(new Error('Socket connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        console.log('CallService: Socket connected successfully');
        clearTimeout(connectionTimeout);
        this.isSocketConnected = true;
        this.connectionPromise = null;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('CallService: Socket disconnected:', reason);
        this.isSocketConnected = false;
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          console.log('CallService: Attempting to reconnect...');
          this.socket.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('CallService: Socket connection error:', error);
        clearTimeout(connectionTimeout);
        this.isSocketConnected = false;
        this.connectionPromise = null;
        reject(error);
      });

      // Call event listeners
      this.socket.on('incoming-call', (data) => {
        console.log('CallService: Incoming call received:', data);
        if (this.callbacks.onIncomingCall) {
          this.callbacks.onIncomingCall(data);
        }
      });

      this.socket.on('call-accepted', async (data) => {
        console.log('CallService: Call accepted:', data);
        if (this.callbacks.onCallAccepted) {
          this.callbacks.onCallAccepted(data);
        }
        await this.handleCallAccepted(data);
      });

      this.socket.on('call-rejected', (data) => {
        console.log('CallService: Call rejected:', data);
        if (this.callbacks.onCallRejected) {
          this.callbacks.onCallRejected(data);
        }
        this.cleanup();
      });

      this.socket.on('call-failed', (data) => {
        console.log('CallService: Call failed:', data);
        if (this.callbacks.onCallRejected) {
          this.callbacks.onCallRejected(data);
        }
        this.cleanup();
      });

      // WebRTC signaling
      this.socket.on('ice-candidate', async (data) => {
        if (this.peerConnection && data.candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('CallService: ICE candidate added successfully');
          } catch (error) {
            console.error('CallService: Error adding ICE candidate:', error);
          }
        }
      });

      this.socket.on('offer', async (data) => {
        console.log('CallService: Offer received');
        await this.handleOffer(data);
      });

      this.socket.on('answer', async (data) => {
        console.log('CallService: Answer received');
        await this.handleAnswer(data);
      });

      this.socket.on('call-ended', () => {
        console.log('CallService: Call ended by remote peer');
        this.handleCallEnded();
      });
    });

    return this.connectionPromise;
  }

  async waitForConnection(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      if (this.isSocketConnected) {
        return true;
      }
      
      console.log(`CallService: Waiting for connection... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Failed to establish socket connection after multiple attempts');
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async startCall(recipientId, isVideo = true) {
    try {
      console.log('CallService: Starting call to:', recipientId, 'Video:', isVideo);
      
      // Ensure socket is connected
      if (!this.isSocketConnected) {
        console.log('CallService: Socket not connected, waiting...');
        await this.waitForConnection();
      }

      if (!this.socket || !this.isSocketConnected) {
        throw new Error('Socket connection failed - please check your internet connection');
      }

      this.isInitiator = true;
      this.currentCallRecipient = recipientId;
      
      // Get user media first
      await this.getUserMedia(isVideo);
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
        console.log('CallService: Local tracks added to peer connection');
      }

      // Initiate call via socket
      this.socket.emit('initiate-call', {
        to: recipientId,
        isVideo
      });

      console.log('CallService: Call initiation sent');

    } catch (error) {
      console.error('CallService: Failed to start call:', error);
      this.cleanup();
      throw error;
    }
  }

  async answerCall(callData) {
    try {
      console.log('CallService: Answering call from:', callData.from);
      
      // Ensure socket is connected
      if (!this.isSocketConnected) {
        console.log('CallService: Socket not connected, waiting...');
        await this.waitForConnection();
      }

      if (!this.socket || !this.isSocketConnected) {
        throw new Error('Socket connection failed - please check your internet connection');
      }

      this.isInitiator = false;
      this.currentCallRecipient = callData.from;
      
      // Get user media
      await this.getUserMedia(callData.isVideo);
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
        console.log('CallService: Local tracks added to peer connection');
      }

      // Accept call via socket
      this.socket.emit('accept-call', {
        to: callData.from,
        isVideo: callData.isVideo
      });

      console.log('CallService: Call acceptance sent');

    } catch (error) {
      console.error('CallService: Failed to answer call:', error);
      this.cleanup();
      throw error;
    }
  }

  async handleCallAccepted(data) {
    console.log('CallService: Handling call accepted');
    if (this.isInitiator && this.peerConnection) {
      try {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await this.peerConnection.setLocalDescription(offer);
        
        if (this.socket && this.isSocketConnected) {
          this.socket.emit('offer', {
            to: this.currentCallRecipient,
            offer: offer
          });
        }
        
        console.log('CallService: Offer created and sent');
      } catch (error) {
        console.error('CallService: Error creating offer:', error);
      }
    }
  }

  async handleOffer(data) {
    try {
      if (!this.peerConnection) {
        console.error('CallService: No peer connection available for offer');
        return;
      }

      console.log('CallService: Setting remote description from offer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      if (this.socket && this.isSocketConnected) {
        this.socket.emit('answer', {
          to: this.currentCallRecipient,
          answer: answer
        });
      }
      
      console.log('CallService: Answer created and sent');
    } catch (error) {
      console.error('CallService: Error handling offer:', error);
    }
  }

  async handleAnswer(data) {
    try {
      if (!this.peerConnection) {
        console.error('CallService: No peer connection available for answer');
        return;
      }

      console.log('CallService: Setting remote description from answer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('CallService: Error handling answer:', error);
    }
  }

  endCall() {
    console.log('CallService: Ending call');
    if (this.socket && this.isSocketConnected && this.currentCallRecipient) {
      this.socket.emit('end-call', {
        to: this.currentCallRecipient
      });
    }
    this.handleCallEnded();
  }

  rejectCall(callData) {
    console.log('CallService: Rejecting call from:', callData.from);
    if (this.socket && this.isSocketConnected) {
      this.socket.emit('reject-call', {
        to: callData.from
      });
    }
  }

  handleCallEnded() {
    console.log('CallService: Handling call end');
    if (this.callbacks.onCallEnded) {
      this.callbacks.onCallEnded();
    }
    this.cleanup();
  }

  async getUserMedia(isVideo = true) {
    try {
      console.log('CallService: Requesting user media - Video:', isVideo);
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }
      
      console.log('CallService: User media obtained successfully');
      return this.localStream;
    } catch (error) {
      console.error('CallService: Error accessing media devices:', error);
      
      // Try with more basic constraints if the ideal ones fail
      if (isVideo) {
        try {
          console.log('CallService: Retrying with basic video constraints');
          const basicConstraints = { audio: true, video: true };
          this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          
          if (this.callbacks.onLocalStream) {
            this.callbacks.onLocalStream(this.localStream);
          }
          
          return this.localStream;
        } catch (basicError) {
          console.error('CallService: Basic constraints also failed:', basicError);
        }
      }
      
      throw error;
    }
  }

  createPeerConnection() {
    console.log('CallService: Creating peer connection');
    this.peerConnection = new RTCPeerConnection(this.pcConfig);

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCallRecipient && this.socket && this.isSocketConnected) {
        this.socket.emit('ice-candidate', {
          to: this.currentCallRecipient,
          candidate: event.candidate
        });
        console.log('CallService: ICE candidate sent');
      }
    };

    // Remote stream handling
    this.peerConnection.ontrack = (event) => {
      console.log('CallService: Remote track received');
      this.remoteStream = event.streams[0];
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(this.remoteStream);
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('CallService: Connection state changed to:', state);
      
      if (state === 'connected') {
        console.log('CallService: Peer connection established successfully');
      } else if (state === 'disconnected' || state === 'failed') {
        console.log('CallService: Peer connection lost');
        this.handleCallEnded();
      }
    };

    // ICE connection state monitoring
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection.iceConnectionState;
      console.log('CallService: ICE connection state:', iceState);
      
      if (iceState === 'failed' || iceState === 'disconnected') {
        console.log('CallService: ICE connection failed');
        // Optionally restart ICE or end call
      }
    };

    // Gathering state monitoring
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('CallService: ICE gathering state:', this.peerConnection.iceGatheringState);
    };
  }

  // Media control methods
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('CallService: Audio muted:', !audioTrack.enabled);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('CallService: Video enabled:', videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return false;
  }

  cleanup() {
    console.log('CallService: Cleaning up resources');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('CallService: Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset state
    this.remoteStream = null;
    this.isInitiator = false;
    this.currentCallRecipient = null;
  }

  // Complete disconnect - use when component unmounts
  disconnect() {
    console.log('CallService: Disconnecting completely');
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isSocketConnected = false;
      this.connectionPromise = null;
    }
  }
}

// Export singleton instance
const callService = new CallService();
export default callService;