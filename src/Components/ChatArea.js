import React, { useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import MessageSelf from "./MessageSelf";
import MessageOthers from "./MessageOthers";

function ChatArea() {
  // Existing states
  const [messageContent, setMessageContent] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const lightTheme = useSelector((state) => state.themeKey);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Existing refs and params
  const messagesEndRef = useRef(null);
  const dyParams = useParams();
  const [chat_id, chat_user_raw] = dyParams._id.split("&");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setLoaded] = useState(false);
  const [recipientName, setRecipientName] = useState("");

  // Voice recording functions
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        setFile(new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' }));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Modified uploadToCloudinary to handle voice messages
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    formData.append("resource_type", file.type.startsWith('audio') ? 'video' : 'auto');

    try {
      setUploading(true);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setUploading(false);
      return response.data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      setUploading(false);
      return null;
    }
  };

  // Modified sendMessage to handle voice messages
  const sendMessage = async () => {
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
            isVoiceMessage: file.type.startsWith('audio')
          };
        }
      }

      await axios.post("http://localhost:5000/message/", messageData, config);

      setFile(null);
      setFilePreview(null);
      setMessageContent("");
      setAudioURL("");
      setRefresh(!refresh);
    } catch (error) {
      console.error("Message send error:", error);
    }
  };

  // Existing useEffects and handlers remain the same
  useEffect(() => {
    const fetchRecipientName = async () => {
      const config = {
        headers: { Authorization: `Bearer ${userData.data.token}` },
      };
      try {
        const { data } = await axios.get(
          `http://localhost:5000/message/recipient/${chat_id}`,
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
  }, [chat_id, chat_user_raw, userData.data.token]);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Skeleton loader
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
      {/* Chat Header */}
      <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
        <p className={"con-icon" + (lightTheme ? "" : " dark")}>{recipientName[0]}</p>
        <div className={"header-text" + (lightTheme ? "" : " dark")}>
          <p className={"con-title" + (lightTheme ? "" : " dark")}>{recipientName}</p>
        </div>
        <IconButton>
          <DeleteIcon />
        </IconButton>
      </div>

      {/* Messages */}
      <div
        className={"messages-container" + (lightTheme ? "" : " dark")}
        style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}
      >
        {allMessages.slice(0).reverse().map((message, index) => {
          const sender = message.sender;
          const self_id = userData.data._id;

          if (message.isFile) {
            if (message.isVoiceMessage) {
              return (
                <div key={index} style={{ alignSelf: sender._id === self_id ? "flex-end" : "flex-start", margin: "10px" }}>
                  <audio controls src={message.content} style={{ maxWidth: "250px" }} />
                </div>
              );
            }
            return (
              <div key={index} style={{ alignSelf: sender._id === self_id ? "flex-end" : "flex-start" }}>
                {message.fileType.startsWith("image") ? (
                  <img src={message.content} alt={message.fileName} style={{ maxWidth: "250px" }} />
                ) : (
                  <a href={message.content} target="_blank" rel="noopener noreferrer">
                    {message.fileName}
                  </a>
                )}
              </div>
            );
          }

          return sender._id === self_id ? (
            <MessageSelf props={message} key={index} />
          ) : (
            <MessageOthers props={message} key={index} />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File/Audio Preview */}
      {(filePreview || audioURL) && (
        <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
          {file?.type.startsWith("image/") ? (
            <img src={filePreview} alt="Preview" style={{ maxWidth: "100px" }} />
          ) : audioURL ? (
            <audio controls src={audioURL} style={{ maxWidth: "200px" }} />
          ) : (
            <span>{file?.name}</span>
          )}
          <IconButton onClick={() => {
            setFile(null);
            setFilePreview(null);
            setAudioURL("");
          }}>❌</IconButton>
        </div>
      )}

      {/* Input Area */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
        <input
          placeholder="Type a Message"
          style={{ flexGrow: 1, padding: "10px", borderRadius: "20px" }}
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(event) => event.code === "Enter" && sendMessage()}
        />
        <IconButton onClick={sendMessage}>{uploading ? <CloudUploadIcon /> : <SendIcon />}</IconButton>
        <IconButton onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <StopIcon style={{ color: "red" }} /> : <MicIcon />}
        </IconButton>
        <IconButton component="label">
          <AttachFileIcon />
          <input type="file" hidden onChange={handleFileChange} />
        </IconButton>
      </div>
    </div>
  );
}

export default ChatArea; 