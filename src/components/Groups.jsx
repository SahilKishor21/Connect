import React from "react";
import "./myStyle.css";
import chatting from "./chatting.png";
import { IconButton } from "@mui/material";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";


function Groups() {
    const lightTheme = useSelector((state) => state.themekey);
    return(
        <AnimatePresence>
         <motion.div
             initial={{opacity:0, scale:1}}
             animate={{opacity:1, scale:1}} 
             exit={{opacity:0, scale:0}}
             transition={{
                ease:"anticipate",
                duration: "0.3s",
             }}
            className="list-container">
            <div className={"ug-header" + (lightTheme ? "" : "dark")}>
                <img
                src={chatting} alt="logo"
                style={{height: "2rem", width: "2rem", marginLeft: "10px", }}
                />
                <p className={"ug-title" + (lightTheme ? "" : "dark")}>
                    Available Groups
                </p>
            </div>
            <div className={"sb-search" + (lightTheme ? "" : "dark")}>
                <IconButton className={"icon" + (lightTheme ? "" : "dark")}>
                    <SearchOutlined />
                </IconButton>
                <input
                placeholder="Search"
                className={"search-box" + (lightTheme ? "" : "dark")}>
                </input>
            </div>
            <div className="ug-list">
            <motion.div
             whileHover={{scale: 1.1}}
             whileTap={{scale:0.98}}
             className={"list-items" + (lightTheme ? "" : "dark")}>
                <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                <p className={"con-title" + (lightTheme ? "" : "dark")}>Test group</p>
                </motion.div>
                <motion.div
                 whileHover={{scale: 1.1}}
                 whileTap={{scale:0.98}}
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test group</p>
                </motion.div>
                <motion.div 
                whileHover={{scale: 1.1}}
                whileTap={{scale:0.98}}
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test group</p>
                </motion.div>
                <motion.div 
                whileHover={{scale: 1.1}}
                whileTap={{scale:0.98}}
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test group</p>
                </motion.div>
            </div>
        </motion.div>
     </AnimatePresence> 
    );
}

export default Groups;