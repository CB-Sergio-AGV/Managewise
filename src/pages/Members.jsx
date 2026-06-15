import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Avatar } from 'primereact/avatar';
import { useNavigate } from 'react-router-dom';
import './Members.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Members() {
    const navigate = useNavigate();
    
    // 🚀 MAGIA: Proyecto actual
    const currentProjectId = localStorage.getItem('current_project_id');

    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isRoleModalOpen, setRoleModalOpen] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState(null);
    const [isAiModalOpen, setAiModalOpen] = useState(false); // 🚨 Modal de Planes
    const [isLoading, setIsLoading] = useState(true);

    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);

    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');

    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#0ea5e9'); 

    const colorOptions = [
        { label: 'Azul', value: '#0ea5e9' },
        { label: 'Naranja', value: '#f97316' },
        { label: 'Verde', value: '#22c55e' },
        { label: 'Rojo', value: '#ef4444' },
        { label: 'Morado', value: '#8b5cf6' },
        { label: 'Gris Oscuro', value: '#475569' }
    ];

    // 🚨 MANEJADOR DE CLICS PRO
    const handleProClick = (e) => {
        if (e) e.preventDefault();
        setAiModalOpen(true);
    };

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

    const fetchData = async () => {
        if (!currentProjectId) {
            navigate('/projects');
            return;
        }

        setIsLoading(true);
        try {
            const headers = getAuthHeaders(); 

            const [membersRes, rolesRes] = await Promise.all([
                fetch(`${API_BASE}/team-members/project/${currentProjectId}`, { headers }), 
                fetch(`${API_BASE}/roles/project/${currentProjectId}`, { headers }) 
            ]);

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setMembers(membersData);
            } else if (membersRes.status === 401 || membersRes.status === 403) {
                localStorage.clear();
                navigate('/login');
            }

            if (rolesRes.ok) {
                const rolesData = await rolesRes.json();
                setRoles(rolesData);
            }
        } catch (error) {
            console.error("Error al cargar los datos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const crearRol = async () => {
        if (!newRoleName.trim()) return;
        
        const safeValue = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');
        
        const rolePayload = { 
            label: newRoleName, 
            value: safeValue, 
            color: newRoleColor,
            projectId: currentProjectId 
        };
        
        try {
            const res = await fetch(`${API_BASE}/roles`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(rolePayload)
            });
            
            if (res.ok) {
                fetchData(); 
                setNewRoleName('');
                setNewRoleColor('#0ea5e9');
            }
        } catch (error) {
            console.error("Error creando el rol:", error);
        }
    };

    const eliminarRol = async (roleId) => {
        try {
            const res = await fetch(`${API_BASE}/roles/${roleId}`, { 
                method: 'DELETE',
                headers: getAuthHeaders() 
            });
            if (res.ok || res.status === 204) {
                fetchData(); 
            }
        } catch (error) {
            console.error("Error eliminando el rol:", error);
        }
    };

    const openAddModal = () => {
        setEditingMemberId(null);
        setName('');
        setRole('');
        setEmail('');
        setAddress('');
        setMemberModalOpen(true);
    };

    const openEditModal = (member) => {
        setEditingMemberId(member.id);
        setName(member.fullName); 
        setRole(member.role);
        setEmail(member.email);
        setAddress(member.location); 
        setMemberModalOpen(true);
    };

    const saveMember = async () => {
        if (!name.trim() || !role) {
            alert("El nombre y el rol son obligatorios");
            return;
        }

        const memberPayload = {
            fullName: name.trim(), 
            role: role,
            email: email || 'Sin especificar',
            location: address || 'Sin especificar', 
            projectId: currentProjectId 
        };

        try {
            const headers = getAuthHeaders(); 
            const url = editingMemberId ? `${API_BASE}/team-members/${editingMemberId}` : `${API_BASE}/team-members`;
            const method = editingMemberId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: headers,
                body: JSON.stringify(memberPayload)
            });
            
            if (res.ok) fetchData();
        } catch (error) {
            console.error("Error guardando el miembro:", error);
        }
        
        setMemberModalOpen(false);
    };

    const deleteMember = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/team-members/${id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders() 
            });
            if (res.ok || res.status === 204) {
                fetchData();
            }
        } catch (error) {
            console.error("Error eliminando el miembro:", error);
        }
    };

    const getRoleColor = (roleValue) => {
        const foundRole = roles.find(r => r.value === roleValue);
        return foundRole ? foundRole.color : '#64748b';
    };

    const formatRoleLabel = (roleValue) => {
        const foundRole = roles.find(r => r.value === roleValue);
        return foundRole ? foundRole.label : roleValue;
    };

    const getInitials = (fullName) => {
        if (!fullName) return 'U';
        const names = fullName.trim().split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.substring(0, 2).toUpperCase();
    };

    const colorItemTemplate = (option) => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: option.value, border: '1px solid #cbd5e1' }}></div>
                <span>{option.label}</span>
            </div>
        );
    };

    const colorValueTemplate = (option, props) => {
        if (option) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: option.value, border: '1px solid #cbd5e1' }}></div>
                    <span>{option.label}</span>
                </div>
            );
        }
        return <span>{props.placeholder}</span>;
    };

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item active" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    
                    {/* 🔒 BLOQUEO EN SIDEBAR */}
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-history"></i> ACTIVITY FEED
                        <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-file-export"></i> REPORTES
                        <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item ai-nav-item" onClick={handleProClick}>
                        <i className="pi pi-sparkles" style={{ color: '#fbbf24' }}></i> 
                        <div className="ai-text">
                            <span>ManageWise</span>
                            <span>AI</span>
                        </div>
                        <span className="pro-text">PRO</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="nav-item exit-item" onClick={() => navigate('/projects')}>
                        <i className="pi pi-arrow-left"></i> Ir a Proyectos
                    </div>
                </div>
            </aside>

            <main className="dashboard-content">
                <div className="content-inner team-inner">
                    <header className="content-header team-header">
                        <div>
                            <h1>Project Team</h1>
                            <p>Gestiona los miembros del equipo y sus roles en el proyecto.</p>
                        </div>
                        <div className="action-buttons">
                            <Button label="Administrar Roles" icon="pi pi-tags" className="btn-role" onClick={() => setRoleModalOpen(true)} />
                            <Button label="Nuevo Miembro" icon="pi pi-user-plus" className="p-button-orange" onClick={openAddModal} />
                        </div>
                    </header>

                    {isLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                            <h2>Cargando Equipo...</h2>
                        </div>
                    ) : (
                        <div className="members-grid">
                            {members.length === 0 && <p className="empty-msg">No hay miembros en el equipo aún.</p>}
                            
                            {members.map(member => (
                                <div key={member.id} className="member-card">
                                    <div className="member-header">
                                        <Avatar label={getInitials(member.fullName)} size="xlarge" shape="circle" className="member-avatar" />
                                        <div className="member-title">
                                            <h3>{member.fullName}</h3>
                                            <Tag value={formatRoleLabel(member.role)} style={{ backgroundColor: getRoleColor(member.role), color: '#ffffff' }} className="role-tag" />
                                        </div>
                                    </div>

                                    <hr className="member-divider" />

                                    <div className="member-details">
                                        <div className="detail-row">
                                            <i className="pi pi-envelope"></i>
                                            <span>{member.email}</span>
                                        </div>
                                        <div className="detail-row">
                                            <i className="pi pi-map-marker"></i>
                                            <span>{member.location}</span>
                                        </div>
                                    </div>

                                    <div className="member-actions">
                                        <Button icon="pi pi-pencil" className="p-button-rounded p-button-secondary action-btn" onClick={() => openEditModal(member)} tooltip="Editar" tooltipOptions={{ position: 'top' }} />
                                        <Button icon="pi pi-trash" className="p-button-rounded p-button-danger action-btn" onClick={() => deleteMember(member.id)} tooltip="Eliminar" tooltipOptions={{ position: 'top' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Dialog header={editingMemberId ? "Editar Miembro" : "Añadir Nuevo Miembro"} visible={isMemberModalOpen} style={{ width: '450px' }} onHide={() => setMemberModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Nombre Completo</label>
                        <InputText value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Maria Lopez" className="w-full" />
                    </div>
                    <div className="field">
                        <label>Rol en el Proyecto</label>
                        <Dropdown value={role} options={roles} onChange={(e) => setRole(e.value)} placeholder="Selecciona un rol" className="w-full" disabled={roles.length === 0} />
                    </div>
                    <div className="field">
                        <label>Correo Electrónico (Opcional)</label>
                        <InputText type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej: correo@empresa.com" className="w-full" />
                    </div>
                    <div className="field">
                        <label>Dirección / Ubicación (Para enviar invitación)</label>
                        <InputText value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Lima, Peru" className="w-full" />
                    </div>
                    
                    <Button label={editingMemberId ? "Actualizar Miembro" : "Guardar Miembro"} className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={saveMember} />
                </div>
            </Dialog>

            <Dialog header="Administrar Roles" visible={isRoleModalOpen} style={{ width: '450px' }} onHide={() => setRoleModalOpen(false)}>
                <div className="modal-form">
                    <div className="role-creation-zone">
                        <div className="field">
                            <label>Nombre del Nuevo Rol</label>
                            <InputText value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Ej: QA Tester" className="w-full" />
                        </div>
                        <div className="field">
                            <label>Color Real (Hex)</label>
                            <Dropdown 
                                value={newRoleColor} 
                                options={colorOptions} 
                                onChange={(e) => setNewRoleColor(e.value)} 
                                itemTemplate={colorItemTemplate}
                                valueTemplate={colorValueTemplate}
                                placeholder="Selecciona un color exacto" 
                                className="w-full" 
                            />
                        </div>
                        <Button label="Guardar Rol" className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={crearRol} />
                    </div>

                    <hr style={{ margin: '1.5rem 0', borderColor: '#e2e8f0', opacity: 0.5 }} />

                    <div className="roles-list">
                        <label>Roles Existentes</label>
                        {roles.length === 0 && <p style={{color: '#64748b', fontSize: '0.9rem'}}>No hay roles creados.</p>}
                        {roles.map(r => (
                            <div key={r.id} className="role-list-item">
                                <Tag value={r.label} style={{ backgroundColor: r.color, color: '#ffffff' }} />
                                <Button icon="pi pi-trash" className="p-button-rounded p-button-danger p-button-sm action-btn" onClick={() => eliminarRol(r.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>

            {/* 💎 MODAL PLANES UNIFICADO (ÚNICO) */}
            <Dialog 
                visible={isAiModalOpen} 
                style={{ width: '90vw', maxWidth: '800px' }} 
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
                        <p>ManageWise AI y las exportaciones avanzadas requieren una suscripción activa.</p>
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
