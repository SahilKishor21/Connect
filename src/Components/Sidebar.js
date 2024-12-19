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
      },
    };

    axios.get("http://localhost:5000/chat/", config).then((response) => {
      setConversations(response.data);
      //setRefresh(!refresh);
    });
  }, [refresh, user.token, setRefresh]);

  const getReceiverName = (conversation) => {
    // Filter the user to identify the receiver
    const receiver = conversation.users.find(
      (participant) => participant._id !== user._id
    );
    return receiver?.name || "Unknown User"; // Fallback to "Unknown User" if no match
  };

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
        />
      </div>

      {/* Conversations */}
      <div className={"sb-conversations" + (lightTheme ? "" : " dark")}>
        {conversations.map((conversation, index) => {
          if (conversation.users.length === 1) {
            return <div key={index}></div>;
          }

          const receiverName = getReceiverName(conversation);

          if (!conversation.latestMessage) {
            return (
              <div
                key={index}
                className="conversation-container"
                onClick={() => {
                  navigate("chat/" + conversation._id + "&" + receiverName);
                }}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {receiverName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {receiverName}
                </p>
                <p className="con-lastMessage">
                  No previous messages, click here to start a new chat.
                </p>
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className="conversation-container"
                onClick={() => {
                  navigate("chat/" + conversation._id + "&" + receiverName);
                }}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {receiverName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {receiverName}
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
