import React, { useContext, useEffect, useState } from "react";
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

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  const { refresh, setRefresh } = useContext(myContext);

  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const user = userData?.data;

  // Redirect if not authenticated
  if (!userData) {
    navigate("/");
  }

  useEffect(() => {
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
        withCredentials: true,
      },
    };

    axios.get("https://connect-server-1a2y.onrender.com/chat/", config).then((response) => {
      setConversations(response.data);
    });
  }, [refresh, user.token, setRefresh]);

  const getReceiverName = (conversation) => {
    if (conversation.isGroupChat) {
      return conversation.chatName;
    }
    
    const receiver = conversation.users.find(
      (participant) => participant._id !== user._id
    );
    return receiver?.name || "Unknown User";
  };


  const filteredConversations = conversations.filter(conversation => {
    const name = getReceiverName(conversation).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Also search in latest message if it exists
    const latestMessage = conversation.latestMessage?.content?.toLowerCase() || "";
    
    return name.includes(searchLower) || latestMessage.includes(searchLower);
  });

  return (
    <div className="sidebar-container">
      {/* Sidebar Header */}
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

      {/* Search Bar */}
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

      {/* Conversations */}
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
                onClick={() => {
                  navigate("chat/" + conversation._id + "&" + displayName);
                }}
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
                onClick={() => {
                  navigate("chat/" + conversation._id + "&" + displayName);
                }}
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