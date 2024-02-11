import { Button, TextField } from "@mui/material";
import React from "react";
import chatting from "./chatting.png"



function Login (){
    return (
        <div className="login-container">
            <div className="image-container">
                <img src={chatting}  className="welcome-logo" />
            </div>
            <div className="login-box">
                <p>Login to your Account </p>
                <TextField id="standard-basic" label= "Enter user name" color="secondary" variant="outlined" />
                <TextField id="standard-basic" label= "password" type="password" color="secondary" autoComplete="current-password" />
                <Button variant="contained" color="secondary">Login</Button>
            </div>
            
        </div>
    )
}

export default Login;