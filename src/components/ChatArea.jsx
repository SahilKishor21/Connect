import { Divider, IconButton } from "@mui/material";
import "./myStyle.css";
import DeleteIcon from '@mui/icons-material/Delete';
import SendSharpIcon from '@mui/icons-material/SendSharp';
import React from "react";
import MessageOthers from "./MessageOthers";
import MessageSelf from "./MessageSelf"

function ChatArea(){
    return(
        <div className="chatArea-container">
            <div className="chatArea-header">
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