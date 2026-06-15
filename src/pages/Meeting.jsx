import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { useNavigate } from 'react-router-dom';
import './Meeting.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Meeting() {
    const navigate = useNavigate();
    const currentProjectId = localStorage.getItem('current_project_id');

    // --- ESTADOS DE MODALES ---
    const [isMeetingModalOpen, setMeetingModalOpen] = useState(false);
    const [isRecordModalOpen, setRecordModalOpen] = useState(false);
    const [isAiModalOpen, setAiModalOpen] = useState(false); 
    
    const [editingMeetingId, setEditingMeetingId] = useState(null);
    const [editingRecordId, setEditingRecordId] = useState(null);

    // --- ESTADOS DE DATOS ---
    const [meetings, setMeetings] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');

    // --- ESTADOS DE FORMULARIO REUNIÓN ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState(''); 
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [link, setLink] = useState('');

    // --- ESTADOS DE FORMULARIO GRABACIÓN ---
    const [recTitle, setRecTitle] = useState('');
    const [recDate, setRecDate] = useState('');
    const [recDuration, setRecDuration] = useState('');
    const [recAccess, setRecAccess] = useState('Público');
    const [recLink, setRecLink] = useState('');

    const accessOptions = [
        { label: 'Público', value: 'Público' },
        { label: 'Privado', value: 'Privado' }
    ];

    // 🚨 MANEJADOR DE CLICS PRO
    const handleProClick = (e) => {
        if (e) e.preventDefault();
        setAiModalOpen(true);
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) { navigate('/login'); throw new Error("No token"); }
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    };

    // --- OBTENER DATOS ---
    const fetchMeetingsAndRecordings = async () => {
        if (!currentProjectId) { navigate('/projects'); return; }
        setIsLoading(true);
        try {
            const headers = getAuthHeaders();
            const [meetingsRes, recordingsRes] = await Promise.all([
                fetch(`${API_BASE}/meetings/project/${currentProjectId}`, { headers }),
                fetch(`${API_BASE}/recordings/project/${currentProjectId}`, { headers })
            ]);
            
            if (meetingsRes.ok) setMeetings(await meetingsRes.json());
            if (recordingsRes.ok) setRecordings(await recordingsRes.json());
        } catch (error) { 
            console.error("Error cargando datos", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { fetchMeetingsAndRecordings(); }, []);

    // --- HELPERS FECHAS ---
    const extractDateFromISO = (iso) => iso ? iso.split('T')[0] : '';
    const extractTimeFromISO = (iso) => iso ? iso.split('T')[1]?.substring(0, 5) : '';
    const createISOString = (d, t) => `${d}T${t}:00.000Z`;

    const getMeetingStatus = (isoDate) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const meetingDate = extractDateFromISO(isoDate);
        if (meetingDate === todayStr) return { label: 'HOY', severity: 'danger' };
        if (meetingDate < todayStr) return { label: 'PASADA', severity: 'secondary' };
        return { label: 'PRÓXIMA', severity: 'info' };
    };

    // --- LÓGICA DE REUNIONES ---
    const openAddMeetingModal = () => {
        setEditingMeetingId(null);
        setTitle(''); setDescription(''); setDate(''); setTime(''); setLink('');
        setMeetingModalOpen(true);
    };

    const openEditMeetingModal = (meeting) => {
        setEditingMeetingId(meeting.id);
        setTitle(meeting.title);
        setDescription(meeting.description || '');
        setDate(extractDateFromISO(meeting.scheduledAt)); 
        setTime(extractTimeFromISO(meeting.scheduledAt)); 
        setLink(meeting.meetingUrl); 
        setMeetingModalOpen(true);
    };

    const saveMeeting = async () => {
        if (!title.trim() || !date || !time) {
            alert("El título, fecha y hora son obligatorios.");
            return;
        }

        const payload = { 
            title, 
            description: description || 'Revisión', 
            scheduledAt: createISOString(date, time), 
            meetingUrl: link || 'https://meet.google.com/', 
            projectId: currentProjectId 
        };
        
        const method = editingMeetingId ? 'PUT' : 'POST';
        const url = editingMeetingId ? `${API_BASE}/meetings/${editingMeetingId}` : `${API_BASE}/meetings`;
        
        await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
        setMeetingModalOpen(false);
        fetchMeetingsAndRecordings();
    };

    const deleteMeeting = async (id) => {
        await fetch(`${API_BASE}/meetings/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        fetchMeetingsAndRecordings();
    };

    // --- LÓGICA DE GRABACIONES ---
    const openAddRecordModal = () => {
        setEditingRecordId(null);
        setRecTitle(''); setRecDate(''); setRecDuration(''); setRecAccess('Público'); setRecLink('');
        setRecordModalOpen(true);
    };

    const openEditRecordModal = (rec) => {
        setEditingRecordId(rec.id);
        setRecTitle(rec.title);
        setRecDate(extractDateFromISO(rec.recordedAt) || '');
        setRecDuration(rec.duration || '');
        setRecAccess(rec.access || 'Público');
        setRecLink(rec.videoUrl || '');
        setRecordModalOpen(true);
    };

    const saveRecording = async () => {
        if (!recTitle.trim() || !recDate) return;
        const payload = { 
            title: recTitle, 
            recordedAt: createISOString(recDate, "12:00"), 
            duration: recDuration, 
            access: recAccess, 
            videoUrl: recLink, 
            projectId: currentProjectId 
        };
        const method = editingRecordId ? 'PUT' : 'POST';
        const url = editingRecordId ? `${API_BASE}/recordings/${editingRecordId}` : `${API_BASE}/recordings`;
        
        await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
        setRecordModalOpen(false);
        fetchMeetingsAndRecordings();
    };

    const deleteRecording = async (id) => {
        await fetch(`${API_BASE}/recordings/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        fetchMeetingsAndRecordings();
    };

    // --- TEMPLATES PARA LA TABLA ---
    const actionBodyTemplate = (rowData) => (
        <div className="table-actions">
            <Button icon="pi pi-pencil" className="p-button-rounded p-button-secondary action-btn-small mr-2" onClick={() => openEditRecordModal(rowData)} />
            <Button icon="pi pi-trash" className="p-button-rounded p-button-danger action-btn-small" onClick={() => deleteRecording(rowData.id)} />
        </div>
    );
    const linkBodyTemplate = (rowData) => <a href={rowData.videoUrl} target="_blank" rel="noreferrer" className="table-link-btn"><i className="pi pi-external-link"></i> Abrir</a>;
    const dateBodyTemplate = (rowData) => <span>{extractDateFromISO(rowData.recordedAt)}</span>;
    
    // 🚨 AQUÍ ESTÁ LA SOLUCIÓN AL PUNTITO NARANJA: Si rowData.access viene vacío de la DB, le ponemos 'Público'
    const accessBodyTemplate = (rowData) => {
        const accesoReal = rowData.access || 'Público';
        return <Tag value={accesoReal} severity={accesoReal === 'Público' ? 'success' : 'warning'} />;
    };

    const tableHeader = (
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar grabación..." />
            </span>
            <Button label="Añadir Grabación" icon="pi pi-video" className="p-button-secondary" onClick={openAddRecordModal} />
        </div>
    );

    // --- RENDER ---
    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item active" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    
                    {/* BLOQUEADOS CON MODAL PLANES */}
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-history"></i> ACTIVITY FEED <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-file-export"></i> REPORTES <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item ai-nav-item" onClick={handleProClick}>
                        <i className="pi pi-sparkles" style={{ color: '#fbbf24' }}></i> 
                        <div className="ai-text"><span>ManageWise AI</span></div>
                        <span className="pro-text">PRO</span>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item exit-item" onClick={() => navigate('/projects')}><i className="pi pi-arrow-left"></i> Proyectos</div>
                </div>
            </aside>

            <main className="dashboard-content">
                <div className="content-inner">
                    <header className="content-header">
                        <h1>Reuniones y Grabaciones</h1>
                        <Button label="Nueva Reunión" icon="pi pi-plus" className="p-button-orange" onClick={openAddMeetingModal} />
                    </header>

                    {isLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                            <h2>Cargando reuniones...</h2>
                        </div>
                    ) : (
                        <>
                            {/* 🚨 ESTRUCTURA HTML ORIGINAL RESTAURADA PARA EL CSS */}
                            <div className="meetings-grid">
                                {meetings.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', width: '100%', gridColumn: '1 / -1' }}>
                                        <i className="pi pi-calendar-times" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem', display: 'block' }}></i>
                                        <p style={{ color: '#64748b', margin: 0 }}>No hay reuniones programadas para este proyecto.</p>
                                    </div>
                                )}
                                
                                {meetings.map(meeting => {
                                    const status = getMeetingStatus(meeting.scheduledAt);
                                    return (
                                        <div key={meeting.id} className="meeting-card">
                                            <div className="meeting-content">
                                                
                                                <div className="meeting-info-header">
                                                    <h3>{meeting.title}</h3>
                                                    <Tag value={status.label} severity={status.severity} />
                                                </div>
                                                
                                                <div className="meeting-time-block">
                                                    <div className="time-row">
                                                        <i className="pi pi-calendar"></i>
                                                        <span>{extractDateFromISO(meeting.scheduledAt)}</span>
                                                    </div>
                                                    <div className="time-row">
                                                        <i className="pi pi-clock"></i>
                                                        <span>{extractTimeFromISO(meeting.scheduledAt)} Hrs</span>
                                                    </div>
                                                </div>

                                                <div className="meeting-footer">
                                                    <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="join-btn">
                                                        <i className="pi pi-video"></i> Entrar a la Reunión
                                                    </a>
                                                    <div className="meeting-actions">
                                                        <Button icon="pi pi-pencil" className="p-button-rounded p-button-secondary action-btn" onClick={() => openEditMeetingModal(meeting)} />
                                                        <Button icon="pi pi-trash" className="p-button-rounded p-button-danger action-btn" onClick={() => deleteMeeting(meeting.id)} />
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <hr style={{ margin: '3rem 0', borderColor: '#e2e8f0', opacity: 0.5 }} />

                            <div className="recordings-section">
                                <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Grabaciones Anteriores</h2>
                                <DataTable value={recordings} header={tableHeader} globalFilter={globalFilter} emptyMessage="No se encontraron grabaciones." className="custom-datatable" responsiveLayout="scroll">
                                    <Column field="title" header="Título" sortable></Column>
                                    <Column body={dateBodyTemplate} header="Fecha" sortable></Column>
                                    <Column field="duration" header="Duración"></Column>
                                    <Column body={accessBodyTemplate} header="Acceso"></Column>
                                    <Column body={linkBodyTemplate} header="Enlace"></Column>
                                    <Column body={actionBodyTemplate} header="Acciones" style={{ textAlign: 'right' }}></Column>
                                </DataTable>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* MODALES REUNIÓN Y GRABACIÓN */}
            <Dialog header={editingMeetingId ? "Editar Reunión" : "Programar Nueva Reunión"} visible={isMeetingModalOpen} style={{ width: '450px' }} onHide={() => setMeetingModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Título</label>
                        <InputText value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" />
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="field half-width" style={{ flex: 1 }}>
                            <label>Fecha</label>
                            <InputText type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
                        </div>
                        <div className="field half-width" style={{ flex: 1 }}>
                            <label>Hora</label>
                            <InputText type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />
                        </div>
                    </div>
                    <div className="field">
                        <label>Link (Meet/Zoom)</label>
                        <InputText type="url" value={link} onChange={(e) => setLink(e.target.value)} className="w-full" />
                    </div>
                    <Button label={editingMeetingId ? "Actualizar Reunión" : "Guardar Reunión"} className="p-button-orange w-full mt-4" onClick={saveMeeting} />
                </div>
            </Dialog>

            <Dialog header={editingRecordId ? "Editar Grabación" : "Añadir Grabación"} visible={isRecordModalOpen} style={{ width: '450px' }} onHide={() => setRecordModalOpen(false)}>
                <div className="modal-form">
                    <div className="field">
                        <label>Título</label>
                        <InputText value={recTitle} onChange={(e) => setRecTitle(e.target.value)} className="w-full" />
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="field half-width" style={{ flex: 1 }}>
                            <label>Fecha</label>
                            <InputText type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} className="w-full" />
                        </div>
                        <div className="field half-width" style={{ flex: 1 }}>
                            <label>Duración</label>
                            <InputText value={recDuration} onChange={(e) => setRecDuration(e.target.value)} placeholder="Ej: 01:20:00" className="w-full" />
                        </div>
                    </div>
                    <div className="field">
                        <label>Nivel de Acceso</label>
                        <Dropdown value={recAccess} options={accessOptions} onChange={(e) => setRecAccess(e.value)} className="w-full" />
                    </div>
                    <div className="field">
                        <label>Link del Video (Drive/Youtube)</label>
                        <InputText type="url" value={recLink} onChange={(e) => setRecLink(e.target.value)} className="w-full" />
                    </div>
                    <Button label={editingRecordId ? "Actualizar Grabación" : "Guardar Grabación"} className="p-button-orange w-full mt-4" onClick={saveRecording} />
                </div>
            </Dialog>

            {/* MODAL PLANES */}
            <Dialog visible={isAiModalOpen} onHide={() => setAiModalOpen(false)} showHeader={false} dismissableMask style={{ width: '90vw', maxWidth: '800px' }}>
                <div className="pricing-popup-container">
                    <div className="upgrade-header">
                        <h1>Actualiza tu Plan</h1>
                        <p>Las funciones Pro requieren una suscripción activa.</p>
                    </div>
                    <div className="pricing-grid">
                        <div className="pricing-card">
                            <h3>Plan Light</h3>
                            <div className="price"><span>$0</span></div>
                            <Button label="Tu Plan Actual" disabled className="w-full" />
                        </div>
                        <div className="pricing-card popular">
                            <h3>Pro Business</h3>
                            <div className="price"><span>$29</span></div>
                            <Button label="Actualizar a Pro" className="p-button-orange w-full" />
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
