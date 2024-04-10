import React from "react";
import "./myStyle.css";
import Workarea from "./Workarea";
import Sidebar from "./Sidebar";
import Welcome from "./Welcome";
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
       {/* <Welcome /> */}
       {/*<ChatArea /> */}
       {/* <Users_Groups /> */}
       {/* <CreateGroup /> */}
    </div>
    );

}

export default MainContainer;