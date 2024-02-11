import React from "react";
import "./myStyle.css";
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import NightlightRoundOutlinedIcon from '@mui/icons-material/NightlightRoundOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton } from "@mui/material";
import ConversationsItem from "./conversationsItem";
import { useState } from "react";
function Sidebar() {
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
            <div className="sb-header">
                <div>
                    <IconButton>
                    <AccountCircleRoundedIcon />
                </IconButton>
                </div>
                
                <div><IconButton>
                    <PersonAddRoundedIcon />
                </IconButton>
                <IconButton>
                    <GroupAddRoundedIcon />
                </IconButton>
                <IconButton>
                    <AddCircleRoundedIcon />
                </IconButton>
                <IconButton>
                    <NightlightRoundOutlinedIcon />
                </IconButton>
                </div> 
                </div>
            <div className="sb-search">
                <IconButton>
                    <SearchIcon />
                </IconButton>
                <input placeholder="Search" className="search-box"/>
                </div>
            <div className="sb-chats">
                {conversations.map((conversations) => {
                    return  <ConversationsItem props= {conversations} key= {conversations.name} ></ConversationsItem>
                })}
               
            </div>
        </div>
    );

}

export default Sidebar;