import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Avatar } from 'primereact/avatar';
import { Dialog } from 'primereact/dialog';
import './Profile.css';

// 🚨 Apuntamos a /users para el borrado y obtener datos
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Profile() {
    const navigate = useNavigate();

    // --- DATOS DEL LOCALSTORAGE ---
    const currentUsername = localStorage.getItem('current_username') || 'Usuario';
    const initials = currentUsername.substring(0, 2).toUpperCase();

    // --- ESTADOS ---
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estado para guardar la info real que viene de Java
    const [userData, setUserData] = useState({
        fullName: 'Cargando...',
        email: 'Cargando...'
    });

    // ==========================================
    // 1. OBTENER DATOS REALES DEL USUARIO
    // ==========================================
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('jwt_token');
            if (!token) return;

            try {
                // Hacemos una petición GET a Java para traer el nombre y correo
                const res = await fetch(`${API_BASE}/${encodeURIComponent(currentUsername)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setUserData({
                        fullName: data.fullName || 'No especificado',
                        email: data.email || 'No especificado'
                    });
                }
            } catch (error) {
                console.error("Error al cargar perfil:", error);
                setUserData({ fullName: 'Error al cargar', email: 'Error al cargar' });
            }
        };

        fetchUserData();
    }, [currentUsername]);

    // ==========================================
    // 2. ACCIONES
    // ==========================================
    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const confirmAccountDeletion = async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(currentUsername)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                alert("Tu cuenta y todos tus datos han sido eliminados permanentemente.");
                localStorage.clear();
                navigate('/login');
            } else {
                alert(`Error del servidor: ${res.status}. Revisa la consola.`);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
            alert("Error de conexión con el servidor.");
        } finally {
            setIsLoading(false);
            setDeleteModalOpen(false);
        }
    };

    // --- UI DEL MODAL ---
    const deleteModalFooter = (
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                disabled={isLoading}
                onClick={() => setDeleteModalOpen(false)} 
                className="p-button-text" 
                style={{ color: '#64748b', fontWeight: 'bold' }} 
            />
            <Button 
                label={isLoading ? "Eliminando..." : "Sí, Eliminar Permanentemente"} 
                icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-trash"} 
                onClick={confirmAccountDeletion} 
                className="p-button-danger" 
                disabled={isLoading}
                autoFocus 
            />
        </div>
    );

    return (
        <div className="profile-wrapper">
            <nav className="projects-navbar">
                <div className="brand-logo" style={{cursor:'pointer'}} onClick={() => navigate('/projects')}>ManageWise</div>
                <Button label="Volver a Proyectos" icon="pi pi-arrow-left" className="p-button-text p-button-plain text-white" onClick={() => navigate('/projects')} />
            </nav>

            <main className="profile-main">
                <div className="profile-container">
                    <div className="profile-header-card">
                        <div className="avatar-section">
                            <Avatar label={initials} size="xlarge" shape="circle" className="profile-big-avatar" />
                        </div>
                        <div className="profile-title-info">
                            <h2>Mi Perfil ({currentUsername})</h2>
                            <p>Información actual de tu cuenta. Modo de solo lectura.</p>
                        </div>
                    </div>

                    <div className="profile-body-grid">
                        
                        {/* 🚨 INFORMACIÓN BÁSICA (SOLO LECTURA) */}
                        <div className="settings-card">
                            <h3>Información Básica</h3>
                            <hr />
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <InputText value={userData.fullName} disabled readOnly className="w-full bg-gray-100 cursor-auto" />
                            </div>
                            <div className="form-group">
                                <label>Correo Electrónico</label>
                                <InputText value={userData.email} disabled readOnly className="w-full bg-gray-100 cursor-auto" />
                            </div>
                        </div>

                        {/* 🚨 ZONA DE PELIGRO Y LOGOUT */}
                        <div className="settings-card danger-zone">
                            <h3>Gestión de Cuenta</h3>
                            <hr />
                            <div className="danger-actions">
                                <Button label="Cerrar Sesión" icon="pi pi-sign-out" className="btn-dark" onClick={handleLogout} />
                                <div className="danger-divider"></div>
                                
                                <div className="delete-warning">
                                    <strong>Zona de Peligro:</strong> Una vez que elimines tu cuenta, no hay vuelta atrás. Se borrarán todos tus proyectos de la base de datos.
                                </div>
                                <Button label="Eliminar mi cuenta permanentemente" icon="pi pi-trash" className="p-button-danger" onClick={() => setDeleteModalOpen(true)} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            <Dialog header="¿Eliminar cuenta?" visible={isDeleteModalOpen} style={{ width: '480px' }} footer={deleteModalFooter} onHide={() => setDeleteModalOpen(false)}>
                <div className="confirmation-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem', marginTop: '1rem' }}>
                    <i className="pi pi-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#ef4444', marginTop: '0.2rem' }} />
                    <span style={{ fontSize: '1.1rem', lineHeight: '1.5', color: '#334155' }}>
                        Estás a punto de borrar tu cuenta <strong>{currentUsername}</strong>. Todos tus datos y proyectos se perderán de forma irrecuperable.<br/><br/>¿Deseas continuar?
                    </span>
                </div>
            </Dialog>
        </div>
    );
}
