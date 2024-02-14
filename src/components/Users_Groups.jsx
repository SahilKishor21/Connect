import React from "react";
import "./myStyle.css";
import chatting from "./chatting.png"
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { IconButton } from "@mui/material";

function Users_Groups() {
    return (
        <div className="list-containers">
            <div className="ug-header">
                <img src={chatting}
                style={{ height: "2rem", width: "2rem"}} />
                <p className="ug-titles">Online Users</p>
            </div>
            <div className="sb-search">
                <IconButton>
                    <SearchOutlinedIcon />
                </IconButton>
                <input placeholder="Search" className="ug-search">
                </input>
            </div>
            <div className="ug-list">
                <div className="list-item">
                    <p className="con-icon">T</p>
                    <p className="con-title">Test User</p>
                </div>
                <div className="list-item">
                    <p className="con-icon">T</p>
                    <p className="con-title">Test User</p>
                </div>
                <div className="list-item">
                    <p className="con-icon">T</p>
                    <p className="con-title">Test User</p>
                </div>
                <div className="list-item">
                    <p className="con-icon">T</p>
                    <p className="con-title">Test User</p>
                </div>
            </div>
        </div>
    )
}

export default Users_Groups;