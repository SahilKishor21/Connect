import React from "react";
import "./myStyle.css";
import chatting from "./chatting.png"
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { IconButton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion"

function Users_Groups() {
    const lightTheme = useSelector((state)=> state.themekey);
    return (
        <AnimatePresence>
            <motion.div 
             initial ={{opacity :0, scale:0 }}
             animate ={{opacity:1, scale:1}}
             exit={{ opacity:0, scale:0}}
             transition={{
                ease:"anticipate",
                duration: "0.3",
             }}
             className="list-containers">
            <div className ={"ug-header" + (lightTheme ? "" : "dark")} >
                <img src={chatting}
                style={{ height: "2rem", width: "2rem"}} />
                <p className="ug-titles">Available users</p>
            </div>
            <div className="sb-search">
                <IconButton>
                    <SearchOutlinedIcon />
                </IconButton>
                <input placeholder="Search" className={"search-box" + (lightTheme ? "" : "dark")}>
                </input>
            </div>
            <div className="ug-list">
                <motion.div
                 whileHover={{scale : 1.01 }}
                 whileTap={{scale: 0.98 }}  
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </motion.div>
                <div className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </div>
                <div className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </div>
                <div className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </div>
            </div>
        </motion.div>
        </AnimatePresence>
        
    )
}

export default Users_Groups;