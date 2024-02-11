import React from "react";
import "./myStyle.css";
import { IconButton } from "@mui/material";
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
function CreateGroup () {

    return(
        <div className="createGroups-container">
            <input placeholder="Enter Group Name" className="search-box" />
            <IconButton>
                <AddBoxRoundedIcon />
            </IconButton>
        </div>
    );
}

export default CreateGroup