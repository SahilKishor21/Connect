import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import themeSlice from "./themeSlice";
import themeSliceReducer from "./themeSlice";

const store = configureStore({
  reducer: {
    themekey: themeSliceReducer,
  },
  middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}),
});

export default store;

   

    
