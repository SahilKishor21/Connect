import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import themeSlice from "./themeSlice";
import themeSliceReducer from "./themeSlice";
import refreshSidebar from "./refreshSidebar";
const store = configureStore({
  reducer: {
    themekey: themeSliceReducer,
  },
  middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}),
}); 


/*
export const store = configureStore({
  reducer: {
    themeKey: themeSliceReducer,
    refreshKey: refreshSidebar,
  },

});
*/
export default store;

   

    
