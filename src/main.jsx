import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Login from './Login.jsx'

function Root() {
  const [user, setUser]       = useState(undefined); // undefined = 로딩중
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  },[]);

  if(loading) return (
    <div style={{background:"#0f0f0f",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#888",fontSize:14}}>로딩 중...</div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={user ? <App user={user} /> : <Login onLogin={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)