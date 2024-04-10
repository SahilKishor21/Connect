import { Divider, IconButton } from "@mui/material";
import "./myStyle.css";
import DeleteIcon from '@mui/icons-material/Delete';
import SendSharpIcon from '@mui/icons-material/SendSharp';
import React, { useState } from "react";
import MessageOthers from "./MessageOthers";
import MessageSelf from "./MessageSelf";
import { useNavigate } from "react-router-dom";


function ChatArea(){
    const [conversations, setConversations]= useState([
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
    var props= conversations[0];
    return(
        <div className="chatArea-container">
            <div className="chatArea-header">
                <p className="con-icon">{props.name[0]}</p>
                <div className="header-text">
                    <p className="com-title">{props.name}</p>
                    <p className="com-timeStamp">{props.timestamp}</p>
                </div>
            <IconButton>
                <DeleteIcon />
            </IconButton>
            </div>
            <div className="messages-container">
                <MessageOthers />
                <MessageSelf />
                <MessageOthers />
                <MessageSelf />
                <MessageOthers />
                <MessageSelf />
            </div>
            <div className="text-input-area">
                <input placeholder="Type a message" className="search-box"></input>
                <IconButton>
                    <SendSharpIcon />
                </IconButton>
                </div>
        
        </div>
    )
}

export default ChatArea;