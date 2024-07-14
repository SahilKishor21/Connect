import React, { useContext, useState } from "react";
import "./myStyle.css";
import chatting from "./chatting.png"
import { IconButton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion"
import SearchOutlined from "@mui/icons-material/SearchOutlined";

function Users_Groups() {

    const {refresh, setRefresh} = useContext(myContext);
    const [users, setUsers] = useState([]);
    const lightTheme = useSelector((state)=> state.themekey);
    return (
        <AnimatePresence>
            <motion.div 
             className="list-containers">
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
                 whileHover={{scale : 1.01 }}
                 whileTap={{scale: 0.98 }}  
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </motion.div>
                <motion.div 
                 whileHover={{scale : 1.01 }}
                 whileTap={{scale: 0.98 }}  
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </motion.div>
                <motion.div
                 whileHover={{scale : 1.01 }}
                 whileTap={{scale: 0.98 }}  
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </motion.div>
                <motion.div
                 whileHover={{scale : 1.01 }}
                 whileTap={{scale: 0.98 }}  
                 className={"list-items" + (lightTheme ? "" : "dark")}>
                    <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                    <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                </motion.div>
            </div>
        </motion.div>
        </AnimatePresence>
        
    )
}

export default Users_Groups;