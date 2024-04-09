import React, { useState } from "react";
import "./myStyle.css";
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import NightlightRoundOutlinedIcon from '@mui/icons-material/NightlightRoundOutlined';
import SearchIcon from '@mui/icons-material/Search';
import LightModeIcon from '@mui/icons-material/LightMode';
import { IconButton } from "@mui/material";
import ConversationsItem from "./conversationsItem";
import { use3 } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../Features/themeSlice";
import store from "../Features/Store";

function Sidebar() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const lightTheme = useSelector((state) => state.themekey);
    console.log(lightTheme)
    const [conversations, setConversations] = useState([
        {
            name : "test#1",
            lastMessage : "messsage#1",
            timestamp : "today",
        },
        {
            name : "test#2",
            lastMessage : "messsage#2",
            timestamp : "today",
        },
        {
            name : "test#3",
            lastMessage : "messsage#3",
            timestamp : "today",
        },
    ]);

    return(
        <div className="sidebar-container">
            <div className={"sb-header" + (lightTheme ? "" : "dark")}>
                <div>
                    <IconButton >
                    <AccountCircleRoundedIcon 
                    className="icon" />
                </IconButton>
                </div>
                
                <div><IconButton onClick={()=>{
                    navigate('users')
                    }}>
                    <PersonAddRoundedIcon
                    className ={"icon" + (lightTheme ? "" : "dark")} />
                </IconButton>
                <IconButton onClick={()=>{
                    navigate('groups')
                    }}>
                    <GroupAddRoundedIcon 
                    className ={"icon" + (lightTheme ? "" : "dark")} />
                </IconButton>
                <IconButton onClick={()=>{
                    navigate('create-groups')
                    }}>
                    <AddCircleRoundedIcon
                    className ={"icon" + (lightTheme ? "" : "dark")}  />
                </IconButton>
                <IconButton 
                onClick={() => {
                    dispatch(toggleTheme());
                 }}>
                {lightTheme &&
                 (<NightlightRoundOutlinedIcon
                 className ={"icon" + (lightTheme ? "" : "dark")} />)}
                {!lightTheme &&
                 (<LightModeIcon 
                className ={"icon" + (lightTheme ? "" : "dark")} />)}
                    
                </IconButton>
                </div> 
                </div>
            <div  
            
            className ={"sb-search" + ((lightTheme) ? "" : "dark")} >
                <IconButton>
                    <SearchIcon />
                </IconButton>
                <input placeholder="Search" className ={"search-box" + (lightTheme ? "" : "dark")} />
                </div>
            <div className ={"sb-chats" + ((lightTheme) ? "" : "dark")} >
                {conversations.map((conversations) => {
                    return  <ConversationsItem props= {conversations} key= {conversations.name}></ConversationsItem>
                })}
               
            </div>
        </div>
    );

}

export default Sidebar;