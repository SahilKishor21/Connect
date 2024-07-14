import { Backdrop, Button, CircularProgress, TextField } from "@mui/material";
import React, { useState } from "react";
import chatting from "./chatting.png";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Toaster from "./Toaster";



function Login (){
    const [showLogin, setShowLogin] = useState(false);
    const [data, setData] = useState({name: "", email: "", password: ""});
    const [loading, setloading] = useState(false);

    const [loginstatus, setloginstatus] = React.useState("");
    const [signinstatus, setSigninstatus] = React.useState("");
    const navigate = useNavigate();

    const changeHandler = (e) => {
        setData({...data, [e.target.name]: e.target.value});
    };

    const loginHandler = async (e) => {
        setloading(true);
        console.log(data);
        try{
            const config = {
                headers: {
                    "content-type": "application/json",
                },
            };

            const response = await axios.post(
                "http://localhost:5000/user/login/", 
                data,
                config, 

            );
            console.log("Login: ", response);
            setloginstatus({msg: "success", key: Math.random()}); 
            setloading(false);
            localStorage.setItem("userdata", JSON.stringify(response));
            navigate("/app/welcome");
        }
        catch(error) {
            setloginstatus({
                msg:"Invalid Username or Password",
                key: Math.random(), 
            });
        }
        setloading(false);
    };

    const signUpHandler = async () => {
        setloading(true);
        try{
            const config = {
                headers: {
                    "content-type": "application/json",
                },
            };

            const response = await axios.post(
                "http://localhost:5000/user/register/", 
                data,
                config
            );
            console.log(response);
            setSigninstatus({msg: "success", key: Math.random()}); 
            setloading(false);
            localStorage.setItem("userdata", JSON.stringify(response));
            navigate("/app/welcome");
        }
        catch(error) {
            console.log(error);
            if (error.response.status === 405){
                setloginstatus({
                    msg:"User with this email ID already exists",
                    key: Math.random(), 
                });
            }
            if (error.response.status === 406){
                setloginstatus({
                    msg:"User Name already taken, Please take another one",
                    key: Math.random(), 
                });
        }
        setloading(false);
    };
}


    return (
        <>
        <Backdrop
        sx={{color:"#fff", zIndex: (theme) => theme.zIndex.drawer = 1 }}
        open = {loading}>
            <CircularProgress color="secondary" />
        </Backdrop>

        <div className="login-container">
            <div className="image-container">
                <img src={chatting}  className="welcome-logo" />
            </div>
            {showLogin && (<div className="login-box">
                <h3>Login to your Account </h3>
                <TextField onChange= {changeHandler} id="standard-basic" label= "Enter user name" color="secondary" variant="outlined" name="name" helperText="" />
                <TextField onChange={changeHandler} id="standard-basic" label= "password" type="password" color="secondary" autoComplete="current-password" name="password" />
                <Button variant="contained" color="secondary" onClick={loginHandler} isLoading >Login</Button>
                <p>New User? {" "}
                <span
                    className= "hyper"
                    onClick={() =>{
                        setShowLogin(false);
                    }}>
                    Signin
                </span>
                </p>
                {loginstatus ? (
                    <Toaster key={loginstatus.key} message={loginstatus.msg} />  
                         ) : null}
            </div>)}

            {!showLogin && ( <div className="login-box">
                <h3>Create your Account </h3>
                <TextField 
                id="standard-basic"
                onChange={changeHandler}
                label= "Enter user name"
                color="secondary"
                variant="outlined"
                name= "name" />
                
                <TextField 
                id="standard-basic"
                onChange={changeHandler}
                label= "Enter user email" 
                color="secondary"
                variant="outlined" 
                name="email" />
                <TextField 
                id="standard-basic"
                 onChange={changeHandler}
                 label= "password"
                 type="password" 
                 color="secondary" 
                 autoComplete="current-password" 
                  name="password"/>
                <Button variant="contained" 
                color="secondary"
                onClick={signUpHandler}>
                Signin
                </Button>
                <p>Already have an account? 
                <span
                    className= "hyper"
                    onClick={() =>{
                        setShowLogin(true);
                    }}>
                         Login
                </span>
                </p>
                {signinstatus ? (
                    <Toaster key={loginstatus.key} message={loginstatus.msg} />  
                         ) : null}
              
            </div>)} 
        </div>
        </>
    );
 }

export default Login;