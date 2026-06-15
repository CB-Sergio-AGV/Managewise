import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import './Reports.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/local-api';

export default function Reports() {
    const navigate = useNavigate();
    
    // 🚀 MAGIA: Sacamos el ID del proyecto actual
    const currentProjectId = localStorage.getItem('current_project_id');

    const [isAiModalOpen, setAiModalOpen] = useState(false);

    // --- ESTADOS DE CONTROL ---
    const [includeAI, setIncludeAI] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false); 
    const [projectName, setProjectName] = useState('Cargando Proyecto...');
    
    // --- ESTADOS DE DATOS CRUDOS ---
    const [rawStories, setRawStories] = useState([]);
    const [rawSprints, setRawSprints] = useState([]);

    // --- ESTADO DEL NUEVO FILTRO REAL ---
    const [selectedScope, setSelectedScope] = useState('ALL');
    const [scopeOptions, setScopeOptions] = useState([{ label: 'Visión Global del Proyecto', value: 'ALL' }]);

    // --- ESTADOS DE GRÁFICOS Y KPIs ---
    const [kpis, setKpis] = useState({ planned: 0, completed: 0, progress: 0, pending: 0 });
    const [barChartData, setBarChartData] = useState({ labels: [], datasets: [] });
    const [distributionData, setDistributionData] = useState({ labels: [], datasets: [] });
    const [barChartTitle, setBarChartTitle] = useState('Historial de Velocidad');
    const [aiConclusion, setAiConclusion] = useState('');

    const doughnutOptions = {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { usePointStyle: true } } },
        cutout: '70%'
    };

    const apiKey = "mw_live_sk_9f8a7d6b5e4c3b2a1";
    const [copied, setCopied] = useState(false);
    const copyApiKey = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

    // ==========================================
    // 1. DESCARGAR DATOS FILTRADOS Y SEGUROS
    // ==========================================
    const fetchBaseData = async () => {
        if (!currentProjectId) {
            navigate('/projects');
            return;
        }

        setIsUpdating(true);
        try {
            const headers = getAuthHeaders(); // 🚨 Añadimos Token

            // 🚨 AHORA LLAMAMOS A LAS RUTAS CON SEGURIDAD
            const [storiesRes, sprintsRes, projectsRes] = await Promise.all([
                fetch(`${API_BASE}/user-stories/project/${currentProjectId}`, { headers }),
                fetch(`${API_BASE}/sprints/project/${currentProjectId}`, { headers }),
                fetch(`${API_BASE}/projects`, { headers }) 
            ]);

            // Extraer nombre del proyecto
            if (projectsRes.ok) {
                const allProjects = await projectsRes.json();
                const miProyecto = allProjects.find(p => p.id === currentProjectId);
                if (miProyecto) setProjectName(miProyecto.name);
            } else if (projectsRes.status === 401 || projectsRes.status === 403) {
                localStorage.clear();
                navigate('/login');
                return;
            }

            if (storiesRes.ok && sprintsRes.ok) {
                const stories = await storiesRes.json();
                const sprints = await sprintsRes.json();
                
                setRawStories(stories);
                setRawSprints(sprints);

                // Llenar el Dropdown con Sprints reales de ESTE proyecto
                const sprintOptions = sprints.map(sp => ({ label: `Solo ${sp.name}`, value: sp.id }));
                setScopeOptions([{ label: 'Visión Global del Proyecto', value: 'ALL' }, ...sprintOptions]);
            }
        } catch (error) {
            console.error("Error generando reportes:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        fetchBaseData();
    }, [currentProjectId]);

    // ==========================================
    // 2. RECALCULAR GRÁFICOS CUANDO CAMBIA EL FILTRO
    // ==========================================
    useEffect(() => {
        if (rawStories.length === 0 && rawSprints.length === 0) return;

        let filteredStories = [];
        let bLabels = [];
        let bPlanned = [];
        let bCompleted = [];
        let title = '';
        let aiText = '';

        if (selectedScope === 'ALL') {
            // ----- MODO GLOBAL -----
            filteredStories = rawStories;
            title = 'Historial de Velocidad (Por Sprint)';

            rawSprints.forEach(sprint => {
                bLabels.push(sprint.name);
                const sprintStories = rawStories.filter(s => s.sprintId === sprint.id);
                bPlanned.push(sprintStories.reduce((sum, s) => sum + (s.points || 0), 0));
                bCompleted.push(sprintStories.filter(s => s.status === 'DONE').reduce((sum, s) => sum + (s.points || 0), 0));
            });

            if (rawSprints.length === 0) { bLabels = ['Sin Sprints']; bPlanned = [0]; bCompleted = [0]; }

        } else {
            // ----- MODO POR SPRINT (Desarrolladores) -----
            filteredStories = rawStories.filter(s => s.sprintId === selectedScope);
            const currentSprint = rawSprints.find(s => s.id === selectedScope);
            const sprintName = currentSprint ? currentSprint.name : 'Este Sprint';
            title = `Productividad de Equipo (${sprintName})`;

            // Agrupar por miembro del equipo
            const assignees = [...new Set(filteredStories.map(s => s.assigneeId || 'Sin asignar'))];
            
            assignees.forEach(assignee => {
                bLabels.push(assignee);
                const userStories = filteredStories.filter(s => (s.assigneeId || 'Sin asignar') === assignee);
                bPlanned.push(userStories.reduce((sum, s) => sum + (s.points || 0), 0));
                bCompleted.push(userStories.filter(s => s.status === 'DONE').reduce((sum, s) => sum + (s.points || 0), 0));
            });

            if (assignees.length === 0) { bLabels = ['Sin asignaciones']; bPlanned = [0]; bCompleted = [0]; }
        }

        // --- ACTUALIZAR GRÁFICO DE BARRAS ---
        setBarChartTitle(title);
        setBarChartData({
            labels: bLabels,
            datasets: [
                { label: 'Puntos Planeados', backgroundColor: '#e2e8f0', data: bPlanned, borderRadius: 4 },
                { label: 'Puntos Completados', backgroundColor: '#f97316', data: bCompleted, borderRadius: 4 }
            ]
        });

        // --- ACTUALIZAR KPIs Y DONA (Basado en las historias filtradas) ---
        let totalPlanned = 0;
        let totalCompleted = 0;
        let countToDo = 0;
        let countInProgress = 0;
        let countDone = 0;

        filteredStories.forEach(s => {
            const pts = s.points || 0;
            totalPlanned += pts;

            if (!s.status || s.status === 'TO_DO') {
                countToDo++;
            } else if (s.status === 'IN_PROGRESS') {
                countInProgress++;
            } else if (s.status === 'DONE') {
                countDone++;
                totalCompleted += pts;
            }
        });

        setDistributionData({
            labels: ['To Do', 'In Progress', 'Done'],
            datasets: [{
                data: [countToDo, countInProgress, countDone],
                backgroundColor: ['#e2e8f0', '#0ea5e9', '#22c55e'],
                borderWidth: 0
            }]
        });

        const progressPercent = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
        
        setKpis({
            planned: totalPlanned,
            completed: totalCompleted,
            progress: progressPercent,
            pending: countToDo
        });

        // --- GENERAR TEXTO IA INTELIGENTE ---
        if (selectedScope === 'ALL') {
            aiText = `Análisis Global: El proyecto tiene un avance general del ${progressPercent}%, con ${totalCompleted} puntos completados de ${totalPlanned} planeados. Hay ${countToDo} tareas pendientes ("To Do") que deben vigilarse para mantener el ritmo.`;
        } else {
            aiText = `Análisis de Sprint: Este ciclo tiene un progreso actual del ${progressPercent}%. El equipo ha entregado ${totalCompleted} puntos. Quedan ${countToDo} tareas sin iniciar. Se recomienda revisar si la carga está balanceada entre los miembros.`;
        }
        setAiConclusion(aiText);

    }, [selectedScope, rawStories, rawSprints]);

    const handleExportPDF = () => { window.print(); };

    // --- TEMPLATES PARA TABLA ---
    const statusBodyTemplate = (rowData) => {
        let severity = 'info';
        let label = 'To Do';
        if (rowData.status === 'IN_PROGRESS') { severity = 'warning'; label = 'In Progress'; }
        if (rowData.status === 'DONE') { severity = 'success'; label = 'Done'; }
        return <Tag value={label} severity={severity} />;
    };

    // Datos crudos filtrados para la tabla inferior
    const tableData = (selectedScope === 'ALL' ? rawStories : rawStories.filter(s => s.sprintId === selectedScope)).map(s => ({
        id: s.id.substring(0, 8) + '...', 
        title: s.title,
        status: s.status || 'TO_DO',
        points: s.points || 0,
        owner: s.assigneeId || 'Sin asignar'
    }));

    return (
        <div className="dashboard-wrapper">
            <aside className="dashboard-sidebar hide-on-print">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    
                    <div className="nav-item" onClick={() => navigate('/activity')}>
                        <i className="pi pi-history"></i> ACTIVITY FEED
                        <span className="pro-text">PRO</span>
                    </div>
                    <div className="nav-item active" onClick={() => navigate('/reports')}>
                        <i className="pi pi-file-export"></i> REPORTES
                        <span className="pro-text" style={{color: 'white'}}>PRO</span>
                    </div>
                    <div className="nav-item ai-nav-item" onClick={() => setAiModalOpen(true)}>
                        <i className="pi pi-sparkles" style={{ color: '#fbbf24' }}></i> 
                        <div className="ai-text"><span>ManageWise</span><span>AI</span></div>
                        <span className="pro-text">PRO</span>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item exit-item" onClick={() => navigate('/projects')}><i className="pi pi-arrow-left"></i> Ir a Proyectos</div>
                </div>
            </aside>

            <main className="dashboard-content print-full-width">
                <div className="content-inner reports-inner">
                    
                    <header className="content-header reports-header hide-on-print">
                        <div>
                            <h1>Reportes & Integraciones</h1>
                            <p>Exporta datos estructurados e interactúa con métricas en tiempo real.</p>
                        </div>
                        
                        <div className="export-zone-pro">
                            <span className="export-title-pro">EXPORTACIÓN RÁPIDA:</span>
                            <div className="export-btn-group-pro">
                                <button className="export-btn-pro btn-pdf" onClick={handleExportPDF} title="Exportar a PDF">
                                    <i className="pi pi-file-pdf icon-pdf"></i>
                                </button>
                                <button className="export-btn-pro btn-excel" onClick={() => alert('Solo disponible en el plan Business Elite')} title="Exportar a Excel">
                                    <i className="pi pi-file-excel icon-excel"></i>
                                </button>
                                <button className="export-btn-pro btn-powerbi" onClick={() => alert('Conectando a Power BI...')} title="Power BI API">
                                    <i className="pi pi-chart-bar icon-powerbi"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="reports-top-grid hide-on-print">
                        <Card className="config-card" title="Configuración del Reporte">
                            <div className="report-form">
                                <div className="field">
                                    <label>Alcance de Datos (Filtro Activo)</label>
                                    <Dropdown 
                                        value={selectedScope} 
                                        options={scopeOptions} 
                                        onChange={(e) => setSelectedScope(e.value)} 
                                        className="w-full" 
                                    />
                                </div>
                                <div className="field-checkbox-custom mt-3">
                                    <Checkbox inputId="includeAI" checked={includeAI} onChange={e => setIncludeAI(e.checked)} />
                                    <label htmlFor="includeAI">Incluir Análisis Predictivo de IA</label>
                                </div>
                                <Button 
                                    label={isUpdating ? "Sincronizando con BD..." : "Recargar desde Base de Datos"} 
                                    icon={isUpdating ? "pi pi-spin pi-spinner" : "pi pi-sync"} 
                                    className="p-button-outlined p-button-secondary w-full mt-3" 
                                    onClick={fetchBaseData}
                                    disabled={isUpdating}
                                />
                            </div>
                        </Card>

                        <div className="api-panel-wrapper">
                            <Card className="api-card">
                                <h3><i className="pi pi-database"></i> Conexión API REST</h3>
                                <p>Utiliza esta clave para extraer los datos de tu proyecto en tiempo real hacia PowerBI, Tableau o herramientas internas.</p>
                                <div className="api-key-container">
                                    <InputText value={apiKey} readOnly className="api-key-input" />
                                    <Button icon={copied ? "pi pi-check" : "pi pi-copy"} className={`copy-btn ${copied ? 'p-button-success' : 'p-button-secondary'}`} onClick={copyApiKey} tooltip="Copiar API Key" />
                                </div>
                                <div className="api-status">
                                    <Tag severity="success" value="Conexión Activa" rounded />
                                    <span className="api-docs-link">Ver Documentación de API <i className="pi pi-external-link"></i></span>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="preview-section printable-area">
                        <div className="preview-header hide-on-print">
                            <h2>Vista Previa del Documento</h2>
                            <span className="preview-badge">ACTUALIZADO AL INSTANTE</span>
                        </div>
                        
                        <div className="report-canvas">
                            <div className="canvas-header">
                                <div className="canvas-title-group">
                                    <h2>Reporte Ejecutivo</h2>
                                    {/* 🚨 AQUÍ INYECTAMOS EL NOMBRE REAL DEL PROYECTO */}
                                    <p>Proyecto: <strong>{projectName}</strong> | Filtro: <strong>{scopeOptions.find(o => o.value === selectedScope)?.label || ''}</strong></p>
                                </div>
                                <div className="canvas-logo">MW PRO</div>
                            </div>

                            <div className="canvas-kpi-grid">
                                <div className="kpi-box">
                                    <span className="kpi-label">Puntos Planeados Totales</span>
                                    <div className="kpi-value-group">
                                        <span className="kpi-value">{kpis.planned} <small>pts</small></span>
                                    </div>
                                </div>
                                <div className="kpi-box">
                                    <span className="kpi-label">Puntos Completados (Done)</span>
                                    <div className="kpi-value-group">
                                        <span className="kpi-value" style={{color: '#f97316'}}>{kpis.completed} <small>pts</small></span>
                                    </div>
                                </div>
                                <div className="kpi-box">
                                    <span className="kpi-label">Avance del Proyecto</span>
                                    <div className="kpi-value-group">
                                        <span className="kpi-value" style={{color: '#22c55e'}}>{kpis.progress} <small>%</small></span>
                                    </div>
                                </div>
                                <div className="kpi-box">
                                    <span className="kpi-label">Tareas por Iniciar (To Do)</span>
                                    <div className="kpi-value-group">
                                        <span className="kpi-value">{kpis.pending}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="canvas-charts-grid">
                                <div className="canvas-chart-box chart-wrapper">
                                    <h3>{barChartTitle}</h3>
                                    <div className="chart-container-relative">
                                        <Chart type="bar" data={barChartData} options={{ maintainAspectRatio: false }} style={{ height: '250px' }} />
                                    </div>
                                </div>
                                <div className="canvas-chart-box chart-wrapper">
                                    <h3>Distribución del Estado de Tareas</h3>
                                    <div className="chart-container-relative">
                                        <Chart type="doughnut" data={distributionData} options={doughnutOptions} style={{ height: '250px' }} />
                                    </div>
                                </div>
                            </div>

                            {includeAI && (
                                <div className="canvas-ai-conclusion">
                                    <div className="ai-c-header">
                                        <i className="pi pi-sparkles"></i> Conclusión Automática de IA
                                    </div>
                                    <p>{aiConclusion}</p>
                                </div>
                            )}

                            <div className="canvas-table-box">
                                <h3>Data Cruda (Historias de Usuario Filtradas)</h3>
                                <DataTable value={tableData} size="small" stripedRows className="p-datatable-sm" emptyMessage="No hay historias registradas en la base de datos para este alcance.">
                                    <Column field="id" header="Ticket ID" style={{ fontWeight: 'bold' }}></Column>
                                    <Column field="title" header="Título"></Column>
                                    <Column field="status" header="Estado" body={statusBodyTemplate}></Column>
                                    <Column field="points" header="Puntos"></Column>
                                    <Column field="owner" header="Asignado a"></Column>
                                </DataTable>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Dialog visible={isAiModalOpen} style={{ width: '90vw', maxWidth: '1100px' }} onHide={() => setAiModalOpen(false)} className="pricing-dialog" showHeader={false} dismissableMask={true}>
                {/* Contenido del modal premium */}
            </Dialog>
        </div>
    );
}
