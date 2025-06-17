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
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
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

// Error Popup Component
function ErrorPopup({
  isOpen,
  onClose,
  title,
  message,
  type = "error", // 'error', 'success', 'warning', 'info'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <CheckCircleIcon style={{ color: "#4caf50", fontSize: "24px" }} />
        );
      case "warning":
        return <WarningIcon style={{ color: "#ff9800", fontSize: "24px" }} />;
      case "info":
        return <InfoIcon style={{ color: "#2196f3", fontSize: "24px" }} />;
      default:
        return <ErrorIcon style={{ color: "#f44336", fontSize: "24px" }} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return { bg: "#e8f5e8", border: "#4caf50", text: "#2e7d32" };
      case "warning":
        return { bg: "#fff3e0", border: "#ff9800", text: "#e65100" };
      case "info":
        return { bg: "#e3f2fd", border: "#2196f3", text: "#1565c0" };
      default:
        return { bg: "#ffebee", border: "#f44336", text: "#c62828" };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        animation: "fadeIn 0.3s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          padding: "20px",
          margin: "20px",
          maxWidth: "400px",
          width: "90%",
          boxShadow:
            "rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px",
          animation: "slideIn 0.3s ease-out",
          border: `2px solid ${colors.border}`,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "15px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {getIcon()}
            <h3
              style={{
                margin: 0,
                color: colors.text,
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              {title}
            </h3>
          </div>
          <IconButton
            onClick={onClose}
            style={{
              color: "#666",
              padding: "4px",
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>

        <div
          style={{
            backgroundColor: colors.bg,
            padding: "15px",
            borderRadius: "10px",
            border: `1px solid ${colors.border}`,
            marginBottom: "15px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: colors.text,
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {message}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "darkorchid",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#8a2be2")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "darkorchid")}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const dropdownRef = useRef(null);

  // Popup state
  const [popup, setPopup] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

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

  // Socket.IO connection for real-time messaging
  useEffect(() => {
    console.log("🔌 Setting up socket connection...");
    console.log("🔌 User data:", userData.data);

    socketRef.current = io("http://localhost:5000", {
      auth: { token: userData.data.token },
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("🔌 Socket connected:", socketRef.current.id);
      console.log("🔌 Current user ID:", userData.data._id || userData.data.id);
      socketRef.current.emit("setup", userData.data);
      socketRef.current.emit("join chat", chat_id);

      callListenersSetup.current = false;
      setupCallListeners();
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
    });

    socketRef.current.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      callListenersSetup.current = false;
    });

    setupBasicListeners();

    return () => {
      console.log("🔌 Cleaning up socket connection");
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

    socketRef.current.on("message received", (newMessage) => {
      console.log("💬 Message received:", newMessage);
      const messageChatId = newMessage.chat?._id || newMessage.chatId;
      const messageSenderId = newMessage.sender?._id || newMessage.sender;

      if (messageChatId === chat_id && messageSenderId !== userData.data._id) {
        setAllMessages((prev) => {
          const messageExists = prev.some((msg) => msg._id === newMessage._id);
          if (messageExists) return prev;
          return [...prev, newMessage];
        });
      }
    });

    // Handle notification messages
    socketRef.current.on("notification received", (data) => {
      console.log("🔔 Notification received:", data);
      const { message, chatId } = data;

      if (chatId === chat_id) {
        setAllMessages((prev) => {
          const messageExists = prev.some((msg) => msg._id === message._id);
          if (messageExists) return prev;
          return [...prev, message];
        });
      }
    });

    // Handle user leaving group
    socketRef.current.on("user left group", (data) => {
      console.log("👋 User left group:", data);
      const { chatId, userId, userName, updatedChat } = data;

      if (chatId === chat_id) {
        // Update group members if this is the current chat
        if (isGroupChat && updatedChat) {
          setGroupMembers(updatedChat.users || []);
        }

        // If current user left, they should be redirected (handled in handleLeaveGroup)
        if (userId === userData.data._id) {
          console.log("Current user left group, should redirect");
        }
      }
    });

    socketRef.current.on("online users", (users) => {
      console.log("👥 Online users received:", users);
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socketRef.current.on("user online", (data) => {
      console.log("👤 User online:", data);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers);
      }
    });

    socketRef.current.on("user offline", (data) => {
      console.log("👤 User offline:", data);
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

    console.log("📞 Setting up call listeners...");
    callListenersSetup.current = true;

    socketRef.current.on("incoming-call", (callData) => {
      console.log("📞 ===== INCOMING CALL =====");
      console.log("📞 Call data:", callData);
      console.log("📞 From:", callData.from, callData.fromName);
      console.log("📞 Current user ID:", userData.data._id || userData.data.id);
      console.log(
        "📞 Current call interface state:",
        callInterfaceRef.current.isOpen
      );

      if (callData.from === (userData.data._id || userData.data.id)) {
        console.log("📞 Ignoring call from self");
        return;
      }

      if (callInterfaceRef.current.isOpen) {
        console.log("📞 Already in call, rejecting");
        socketRef.current.emit("reject-call", {
          to: callData.from,
          from: userData.data._id || userData.data.id,
          callId: callData.callId,
          reason: "busy",
        });
        return;
      }

      console.log("📞 Showing incoming call interface");
      setCallInterface({
        isOpen: true,
        type: callData.isVideo ? "video" : "audio",
        isIncoming: true,
        callData: callData,
      });
    });

    socketRef.current.on("call-user-offline", (data) => {
      console.log("📞 Call user offline:", data);
      setPopup({
        isOpen: true,
        type: "warning",
        title: "User Offline",
        message: `${data.targetName || "User"} is currently offline.`,
      });
      resetCallInterface();
    });

    socketRef.current.on("call-failed", (data) => {
      console.log("📞 Call failed:", data);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Call Failed",
        message: `Call failed: ${data.message || "Unknown error"}`,
      });
      resetCallInterface();
    });

    socketRef.current.on("call-sent", (data) => {
      console.log("📞 Call sent confirmation:", data);
    });

    socketRef.current.onAny((eventName, ...args) => {
      if (eventName.includes("call") || eventName.includes("webrtc")) {
        console.log(`🔍 Call-related event: ${eventName}`, args);
      }
    });
  };

  const resetCallInterface = () => {
    console.log("📞 Resetting call interface");
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

        console.log("👤 Fetching chat details for chat_id:", chat_id);
        const { data } = await axios.get(
          `http://localhost:5000/chat/${chat_id}`,
          config
        );
        console.log("👤 Chat data received:", data);

        setCurrentChat(data);
        setIsGroupChat(data.isGroupChat || false);

        if (data.isGroupChat) {
          setRecipientName(data.chatName);
          setGroupMembers(data.users || []);
        } else if (data?.users) {
          const currentUserId = userData.data._id || userData.data.id;
          const recipient = data.users.find(
            (user) => user._id !== currentUserId
          );

          if (recipient) {
            console.log("👤 Found recipient:", recipient);
            setRecipientUserId(recipient._id);
            setRecipientName(recipient.name);
            return;
          }
        }

        if (/^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
          console.log("👤 Using chat_user_raw as recipient ID:", chat_user_raw);
          setRecipientUserId(chat_user_raw);
        } else {
          console.log("👤 chat_user_raw appears to be a name:", chat_user_raw);
          setRecipientName(chat_user_raw);
        }
      } catch (error) {
        console.error("👤 Failed to fetch chat details:", error);
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
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close popup function
  const closePopup = () => {
    setPopup({
      isOpen: false,
      type: "error",
      title: "",
      message: "",
    });
  };

  // Leave group function
  const handleLeaveGroup = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userData.data.token}`,
          "Content-Type": "application/json",
        },
      };

      // Show confirmation dialog
      const confirmLeave = window.confirm(
        `Are you sure you want to leave "${recipientName}"? You won't be able to see new messages from this group.`
      );

      if (!confirmLeave) {
        setShowDropdown(false);
        return;
      }

      // Call the updated leave group API
      const response = await axios.post(
        "http://localhost:5000/chat/groupExit",
        {
          chatId: chat_id,
          userId: userData.data._id,
        },
        config
      );

      if (response.data && response.data.success) {
        console.log("✅ Successfully left group:", response.data);

        // Close dropdown
        setShowDropdown(false);

        // Refresh sidebar to remove the group from list
        setRefresh(!refresh);

        // Show success popup
        setPopup({
          isOpen: true,
          type: "success",
          title: "Success!",
          message: "You have left the group successfully.",
        });

        // Navigate back to welcome page after popup
        setTimeout(() => {
          navigate("/app/welcome");
        }, 1500);
      }
    } catch (error) {
      console.error("❌ Error leaving group:", error);

      // Close dropdown on error
      setShowDropdown(false);

      // More specific error handling with popup
      let errorTitle = "Error";
      let errorMessage = "Failed to leave group. Please try again.";

      if (error.response?.status === 404) {
        errorTitle = "Group Not Found";
        errorMessage = "This group no longer exists or has been deleted.";
      } else if (error.response?.status === 403) {
        errorTitle = "Permission Denied";
        errorMessage = "You don't have permission to leave this group.";
      } else if (error.response?.data?.message) {
        errorTitle = "Failed to Leave Group";
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Network Error")) {
        errorTitle = "Connection Error";
        errorMessage = "Please check your internet connection and try again.";
      }

      setPopup({
        isOpen: true,
        type: "error",
        title: errorTitle,
        message: errorMessage,
      });
    }
  };

  useEffect(() => {
    console.log("👥 Checking online status...");
    console.log("👥 Online users:", onlineUsers);
    console.log("👥 Recipient user ID:", recipientUserId);
    console.log("👥 chat_user_raw:", chat_user_raw);

    if (recipientUserId && onlineUsers.includes(recipientUserId)) {
      console.log("👥 Recipient is ONLINE");
      setIsRecipientOnline(true);
    } else if (chat_user_raw && onlineUsers.includes(chat_user_raw)) {
      console.log("👥 Recipient is ONLINE (via chat_user_raw)");
      setIsRecipientOnline(true);
      if (!recipientUserId && /^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
        setRecipientUserId(chat_user_raw);
      }
    } else {
      console.log("👥 Recipient is OFFLINE");
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
    console.log("📞 ===== STARTING CALL =====");
    console.log("📞 Call type:", callType);
    console.log("📞 Socket connected:", socketRef.current?.connected);
    console.log("📞 Recipient user ID:", recipientUserId);
    console.log("📞 chat_user_raw:", chat_user_raw);
    console.log("📞 Recipient name:", recipientName);
    console.log("📞 Is recipient online:", isRecipientOnline);
    console.log("📞 Online users:", onlineUsers);
    console.log("📞 Current user ID:", userData.data._id || userData.data.id);
    console.log("📞 Current call interface state:", callInterface);

    if (!socketRef.current || !socketRef.current.connected) {
      console.error("📞 Socket not connected");
      setPopup({
        isOpen: true,
        type: "error",
        title: "Connection Error",
        message: "Connection error. Please refresh and try again.",
      });
      return;
    }

    let targetId = recipientUserId;
    if (!targetId && /^[0-9a-fA-F]{24}$/.test(chat_user_raw)) {
      targetId = chat_user_raw;
    }

    if (!targetId) {
      console.error("📞 No valid recipient ID found");
      setPopup({
        isOpen: true,
        type: "error",
        title: "Cannot Start Call",
        message:
          "Cannot determine recipient ID. Please try refreshing the page.",
      });
      return;
    }

    const currentUserId = userData.data._id || userData.data.id;
    if (targetId === currentUserId) {
      console.error("📞 Trying to call self");
      setPopup({
        isOpen: true,
        type: "warning",
        title: "Invalid Call",
        message: "Cannot call yourself",
      });
      return;
    }

    if (!isRecipientOnline) {
      console.error("📞 Recipient not online");
      setPopup({
        isOpen: true,
        type: "warning",
        title: "User Offline",
        message: `${recipientName || "User"} is currently offline.`,
      });
      return;
    }

    if (callInterface.isOpen) {
      console.error("📞 Already in call");
      setPopup({
        isOpen: true,
        type: "warning",
        title: "Call in Progress",
        message: "You are already in a call.",
      });
      return;
    }

    console.log("📞 Opening call interface with target ID:", targetId);

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
        console.log("👤 Fetching recipient name for chat:", chat_id);
        const { data } = await axios.get(
          `http://localhost:5000/message/recipient/${chat_id}`,
          config
        );
        console.log("👤 Recipient name fetched:", data.recipientName);
        setRecipientName(data.recipientName);
      } catch (error) {
        console.error("👤 Failed to fetch recipient name:", error);
        if (!recipientName) {
          setRecipientName(chat_user_raw || "Unknown User");
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
      backgroundColor:
        message.sender._id === userData.data._id ? "#dcf8c6" : "#fff",
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
      const mediaType = fileType
        ? fileType.split("/")[0]
        : getFileTypeFromUrl(content);

      switch (mediaType) {
        case "image":
          return (
            <div style={messageStyle}>
              <img src={content} alt="Shared media" style={contentStyle} />
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {message.fileName}
                </div>
              )}
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
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {message.fileName}
                </div>
              )}
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
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {message.fileName}
                </div>
              )}
            </div>
          );
        default:
          return (
            <div style={messageStyle}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <AttachFileIcon />
                <div>
                  <div style={senderNameStyle}>{message.sender}</div>
                  <div style={{ wordBreak: "break-word" }}>
                    {message.fileName || "Download file"}
                  </div>
                  <a
                    href={content}
                    download
                    style={{ color: "#007bff", textDecoration: "none" }}
                  >
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        setFile(
          new File([audioBlob], "voice-message.webm", { type: "audio/webm" })
        );
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Microphone Error",
        message:
          "Error accessing microphone. Please ensure microphone permissions are granted.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    );
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
      const receiverId =
        recipientName === userData.data.name
          ? chat_user_raw
          : userData.data._id;
      let messageData = {
        content: messageContent,
        chatId: chat_id,
        receiverId,
      };

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
        "http://localhost:5000/message/",
        messageData,
        config
      );

      socketRef.current.emit("new message", {
        ...data,
        chatId: chat_id,
        chat: { _id: chat_id },
      });

      setAllMessages((prev) => {
        const messageExists = prev.some((msg) => msg._id === data._id);
        if (messageExists) return prev;
        return [...prev, data];
      });

      setFile(null);
      setFilePreview(null);
      setMessageContent("");
      setAudioURL("");

      // ✅ ADD THIS: Trigger sidebar refresh
      setRefresh(!refresh);

      if (typing) {
        setTyping(false);
        socketRef.current.emit("stop typing", chat_id);
      }
    } catch (error) {
      console.error("Message send error:", error);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Send Failed",
        message: "Failed to send message. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
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
      .get(`http://localhost:5000/message/${chat_id}`, config)
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
      <div
        style={{
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px", flexGrow: "1" }}
        />
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
      </div>
    );
  }

  const handleCallInterfaceClose = () => {
    console.log("📞 Call interface closing - performing cleanup");
    resetCallInterface();

    setTimeout(() => {
      if (socketRef.current && socketRef.current.connected) {
        console.log("📞 Re-setting up call listeners for next call");
        callListenersSetup.current = false;
        setupCallListeners();
      }
    }, 1000);
  };

  return (
    <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
      <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <p
            className={"con-icon" + (lightTheme ? "" : " dark")}
            onClick={handleDropdownToggle}
            style={{ cursor: isGroupChat ? "pointer" : "default" }}
          >
            {recipientName[0]}
          </p>

          {/* Group Dropdown positioned below con-icon */}
          {isGroupChat && showDropdown && (
            <div
              ref={dropdownRef}
              className={"group-dropdown" + (lightTheme ? "" : " dark")}
              style={{
                position: "absolute",
                top: "55px", 
                left: "0",
                width: "220px",
                backgroundColor: lightTheme ? "white" : "#2a2d47",
                border: `1px solid ${lightTheme ? "#ddd" : "#444"}`,
                borderRadius: "0px",
                boxShadow:
                  "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px",
                zIndex: 1000,
                maxHeight: "280px",
                overflowY: "auto",
                animation: "dropdownSlide 0.2s ease-out",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: `2px solid ${lightTheme ? "#eee" : "#444"}`,
                  fontWeight: "bold",
                  fontSize: "13px",
                  color: lightTheme ? "#333" : "lightgray",
                  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                }}
              >
                Group Members ({groupMembers.length})
              </div>

              {groupMembers.map((member) => (
                <div
                  key={member._id}
                  style={{
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderBottom: `2px solid ${
                      lightTheme ? "#f5f5f5" : "#444"
                    }`,
                    fontFamily:
                      '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                  }}
                >
                  <PersonIcon style={{ color: "#666", fontSize: "16px" }} />
                  <span
                    style={{
                      fontSize: "13px",
                      flex: 1,
                      color: lightTheme ? "#333" : "lightgray",
                    }}
                  >
                    {member.name}
                    {member._id === userData.data._id && (
                      <span style={{ color: "darkorchid", fontWeight: "500" }}>
                        {" "}
                        (You)
                      </span>
                    )}
                  </span>
                  {currentChat?.groupAdmin?._id === member._id && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#ff9800",
                        fontWeight: "500",
                        backgroundColor: lightTheme
                          ? "#fff3e0"
                          : "rgba(255, 152, 0, 0.2)",
                        padding: "2px 5px",
                        borderRadius: "8px",
                      }}
                    >
                      Admin
                    </span>
                  )}
                </div>
              ))}

              <div
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  backgroundColor: lightTheme
                    ? "#fff5f5"
                    : "rgba(211, 47, 47, 0.1)",
                  color: "#d32f2f",
                  borderTop: `1px solid ${lightTheme ? "#eee" : "#444"}`,
                  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                  fontSize: "13px",
                  fontWeight: "500",
                  borderRadius: "0 0 15px 15px",
                }}
                onClick={handleLeaveGroup}
              >
                <ExitToAppIcon style={{ fontSize: "16px" }} />
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
            <small
              style={{
                color: isRecipientOnline ? "#4caf50" : "#999",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: isRecipientOnline ? "#4caf50" : "#999",
                  display: "inline-block",
                }}
              ></span>
              {isRecipientOnline ? "Online" : "Offline"}
            </small>
          )}
        </div>

        {/* Keep calling functionality for all chats */}
        <CallIcon
          sx={{
            color: !isGroupChat && isRecipientOnline ? "darkorchid" : "#ccc",
            cursor:
              !isGroupChat && isRecipientOnline ? "pointer" : "not-allowed",
          }}
          className={"icon" + (lightTheme ? "" : " dark")}
          onClick={() => {
            console.log("📞 Audio call button clicked");
            if (!isGroupChat && isRecipientOnline) {
              startCall("audio");
            }
          }}
          title={
            !isGroupChat
              ? isRecipientOnline
                ? "Audio Call"
                : "User is offline"
              : "Calling not available in groups"
          }
        />
        <VideocamIcon
          sx={{
            color: !isGroupChat && isRecipientOnline ? "darkorchid" : "#ccc",
            cursor:
              !isGroupChat && isRecipientOnline ? "pointer" : "not-allowed",
          }}
          className={"icon" + (lightTheme ? "" : " dark")}
          onClick={() => {
            console.log("📞 Video call button clicked");
            if (!isGroupChat && isRecipientOnline) {
              startCall("video");
            }
          }}
          title={
            !isGroupChat
              ? isRecipientOnline
                ? "Video Call"
                : "User is offline"
              : "Calling not available in groups"
          }
        />

        <IconButton>
          <DeleteIcon
            sx={{ color: "darkorchid" }}
            className={"icon" + (lightTheme ? "" : " dark")}
          />
        </IconButton>
      </div>

      <div
        className={"messages-container" + (lightTheme ? "" : " dark")}
        style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}
      >
        {isRecipientTyping && (
          <div
            className="typing-indicator"
            style={{ padding: "5px 10px", color: "#666" }}
          >
            {recipientName} is typing...
          </div>
        )}
        <div
          ref={chatContainerRef}
          style={{
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "transparent transparent",
            height: "100%",
          }}
        >
          {allMessages.map((message, index) => (
            <div key={index}>{renderMediaContent(message)}</div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {(filePreview || audioURL) && (
        <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
          {file?.type.startsWith("image/") ? (
            <img
              src={filePreview}
              alt="Preview"
              style={{ maxWidth: "100px" }}
            />
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
            <SendIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          )}
        </IconButton>
        <IconButton onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? (
            <StopIcon
              style={{ color: "red" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          ) : (
            <MicIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          )}
        </IconButton>
        <IconButton component="label">
          <AttachFileIcon
            sx={{ color: "darkorchid" }}
            className={"icon" + (lightTheme ? "" : " dark")}
          />
          <input type="file" hidden onChange={handleFileChange} />
        </IconButton>
      </div>

      <CallInterface
        isOpen={callInterface.isOpen}
        onClose={handleCallInterfaceClose}
        recipientId={
          callInterface.isIncoming
            ? callInterface.callData?.from
            : recipientUserId ||
              (/^[0-9a-fA-F]{24}$/.test(chat_user_raw) ? chat_user_raw : null)
        }
        recipientName={
          callInterface.isIncoming
            ? callInterface.callData?.fromName || "Unknown User"
            : recipientName
        }
        isIncoming={callInterface.isIncoming}
        initialCallType={callInterface.type}
        callData={callInterface.callData}
        socket={socketRef.current}
      />

      {/* Error/Success Popup */}
      <ErrorPopup
        isOpen={popup.isOpen}
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}

export default ChatArea;
