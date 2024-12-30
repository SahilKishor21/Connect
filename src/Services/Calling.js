// services/CallService.js
import io from 'socket.io-client';

class CallService {
  constructor() {
    this.socket = io('http://localhost:5000');
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callCallbacks = {};
  }

  async initialize() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: this.currentCallUser
        });
      }
    };

    // Handle receiving remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.callCallbacks.onRemoteStream) {
        this.callCallbacks.onRemoteStream(this.remoteStream);
      }
    };

    // Socket event listeners
    this.socket.on('call-offer', async (data) => {
      if (this.callCallbacks.onIncomingCall) {
        this.currentCallUser = data.from;
        this.callCallbacks.onIncomingCall(data);
      }
    });

    this.socket.on('call-answer', async (data) => {
      const remoteDesc = new RTCSessionDescription(data.answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
    });

    this.socket.on('ice-candidate', async (data) => {
      if (data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(data.candidate);
        } catch (e) {
          console.error('Error adding ice candidate:', e);
        }
      }
    });

    this.socket.on('call-ended', () => {
      if (this.callCallbacks.onCallEnded) {
        this.callCallbacks.onCallEnded();
      }
      this.cleanup();
    });
  }

  async startCall(userId, isVideo = true) {
    try {
      this.currentCallUser = userId;
      
      // Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('call-offer', {
        offer: offer,
        to: userId,
        isVideo: isVideo
      });

      if (this.callCallbacks.onLocalStream) {
        this.callCallbacks.onLocalStream(this.localStream);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(data) {
    try {
      // Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: data.isVideo
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('call-answer', {
        answer: answer,
        to: data.from
      });

      if (this.callCallbacks.onLocalStream) {
        this.callCallbacks.onLocalStream(this.localStream);
      }
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  endCall() {
    this.socket.emit('end-call', {
      to: this.currentCallUser
    });
    this.cleanup();
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.localStream = null;
    this.remoteStream = null;
    this.currentCallUser = null;
    this.initialize(); // Reinitialize for next call
  }

  setCallbacks(callbacks) {
    this.callCallbacks = callbacks;
  }
}

export default new CallService();