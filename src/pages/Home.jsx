import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Home() {
    const navigate = useNavigate();
    const currentProjectId = localStorage.getItem('current_project_id');

    const [projectName, setProjectName] = useState('Cargando Proyecto...');
    const [availableSprints, setAvailableSprints] = useState([]);
    const [activeSprintId, setActiveSprintId] = useState(null); 
    const [sprintStories, setSprintStories] = useState([]); 
    
    const [teamMembers, setTeamMembers] = useState([]); 
    
    const [loading, setLoading] = useState(true);
    const [isAiModalOpen, setAiModalOpen] = useState(false);

    const handleProClick = (e) => {
        if (e) e.preventDefault();
        setAiModalOpen(true);
    };

    // ==========================================
    // CARGAR DATOS
    // ==========================================
    useEffect(() => {
        if (!currentProjectId) {
            navigate('/projects');
            return;
        }

        const fetchInitialData = async () => {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                navigate('/login');
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            try {
                const [sprintsRes, storiesRes, projectsRes, membersRes] = await Promise.all([
                    fetch(`${API_BASE}/sprints`, { headers }),
                    fetch(`${API_BASE}/user-stories`, { headers }),
                    fetch(`${API_BASE}/projects`, { headers }),
                    fetch(`${API_BASE}/team-members/project/${currentProjectId}`, { headers }) 
                ]);

                if (projectsRes.ok) {
                    const allProjects = await projectsRes.json();
                    const miProyecto = allProjects.find(p => p.id === currentProjectId);
                    if (miProyecto) setProjectName(miProyecto.name);
                } else if (projectsRes.status === 401 || projectsRes.status === 403) {
                    localStorage.clear(); navigate('/login'); return;
                }

                if (membersRes.ok) {
                    setTeamMembers(await membersRes.json());
                }

                if (sprintsRes.ok && storiesRes.ok) {
                    const allSprints = await sprintsRes.json();
                    const allStories = await storiesRes.json();

                    const misSprints = allSprints.filter(s => s.projectId === currentProjectId);
                    setAvailableSprints(misSprints);

                    if (misSprints.length > 0) {
                        const primerSprintId = misSprints[0].id;
                        setActiveSprintId(primerSprintId);
                        setSprintStories(allStories.filter(story => story.sprintId === primerSprintId));
                    }
                }
            } catch (error) {
                console.error("Error al cargar los datos del Dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [currentProjectId, navigate]);

    useEffect(() => {
        if (!activeSprintId) return;

        const updateSprintStories = async () => {
            const token = localStorage.getItem('jwt_token');
            if (!token) return;

            try {
                const response = await fetch(`${API_BASE}/user-stories`, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const allStories = await response.json();
                    setSprintStories(allStories.filter(story => story.sprintId === activeSprintId));
                }
            } catch (error) { console.error("Error actualizando historias:", error); }
        };

        updateSprintStories();
    }, [activeSprintId]);

    // ==========================================
    // MATEMÁTICA Y GRÁFICOS REALES
    // ==========================================
    const totalPoints = sprintStories.reduce((sum, s) => sum + (s.points || 0), 0);
    const completedPoints = sprintStories.filter(s => s.status === 'DONE').reduce((sum, s) => sum + (s.points || 0), 0);
    const displayProgress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
    
    // 🚨 Cálculo Real del Burndown
    const remainingPoints = totalPoints - completedPoints;

    const teamEffortLabels = [];
    const teamEffortPoints = [];
    
    const uniqueAssignees = [...new Set(sprintStories.map(s => s.assigneeId || null))];
    
    uniqueAssignees.forEach(assigneeId => {
        let labelName = 'Sin asignar';
        if (assigneeId) {
            const member = teamMembers.find(m => String(m.id) === String(assigneeId));
            labelName = member ? member.fullName : 'Usuario Desconocido';
        }
        
        teamEffortLabels.push(labelName);
        
        const puntosDelDev = sprintStories
            .filter(s => (s.assigneeId || null) === assigneeId)
            .reduce((sum, s) => sum + (s.points || 0), 0);
            
        teamEffortPoints.push(puntosDelDev);
    });

    const teamEffortData = {
        labels: teamEffortLabels.length > 0 ? teamEffortLabels : ['Sin tareas'],
        datasets: [{ 
            label: 'Puntos Asignados', 
            backgroundColor: ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6'], 
            data: teamEffortPoints.length > 0 ? teamEffortPoints : [0],
            borderRadius: 6
        }]
    };

    const countToDo = sprintStories.filter(s => !s.status || s.status === 'TO_DO').length;
    const countInProgress = sprintStories.filter(s => s.status === 'IN_PROGRESS').length;
    const countDone = sprintStories.filter(s => s.status === 'DONE').length;

    const distributionData = {
        labels: ['To Do', 'In Progress', 'Done'],
        datasets: [{ 
            data: [countToDo, countInProgress, countDone], 
            backgroundColor: ['#e2e8f0', '#0ea5e9', '#22c55e'],
            borderWidth: 0
        }]
    };

    // 🚨 DATOS REALES PARA EL BURNDOWN CHART
    const burndownData = {
        labels: ['Inicio del Sprint', 'Estado Actual', 'Cierre Estimado'],
        datasets: [
            {
                label: 'Línea Ideal',
                data: [totalPoints, totalPoints / 2, 0], // Tendencia matemática a 0
                borderColor: '#cbd5e1',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false,
                tension: 0
            },
            {
                label: `Trabajo Restante Real`,
                data: [totalPoints, remainingPoints, null], // Null hace que la línea pare en "Actual"
                borderColor: '#f97316',
                borderWidth: 5, 
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.1 
            }
        ]
    };

    const activeSprintName = availableSprints.find(s => s.id === activeSprintId)?.name || '';

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item active" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-history"></i> ACTIVITY FEED <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item" onClick={handleProClick}>
                        <i className="pi pi-file-export"></i> REPORTES <span className="pro-text">PRO</span>
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
                <div className="content-inner">
                    <header className="content-header">
                        <div>
                            <h1>Dashboard: {projectName}</h1>
                            <p>Gestión avanzada de rendimiento para <strong>ManageWise</strong>.</p>
                        </div>
                        <div className="export-actions">
                            <span className="export-label">Exportar Reportes:</span>
                            <div className="export-buttons-group">
                                <Button icon="pi pi-file-pdf" className="p-button-danger action-btn-sm" onClick={handleProClick} />
                                <Button icon="pi pi-file-excel" className="p-button-outlined p-button-success action-btn-sm" onClick={handleProClick} />
                                <Button icon="pi pi-chart-bar" className="p-button-outlined p-button-help action-btn-sm" onClick={handleProClick} />
                            </div>
                        </div>
                    </header>

                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#f97316' }}></i>
                            <h2>Cargando métricas...</h2>
                        </div>
                    ) : availableSprints.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', marginTop: '2rem' }}>
                            <i className="pi pi-box" style={{ fontSize: '4rem', marginBottom: '1rem', color: '#94a3b8' }}></i>
                            <h2>Aún no hay Sprints en tu Proyecto</h2>
                            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Ve a la pestaña de Backlog para planificar tu primer Sprint.</p>
                            <Button label="Ir al Backlog" icon="pi pi-list" onClick={() => navigate('/backlog')} />
                        </div>
                    ) : totalPoints === 0 ? (
                        <div className="main-grid-layout">
                            <div className="sprint-navigation">
                                <h2 className="section-label">Sprints del Proyecto</h2>
                                <div className="sprint-list">
                                    {availableSprints.map(sprint => (
                                        <div 
                                            key={sprint.id} 
                                            className={`sprint-hero-card ${activeSprintId === sprint.id ? 'active' : ''}`}
                                            onClick={() => setActiveSprintId(sprint.id)}
                                        >
                                            <div className="sprint-main-info">
                                                <span className="sprint-number">{sprint.name}</span>
                                                <Tag value={sprint.status || 'PLANNING'} severity={sprint.status === 'ACTIVE' ? 'success' : 'secondary'} />
                                            </div>
                                            <i className="pi pi-chevron-right"></i>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 3', padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                                <i className="pi pi-exclamation-circle text-orange" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                                <h2>Gráficos en espera para "{activeSprintName}"</h2>
                                <p style={{ color: '#64748b' }}>Arrastra historias con puntos de esfuerzo al Sprint en el Backlog para ver las métricas.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="main-grid-layout">
                            <div className="sprint-navigation">
                                <h2 className="section-label">Sprints del Proyecto</h2>
                                <div className="sprint-list">
                                    {availableSprints.map(sprint => (
                                        <div 
                                            key={sprint.id} 
                                            className={`sprint-hero-card ${activeSprintId === sprint.id ? 'active' : ''}`}
                                            onClick={() => setActiveSprintId(sprint.id)}
                                        >
                                            <div className="sprint-main-info">
                                                <span className="sprint-number">{sprint.name}</span>
                                                <Tag value={sprint.status || 'PLANNING'} severity={sprint.status === 'ACTIVE' ? 'success' : 'secondary'} />
                                            </div>
                                            <i className="pi pi-chevron-right"></i>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="graphics-section">
                                <Card className="grid-full main-card-chart" title={`BURNDOWN: ${activeSprintName.toUpperCase()}`}>
                                    <div className="chart-container">
                                        <Chart type="line" data={burndownData} options={{ maintainAspectRatio: false }} style={{ height: '450px', width: '100%' }} />
                                    </div>
                                </Card>

                                <div className="lower-grid">
                                    <Card className="grid-half" title="Distribución de Estados">
                                        <Chart type="pie" data={distributionData} style={{ height: '280px', width: '100%' }} />
                                    </Card>
                                    
                                    <Card className="grid-half" title="Esfuerzo del Equipo (Pts Asignados)">
                                        <Chart type="bar" data={teamEffortData} options={{ scales: { y: { beginAtZero: true } } }} style={{ height: '280px', width: '100%' }} />
                                    </Card>
                                </div>

                                <Card className="grid-full metrics-footer">
                                    <div className="giant-stats">
                                        <div className="g-stat">
                                            <span className="g-label">PUNTOS REALES (SPRINT)</span>
                                            <h2 className="g-value">{totalPoints}</h2>
                                        </div>
                                        <div className="g-stat">
                                            <span className="g-label">PROGRESO DEL SPRINT</span>
                                            <h2 className="g-value text-orange">{displayProgress}%</h2>
                                        </div>
                                        <div className="g-stat">
                                            <span className="g-label">TAREAS TERMINADAS</span>
                                            <h2 className="g-value text-green">{countDone}</h2>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </main>

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
                                <div className="price"><span className="currency">$</span><span className="amount">0</span><span className="period">/mo</span></div>
                            </div>
                            <div className="pricing-features">
                                <ul>
                                    <li><i className="pi pi-check"></i> Hasta 2 Proyectos</li>
                                    <li><i className="pi pi-check"></i> 5 Colaboradores</li>
                                    <li className="disabled"><i className="pi pi-times"></i> Exportación</li>
                                    <li className="disabled"><i className="pi pi-times"></i> AI Assistant</li>
                                </ul>
                            </div>
                            <Button label="Tu Plan Actual" className="p-button-outlined p-button-secondary w-full" disabled />
                        </div>
                        <div className="pricing-card popular">
                            <div className="recommended-badge">RECOMENDADO</div>
                            <div className="pricing-header">
                                <h3>Pro Business</h3>
                                <p>Grow your brand</p>
                                <div className="price"><span className="currency">$</span><span className="amount">29</span><span className="period">/mo</span></div>
                            </div>
                            <div className="pricing-features">
                                <ul>
                                    <li><i className="pi pi-check"></i> Proyectos Ilimitados</li>
                                    <li><i className="pi pi-check"></i> Ilimitados Colaboradores</li>
                                    <li><i className="pi pi-check"></i> Exportación PDF/Excel</li>
                                    <li><i className="pi pi-check"></i> <strong>ManageWise AI</strong></li>
                                </ul>
                            </div>
                            <Button label="Actualizar a Pro" className="p-button-orange w-full" onClick={() => alert('Redirigiendo a pasarela...')} />
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
