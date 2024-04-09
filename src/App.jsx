import './App.css'
import MainContainer from './components/MainContainer';
import Login from "./components/Login";
import Welcome from './components/Welcome';
import Users_Groups from './components/Users_Groups';
import CreateGroup from './components/CreateGroups';
import ChatArea from './components/ChatArea';
import ConversationsItem from './components/conversationsItem';
import { Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

function App() {
  const dispatch = useDispatch();
  const lightTheme = useSelector((state)=> state.themekey);

  return (
   <div className ={"App" + ((lightTheme) ? "" : "dark")} >
    App
      { <MainContainer /> }
       {/* <Login />*/} 
      <Routes>
        <Route path="/" elements={<Login />} />
        <Route path='app' element={<MainContainer />}>
          <Route path='welcome' element={<Welcome />}></Route>
          <Route path='chat' element={<ChatArea />}></Route>
          <Route path='users' element={< Users_Groups/>}></Route>
         {/* <Route path='groups' element={<Groups />}></Route> */}
          <Route path='create-groups' element={<CreateGroup />}></Route>
          <Route path='conversations' element={< ConversationsItem />}></Route>
        </Route>
      </Routes>
  
   </div>
  );
}

export default App
