import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Backlog from './pages/Backlog';
import Members from './pages/Members';
import Meeting from './pages/Meeting';
import Activity from './pages/Activity';
import Reports from './pages/Reports';
import ManageWiseAI from './pages/ManageWiseAI';

// 🛡️ COMPONENTE GUARDIA (Protección de rutas)
// Verifica el plan en el localStorage. Si no es 'pro', bloquea el paso.
const ProRoute = ({ children }) => {
    const userPlan = localStorage.getItem('user_plan'); // Puede ser 'light' o 'pro'
    
    if (userPlan !== 'pro') {
        console.warn("Acceso denegado: Se requiere plan Pro Business");
        return <Navigate to="/home" replace />;
    }
    return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
   
        
        {/* Gateway / Hub */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/profile" element={<Profile />} />

        {/* Vistas Estándar (Plan Light) */}
        <Route path="/home" element={<Home />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/members" element={<Members />} />
        <Route path="/meeting" element={<Meeting />} />

        {/* 🔒 Vistas PROTEGIDAS (Solo Plan Pro) */}
        <Route path="/activity" element={
            <ProRoute>
                <Activity />
            </ProRoute>
        } />
        <Route path="/reports" element={
            <ProRoute>
                <Reports />
            </ProRoute>
        } />
        <Route path="/ManageWiseAI" element={
            <ProRoute>
                <ManageWiseAI />
            </ProRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}