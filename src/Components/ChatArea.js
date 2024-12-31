import React, { useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MicIcon from "@mui/icons-material/Mic";
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import StopIcon from "@mui/icons-material/Stop";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import MessageSelf from "./MessageSelf";
import MessageOthers from "./MessageOthers";
import { Phone, Video } from 'lucide-react';
import CallInterface from "./Call";

function ChatArea() {
  const [messageContent, setMessageContent] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const lightTheme = useSelector((state) => state.themeKey);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const dyParams = useParams();
  const [chat_id, chat_user_raw] = dyParams._id.split("&");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setLoaded] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [callInterface, setCallInterface] = useState({
    isOpen: false,
    type: null
  });

  const startCall = (callType) => {
    setCallInterface({
      isOpen: true,
      type: callType
    });
  };

  // Function to render media content based on file type
  const renderMediaContent = (message) => {
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
      marginBottom: "4px"
    };

    // Helper function to detect file type from URL
    const getFileTypeFromUrl = (url) => {
      const extension = url.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
      if (['mp3', 'wav', 'webm'].includes(extension)) return 'audio';
      if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
      return 'other';
    };

    if (message.isFile) {
      const mediaType = fileType ? fileType.split('/')[0] : getFileTypeFromUrl(content);

      switch (mediaType) {
        case 'image':
          return (
            <div style={messageStyle}>
              <img
                src={content}
                alt="Shared media"
                style={contentStyle}
              />
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>
              )}
            </div>
          );

        case 'audio':
          return (
            <div style={messageStyle}>
              <audio controls style={contentStyle}>
                <source src={content} type={fileType || 'audio/webm'} />
                Your browser does not support the audio element.
              </audio>
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>
              )}
            </div>
          );

        case 'video':
          return (
            <div style={messageStyle}>
              <video controls style={contentStyle}>
                <source src={content} type={fileType || 'video/mp4'} />
                Your browser does not support the video element.
              </video>
              <div style={senderNameStyle}>{message.sender}</div>
              {message.fileName && (
                <div style={{ fontSize: "12px", color: "#666" }}>{message.fileName}</div>
              )}
            </div>
          );

        default:
          return (
            <div style={messageStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AttachFileIcon />
                <div>
                <div style={senderNameStyle}>{message.sender}</div>
                  <div style={{ wordBreak: "break-word" }}>{message.fileName || 'Download file'}</div>
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

    // Return text message if not a file
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
    formData.append("resource_type", file.type.startsWith("audio") ? "video" : "auto");

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
            isVoiceMessage: file.type.startsWith("audio"),
          };
        }
      }

      await axios.post("https://connect-server-1a2y.onrender.com/message/", messageData, config);

      setFile(null);
      setFilePreview(null);
      setMessageContent("");
      setAudioURL("");
      setRefresh(!refresh);
    } catch (error) {
      console.error("Message send error:", error);
    }
  };

  useEffect(() => {
    const fetchRecipientName = async () => {
      const config = {
        headers: { Authorization: `Bearer ${userData.data.token}` },
      };
      try {
        const { data } = await axios.get(
          `https://connect-server-1a2y.onrender.com//message/recipient/${chat_id}`,
          config
        );
        setRecipientName(data.recipientName);
      } catch (error) {
        console.error("Failed to fetch recipient name:", error);
        setRecipientName(chat_user_raw);
      }
    };

    if (chat_user_raw === userData.data.name) {
      fetchRecipientName();
    } else {
      setRecipientName(chat_user_raw);
    }
  }, [chat_id, chat_user_raw, userData.data.token, userData.data.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  useEffect(() => {
    const config = {
      headers: { Authorization: `Bearer ${userData.data.token}` },
    };

    axios
      .get(`https://connect-server-1a2y.onrender.com//message/${chat_id}`, config)
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
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
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
  }

  return (
    <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
      <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
        <p className={"con-icon" + (lightTheme ? "" : " dark")}>{recipientName[0]}</p>
        <div className={"header-text" + (lightTheme ? "" : " dark")}>
          <p className={"con-title" + (lightTheme ? "" : " dark")}>{recipientName}</p>
          <p className={"con-timestamp" + (lightTheme ? "" : " dark")}></p>
        </div>
            <CallIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} 
            onClick={() => startCall('audio')}
            />

            <VideocamIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} 
             onClick={() => startCall('video')}/>
         
        <IconButton>
          <DeleteIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
        </IconButton>
      </div>

      <div
        className={"messages-container" + (lightTheme ? "" : " dark")}
        style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}
      >
        {allMessages.slice(0).reverse().map((message, index) => (
          <div key={index}>
            {renderMediaContent(message)}
          </div>
        ))}
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
          {uploading ? <CloudUploadIcon sx={{ color: "darkorchid" }}  /> : <SendIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />}
        </IconButton>
        <IconButton onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <StopIcon style={{ color: "red" }} className={"icon" + (lightTheme ? "" : " dark")} /> : <MicIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />}
        </IconButton>
        <IconButton component="label">
          <AttachFileIcon sx={{ color: "darkorchid" }} className={"icon" + (lightTheme ? "" : " dark")} />
          <input type="file" hidden onChange={handleFileChange} />
        </IconButton>
      </div>

      <CallInterface
        isOpen={callInterface.isOpen}
        onClose={() => setCallInterface({ isOpen: false, type: null })}
        recipientId={chat_user_raw}
        recipientName={recipientName}
        initialCallType={callInterface.type}
      />
    </div>
  );
}

export default ChatArea;