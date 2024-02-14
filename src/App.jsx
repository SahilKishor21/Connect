import './App.css'
import MainContainer from './components/MainContainer';
import Login from "./components/Login";
import {Routes, Route} from "react-router-dom";
import Welcome from './components/Welcome';
function App() {
  

  return (
   <div className='App'>
    App
      {/* <MainContainer /> */}
       {/* <Login />*/} 
      <Routes>
        <Route path="/" elements={<Login />} />
        <Route path='app' element={<MainContainer />}>
          <Route path='welcome' element={<Welcome />}></Route>
          <Route path='welcome' element={<Welcome />}></Route>
          <Route path='welcome' element={<Welcome />}></Route>
          <Route path='welcome' element={<Welcome />}></Route>
          <Route path='welcome' element={<Welcome />}></Route>
        
        </Route>


      </Routes>
  
   </div>
  );
}

export default App
