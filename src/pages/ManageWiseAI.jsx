import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import './ManageWiseAI.css';

export default function ManageWiseAI() {
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // Estado de los mensajes (Inicia con un mensaje de bienvenida de la IA)
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            sender: 'ai', 
            text: '¡Hola Sergio! Soy ManageWise AI ✨. He analizado el Sprint 1 y veo que la velocidad del equipo es buena, pero hay 2 bugs críticos pendientes. ¿En qué te puedo ayudar hoy?' 
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Bajar el scroll automáticamente cuando hay nuevos mensajes
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // --- MAGIA FRONTEND: Respuestas Simuladas ---
    const getSimulatedResponse = (input) => {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('resumen') || lowerInput.includes('sprint')) {
            return "El 'Sprint 1 - MVP' está al 85% de progreso. Quedan 15 puntos de historia por completar. Te sugiero reasignar la tarea US-04 a Valeria para equilibrar la carga de trabajo.";
        }
        if (lowerInput.includes('riesgo') || lowerInput.includes('peligro') || lowerInput.includes('bug')) {
            return "He detectado un riesgo moderado. La tasa de bugs ha subido un 2% en los últimos 3 días (BUG-102 y BUG-105). Recomiendo agendar una sesión de Pair Programming para resolver la deuda técnica de la base de datos.";
        }
        if (lowerInput.includes('historia') || lowerInput.includes('crear')) {
            return "¡Claro! Aquí tienes una propuesta de Historia de Usuario:\n\n**Título:** Implementar 2FA (Doble Factor)\n**Como:** Usuario registrado\n**Quiero:** Autenticarme con un código enviado a mi correo\n**Para:** Mejorar la seguridad de mi cuenta.\n**Criterios de Aceptación:** El código debe caducar en 5 min. Máximo 3 intentos fallidos.";
        }
        return "Es una excelente pregunta. Como asistente de IA de tu proyecto, estoy monitoreando el repositorio y el backlog constantemente. ¿Te gustaría que genere un reporte detallado de esto en la pestaña de Reportes?";
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // 1. Agregar mensaje del usuario
        const newUserMsg = { id: Date.now(), sender: 'user', text: inputValue };
        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        // 2. Simular que la IA está "pensando" (Retraso de 1.5 segundos)
        setTimeout(() => {
            const aiResponseText = getSimulatedResponse(newUserMsg.text);
            const newAiMsg = { id: Date.now() + 1, sender: 'ai', text: aiResponseText };
            setMessages(prev => [...prev, newAiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const handleSuggestedPrompt = (promptText) => {
        setInputValue(promptText);
    };

    return (
        <div className="dashboard-wrapper">
            {/* SIDEBAR */}
            <aside className="dashboard-sidebar">
                <div className="brand">ManageWise</div>
                <nav className="nav-links">
                    <div className="nav-item" onClick={() => navigate('/home')}><i className="pi pi-chart-line"></i> DASHBOARD</div>
                    <div className="nav-item" onClick={() => navigate('/backlog')}><i className="pi pi-list"></i> BACKLOG</div>
                    <div className="nav-item" onClick={() => navigate('/members')}><i className="pi pi-users"></i> TEAM</div>
                    <div className="nav-item" onClick={() => navigate('/meeting')}><i className="pi pi-video"></i> MEETINGS</div>
                    <div className="nav-item" onClick={() => navigate('/activity')}><i className="pi pi-history"></i> ACTIVITY FEED <span className="pro-text">PRO</span></div>
                    <div className="nav-item" onClick={() => navigate('/reports')}><i className="pi pi-file-export"></i> REPORTES <span className="pro-text">PRO</span></div>
                    
                    <div className="nav-item ai-nav-item active" onClick={() => navigate('/ManageWiseAI')}>
                        <i className="pi pi-sparkles" style={{ color: '#fbbf24' }}></i> 
                        <div className="ai-text"><span>ManageWise</span><span>AI</span></div>
                        <span className="pro-text" style={{color: 'white'}}>PRO</span>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item exit-item" onClick={() => navigate('/projects')}><i className="pi pi-arrow-left"></i> Ir a Proyectos</div>
                </div>
            </aside>

            <main className="dashboard-content ai-main-content">
                <div className="ai-chat-container">
                    
                    {/* CABECERA DEL CHAT */}
                    <header className="ai-chat-header">
                        <div className="ai-header-title">
                            <div className="ai-pulse-icon"><i className="pi pi-sparkles"></i></div>
                            <div>
                                <h1>ManageWise AI</h1>
                                <p>Tu copiloto ágil impulsado por inteligencia artificial.</p>
                            </div>
                        </div>
                        <Button label="Limpiar Chat" icon="pi pi-trash" className="p-button-text p-button-secondary" onClick={() => setMessages([messages[0]])} />
                    </header>

                    {/* ZONA DE MENSAJES */}
                    <div className="ai-messages-area">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'msg-right' : 'msg-left'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="msg-avatar ai-avatar"><i className="pi pi-sparkles"></i></div>
                                )}
                                <div className={`message-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                                    {/* Mapeo para respetar los saltos de línea (\n) */}
                                    {msg.text.split('\n').map((line, i) => (
                                        <span key={i}>{line}<br/></span>
                                    ))}
                                </div>
                                {msg.sender === 'user' && (
                                    <Avatar label="SA" shape="circle" className="msg-avatar user-avatar" />
                                )}
                            </div>
                        ))}
                        
                        {/* Indicador de escritura */}
                        {isTyping && (
                            <div className="message-wrapper msg-left">
                                <div className="msg-avatar ai-avatar"><i className="pi pi-sparkles"></i></div>
                                <div className="message-bubble bubble-ai typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* ZONA DE INPUT Y SUGERENCIAS */}
                    <div className="ai-input-area">
                        <div className="suggested-prompts">
                            <span onClick={() => handleSuggestedPrompt("Genera un resumen del Sprint actual")}>Generar resumen del Sprint</span>
                            <span onClick={() => handleSuggestedPrompt("¿Cuáles son los mayores riesgos del proyecto hoy?")}>Analizar Riesgos</span>
                            <span onClick={() => handleSuggestedPrompt("Crea una historia de usuario para el login")}>Redactar Historia de Usuario</span>
                        </div>
                        
                        <form className="ai-input-form" onSubmit={handleSendMessage}>
                            <InputText 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value)} 
                                placeholder="Pregúntale a ManageWise AI sobre tu proyecto..." 
                                className="ai-text-input"
                                disabled={isTyping}
                            />
                            <Button 
                                type="submit" 
                                icon="pi pi-send" 
                                className="ai-send-btn" 
                                disabled={!inputValue.trim() || isTyping}
                            />
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}