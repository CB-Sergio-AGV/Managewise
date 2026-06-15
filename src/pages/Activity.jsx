import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import './Activity.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';
export default function Activity() {
    const navigate = useNavigate();
    
    // 🚀 MAGIA: Sacamos el ID del proyecto actual de la memoria
    const currentProjectId = localStorage.getItem('current_project_id');

    const [isAiModalOpen, setAiModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState(null);
    const [activities, setActivities] = useState([]);

    const eventTypes = [
        { label: 'Todos los eventos', value: null },
        { label: 'Desarrollo (Tickets)', value: 'dev' },
        { label: 'Reuniones', value: 'meeting' },
        { label: 'Alertas de IA', value: 'ai' }
    ];

    const formatDateTime = (isoString) => {
        if (!isoString) return { date: 'Fecha desconocida', time: '' };
        
        const d = new Date(isoString);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const dateStr = isToday ? 'Hoy' : isYesterday ? 'Ayer' : d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return { date: dateStr, time: timeStr };
    };

    const getTypeStyles = (type) => {
        switch(type?.toLowerCase()) {
            case 'meeting': return { icon: 'pi pi-video', color: '#f97316' }; 
            case 'dev': return { icon: 'pi pi-check-circle', color: '#0ea5e9' }; 
            case 'ai': return { icon: 'pi pi-sparkles', color: '#fbbf24' }; 
            default: return { icon: 'pi pi-info-circle', color: '#64748b' }; 
        }
    };

    // ==========================================
    // 1. CARGA SEGURA DE ACTIVIDADES
    // ==========================================
    const fetchActivities = async () => {
        if (!currentProjectId) {
            navigate('/projects');
            return;
        }

        // 🚨 SACAMOS EL TOKEN
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setIsLoading(true);
        try {
            // 🚨 AÑADIMOS EL TOKEN A LAS CABECERAS
            const res = await fetch(`${API_BASE}/activities/project/${currentProjectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                // 🚨 OBTENEMOS EL TEXTO PRIMERO PARA EVITAR ERRORES SI LA RESPUESTA ESTÁ VACÍA
                const text = await res.text();
                const data = text ? JSON.parse(text) : [];
                
                // Asegurarnos de que data sea un array
                const activitiesArray = Array.isArray(data) ? data : [];

                const formattedActivities = activitiesArray.map(item => {
                    const { date, time } = formatDateTime(item.createdAt);
                    const styles = getTypeStyles(item.actionType);
                    
                    return {
                        id: item.id,
                        user: item.authorName || 'Sistema', 
                        type: item.actionType || 'info',
                        action: item.content || 'realizó una actualización',
                        details: item.extraDetails || '',
                        time: time,
                        date: date,
                        icon: styles.icon,
                        color: styles.color
                    };
                });

                setActivities(formattedActivities.reverse());
            } else if (res.status === 401 || res.status === 403) {
                // Si el token ya no sirve, lo expulsamos
                localStorage.clear();
                navigate('/login');
            } else {
                console.error("Error del servidor al cargar actividades:", res.status);
            }
        } catch (error) {
            console.error("Error al cargar el log de actividades:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const filteredActivities = activities.filter(act => {
        const matchesSearch = act.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              act.action.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesType = false;
        if (filterType === null || filterType === undefined) {
            matchesType = true; 
        } else if (act.type === filterType) {
            matchesType = true;
        }

        return matchesSearch && matchesType;
    });

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    
                    <div className="nav-item active" onClick={() => navigate('/activity')}>
                        <i className="pi pi-history"></i> ACTIVITY FEED
                        <span className="pro-text" style={{color: 'white'}}>PRO</span>
                    </div>
                    <div className="nav-item" onClick={() => navigate('/reports')}>
                        <i className="pi pi-file-export"></i> REPORTES
                        <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item ai-nav-item" onClick={() => navigate('/ManageWiseAI')}>
                        <i className="pi pi-sparkles" style={{ color: '#fbbf24' }}></i> 
                        <div className="ai-text"><span>ManageWise</span><span>AI</span></div>
                        <span className="pro-text">PRO</span>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item exit-item" onClick={() => navigate('/projects')}><i className="pi pi-arrow-left"></i> Ir a Proyectos</div>
                </div>
            </aside>

            <main className="dashboard-content">
                <div className="content-inner activity-inner">
                    <header className="content-header">
                        <div>
                            <h1>Activity Feed & Audit Log</h1>
                            <p>Registro inmutable de eventos. Exclusivo del plan PRO.</p>
                        </div>
                        <div className="action-buttons">
                            <Button label="Exportar Log (.CSV)" icon="pi pi-download" className="p-button p-button-secondary" onClick={() => alert('Generando exportación de log inmutable...')} />
                        </div>
                    </header>

                    <Card className="ai-summary-panel">
                        <div className="ai-summary-content">
                            <div className="ai-icon-pulse">
                                <i className="pi pi-sparkles"></i>
                            </div>
                            <div className="ai-summary-text">
                                <h3>Resumen Inteligente del Día</h3>
                                <p>Hoy se han registrado <strong>{activities.length} eventos</strong>. La actividad reciente muestra un ritmo saludable para el Sprint actual. No se detectan bloqueos críticos por el momento.</p>
                            </div>
                        </div>
                    </Card>

                    <div className="activity-filters-bar">
                        <span className="p-input-icon-left search-input-wrapper">
                            <i className="pi pi-search" />
                            <InputText value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar usuario, ticket o acción..." className="w-full" />
                        </span>
                        <Dropdown 
                            value={filterType} 
                            options={eventTypes} 
                            onChange={(e) => setFilterType(e.value)} 
                            placeholder="Filtrar por tipo" 
                            className="filter-dropdown"
                        />
                    </div>

                    <div className="activity-timeline-container">
                        {isLoading ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                                <h2>Cargando registro de auditoría...</h2>
                            </div>
                        ) : filteredActivities.length === 0 ? (
                            <p className="empty-msg">No se encontraron actividades con estos filtros o el registro está vacío.</p>
                        ) : (
                            filteredActivities.map((act, index) => {
                                const showDateHeader = index === 0 || filteredActivities[index - 1].date !== act.date;

                                return (
                                    <React.Fragment key={act.id}>
                                        {showDateHeader && <div className="timeline-date-divider"><i className="pi pi-calendar"></i> {act.date}</div>}
                                        
                                        <div className="timeline-item" data-date={act.date}>
                                            <div className="timeline-icon" style={{ backgroundColor: `${act.color}20`, color: act.color }}>
                                                <i className={act.icon}></i>
                                            </div>
                                            <div className="timeline-content">
                                                <div className="timeline-main-info">
                                                    <div className="timeline-text">
                                                        <Avatar label={act.user.substring(0, 2).toUpperCase()} shape="circle" size="small" className="timeline-avatar" />
                                                        <span className="t-user">{act.user}</span>
                                                        <span className="t-action">{act.action}</span>
                                                        {act.type === 'ai' && <Tag value="AI System" severity="warning" style={{marginLeft: '10px', fontSize: '0.7rem'}} />}
                                                    </div>
                                                    <span className="timeline-time">{act.time}</span>
                                                </div>
                                                {act.details && (
                                                    <div className="timeline-details">
                                                        <i className="pi pi-info-circle"></i> {act.details}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            <Dialog visible={isAiModalOpen} style={{ width: '90vw', maxWidth: '1100px' }} onHide={() => setAiModalOpen(false)} className="pricing-dialog" showHeader={false} dismissableMask={true}>
                {/* Contenido del modal de precios */}
            </Dialog>
        </div>
    );
}
