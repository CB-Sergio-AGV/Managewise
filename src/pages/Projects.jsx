import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import './Projects.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Projects() {
    const navigate = useNavigate();
    
    // --- ESTADOS DE MODALES ---
    const [isNewProjectModalOpen, setNewProjectModalOpen] = useState(false);
    const [isAiModalOpen, setAiModalOpen] = useState(false); 
    
    // --- ESTADOS DE DATOS REALES ---
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [projects, setProjects] = useState([]); // Mis proyectos
    const [sharedProjects, setSharedProjects] = useState([]); // Proyectos invitados 🚨 NUEVO
    const [isLoading, setIsLoading] = useState(true);

    // --- DATOS DEL USUARIO LOGUEADO ---
    const currentUsername = localStorage.getItem('current_username') || 'Usuario';
    // 🚨 Asumimos que guardaste el email al hacer login. Si no, lo puedes sacar del endpoint de perfil que armamos.
    const currentEmail = localStorage.getItem('current_email') || `${currentUsername}@ejemplo.com`; 
    const initials = currentUsername.substring(0, 2).toUpperCase();

    // CONFIGURACIÓN DE PLAN
    const PROJECT_LIMIT = 2; 

    // 🚨 FUNCIÓN AUXILIAR DE SEGURIDAD
    const getAuthHeaders = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            navigate('/login');
            throw new Error("No token found");
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // ==========================================
    // 1. CARGAR PROYECTOS DESDE EL BACKEND (DOBLE LLAMADA)
    // ==========================================
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const headers = getAuthHeaders();

            // 🚨 HACEMOS DOS PETICIONES AL MISMO TIEMPO
            const [ownerRes, sharedRes] = await Promise.all([
                fetch(`${API_BASE}/projects/owner/${currentUsername}`, { headers }),
                fetch(`${API_BASE}/projects/shared/${currentEmail}`, { headers })
            ]);

            if (ownerRes.ok) {
                const ownerData = await ownerRes.json();
                setProjects(ownerData);
            } else if (ownerRes.status === 403 || ownerRes.status === 401) {
                localStorage.clear();
                navigate('/login');
                return;
            }

            if (sharedRes.ok) {
                const sharedData = await sharedRes.json();
                setSharedProjects(sharedData);
            }

        } catch (error) {
            console.error("Error al cargar proyectos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Si no hay token en la mochila, ni lo intentamos, de frente al login
        if (!localStorage.getItem('jwt_token')) {
            navigate('/login');
            return;
        }
        
        fetchProjects();
        // Limpiamos la memoria del proyecto actual al estar en el lobby
        localStorage.removeItem('current_project_id');
        localStorage.removeItem('current_project_role'); // 🚨 Limpiamos el rol anterior
    }, [navigate]);

    // ==========================================
    // 2. CREAR PROYECTO REAL
    // ==========================================
    const handleCreateProject = async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            alert("Tu sesión ha finalizado. Por favor, inicia sesión de nuevo.");
            navigate('/login');
            return;
        }

        if (projects.length >= PROJECT_LIMIT) {
            setNewProjectModalOpen(false);
            setAiModalOpen(true); 
            return;
        }
        
        if (!newProjectName.trim()) {
            alert("El nombre del proyecto es obligatorio");
            return;
        }

        const payload = {
            name: newProjectName.trim(),
            description: newProjectDesc.trim() || 'Sin descripción',
            ownerId: currentUsername, 
            role: "Product Owner" 
        };

        try {
            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchProjects(); // Recargamos la lista
                setNewProjectName('');
                setNewProjectDesc('');
                setNewProjectModalOpen(false);
            } else {
                console.error("Error del servidor al crear.");
            }
        } catch (error) {
            console.error("Error de conexión al crear el proyecto", error);
        }
    };

    // ==========================================
    // 3. ENTRAR AL PROYECTO (LA LLAVE DEL SISTEMA)
    // ==========================================
    const enterProject = (projectId, role = 'Owner') => {
        localStorage.setItem('current_project_id', projectId);
        localStorage.setItem('current_project_role', role); // 🚨 Guardamos si es dueño o invitado
        navigate('/home');
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="projects-wrapper">
            <nav className="projects-navbar">
                <div className="brand-logo">ManageWise</div>
                <div className="nav-right">
                    <div className="plan-badge-container" onClick={() => setAiModalOpen(true)}>
                        <Tag value="Plan Light" severity="warning" icon="pi pi-bolt" className="plan-tag" />
                    </div>
                    
                    {/* Botón real para cerrar sesión */}
                    <Button icon="pi pi-sign-out" rounded text severity="secondary" onClick={handleLogout} title="Cerrar Sesión" />
                    
                    {/* Perfil del usuario (te llevará a /profile en el futuro) */}
                    <div className="user-nav-profile" onClick={() => navigate('/profile')}>
                        <span className="user-greeting">Hola, {currentUsername}</span>
                        <Avatar label={initials} shape="circle" className="nav-avatar" />
                    </div>
                </div>
            </nav>

            <main className="projects-main">
                {isLoading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                        <h2>Cargando espacios de trabajo...</h2>
                    </div>
                ) : (
                    <>
                        {/* 🚨 SECCIÓN 1: MIS PROYECTOS PROPIOS */}
                        <div className="projects-header">
                            <div>
                                <h1>Tus Proyectos Propios</h1>
                                <p>Gestiona tus espacios de trabajo. Límite de plan: <strong>{projects.length}/{PROJECT_LIMIT}</strong></p>
                            </div>
                            <Button 
                                label="Crear Proyecto" 
                                icon="pi pi-plus" 
                                className={projects.length >= PROJECT_LIMIT ? "p-button-secondary" : "p-button-orange"} 
                                onClick={() => setNewProjectModalOpen(true)} 
                            />
                        </div>

                        <div className="projects-grid">
                            {projects.map(project => (
                                <div key={project.id} className="project-card" onClick={() => enterProject(project.id, 'Owner')}>
                                    <div className="project-card-header">
                                        <i className="pi pi-folder project-icon"></i>
                                        <h3>{project.name}</h3>
                                        <Tag value="Propietario" severity="success" style={{ marginLeft: '10px', fontSize: '0.7rem' }}/>
                                    </div>
                                    <div className="project-card-body">
                                        <span className="project-role"><i className="pi pi-info-circle"></i> {project.description || 'Sin descripción'}</span>
                                        <span className="project-date"><i className="pi pi-database"></i> ID: {project.id.substring(0,8)}...</span>
                                    </div>
                                    <div className="project-card-footer">
                                        <span>Entrar al espacio de trabajo</span>
                                        <i className="pi pi-arrow-right"></i>
                                    </div>
                                </div>
                            ))}
                            
                            {projects.length < PROJECT_LIMIT && (
                                <div className="project-card empty-card" onClick={() => setNewProjectModalOpen(true)}>
                                    <i className="pi pi-plus-circle"></i>
                                    <span>Crear nuevo proyecto</span>
                                </div>
                            )}
                        </div>

                        {/* 🚨 SECCIÓN 2: PROYECTOS COMPARTIDOS CONMIGO */}
                        {sharedProjects.length > 0 && (
                            <>
                                <div className="projects-header" style={{ marginTop: '4rem' }}>
                                    <div>
                                        <h1>Compartidos Contigo</h1>
                                        <p>Proyectos donde has sido invitado como colaborador.</p>
                                    </div>
                                </div>

                                <div className="projects-grid">
                                    {sharedProjects.map(project => (
                                        <div key={project.id} className="project-card shared-card" onClick={() => enterProject(project.id, 'Guest')}>
                                            <div className="project-card-header">
                                                <i className="pi pi-users project-icon" style={{ color: '#8b5cf6' }}></i>
                                                <h3>{project.name}</h3>
                                                <Tag value="Invitado" severity="info" style={{ marginLeft: '10px', fontSize: '0.7rem' }}/>
                                            </div>
                                            <div className="project-card-body">
                                                <span className="project-role"><i className="pi pi-user"></i> Dueño: {project.ownerId}</span>
                                                <span className="project-date"><i className="pi pi-database"></i> ID: {project.id.substring(0,8)}...</span>
                                            </div>
                                            <div className="project-card-footer" style={{ color: '#8b5cf6' }}>
                                                <span>Colaborar en el proyecto</span>
                                                <i className="pi pi-arrow-right"></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>

            <Dialog header="Crear Nuevo Proyecto" visible={isNewProjectModalOpen} style={{ width: '450px' }} onHide={() => setNewProjectModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Nombre del Proyecto</label>
                        <InputText value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Ej: App Móvil Finanzas" className="w-full" />
                    </div>
                    <div className="field">
                        <label>Descripción (Opcional)</label>
                        <InputText value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} placeholder="¿De qué trata este proyecto?" className="w-full" />
                    </div>
                    <Button label="Crear Proyecto" className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={handleCreateProject} />
                </div>
            </Dialog>

            <Dialog 
                visible={isAiModalOpen} 
                style={{ width: '90vw', maxWidth: '1100px' }} 
                onHide={() => setAiModalOpen(false)}
                className="pricing-dialog"
                showHeader={false}
                dismissableMask={true}
            >
                <div className="pricing-popup-container">
                    <div className="popup-close-btn" onClick={() => setAiModalOpen(false)}>
                        <i className="pi pi-times"></i>
                    </div>
                    
                    <div className="upgrade-header">
                        <h1>Actualiza tu Plan</h1>
                        <p>ManageWise AI y proyectos ilimitados requieren una suscripción activa.</p>
                    </div>

                    <div className="pricing-grid">
                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h3>Light</h3>
                                <p>Get the basics</p>
                                <div className="price">
                                    <span className="currency">$</span><span className="amount">0</span><span className="period">/mo</span>
                                </div>
                            </div>
                            <div className="pricing-features">
                                <ul>
                                    <li><i className="pi pi-check"></i> Hasta 2 Proyectos</li>
                                    <li><i className="pi pi-check"></i> 5 Colaboradores</li>
                                    <li className="disabled"><i className="pi pi-times"></i> Exportación de Reportes</li>
                                    <li className="disabled"><i className="pi pi-times"></i> Asistente ManageWise AI</li>
                                </ul>
                            </div>
                            <Button label="Tu Plan Actual" className="p-button-outlined p-button-secondary w-full" disabled />
                        </div>

                        <div className="pricing-card popular">
                            <div className="recommended-badge">RECOMENDADO</div>
                            <div className="pricing-header">
                                <h3>Pro Business</h3>
                                <p>Grow your brand</p>
                                <div className="price">
                                    <span className="currency">$</span><span className="amount">29</span><span className="period">/mo</span>
                                </div>
                            </div>
                            <div className="pricing-features">
                                <ul>
                                    <li><i className="pi pi-check"></i> Proyectos Ilimitados</li>
                                    <li><i className="pi pi-check"></i> Ilimitados Colaboradores</li>
                                    <li><i className="pi pi-check"></i> Reportes PDF y Excel y Power Bi</li>
                                    <li><i className="pi pi-check"></i> <strong>ManageWise AI</strong></li>
                                </ul>
                            </div>
                            <Button label="Actualizar a Pro" className="p-button-orange w-full" onClick={() => alert('Redirigiendo a pasarela de pago...')} />
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
