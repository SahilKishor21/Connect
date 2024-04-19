import { Snackbar } from "@mui/base";
import { Alert, IconButton } from "@mui/material";
import React, { useState } from "react";
import CloseIcon from '@mui/icons-material/Close';


export default function Toaster ({message}) {
    const [open, setOpen] = useState(true);
    function handleClose(event, reason) {
        if (reason=== "clickaway") {
            return;
        }
        setOpen(false);
    }
    return(
        <div>
        <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        variant="warning"
        message={message}
        action={[
            <IconButton key="close" onClick={handleClose}>
            <CloseIcon />
            </IconButton>
        ]}>
    
    <Alert onClose={handleClose} severity="warning" sx={{width:"30vw" }}>
     {message}
    </Alert> 

    </Snackbar>
   </div>
 );
}
