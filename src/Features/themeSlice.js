import { createSlice } from "@reduxjs/toolkit";

const initialState={
    theme:true,
};
export const themeSlice = createSlice(
    {
        
        name : 'themeSlice',
        initialState,
        reducers : {
            toggleTheme : (state)=> {
               state.theme =!state.theme; 
                },
            
        },
    }
);  
/*
export const themeSlice = createSlice({
    name: "themeSlice",
    initialState: true,
    reducers: {
      toggleTheme: (state) => {
        return (state = !state);
      },
    },
  });
*/
export const  {toggleTheme} = themeSlice.actions;
export default themeSlice.reducer;