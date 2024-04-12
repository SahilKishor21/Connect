import React, { useState } from "react";
import ConversationsItem from "./conversationsItem";
import { useSelector } from "react-redux";

function Conversations() {
    const lightTheme = useSelector((state) => state.themekey);
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

    return (
        <div className={"sb-conversations" + (lightTheme ? "" : "dark")}>
             {conversations.map((conversation) => {
            return (
                <ConversationsItem props={conversation} key={conversation} />
            );
        }
        )}
        </div>
    );       
}

export default Conversations;