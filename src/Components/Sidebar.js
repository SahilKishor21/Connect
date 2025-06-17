import React, { useContext, useEffect, useState, useRef } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { IconButton } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import NightlightIcon from "@mui/icons-material/Nightlight";
import LightModeIcon from "@mui/icons-material/LightMode";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../Features/themeSlice";
import axios from "axios";
import { myContext } from "./MainContainer";
import io from "socket.io-client";

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  const { refresh, setRefresh } = useContext(myContext);

  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const user = userData?.data;
  const socketRef = useRef(null);

  if (!userData) {
    navigate("/");
  }

  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      auth: { token: user.token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Sidebar socket connected');
      socketRef.current.emit("setup", user);
    });

    socketRef.current.on("message received", (newMessage) => {
      console.log('💬 Sidebar received message:', newMessage);
      setRefresh(prev => !prev);
    });

    socketRef.current.on("notification received", (data) => {
      console.log('🔔 Sidebar received notification:', data);
      setRefresh(prev => !prev);
    });

    socketRef.current.on("user left group", (data) => {
      console.log('👋 User left group in sidebar:', data);
      if (data.userId === user._id) {
        setRefresh(prev => !prev);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [user.token, user._id, setRefresh]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
            credentials: "include",
          },
        };

        const response = await axios.get("http://localhost:5000/chat/", config);
        console.log('📋 Fetched conversations:', response.data);
        const sortedConversations = response.data.sort((a, b) => {
          const aTime = a.latestMessage?.createdAt || a.createdAt;
          const bTime = b.latestMessage?.createdAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
        setConversations(sortedConversations);
      } catch (error) {
        console.error('❌ Error fetching conversations:', error);
      }
    };

    fetchConversations();
  }, [refresh, user.token]);

  const getReceiverName = (conversation) => {
    console.log('🔍 Getting receiver name for:', conversation);
    if (conversation.isGroupChat) {
      console.log('👥 Group chat name:', conversation.chatName);
      return conversation.chatName || "Group Chat";
    }
    const receiver = conversation.users.find(
      (participant) => participant._id !== user._id
    );
    console.log('👤 One-on-one receiver:', receiver?.name);
    return receiver?.name || "Unknown User";
  };

  const handleConversationClick = (conversation) => {
    const displayName = getReceiverName(conversation);
    console.log('🖱️ Clicking conversation:', conversation._id, displayName);
    if (conversation.isGroupChat) {
      navigate(`chat/${conversation._id}&${conversation.chatName || 'GroupChat'}`);
    } else {
      navigate(`chat/${conversation._id}&${displayName}`);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const name = getReceiverName(conversation).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const latestMessage = conversation.latestMessage?.content?.toLowerCase() || "";
    return name.includes(searchLower) || latestMessage.includes(searchLower);
  });

  return (
    <div className="sidebar-container">
      <div className={"sb-header" + (lightTheme ? "" : " dark")}>
        <div className="other-icons">
          <IconButton
            onClick={() => {
              navigate("/app/welcome");
            }}
          >
            <AccountCircleIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>

          <IconButton
            onClick={() => {
              navigate("users");
            }}
          >
            <PersonAddIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("groups");
            }}
          >
            <GroupAddIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("create-groups");
            }}
          >
            <AddCircleIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>

          <IconButton
            onClick={() => {
              dispatch(toggleTheme());
            }}
          >
            {lightTheme && (
              <NightlightIcon
                sx={{ color: "darkorchid" }}
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            )}
            {!lightTheme && (
              <LightModeIcon
                sx={{ color: "darkorchid" }}
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            )}
          </IconButton>
          <IconButton
            onClick={() => {
              localStorage.removeItem("userData");
              navigate("/");
            }}
          >
            <ExitToAppIcon
              sx={{ color: "darkorchid" }}
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>
        </div>
      </div>

      <div className={"sb-search" + (lightTheme ? "" : " dark")}>
        <IconButton className={"icon" + (lightTheme ? "" : " dark")}>
          <SearchIcon />
        </IconButton>
        <input
          placeholder="Search"
          className={"search-box" + (lightTheme ? "" : " dark")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={"sb-conversations" + (lightTheme ? "" : " dark")}>
        {filteredConversations.map((conversation, index) => {
          if (conversation.users.length === 1) {
            return <div key={index}></div>;
          }

          const displayName = getReceiverName(conversation);

          if (!conversation.latestMessage) {
            return (
              <div
                key={index}
                className="conversation-container"
                onClick={() => handleConversationClick(conversation)}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {displayName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {displayName}
                </p>
                <p className="con-lastMessage">
                  {conversation.isGroupChat 
                    ? "Group Chat - No messages yet" 
                    : "No previous messages, click here to start a new chat."}
                </p>
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className="conversation-container"
                onClick={() => handleConversationClick(conversation)}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {displayName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {displayName}
                </p>
                <p className="con-lastMessage">
                  {conversation.latestMessage.content}
                </p>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export default Sidebar;
