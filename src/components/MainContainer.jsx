import React from "react";
import "./myStyle.css";
import Workarea from "./Workarea";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import CreateGroup from "./CreateGroups";
import Users_Groups from "./Users_Groups";
import { useState } from "react";


function MainContainer() {
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

    return (
    <div className="MainContainer">
       <Sidebar />
       { /*<Workarea /> */}
      { /*<ChatArea props ={conversations[0]}></ChatArea> */ }
       {<Users_Groups /> }
       { <CreateGroup /> }
    </div>
    );

}

export default MainContainer;