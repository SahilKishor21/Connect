import React from "react";
import "./myStyle.css";
import chatting from "./chatting.png";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { response } from "express";

function Welcome() {
  const lightTheme = useSelector((state) => state.themeKey);
  const userData = JSON.parse(localStorage.getItem("userdata"));
  console.log(userData);
  const nav = useNavigate();
  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  return (
    <div className={"welcome-container" + (lightTheme ? "" : " dark")}>
      <motion.img
        drag
        whileTap={{ scale: 1.05, rotate: 360 }}
        src={chatting}
        alt="Logo"
        className="welcome-logo"
      />
      <b>Hi , {userData.data.name} 👋</b>
      <p>View and text directly to people present in the chat Rooms.</p>
    </div>
  );
}

export default Welcome;
/*
import React from "react";
import "./myStyle.css";
import chatting from "./chatting.png";
import {motion} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

function Welcome () {
    const lightTheme = useSelector((state) => state.themekey);
    const userData = JSON.parse(localStorage.getItem("userData"));
    console.log(userData);
    const navigate = useNavigate();
    if (!userData) {
        console.log("User is not Authenticated");
        navigate("/");
    }
    
    return(
        <div className={"welcome-container" + (lightTheme ? "" : "dark")}>
        <motion.img
         drag 
         whileTap= {{scale: 1.05, rotate:360 }}
         src={chatting} 
         alt="logo"
        className="welcome-logo" />
           <p>To feel Connected</p>
        <p>Veiw and text directly to people present in the chat Rooms.</p>
    </div>
    );
}

export default Welcome; */