import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Avatar } from 'primereact/avatar';
import { useNavigate } from 'react-router-dom';
import './Backlog.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Backlog() {
    const navigate = useNavigate();
    
    // 🚀 MAGIA: Sacamos el ID del proyecto actual directo de la memoria
    const currentProjectId = localStorage.getItem('current_project_id');

    // --- ESTADOS DE LOS MODALES ---
    const [isStoryModalOpen, setStoryModalOpen] = useState(false);
    const [isSprintModalOpen, setSprintModalOpen] = useState(false);
    const [isEpicModalOpen, setEpicModalOpen] = useState(false);
    const [isConfirmCloseSprintOpen, setConfirmCloseSprintOpen] = useState(false);
    const [isAiModalOpen, setAiModalOpen] = useState(false); // 🚨 Modal de Planes Premium

    // --- ESTADOS DE DATOS DINÁMICOS ---
    const [epics, setEpics] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [productBacklog, setProductBacklog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);

    const colorOptions = [
        { label: 'Celeste', value: 'info' },
        { label: 'Naranja', value: 'warning' },
        { label: 'Verde', value: 'success' },
        { label: 'Gris', value: 'secondary' }
    ];

    const statusOptions = [
        { label: 'To Do (Por hacer)', value: 'TO_DO' },
        { label: 'In Progress (En curso)', value: 'IN_PROGRESS' },
        { label: 'Done (Terminado)', value: 'DONE' }
    ];

    // --- ESTADOS DE FORMULARIOS ---
    const [editingStoryId, setEditingStoryId] = useState(null); 
    const [newStoryTitle, setNewStoryTitle] = useState('');
    const [newStoryStatement, setNewStoryStatement] = useState('');
    const [newStoryEpicId, setNewStoryEpicId] = useState(null); 
    const [newStoryPoints, setNewStoryPoints] = useState('');
    const [newStoryUser, setNewStoryUser] = useState(null); 
    const [editingStorySprintId, setEditingStorySprintId] = useState(null);
    const [newStoryStatus, setNewStoryStatus] = useState('TO_DO'); 
    
    const [newSprintName, setNewSprintName] = useState('');
    const [newSprintGoal, setNewSprintGoal] = useState('');
    const [newSprintEndDate, setNewSprintEndDate] = useState('');

    const [newEpicName, setNewEpicName] = useState('');
    const [newEpicColor, setNewEpicColor] = useState('info');

    const [sprintToComplete, setSprintToComplete] = useState(null);

    // 🚨 MANEJADOR DE CLICS PRO
    const handleProClick = (e) => {
        if (e) e.preventDefault();
        setAiModalOpen(true);
    };

    // 🚨 FUNCIÓN AUXILIAR: Obtener Cabeceras de Seguridad
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
    // 1. CARGA INICIAL
    // ==========================================
    const fetchAllData = async () => {
        if (!currentProjectId) {
            navigate('/projects');
            return;
        }

        setIsLoading(true);
        try {
            const headers = getAuthHeaders(); 

            const [epicsRes, sprintsRes, storiesRes, membersRes] = await Promise.all([
                fetch(`${API_BASE}/epics`, { headers }), 
                fetch(`${API_BASE}/sprints/project/${currentProjectId}`, { headers }), 
                fetch(`${API_BASE}/user-stories/project/${currentProjectId}`, { headers }), 
                fetch(`${API_BASE}/team-members/project/${currentProjectId}`, { headers }) 
            ]);

            if (epicsRes.ok) {
                const epicsData = await epicsRes.json();
                const misEpicas = epicsData.filter(e => e.projectId === currentProjectId || !e.projectId);
                setEpics(misEpicas.map(e => ({ 
                    label: e.title, 
                    value: e.id, 
                    color: e.description || 'info' 
                })));
            }

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setTeamMembers(membersData.map(m => ({
                    label: m.fullName,
                    value: m.id
                })));
            }

            if (sprintsRes.ok && storiesRes.ok) {
                const misSprints = await sprintsRes.json();
                const misHistorias = await storiesRes.json();

                const formattedSprints = misSprints.map(s => ({
                    id: s.id,
                    name: s.name,
                    dates: `Finaliza: ${s.endDate ? s.endDate.split('T')[0] : 'Sin fecha'}`,
                    status: s.status || 'PLANNING',
                    stories: misHistorias.filter(story => story.sprintId === s.id)
                }));

                const backlogStories = misHistorias.filter(story => !story.sprintId);

                setSprints(formattedSprints);
                setProductBacklog(backlogStories);
            } else if (sprintsRes.status === 401 || sprintsRes.status === 403) {
                localStorage.clear();
                navigate('/login');
            }
        } catch (error) {
            console.error("Error cargando los datos del Backlog:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // ==========================================
    // 2. CREACIÓN & EDICIÓN
    // ==========================================
    const crearEpica = async () => {
        if (!newEpicName.trim()) return;
        const nuevaEpicaPayload = { 
            title: newEpicName, 
            description: newEpicColor,
            projectId: currentProjectId 
        };
        try {
            const response = await fetch(`${API_BASE}/epics`, {
                method: 'POST',
                headers: getAuthHeaders(), 
                body: JSON.stringify(nuevaEpicaPayload)
            });
            if (response.ok) {
                fetchAllData();
                setNewEpicName('');
                setNewEpicColor('info');
            }
        } catch (error) {
            console.error("Error al crear épica", error);
        }
    };

    const guardarHistoria = async () => {
        if (!newStoryTitle.trim() || !newStoryEpicId) {
            alert("Por favor, ingresa un título y selecciona una épica.");
            return;
        }

        try {
            const headers = getAuthHeaders(); 
            const payload = {
                title: newStoryTitle.trim(),
                statement: newStoryStatement.trim(),
                epicId: newStoryEpicId, 
                sprintId: editingStorySprintId || null, 
                points: parseInt(newStoryPoints) || 0,
                assigneeId: newStoryUser || null,
                status: newStoryStatus,
                projectId: currentProjectId 
            };

            const url = editingStoryId ? `${API_BASE}/user-stories/${editingStoryId}` : `${API_BASE}/user-stories`;
            const method = editingStoryId ? 'PUT' : 'POST';

            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (res.ok) fetchAllData(); 
        } catch (error) {
            console.error("Error guardando historia", error);
        }
        setStoryModalOpen(false);
    };

    const crearSprint = async () => {
        if (!newSprintName.trim()) return;
        const sprintPayload = {
            name: newSprintName,
            goal: newSprintGoal,
            endDate: newSprintEndDate,
            status: 'PLANNING',
            projectId: currentProjectId 
        };

        try {
            const res = await fetch(`${API_BASE}/sprints`, {
                method: 'POST',
                headers: getAuthHeaders(), 
                body: JSON.stringify(sprintPayload)
            });
            if (res.ok) fetchAllData();
        } catch (error) {
            console.error("Error creando sprint", error);
        }

        setNewSprintName('');
        setNewSprintGoal('');
        setNewSprintEndDate('');
        setSprintModalOpen(false);
    };
    
    const eliminarEpica = async (epicId) => {
        try {
            await fetch(`${API_BASE}/epics/${epicId}`, { method: 'DELETE', headers: getAuthHeaders() });
            setEpics(epics.filter(e => e.value !== epicId));
        } catch (error) {
            console.error("Error al eliminar épica", error);
        }
    };

    const abrirModalCrearHistoria = () => {
        setEditingStoryId(null);
        setNewStoryTitle('');
        setNewStoryStatement(''); 
        setNewStoryEpicId(null);
        setNewStoryPoints('');
        setNewStoryUser(null); 
        setEditingStorySprintId(null); 
        setNewStoryStatus('TO_DO'); 
        setStoryModalOpen(true);
    };

    const abrirModalEditarHistoria = (story) => {
        setEditingStoryId(story.id);
        setNewStoryTitle(story.title);
        setNewStoryStatement(story.statement || ''); 
        setNewStoryEpicId(story.epicId);
        setNewStoryPoints(story.points);
        setNewStoryUser(story.assigneeId || null); 
        setEditingStorySprintId(story.sprintId || null);
        setNewStoryStatus(story.status || 'TO_DO'); 
        setStoryModalOpen(true);
    };

    const eliminarHistoria = async (storyId) => {
        try {
            await fetch(`${API_BASE}/user-stories/${storyId}`, { method: 'DELETE', headers: getAuthHeaders() });
            fetchAllData();
        } catch (error) {
            console.error("Error eliminando historia", error);
        }
    };

    const completarSprint = async () => {
        if (!sprintToComplete) return;

        try {
            const res = await fetch(`${API_BASE}/sprints/${sprintToComplete}/complete`, { 
                method: 'POST', headers: getAuthHeaders() 
            });
            if (res.ok) fetchAllData(); 
        } catch (error) {
            console.error("Error de conexión al completar el sprint", error);
        }
        
        setConfirmCloseSprintOpen(false);
        setSprintToComplete(null);
    };

    const eliminarSprint = async (sprintId) => {
        try {
            const res = await fetch(`${API_BASE}/sprints/${sprintId}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (res.ok || res.status === 204 || res.status === 404) fetchAllData(); 
        } catch (error) {
            console.error("Error eliminando sprint", error);
        }
    };

    // ==========================================
    // 3. LÓGICA DE DRAG & DROP
    // ==========================================
    const handleDragStart = (e, storyId, sourceZone) => {
        e.dataTransfer.setData("storyId", storyId);
        e.dataTransfer.setData("sourceZone", sourceZone);
    };

    const handleDragOver = (e) => { e.preventDefault(); };

    const processDrop = async (e, targetZone, targetIndex, targetSprintId = null) => {
        const storyId = e.dataTransfer.getData("storyId");
        const sourceZone = e.dataTransfer.getData("sourceZone");

        if (!storyId) return;

        let newBacklog = [...productBacklog];
        let newSprints = [...sprints];
        let movedStory;

        if (sourceZone === 'backlog') {
            const idx = newBacklog.findIndex(s => s.id === storyId);
            movedStory = newBacklog[idx];
            newBacklog.splice(idx, 1);
        } else if (sourceZone === 'sprint') {
            for (let i = 0; i < newSprints.length; i++) {
                const idx = newSprints[i].stories.findIndex(s => s.id === storyId);
                if (idx !== -1) {
                    movedStory = newSprints[i].stories[idx];
                    newSprints[i].stories.splice(idx, 1);
                    break;
                }
            }
        }

        if (!movedStory) return;

        if (targetZone === 'backlog') {
            if (targetIndex !== null) newBacklog.splice(targetIndex, 0, movedStory);
            else newBacklog.push(movedStory);
        } else if (targetZone === 'sprint' && targetSprintId) {
            const sprintIndex = newSprints.findIndex(s => s.id === targetSprintId);
            if (targetIndex !== null) newSprints[sprintIndex].stories.splice(targetIndex, 0, movedStory);
            else newSprints[sprintIndex].stories.push(movedStory);
        }

        setProductBacklog(newBacklog);
        setSprints(newSprints);

        try {
            const updatedSprintId = targetZone === 'sprint' ? targetSprintId : null;
            const putPayload = {
                title: movedStory.title,
                statement: movedStory.statement || '', 
                epicId: movedStory.epicId, 
                sprintId: updatedSprintId,
                points: movedStory.points || 0,
                assigneeId: movedStory.assigneeId || null,
                status: movedStory.status || "TO_DO",
                projectId: currentProjectId 
            };

            await fetch(`${API_BASE}/user-stories/${storyId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(putPayload)
            });
        } catch (error) {
            console.error("Error al mover la historia en la base de datos", error);
        }
    };

    const handleDropOnCard = (e, targetZone, targetIndex, sprintId = null) => {
        e.preventDefault(); e.stopPropagation(); processDrop(e, targetZone, targetIndex, sprintId);
    };

    const handleDropOnZone = (e, targetZone, sprintId = null) => {
        e.preventDefault(); processDrop(e, targetZone, null, sprintId);
    };

    // --- FUNCIONES AUXILIARES PARA UI ---
    const getEpicName = (epicId) => epics.find(e => e.value === epicId)?.label || 'Sin Épica';
    const getEpicColor = (epicId) => epics.find(e => e.value === epicId)?.color || 'secondary';

    const renderStoryStatus = (status) => {
        switch(status) {
            case 'DONE': return <Tag value="Done" severity="success" style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem'}} />;
            case 'IN_PROGRESS': return <Tag value="In Progress" severity="warning" style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem'}} />;
            case 'TO_DO': 
            default: return <Tag value="To Do" severity="info" style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569'}} />;
        }
    };

    const getAssigneeInitials = (assigneeId) => {
        if (!assigneeId || assigneeId === "") return null;
        const member = teamMembers.find(m => m.value === assigneeId);
        if (!member) return 'U';
        const names = member.label.trim().split(' ');
        return names.length >= 2 ? (names[0][0] + names[1][0]).toUpperCase() : member.label.substring(0, 2).toUpperCase();
    };

    const confirmFooter = (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setConfirmCloseSprintOpen(false)} className="p-button-text" style={{ color: '#64748b' }} />
            <Button label="Sí, Completar Sprint" icon="pi pi-check" onClick={completarSprint} className="p-button-orange" autoFocus />
        </div>
    );

    const renderStoryCard = (story, index, zone, sprintId = null) => (
        <div 
            key={story.id} 
            className="story-card draggable"
            draggable
            onDragStart={(e) => handleDragStart(e, story.id, zone)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnCard(e, zone, index, sprintId)}
            onClick={() => abrirModalEditarHistoria(story)}
            style={{ cursor: 'pointer' }}
        >
            <div className="story-main">
                <span className="story-id">{story.id.substring(0,8)}</span>
                <span className="story-title">{story.title}</span>
                <Tag value={getEpicName(story.epicId)} severity={getEpicColor(story.epicId)} className="epic-tag" />
            </div>
            <div className="story-meta">
                {renderStoryStatus(story.status)}
                <div className="story-points">{story.points}</div>
                {story.assigneeId && story.assigneeId !== "" ? 
                    <Avatar label={getAssigneeInitials(story.assigneeId)} shape="circle" className="user-avatar" /> : 
                    <Avatar icon="pi pi-user" shape="circle" className="user-avatar empty-avatar" />
                }
                <div className="story-actions">
                    <Button 
                        icon="pi pi-trash" 
                        className="p-button-rounded p-button-danger p-button-sm action-btn" 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            eliminarHistoria(story.id);
                        }} 
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item active" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
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
                        <div className="ai-text"><span>ManageWise</span><span>AI</span></div>
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
                <div className="content-inner backlog-inner">
                    <header className="content-header backlog-header">
                        <div>
                            <h1>Product Backlog</h1>
                            <p>Gestiona tus Historias de Usuario, Épicas y planifica tus Sprints.</p>
                        </div>
                        <div className="action-buttons">
                            <Button label="Administrar Épicas" icon="pi pi-tags" className="btn-epic" onClick={() => setEpicModalOpen(true)} />
                            <Button label="Nuevo Sprint" icon="pi pi-box" className="btn-sprint" onClick={() => setSprintModalOpen(true)} />
                            <Button label="Nueva Historia" icon="pi pi-plus" className="p-button-orange" onClick={abrirModalCrearHistoria} />
                        </div>
                    </header>

                    {isLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                            <h2>Cargando Backlog...</h2>
                        </div>
                    ) : (
                        <>
                            <div className="sprints-container">
                                {sprints.map(sprint => (
                                    <div 
                                        key={sprint.id} 
                                        className="sprint-block drop-zone"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnZone(e, 'sprint', sprint.id)}
                                    >
                                        <div className="sprint-header">
                                            <div className="sprint-title-group">
                                                <h2>{sprint.name}</h2>
                                                <span className="sprint-dates">{sprint.dates}</span>
                                                <Tag 
                                                    value={sprint.status || 'PLANNING'} 
                                                    severity={
                                                        sprint.status === 'COMPLETED' ? 'success' : 
                                                        sprint.status === 'ACTIVE' ? 'warning' : 'info'
                                                    } 
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <Button 
                                                    icon="pi pi-trash" 
                                                    className="p-button-rounded p-button-danger p-button-text" 
                                                    tooltip="Eliminar Sprint"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={() => eliminarSprint(sprint.id)}
                                                />
                                                <Button 
                                                    label="Completar Sprint" 
                                                    className="btn-complete-sprint" 
                                                    onClick={() => {
                                                        setSprintToComplete(sprint.id);
                                                        setConfirmCloseSprintOpen(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="story-list">
                                            {sprint.stories.length === 0 && <p className="empty-drop-msg">Arrastra historias aquí para planificar este Sprint</p>}
                                            {sprint.stories.map((story, index) => renderStoryCard(story, index, 'sprint', sprint.id))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div 
                                className="backlog-container drop-zone"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnZone(e, 'backlog')}
                            >
                                <div className="backlog-header-bar">
                                    <h2>Backlog General</h2>
                                    <span className="story-count">{productBacklog.length} issues</span>
                                </div>
                                
                                <div className="story-list">
                                    {productBacklog.length === 0 && <p className="empty-drop-msg">El Backlog está vacío. ¡Buen trabajo!</p>}
                                    {productBacklog.map((story, index) => renderStoryCard(story, index, 'backlog'))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* MODALES DE CREACIÓN Y EDICIÓN */}
            <Dialog header="Administrar Épicas" visible={isEpicModalOpen} style={{ width: '450px' }} onHide={() => setEpicModalOpen(false)}>
                <div className="modal-form">
                    <div className="epic-creation-zone">
                        <div className="field">
                            <label>Nombre de la Nueva Épica</label>
                            <InputText value={newEpicName} onChange={(e) => setNewEpicName(e.target.value)} placeholder="Ej: Pasarela de Pagos" className="w-full" />
                        </div>
                        <div className="field">
                            <label>Color de Etiqueta (Tag)</label>
                            <Dropdown value={newEpicColor} options={colorOptions} onChange={(e) => setNewEpicColor(e.value)} placeholder="Selecciona un color" className="w-full" />
                        </div>
                        <Button label="Guardar Épica" className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={crearEpica} />
                    </div>
                    <hr style={{ margin: '1.5rem 0', borderColor: '#e2e8f0', opacity: 0.5 }} />
                    <div className="epics-list">
                        <label>Épicas Existentes</label>
                        {epics.length === 0 && <p style={{color: '#64748b', fontSize: '0.9rem'}}>No hay épicas creadas.</p>}
                        {epics.map(epic => (
                            <div key={epic.value} className="epic-list-item">
                                <Tag value={epic.label} severity={epic.color} />
                                <Button icon="pi pi-trash" className="p-button-rounded p-button-danger p-button-sm action-btn" onClick={() => eliminarEpica(epic.value)} />
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>

            <Dialog header={editingStoryId ? "Editar Historia" : "Crear Nueva Historia"} visible={isStoryModalOpen} style={{ width: '450px' }} onHide={() => setStoryModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Título de la Historia</label>
                        <InputText value={newStoryTitle} onChange={(e) => setNewStoryTitle(e.target.value)} placeholder="Ej: Pantalla de Login" className="w-full" />
                    </div>
                    
                    <div className="field">
                        <label>Descripción (Historia de Usuario)</label>
                        <InputTextarea 
                            value={newStoryStatement} 
                            onChange={(e) => setNewStoryStatement(e.target.value)} 
                            rows={4} 
                            placeholder="Ej: Como usuario, quiero iniciar sesión con mi correo para acceder a mi cuenta." 
                            className="w-full" 
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <div className="field">
                        <label>Épica a la que pertenece</label>
                        <Dropdown value={newStoryEpicId} options={epics} onChange={(e) => setNewStoryEpicId(e.value)} placeholder={epics.length === 0 ? "Crea una épica primero" : "Selecciona una Épica"} className="w-full" disabled={epics.length === 0} />
                    </div>
                    <div className="field">
                        <label>Asignar a (Opcional)</label>
                        <Dropdown 
                            value={newStoryUser} 
                            options={teamMembers} 
                            onChange={(e) => setNewStoryUser(e.value)} 
                            placeholder={teamMembers.length === 0 ? "No hay miembros creados" : "Selecciona un miembro"} 
                            className="w-full" 
                            disabled={teamMembers.length === 0}
                            showClear
                        />
                    </div>
                    <div className="field">
                        <label>Estado de la Tarea</label>
                        <Dropdown 
                            value={newStoryStatus} 
                            options={statusOptions} 
                            onChange={(e) => setNewStoryStatus(e.value)} 
                            className="w-full" 
                            disabled={!editingStoryId} 
                        />
                    </div>
                    <div className="field">
                        <label>Puntos de Esfuerzo (Story Points)</label>
                        <InputText type="number" value={newStoryPoints} onChange={(e) => setNewStoryPoints(e.target.value)} placeholder="Ej: 5" className="w-full" />
                    </div>
                    <Button label={editingStoryId ? "Actualizar Historia" : "Guardar Historia"} className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={guardarHistoria} />
                </div>
            </Dialog>

            <Dialog header="Planificar Nuevo Sprint" visible={isSprintModalOpen} style={{ width: '450px' }} onHide={() => setSprintModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Nombre del Sprint</label>
                        <InputText value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} placeholder="Ej: Sprint 3 - Pasarela de Pagos" className="w-full" />
                    </div>
                    <div className="field">
                        <label>Objetivo principal</label>
                        <InputText value={newSprintGoal} onChange={(e) => setNewSprintGoal(e.target.value)} placeholder="¿Qué queremos lograr?" className="w-full" />
                    </div>
                    <div className="field">
                        <label>Fecha de Fin del Sprint</label>
                        <InputText type="date" value={newSprintEndDate} onChange={(e) => setNewSprintEndDate(e.target.value)} className="w-full" />
                    </div>
                    <Button label="Crear Sprint" className="p-button-orange w-full" style={{ marginTop: '1.5rem' }} onClick={crearSprint} />
                </div>
            </Dialog>

            <Dialog header="Confirmar Acción" visible={isConfirmCloseSprintOpen} style={{ width: '400px' }} footer={confirmFooter} onHide={() => setConfirmCloseSprintOpen(false)}>
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle mr-3" style={{ fontSize: '2rem', color: '#f97316' }} />
                    <span>¿Estás seguro de que deseas completar este Sprint? Las tareas no finalizadas se moverán al Backlog General.</span>
                </div>
            </Dialog>

            {/* 💎 MODAL DE PLANES (PRO) UNIFICADO */}
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
