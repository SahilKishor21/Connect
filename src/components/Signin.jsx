import React from "react";
import chatting from "./chatting.png"
import "./myStyle.css"

function Signin () {
    return (
        <div className="Signin-container">
            <div className="image-container">
                <img src={chatting}  className="welcome-logo" />
            </div>
            <div className="login-box">
                <h3>Signin to your Account </h3>
                <TextField id="standard-basic" label= "Enter user name" color="secondary" variant="outlined" />
                <TextField id="standard-basic" label= "Enter user email" type= "email" color="secondary" variant="outlined" />
                <TextField id="standard-basic" label= "password" type="password" color="secondary" autoComplete="current-password" />
                <Button variant="contained" color="secondary">Signin</Button>
            </div>
            
        </div>
    );
}

export default Signin;