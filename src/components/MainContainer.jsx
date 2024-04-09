import React from "react";
import "./myStyle.css";
import Workarea from "./Workarea";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import CreateGroup from "./CreateGroups";
import Users_Groups from "./Users_Groups";
import { useState } from "react";
import { Outlet } from "react-router-dom";


function MainContainer() {
   

    return (
    <div className="MainContainer">
       <Sidebar />
       <Outlet />
       { /*<Workarea /> */}
     {/*<ChatArea props ={conversations[0]}></ChatArea>*/}
       {<Users_Groups />}
       {/* <CreateGroup /> */}
    </div>
    );

}

export default MainContainer;