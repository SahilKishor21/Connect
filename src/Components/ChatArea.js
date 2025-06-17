import React, { useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MicIcon from "@mui/icons-material/Mic";
import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import StopIcon from "@mui/icons-material/Stop";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import MessageSelf from "./MessageSelf";
import MessageOthers from "./MessageOthers";
import NotificationMessage from "./NotificationMessage";
import CallInterface from "./Call";
import io from "socket.io-client";

function ChatArea() {
  const [messageContent, setMessageContent] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const lightTheme = useSelector((state) => state.themeKey);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const chatContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  
  // Group dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const dropdownRef = useRef(null);
  
  const dyParams = useParams();
  const [chat_id, chat_user_raw] = dyParams._id.split("&");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setLoaded] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [typing, setTyping] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [callInterface, setCallInterface] = useState({
    isOpen: false,
    type: null,
    isIncoming: false,
    callData: null,
  });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);
  
  const callInterfaceRef = useRef(callInterface);
  const callListenersSetup = useRef(false);

  useEffect(() => {
    callInterfaceRef.current = callInterface;
  }, [callInterface]);

  // FIXED: Enhanced error handling function
  const handleApiError = (error) => {
    console.error('❌ API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || "Server error occurred";
      return message;
    } else if (error.request) {
      // Request was made but no response received
      return "Network error. Please check your connection.";
    } else {
      // Something else happened
      return error.message || "An unexpected error occurred";
    }
  };

  // Socket.IO connection for real-time messaging
  useEffect(() => {
    console.log('🔌 Setting up socket connection...');
    console.log('🔌 User data:', userData.data);
    
    socketRef.current = io("https://connect-server-1a2y.onrender.com", {
      auth: { token: userData.data.token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected successfully:', socketRef.current.id);
      console.log('🔌 Current user ID:', userData.data._id || userData.data.id);
      socketRef.current.emit("setup", userData.data);
      socketRef.current.emit("join chat", chat_id);
      
      callListenersSetup.current = false;
      setupCallListeners();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      callListenersSetup.current = false;
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
      socketRef.current.emit("setup", userData.data);
      socketRef.current.emit("join chat", chat_id);
    });

    setupBasicListeners();

    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.emit("leave chat", chat_id);
        socketRef.current.disconnect();
      }
      callListenersSetup.current = false;
    };
  }, [chat_id, userData.data.token, userData.data._id]);

  const setupBasicListeners = () => {
    if (!socketRef.current) return;

    console.log('🔧 Setting up basic socket listeners');

    socketRef.current.on("message received", (newMessage) => {
      console.log('💬 Message received:', newMessage);
      const messageChatId = newMessage.chat?._id || newMessage.chatId;
      const messageSenderId = newMessage.sender?._id || newMessage.sender;
      
      if (messageChatId === chat_id && messageSenderId !== userData.data._id) {
        setAllMessages((prev) => {
          const messageExists = prev.some(msg => msg._id === newMessage._id);
          if (messageExists) return prev;
          return [...prev, newMessage];
        });
      }
    });

    // Handle notification messages
    socketRef.current.on("notification received", (data) => {
      console.log('🔔 Notification received:', data);
      const { message, chatId } = data;
      
      if (chatId === chat_id) {
        setAllMessages((prev) => {
          const messageExists = prev.some(msg => msg._id === message._id);
          if (messageExists) return prev;
          return [...prev, message];
        });
      }
    });

    // FIXED: Enhanced group management socket listeners with better state updates
    socketRef.current.on("user left group", (data) => {
      console.log('👋 User left group event received:', data);
      const { chatId, userId, userName, updatedChat } = data;
      
      if (chatId === chat_id) {
        console.log(`👋 Processing user left: ${userName} (${userId})`);
        
        // Update local state with new chat data
        if (isGroupChat && updatedChat) {
          setGroupMembers(updatedChat.users || []);
          setCurrentChat(updatedChat);
          
          // Update admin status if needed
          if (updatedChat.groupAdmin) {
            setIsCurrentUserAdmin(updatedChat.groupAdmin._id === userData.data._id);
          }
        }
        
        // If current user left the group, redirect
        if (userId === userData.data._id) {
          console.log('👋 Current user left group, redirecting...');
          setTimeout(() => {
            navigate("/app/welcome");
          }, 1000);
        }
        
        // Close any open dropdowns
        setShowMemberActions(null);
        setShowDropdown(false);
      }
    });

    socketRef.current.on("user removed from group", (data) => {
      console.log('🚫 User removed from group event received:', data);
      const { chatId, removedUserId, removedUserName, adminName, updatedChat } = data;
      
      if (chatId === chat_id) {
        console.log(`🚫 Processing user removal: ${removedUserName} by ${adminName}`);
        
        // Update local state
        if (updatedChat) {
          setGroupMembers(updatedChat.users || []);
          setCurrentChat(updatedChat);
          
          // Update admin status
          if (updatedChat.groupAdmin) {
            setIsCurrentUserAdmin(updatedChat.groupAdmin._id === userData.data._id);
          }
        }
        
        // If current user was removed, redirect
        if (removedUserId === userData.data._id) {
          console.log('🚫 Current user was removed, redirecting...');
          setTimeout(() => {
            navigate("/app/welcome");
          }, 1000);
        }
        
        // Close dropdowns
        setShowMemberActions(null);
        setShowDropdown(false);
      }
    });

    socketRef.current.on("user added to group", (data) => {
      console.log('➕ User added to group event received:', data);
      const { chatId, addedUserName, updatedChat } = data;
      
      if (chatId === chat_id && updatedChat) {
        console.log(`➕ Processing user addition: ${addedUserName}`);
        
        setGroupMembers(updatedChat.users || []);
        setCurrentChat(updatedChat);
        
        // Update admin status
        if (updatedChat.groupAdmin) {
          setIsCurrentUserAdmin(updatedChat.groupAdmin._id === userData.data._id);
        }
      }
    });

    socketRef.current.on("admin changed", (data) => {
      console.log('👑 Admin changed event received:', data);
      const { chatId, newAdminId, newAdminName, updatedChat } = data;
      
      if (chatId === chat_id && updatedChat) {
        console.log(`👑 Processing admin change: ${newAdminName} is now admin`);
        
        setCurrentChat(updatedChat);
        setIsCurrentUserAdmin(updatedChat.groupAdmin._id === userData.data._id);
        setGroupMembers(updatedChat.users || []);
        
        // Show notification about admin change
        if (newAdminId === userData.data._id) {
          console.log("🎉 You are now the group admin!");
        }
        
        // Close dropdowns
        setShowMemberActions(null);
        setShowDropdown(false);
      }
    });

    // Online/offline status
    socketRef.current.on("online users", (users) => {
      console.log('👥 Online users received:', users);
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socketRef.current.on("user online", (data) => {
      console.log('👤 User online:', data);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers);
      }
    });

    socketRef.current.on("user offline", (data) => {
      console.log('👤 User offline:', data);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers);
      }
    });

    socketRef.current.on("typing", ({ room, user }) => {
      if (user !== userData.data._id && room === chat_id) {
        setIsRecipientTyping(true);
      }
    });

    socketRef.current.on("stop typing", ({ room, user }) => {
      if (user !== userData.data._id && room === chat_id) {
        setIsRecipientTyping(false);
      }
    });
  };

  const setupCallListeners = () => {
    if (!socketRef.current || callListenersSetup.current) return;

    console.log('📞 Setting up call listeners...');
    callListenersSetup.current = true;

    socketRef.current.on("incoming-call", (callData) => {
      console.log('📞 ===== INCOMING CALL =====');
      console.log('📞 Call data:', callData);
      console.log('📞 From:', callData.from, callData.fromName);
      console.log('📞 Current user ID:', userData.data._id || userData.data.id);
      console.log('📞 Current call interface state:', callInterfaceRef.current.isOpen);
      
      if (callData.from === (userData.data._id || userData.data.id)) {
        console.log('📞 Ignoring call from self');
        return;
      }
      
      if (callInterfaceRef.current.isOpen) {
        console.log('📞 Already in call, rejecting');
        socketRef.current.emit('reject-call', {
          to: callData.from,
          from: userData.data._id || userData.data.id,
          callId: callData.callId,
          reason: 'busy'
        });
        return;
      }
      
      console.log('📞 Showing incoming call interface');
      setCallInterface({
        isOpen: true,
        type: callData.isVideo ? 'video' : 'audio',
        isIncoming: true,
        callData: callData,
      });
    });

    socketRef.current.on("call-user-offline", (data) => {
      console.log('📞 Call user offline:', data);
      alert(`${data.targetName || 'User'} is currently offline.`);
      resetCallInterface();
    });

    socketRef.current.on("call-failed", (data) => {
      console.log('📞 Call failed:', data);
      alert(`Call failed: ${data.message || 'Unknown error'}`);
      resetCallInterface();
    });

    socketRef.current.on("call-sent", (data) => {
      console.log('📞 Call sent confirmation:', data);
    });

    socketRef.current.onAny((eventName, ...args) => {
      if (eventName.includes('call') || eventName.includes('webrtc')) {
        console.log(`🔍 Call-related event: ${eventName}`, args);
      }
    });
  };

  const resetCallInterface = () => {
    console.log('📞 Resetting call interface');
    setCallInterface({
      isOpen: false,
      type: null,
      isIncoming: false,
      callData: null,
    });
  };

  // Fetch chat details and determine if it's a group chat
  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${userData.data.token}` },
        };
        
        console.log('👤 Fetching chat details for chat_id:', chat_id);
        const { data } = await axios.get(`https://connect-server-1a2y.onrender.com/chat/${chat_id}`, config);
        console.log('👤 Chat data received:', data);
        
        setCurrentChat(data);
        setIsGroupChat(data.isGroupChat || false);
        
        if (data.isGroupChat) {
          setRecipientName(data.chatName);
          setGroupMembers(data.users || []);
          setIsCurrentUserAdmin(data.groupAdmin?._id === userData.data._id);
        } else if (data?.users) {
          const currentUserId = userData.data._id || userData.data.id;
          const recipient = data.users.find(user => user._id !== currentUserId);
          
          if (recipient) {
            console.log('👤 Found recipient:', recipient);
            setRecipientUserId(recipient._id);
            setRecipientName(recipient.name);
            return;
          }
        }
        
        if (/^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
          console.log('👤 Using chat_user_raw as recipient ID:', chat_user_raw);
          setRecipientUserId(chat_user_raw);
        } else {
          console.log('👤 chat_user_raw appears to be a name:', chat_user_raw);
          setRecipientName(chat_user_raw);
        }
        
      } catch (error) {
        console.error('👤 Failed to fetch chat details:', error);
        if (/^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
          setRecipientUserId(chat_user_raw);
        } else {
          setRecipientName(chat_user_raw);
        }
      }
    };

    fetchChatDetails();
  }, [chat_id, chat_user_raw, userData.data.token, userData.data._id]);

  // Handle dropdown toggle
  const handleDropdownToggle = () => {
    if (isGroupChat) {
      setShowDropdown(!showDropdown);
      setShowMemberActions(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowMemberActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // FIXED: Admin function: Remove user from group with proper error handling
  const handleRemoveUser = async (userIdToRemove, userName) => {
    try {
      const confirmRemove = window.confirm(`Are you sure you want to remove ${userName} from the group?`);
      if (!confirmRemove) return;

      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
          "Content-Type": "application/json",
        },
      };

      console.log('🔄 Removing user:', { userIdToRemove, userName });

      const response = await axios.post(
        "https://connect-server-1a2y.onrender.com/chat/removeUser",
        {
          chatId: chat_id,
          userId: userData.data._id,
          userIdToRemove: userIdToRemove
        },
        config
      );

      console.log('✅ Remove user response:', response.data);

      if (response.data && response.data.success) {
        alert(response.data.message || `${userName} has been removed from the group`);
        setShowMemberActions(null);
        // Socket will handle real-time updates
      } else {
        alert(response.data?.message || "Failed to remove user");
      }
    } catch (error) {
      console.error("❌ Error removing user:", error);
      const errorMessage = handleApiError(error);
      alert(errorMessage);
    }
  };

  // FIXED: Admin function: Transfer admin rights with proper error handling
  const handleTransferAdmin = async (newAdminId, newAdminName) => {
    try {
      const confirmTransfer = window.confirm(`Are you sure you want to make ${newAdminName} the group admin? You will lose admin privileges.`);
      if (!confirmTransfer) return;

      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
          "Content-Type": "application/json",
        },
      };

      console.log('🔄 Transferring admin:', { newAdminId, newAdminName });

      const response = await axios.post(
        "https://connect-server-1a2y.onrender.com/chat/changeAdmin",
        {
          chatId: chat_id,
          currentAdminId: userData.data._id,
          newAdminId: newAdminId
        },
        config
      );

      console.log('✅ Transfer admin response:', response.data);

      if (response.data && response.data.success) {
        alert(response.data.message || `${newAdminName} is now the group admin`);
        setShowMemberActions(null);
        // Socket will handle real-time updates
      } else {
        alert(response.data?.message || "Failed to transfer admin rights");
      }
    } catch (error) {
      console.error("❌ Error transferring admin:", error);
      const errorMessage = handleApiError(error);
      alert(errorMessage);
    }
  };

  // FIXED: Leave group function with proper error handling
  const handleLeaveGroup = async () => {
    try {
      const confirmLeave = window.confirm(
        `Are you sure you want to leave "${recipientName}"? You won't be able to see new messages from this group.`
      );
      
      if (!confirmLeave) {
        setShowDropdown(false);
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
          "Content-Type": "application/json",
        },
      };

      console.log('🔄 Leaving group:', chat_id);

      const response = await axios.post(
        "https://connect-server-1a2y.onrender.com/chat/groupExit",
        {
          chatId: chat_id,
          userId: userData.data._id
        },
        config
      );

      console.log('✅ Leave group response:', response.data);

      if (response.data && response.data.success) {
        setShowDropdown(false);
        setRefresh(!refresh);
        alert(response.data.message || "You have left the group successfully");
        // Socket will handle navigation
      } else {
        alert(response.data?.message || "Failed to leave group");
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("❌ Error leaving group:", error);
      const errorMessage = handleApiError(error);
      alert(errorMessage);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    console.log('👥 Checking online status...');
    console.log('👥 Online users:', onlineUsers);
    console.log('👥 Recipient user ID:', recipientUserId);
    console.log('👥 chat_user_raw:', chat_user_raw);
    
    if (recipientUserId && onlineUsers.includes(recipientUserId)) {
      console.log('👥 Recipient is ONLINE');
      setIsRecipientOnline(true);
    } else if (chat_user_raw && onlineUsers.includes(chat_user_raw)) {
      console.log('👥 Recipient is ONLINE (via chat_user_raw)');
      setIsRecipientOnline(true);
      if (!recipientUserId && /^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
        setRecipientUserId(chat_user_raw);
      }
    } else {
      console.log('👥 Recipient is OFFLINE');
      setIsRecipientOnline(false);
    }
  }, [onlineUsers, recipientUserId, chat_user_raw]);

  useEffect(() => {
    if (!socketRef.current) return;

    if (messageContent && !typing) {
      setTyping(true);
      socketRef.current.emit("typing", chat_id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (typing) {
        setTyping(false);
        socketRef.current.emit("stop typing", chat_id);
      }
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageContent, chat_id, typing]);

  const startCall = (callType) => {
    console.log('📞 ===== STARTING CALL =====');
    console.log('📞 Call type:', callType);
    console.log('📞 Socket connected:', socketRef.current?.connected);
    console.log('📞 Recipient user ID:', recipientUserId);
    console.log('📞 chat_user_raw:', chat_user_raw);
    console.log('📞 Recipient name:', recipientName);
    console.log('📞 Is recipient online:', isRecipientOnline);
    console.log('📞 Online users:', onlineUsers);
    console.log('📞 Current user ID:', userData.data._id || userData.data.id);
    console.log('📞 Current call interface state:', callInterface);
    
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('📞 Socket not connected');
      alert('Connection error. Please refresh and try again.');
      return;
    }
    
    let targetId = recipientUserId;
    if (!targetId && /^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
      targetId = chat_user_raw;
    }
    
    if (!targetId) {
      console.error('📞 No valid recipient ID found');
      alert('Cannot determine recipient ID. Please try refreshing the page.');
      return;
    }

    const currentUserId = userData.data._id || userData.data.id;
    if (targetId === currentUserId) {
      console.error('📞 Trying to call self');
      alert('Cannot call yourself');
      return;
    }

    if (!isRecipientOnline) {
      console.error('📞 Recipient not online');
      alert(`${recipientName || 'User'} is currently offline.`);
      return;
    }

    if (callInterface.isOpen) {
      console.error('📞 Already in call');
      alert('You are already in a call.');
      return;
    }

    console.log('📞 Opening call interface with target ID:', targetId);
    
    setCallInterface({
      isOpen: true,
      type: callType,
      isIncoming: false,
      callData: null,
    });
  };

  useEffect(() => {
    const fetchRecipientName = async () => {
      if (recipientName) return;
      
      const config = {
        headers: { Authorization: `Bearer ${userData.data.token}` },
      };

      try {
        console.log('👤 Fetching recipient name for chat:', chat_id);
        const { data } = await axios.get(
          `https://connect-server-1a2y.onrender.com/message/recipient/${chat_id}`,
          config
        );
        console.log('👤 Recipient name fetched:', data.recipientName);
        setRecipientName(data.recipientName);
      } catch (error) {
        console.error("👤 Failed to fetch recipient name:", error);
        if (!recipientName) {
          setRecipientName(chat_user_raw || 'Unknown User');
        }
      }
    };

    fetchRecipientName();
  }, [chat_id, chat_user_raw, userData.data.token, recipientName]);

  const renderMediaContent = (message) => {
    // Handle notification messages
    if (message.isNotification) {
      return <NotificationMessage message={message} />;
    }

    const { content, fileType } = message;
    const messageStyle = {
      maxWidth: "350px",
      padding: "10px",
      margin: "5px",
      borderRadius: "10px",
      backgroundColor: message.sender._id === userData.data._id ? "#dcf8c6" : "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    };

    const contentStyle = {
      maxWidth: "100%",
      borderRadius: "8px",
      marginBottom: "5px",
    };

    const senderNameStyle = {
      fontSize: "12px",
      fontWeight: "bold",
      color: "#666",
      marginBottom: "4px",
    };

    const getFileTypeFromUrl = (url) => {
      const extension = url.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
      if (["mp3", "wav", "webm"].includes(extension)) return "audio";
      if (["mp4", "webm", "ogg"].includes(extension)) return "video";
      return "other";
    };

    if (message.isFile) {
      const mediaType = fileType ? fileType.split("/")[0] : getFileTypeFromUrl(content);

      switch (mediaType) {
        case "image":
          return (
            <div style={messageStyle}>
              <img src={content} alt="Shared media" style={contentStyle} />
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>}
            </div>
          );
        case "audio":
          return (
            <div style={messageStyle}>
              <audio controls style={contentStyle}>
                <source src={content} type={fileType || "audio/webm"} />
                Your browser does not support the audio element.
              </audio>
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>}
            </div>
          );
        case "video":
          return (
            <div style={messageStyle}>
              <video controls style={contentStyle}>
                <source src={content} type={fileType || "video/mp4"} />
                Your browser does not support the video element.
              </video>
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>}
            </div>
          );
        default:
          return (
            <div style={messageStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AttachFileIcon />
                <div>
                  <div style={senderNameStyle}>{message.sender}</div>
                  <div style={{ wordBreak: "break-word" }}>{message.fileName || "Download file"}</div>
                  <a href={content} download style={{ color: "#007bff", textDecoration: "none" }}>
                    Download
                  </a>
                </div>
              </div>
            </div>
          );
      }
    }

    return message.sender._id === userData.data._id ? (
      <MessageSelf props={message} />
    ) : (
      <MessageOthers props={message} />
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        setFile(new File([audioBlob], "voice-message.webm", { type: "audio/webm" }));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please ensure microphone permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);

    try {
      setUploading(true);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setUploading(false);
      return response.data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      setUploading(false);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() && !file) return;

    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const receiverId = recipientName === userData.data.name ? chat_user_raw : userData.data._id;
      let messageData = { content: messageContent, chatId: chat_id, receiverId };

      if (file) {
        const cloudinaryUrl = await uploadToCloudinary(file);
        if (cloudinaryUrl) {
          messageData = {
            ...messageData,
            content: cloudinaryUrl,
            isFile: true,
            fileType: file.type,
            fileName: file.name,
          };
        }
      }

      const { data } = await axios.post(
        "https://connect-server-1a2y.onrender.com/message/",
        messageData,
        config
      );

      socketRef.current.emit("new message", {
        ...data,
        chatId: chat_id,
        chat: { _id: chat_id }
      });

      setAllMessages((prev) => {
        const messageExists = prev.some(msg => msg._id === data._id);
        if (messageExists) return prev;
        return [...prev, data];
      });

      setFile(null);
      setFilePreview(null);
      setMessageContent("");
      setAudioURL("");

      if (typing) {
        setTyping(false);
        socketRef.current.emit("stop typing", chat_id);
      }
    } catch (error) {
      console.error("Message send error:", error);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [allMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  useEffect(() => {
    const config = {
      headers: { Authorization: `Bearer ${userData.data.token}` },
    };

    axios
      .get(`https://connect-server-1a2y.onrender.com/message/${chat_id}`, config)
      .then(({ data }) => {
        setAllMessages(data);
        setLoaded(true);
      })
      .catch((error) => console.error("Error fetching messages:", error));
  }, [refresh, chat_id, userData.data.token]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  if (!loaded) {
    return (
      <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px" }} height={60} />
        <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px", flexGrow: "1" }} />
        <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px" }} height={60} />
      </div>
    );
  };

  const handleCallInterfaceClose = () => {
    console.log('📞 Call interface closing - performing cleanup');
    resetCallInterface();
    
    setTimeout(() => {
      if (socketRef.current && socketRef.current.connected) {
        console.log('📞 Re-setting up call listeners for next call');
        callListenersSetup.current = false;
        setupCallListeners();
      }
    }, 1000);
  };

  return (
    <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
      <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <p 
            className={"con-icon" + (lightTheme ? "" : " dark")}
            onClick={handleDropdownToggle}
            style={{ cursor: isGroupChat ? 'pointer' : 'default' }}
          >
            {recipientName[0]}
          </p>
          
          {/* Group Dropdown positioned below con-icon */}
          {isGroupChat && showDropdown && (
            <div 
              ref={dropdownRef}
              className={"group-dropdown" + (lightTheme ? "" : " dark")}
              style={{
                position: 'absolute',
                top: '55px',
                left: '0',
                width: '280px',
                backgroundColor: lightTheme ? 'white' : '#2a2d47',
                border: `1px solid ${lightTheme ? '#ddd' : '#444'}`,
                borderRadius: '15px',
                boxShadow: 'rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px',
                zIndex: 1000,
                maxHeight: '350px',
                overflowY: 'auto',
                animation: 'dropdownSlide 0.2s ease-out'
              }}
            >
              <div style={{ 
                padding: '10px 15px', 
                borderBottom: `1px solid ${lightTheme ? '#eee' : '#444'}`,
                fontWeight: 'bold',
                fontSize: '14px',
                color: lightTheme ? '#333' : 'lightgray',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Group Members ({groupMembers.length})</span>
                {isCurrentUserAdmin && (
                  <AdminPanelSettingsIcon style={{ color: '#ff9800', fontSize: '18px' }} />
                )}
              </div>
              
              {groupMembers.map((member) => (
                <div 
                  key={member._id}
                  style={{
                    padding: '8px 15px',
                    borderBottom: `1px solid ${lightTheme ? '#f5f5f5' : '#444'}`,
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <PersonIcon style={{ color: '#666', fontSize: '16px' }} />
                    <span style={{ 
                      fontSize: '13px', 
                      flex: 1,
                      color: lightTheme ? '#333' : 'lightgray'
                    }}>
                      {member.name}
                      {member._id === userData.data._id && (
                        <span style={{ color: 'darkorchid', fontWeight: '500' }}> (You)</span>
                      )}
                    </span>
                    
                    {currentChat?.groupAdmin?._id === member._id && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#ff9800', 
                        fontWeight: '500',
                        backgroundColor: lightTheme ? '#fff3e0' : 'rgba(255, 152, 0, 0.2)',
                        padding: '2px 5px',
                        borderRadius: '8px'
                      }}>
                        Admin
                      </span>
                    )}
                    
                    {/* Admin Actions */}
                    {isCurrentUserAdmin && member._id !== userData.data._id && (
                      <div style={{ position: 'relative' }}>
                        <MoreVertIcon 
                          style={{ 
                            fontSize: '16px', 
                            color: '#666', 
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                          onClick={() => setShowMemberActions(
                            showMemberActions === member._id ? null : member._id
                          )}
                        />
                        
                        {showMemberActions === member._id && (
                          <div style={{
                            position: 'absolute',
                            right: '0',
                            top: '20px',
                            backgroundColor: lightTheme ? 'white' : '#2a2d47',
                            border: `1px solid ${lightTheme ? '#ddd' : '#444'}`,
                            borderRadius: '8px',
                            minWidth: '120px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            zIndex: 1001
                          }}>
                            <div 
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#2196f3',
                                borderBottom: `1px solid ${lightTheme ? '#eee' : '#444'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onClick={() => handleTransferAdmin(member._id, member.name)}
                            >
                              <AdminPanelSettingsIcon style={{ fontSize: '14px' }} />
                              Make Admin
                            </div>
                            <div 
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#d32f2f',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onClick={() => handleRemoveUser(member._id, member.name)}
                            >
                              <PersonRemoveIcon style={{ fontSize: '14px' }} />
                              Remove
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Admin actions section */}
              {isCurrentUserAdmin && (
                <div style={{
                  padding: '8px 15px',
                  borderBottom: `1px solid ${lightTheme ? '#eee' : '#444'}`,
                  backgroundColor: lightTheme ? '#f8f9fa' : 'rgba(255,255,255,0.05)'
                }}>
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      color: '#2196f3',
                      fontSize: '13px',
                      fontWeight: '500',
                      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                      padding: '4px 0'
                    }}
                    onClick={() => {
                      alert('this functionality is yet to be implemented');
                    }}
                  >
                    <PersonAddIcon style={{ fontSize: '16px' }} />
                    <span>Add Members</span>
                  </div>
                </div>
              )}
              
              {/* Leave Group option */}
              <div 
                style={{
                  padding: '10px 15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  backgroundColor: lightTheme ? '#fff5f5' : 'rgba(211, 47, 47, 0.1)',
                  color: '#d32f2f',
                  borderTop: `1px solid ${lightTheme ? '#eee' : '#444'}`,
                  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  borderRadius: '0 0 15px 15px'
                }}
                onClick={handleLeaveGroup}
              >
                <ExitToAppIcon style={{ fontSize: '16px' }} />
                <span>Leave Group</span>
              </div>
            </div>
          )}
        </div>
        
        <div className={"header-text" + (lightTheme ? "" : " dark")}>
          <p className={"con-title" + (lightTheme ? "" : " dark")}>
            {recipientName}
          </p>
          
          {!isGroupChat && (
            <small style={{ 
              color: isRecipientOnline ? '#4caf50' : '#999', 
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isRecipientOnline ? '#4caf50' : '#999',
                display: 'inline-block'
              }}></span>
              {isRecipientOnline ? 'Online' : 'Offline'}
            </small>
          )}
        </div>
        
        {/* Keep calling functionality for all chats */}
        <CallIcon
          sx={{ 
            color: (!isGroupChat && isRecipientOnline) ? "darkorchid" : "#ccc",
            cursor: (!isGroupChat && isRecipientOnline) ? "pointer" : "not-allowed"
          }}
          className={"icon" + (lightTheme ? "" : " dark")}
          onClick={() => {
            console.log('📞 Audio call button clicked');
            if (!isGroupChat && isRecipientOnline) {
              startCall("audio");
            }
          }}
          title={!isGroupChat ? (isRecipientOnline ? "Audio Call" : "User is offline") : "Calling not available in groups"}
        />
        <VideocamIcon
          sx={{ 
            color: (!isGroupChat && isRecipientOnline) ? "darkorchid" : "#ccc",
            cursor: (!isGroupChat && isRecipientOnline) ? "pointer" : "not-allowed"
          }}
          className={"icon" + (lightTheme ? "" : " dark")}
          onClick={() => {
            console.log('📞 Video call button clicked');
            if (!isGroupChat && isRecipientOnline) {
              startCall("video");
            }
          }}
          title={!isGroupChat ? (isRecipientOnline ? "Video Call" : "User is offline") : "Calling not available in groups"}
        />
        
        <IconButton>
          <DeleteIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
        </IconButton>
      </div>

      <div
        className={"messages-container" + (lightTheme ? "" : " dark")}
        style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}
      >
        {isRecipientTyping && (
          <div className="typing-indicator" style={{ padding: "5px 10px", color: "#666" }}>
            {recipientName} is typing...
          </div>
        )}
         <div ref={chatContainerRef} style={{ overflowY: "auto", scrollbarWidth: "thin",scrollbarColor: "transparent transparent", height: "100%" }}>
      {allMessages.map((message, index) => (
        <div key={index}>{renderMediaContent(message)}</div>
      ))}
    </div>
        <div ref={messagesEndRef} />
      </div>

      {(filePreview || audioURL) && (
        <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
          {file?.type.startsWith("image/") ? (
            <img src={filePreview} alt="Preview" style={{ maxWidth: "100px" }} />
          ) : audioURL ? (
            <audio controls src={audioURL} style={{ maxWidth: "200px" }} />
          ) : (
            <span>{file?.name}</span>
          )}
          <IconButton
            onClick={() => {
              setFile(null);
              setFilePreview(null);
              setAudioURL("");
            }}
          >
            ❌
          </IconButton>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
        <input
          placeholder="Type a Message"
          style={{ flexGrow: 1, padding: "10px", borderRadius: "20px" }}
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(event) => event.code === "Enter" && sendMessage()}
        />
        <IconButton onClick={sendMessage} disabled={uploading}>
          {uploading ? (
            <CloudUploadIcon sx={{ color: "darkorchid" }} />
          ) : (
            <SendIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
          )}
        </IconButton>
        <IconButton onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? (
            <StopIcon style={{ color: "red" }} className={"icon" + (lightTheme ? "" : " dark")} />
          ) : (
            <MicIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
          )}
        </IconButton>
        <IconButton component="label">
          <AttachFileIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
          <input type="file" hidden onChange={handleFileChange} />
        </IconButton>
      </div>

      <CallInterface
        isOpen={callInterface.isOpen}
        onClose={handleCallInterfaceClose}
        recipientId={
          callInterface.isIncoming 
            ? callInterface.callData?.from 
            : recipientUserId || ((/^[0-9a-fA-F]{24}$/.test(chat_user_raw)) ? chat_user_raw : null)
        }
        recipientName={
          callInterface.isIncoming 
            ? callInterface.callData?.fromName || 'Unknown User' 
            : recipientName
        }
        isIncoming={callInterface.isIncoming}
        initialCallType={callInterface.type}
        callData={callInterface.callData}
        socket={socketRef.current}
      />
    </div>
  );
}

export default ChatArea;