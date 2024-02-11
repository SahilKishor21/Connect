import React from "react";
import "./myStyle.css";
import logo from "connect\public\chatting.png"
function Welcome () {

    return(
        <div className="welcome-container">
        <img src={logo} alt="logo"
        className="welcome-logo" />
           <p>To feel Connected</p>
        <p>Veiw and text directly to people present in the chat Rooms.</p>
    </div>
    );
}

export default Welcome