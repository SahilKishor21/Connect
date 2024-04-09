import { createSlice } from "@reduxjs/toolkit";
const initialState={
    theme:true,
};
export const themeSlice = createSlice(
    {
        
        name : 'themeSlice',
        initialState,
        reducer : {
            toggleTheme : (state)=> {
               state =!state;
                },
                // console.log
            
        },
    }
);
export const  {toggleTheme} = themeSlice.actions;
export default themeSlice.reducer;