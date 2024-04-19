import React from "react";
import { TextField, Button } from "@mui/material";
import chatting from "./chatting.png";
import "./myStyle.css"
import { Link } from "react-router-dom";

function Signin () {
    return (
        <div className="login-container">
            <div className="image-container">
                <img src={chatting}  className="welcome-logo" />
            </div> 
            <div className="login-box">
                <h3>Create your Account </h3>
                <TextField id="standard-basic" label= "Enter user name" color="secondary" variant="outlined" />
                <TextField id="standard-basic" label= "Enter user email" color="secondary" variant="outlined" />
                <TextField id="standard-basic" label= "password" type="password" color="secondary" autoComplete="current-password" />
                <Button variant="contained" color="secondary">Signin</Button>
                <p>Already have an account?    <Link to="/">Login</Link> </p>
              
            </div>
        </div>
        
    );
}

export default Signin;