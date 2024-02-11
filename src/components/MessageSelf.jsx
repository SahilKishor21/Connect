import React from "react";
import "./myStyle.css";

function MessageSelf() {
    var props2 = {}
    return (
        <div className="self-mess-container">
            <div className="messageBox">
                <p>{props2.message}</p>
                <p className="self-timestamp">12:00am</p> 
                 </div>
            </div>
    );
}

export default MessageSelf;