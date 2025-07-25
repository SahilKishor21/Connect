import React, { useContext, useEffect, useState } from "react";
import "./myStyles.css";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton } from "@mui/material";
import logo from "../Images/live-chat_512px.png";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { refreshSidebarFun } from "../Features/refreshSidebar";
import { myContext } from "./MainContainer";

function Groups() {
  const { refresh, setRefresh } = useContext(myContext);
  const lightTheme = useSelector((state) => state.themeKey);
  const dispatch = useDispatch();
  const [groups, SetGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const userData = JSON.parse(localStorage.getItem("userData"));
  const nav = useNavigate();
  
  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  const user = userData.data;
  
  useEffect(() => {
    console.log("Users refreshed : ", user.token);
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    axios
      .get("https://connect-server-1a2y.onrender.com/chat/fetch", config)
      .then((response) => {
        console.log("Group Data from API ", response.data);
        SetGroups(response.data);
      });
  }, [refresh]);

  const joinGroup = async (group) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          credentials: "include",
        },
      };

      const response = await axios.post(
        "https://connect-server-1a2y.onrender.com/chat/",
        {
          isGroup: true,
          chatId: group._id,
          userId: user._id
        },
        config
      );

      if (response.data) {
        setRefresh(!refresh);
        dispatch(refreshSidebarFun());
        nav(`/app/chat/${response.data._id}&${response.data.chatName}`);
      }
    } catch (error) {
      console.error("Error joining group:", error.response?.data?.message || "Failed to join group");
    }
  };

  const filteredGroups = groups.filter(group => 
    group.chatName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{
          ease: "anticipate",
          duration: "0.3",
        }}
        className="list-container"
      >
        <div className={"ug-header" + (lightTheme ? "" : " dark")}>
          <img
            src={logo}
            style={{ height: "2rem", width: "2rem", marginLeft: "10px" }}
          />
          <p className={"ug-title" + (lightTheme ? "" : " dark")}>
            Available Groups
          </p>
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              setRefresh(!refresh);
            }}
          >
            <RefreshIcon />
          </IconButton>
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
        <div className="ug-list">
          {filteredGroups.map((group, index) => {
            return (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={"list-tem" + (lightTheme ? "" : " dark")}
                key={index}
                onClick={() => joinGroup(group)}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {group.chatName[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {group.chatName}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Groups;