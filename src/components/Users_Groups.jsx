import React, { useContext, useEffect, useState } from "react";
import "./myStyle.css";
import chatting from "./chatting.png"
import { IconButton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion"
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import axios from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Users_Groups() {

    const {refresh, setRefresh} = useState(true);
    const [users, setUsers] = useState([]);
    const userData = JSON.parse(localstorage.getItem("userData"));
    const lightTheme = useSelector((state)=> state.themekey);
    const nav = useNavigate();
    if (!userData) {
        console.log("User not Authenticated");
        nav(-1);
    }
    useEffect(() => {
        console.log("users refreshed");
        const config = {
            header: {
                Authorization: 'Bearer $(userData.data.token)'
            },
        };
        axios.get("http://localhost:5000/user/fetchUsers", config).then((data) =>{
            console.log("user Data from API ", data);
            setUsers(data.data);
        });
    }, [refresh]);
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
                {users.map((user, index) =>{
                    return (
                        <motion.div
                         whileHover={{scale : 1.01 }}
                         whileTap={{scale: 0.98 }}  
                         className={"list-items" + (lightTheme ? "" : "dark")}
                            key ={index}
                            onclick={() => {
                                console.log("creating caht with", user.name);
                                const config = {
                                    headers: {
                                        Authorization:' Bearer $(userData.data.token)',
                                    },
                                };
                                axios.post(
                                    "http://localhost:5000/chat/", {
                                        userId: user._id,
                                    },
                                 config,
                                );
                            }}
                        >
                             <p className={"con-icon" + (lightTheme ? "" : "dark")}>T</p>
                             <p className={"con-title" + (lightTheme ? "" : "dark")}>Test User</p>
                        </motion.div>
                    );
                })}
              </div>
            </motion.div>
        </AnimatePresence>
      );
}

            

export default Users_Groups;