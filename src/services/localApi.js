const STORAGE_KEY = 'managewise_local_api_v1';
const API_PREFIX = '/local-api';
const NETWORK_DELAY_MS = 120;

let isInstalled = false;

export function installLocalApi() {
    if (typeof window === 'undefined' || isInstalled) return;

    ensureDatabase();
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
        const path = getLocalPath(input);
        if (!path) return nativeFetch(input, init);

        await wait(NETWORK_DELAY_MS);

        try {
            const method = getMethod(input, init);
            const body = await readBody(input, init);
            return handleRequest(path, method, body);
        } catch (error) {
            console.error('Local API error:', error);
            return json({ error: 'Error interno de la API local' }, 500);
        }
    };

    isInstalled = true;
}

function getLocalPath(input) {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    if (!rawUrl) return null;

    const url = new URL(rawUrl, window.location.origin);
    const path = url.pathname;

    if (path.startsWith(API_PREFIX)) {
        return normalizePath(path.slice(API_PREFIX.length));
    }

    if (path.startsWith('/undefined/')) {
        return normalizePath(path.slice('/undefined'.length));
    }

    const knownResources = [
        '/auth',
        '/users',
        '/projects',
        '/roles',
        '/team-members',
        '/epics',
        '/sprints',
        '/user-stories',
        '/meetings',
        '/recordings',
        '/activities'
    ];

    const matchedResource = knownResources.find((resource) => (
        path === resource || path.startsWith(`${resource}/`) || path.includes(`${resource}/`)
    ));

    if (matchedResource) {
        return normalizePath(path.slice(path.indexOf(matchedResource)));
    }

    return null;
}

function normalizePath(path) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return decodeURIComponent(normalized);
}

function getMethod(input, init) {
    return (init?.method || input?.method || 'GET').toUpperCase();
}

async function readBody(input, init) {
    const body = init?.body;
    if (body) return parseBody(body);

    if (typeof Request !== 'undefined' && input instanceof Request) {
        const text = await input.clone().text();
        return parseBody(text);
    }

    return {};
}

function parseBody(body) {
    if (!body || typeof body !== 'string') return {};

    try {
        return JSON.parse(body);
    } catch {
        return {};
    }
}

function handleRequest(path, method, body) {
    const db = readDb();
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    const [resource] = segments;

    if (resource === 'auth') return handleAuth(db, segments, method, body);
    if (resource === 'users') return handleUsers(db, segments, method);
    if (resource === 'projects') return handleProjects(db, segments, method, body);
    if (resource === 'roles') return handleCollection(db, 'roles', segments, method, body, 'role');
    if (resource === 'team-members') return handleCollection(db, 'teamMembers', segments, method, body, 'member');
    if (resource === 'epics') return handleCollection(db, 'epics', segments, method, body, 'epic');
    if (resource === 'sprints') return handleSprints(db, segments, method, body);
    if (resource === 'user-stories') return handleCollection(db, 'userStories', segments, method, body, 'story');
    if (resource === 'meetings') return handleCollection(db, 'meetings', segments, method, body, 'meeting');
    if (resource === 'recordings') return handleCollection(db, 'recordings', segments, method, body, 'recording');
    if (resource === 'activities') return handleActivities(db, segments, method);

    if (segments.length === 1 && method === 'GET') return getUserByUsername(db, resource);
    if (segments.length === 1 && method === 'DELETE') return deleteUserByUsername(db, resource);

    return json({ error: 'Ruta local no encontrada' }, 404);
}

function handleAuth(db, segments, method, body) {
    if (method === 'POST' && segments[1] === 'sign-in') {
        const username = String(body.username || '').trim();
        const password = String(body.password || '').trim();

        if (!username || !password) {
            return json({ error: 'Usuario y contrasena son obligatorios' }, 400);
        }

        let user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            user = createUser(db, {
                username,
                password,
                fullName: username,
                email: `${username}@managewise.local`,
                plan: 'pro'
            });
            ensureWorkspaceForUser(db, user);
        }

        writeDb(db);
        return json({
            token: `local-token-${user.username}`,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            plan: user.plan || 'pro'
        });
    }

    if (method === 'POST' && segments[1] === 'sign-up') {
        const username = String(body.username || '').trim();
        const email = String(body.email || '').trim();
        const password = String(body.password || '').trim();
        const fullName = String(body.fullName || username).trim();

        if (!username || !email || !password) {
            return json({ error: 'Completa usuario, correo y contrasena' }, 400);
        }

        const exists = db.users.some((item) => item.username.toLowerCase() === username.toLowerCase());
        if (exists) return json({ error: 'El usuario ya existe en la data local' }, 409);

        const user = createUser(db, { username, email, password, fullName, plan: 'pro' });
        ensureWorkspaceForUser(db, user);
        writeDb(db);

        return json({ message: 'Cuenta local creada', user: sanitizeUser(user) }, 201);
    }

    return json({ error: 'Ruta de autenticacion local no encontrada' }, 404);
}

function handleUsers(db, segments, method) {
    const username = segments[1];
    if (!username) return json(db.users.map(sanitizeUser));

    if (method === 'GET') return getUserByUsername(db, username);
    if (method === 'DELETE') return deleteUserByUsername(db, username);

    return json({ error: 'Metodo no soportado para usuarios' }, 405);
}

function getUserByUsername(db, username) {
    const user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!user) return json({ error: 'Usuario no encontrado' }, 404);
    return json(sanitizeUser(user));
}

function deleteUserByUsername(db, username) {
    const normalizedUsername = username.toLowerCase();
    const ownedProjectIds = db.projects
        .filter((project) => String(project.ownerId).toLowerCase() === normalizedUsername)
        .map((project) => project.id);

    db.users = db.users.filter((user) => user.username.toLowerCase() !== normalizedUsername);
    db.projects = db.projects.filter((project) => !ownedProjectIds.includes(project.id));
    db.roles = db.roles.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.teamMembers = db.teamMembers.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.epics = db.epics.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.sprints = db.sprints.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.userStories = db.userStories.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.meetings = db.meetings.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.recordings = db.recordings.filter((item) => !ownedProjectIds.includes(item.projectId));
    db.activities = db.activities.filter((item) => !ownedProjectIds.includes(item.projectId));
    writeDb(db);

    return empty();
}

function handleProjects(db, segments, method, body) {
    if (method === 'GET' && segments.length === 1) return json(db.projects);

    if (method === 'GET' && segments[1] === 'owner') {
        const username = segments[2] || '';
        return json(db.projects.filter((project) => String(project.ownerId).toLowerCase() === username.toLowerCase()));
    }

    if (method === 'GET' && segments[1] === 'shared') {
        const email = String(segments[2] || '').toLowerCase();
        const sharedProjectIds = db.teamMembers
            .filter((member) => String(member.email || '').toLowerCase() === email)
            .map((member) => member.projectId);

        return json(db.projects.filter((project) => (
            sharedProjectIds.includes(project.id) && String(project.ownerId).toLowerCase() !== email.split('@')[0]
        )));
    }

    if (method === 'POST' && segments.length === 1) {
        const project = {
            id: createId('project'),
            name: body.name || 'Nuevo Proyecto',
            description: body.description || 'Sin descripcion',
            ownerId: body.ownerId || getCurrentUsername(),
            role: body.role || 'Product Owner'
        };

        db.projects.push(project);
        seedProjectBasics(db, project.id);
        addActivity(db, project.id, 'dev', 'creo un nuevo proyecto', project.name);
        writeDb(db);

        return json(project, 201);
    }

    return json({ error: 'Ruta local de proyectos no encontrada' }, 404);
}

function handleCollection(db, key, segments, method, body, idPrefix) {
    if (method === 'GET' && segments.length === 1) return json(db[key]);

    if (method === 'GET' && segments[1] === 'project') {
        return json(db[key].filter((item) => String(item.projectId) === String(segments[2])));
    }

    if (method === 'POST' && segments.length === 1) {
        const item = {
            id: createId(idPrefix),
            ...body
        };

        db[key].push(item);
        logCollectionActivity(db, key, item, 'creo');
        writeDb(db);
        return json(item, 201);
    }

    const id = segments[1];
    const index = db[key].findIndex((item) => String(item.id) === String(id));

    if (method === 'PUT' && id) {
        if (index === -1) return json({ error: 'Elemento no encontrado' }, 404);

        db[key][index] = {
            ...db[key][index],
            ...body,
            id: db[key][index].id
        };

        logCollectionActivity(db, key, db[key][index], 'actualizo');
        writeDb(db);
        return json(db[key][index]);
    }

    if (method === 'DELETE' && id) {
        if (index === -1) return empty();

        const [deletedItem] = db[key].splice(index, 1);

        if (key === 'epics') {
            db.userStories = db.userStories.map((story) => (
                story.epicId === id ? { ...story, epicId: null } : story
            ));
        }

        logCollectionActivity(db, key, deletedItem, 'elimino');
        writeDb(db);
        return empty();
    }

    return json({ error: 'Ruta local no encontrada' }, 404);
}

function handleSprints(db, segments, method, body) {
    if (method === 'POST' && segments[2] === 'complete') {
        const sprintId = segments[1];
        const sprint = db.sprints.find((item) => String(item.id) === String(sprintId));
        if (!sprint) return json({ error: 'Sprint no encontrado' }, 404);

        sprint.status = 'COMPLETED';
        db.userStories = db.userStories.map((story) => (
            story.sprintId === sprintId && story.status !== 'DONE'
                ? { ...story, sprintId: null }
                : story
        ));

        addActivity(db, sprint.projectId, 'dev', 'completo un sprint', sprint.name);
        writeDb(db);
        return json(sprint);
    }

    if (method === 'DELETE' && segments[1]) {
        const sprintId = segments[1];
        const sprint = db.sprints.find((item) => String(item.id) === String(sprintId));
        db.sprints = db.sprints.filter((item) => String(item.id) !== String(sprintId));
        db.userStories = db.userStories.map((story) => (
            story.sprintId === sprintId ? { ...story, sprintId: null } : story
        ));

        if (sprint) addActivity(db, sprint.projectId, 'dev', 'elimino un sprint', sprint.name);
        writeDb(db);
        return empty();
    }

    return handleCollection(db, 'sprints', segments, method, body, 'sprint');
}

function handleActivities(db, segments, method) {
    if (method === 'GET' && segments[1] === 'project') {
        return json(db.activities.filter((item) => String(item.projectId) === String(segments[2])));
    }

    return json({ error: 'Ruta local de actividades no encontrada' }, 404);
}

function logCollectionActivity(db, key, item, verb) {
    const activityMap = {
        roles: ['dev', 'rol'],
        teamMembers: ['dev', 'miembro del equipo'],
        epics: ['dev', 'epica'],
        sprints: ['dev', 'sprint'],
        userStories: ['dev', 'historia de usuario'],
        meetings: ['meeting', 'reunion'],
        recordings: ['meeting', 'grabacion']
    };

    const [type, label] = activityMap[key] || ['dev', 'registro'];
    const title = item.title || item.name || item.fullName || item.label || item.id;
    addActivity(db, item.projectId, type, `${verb} ${label}`, title);
}

function addActivity(db, projectId, actionType, content, extraDetails = '') {
    if (!projectId) return;

    db.activities.push({
        id: createId('activity'),
        projectId,
        authorName: getCurrentUsername(),
        actionType,
        content,
        extraDetails,
        createdAt: new Date().toISOString()
    });
}

function ensureDatabase() {
    readDb();
}

function readDb() {
    const seed = createSeedData();
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        writeDb(seed);
        return seed;
    }

    try {
        const parsed = JSON.parse(raw);
        const merged = { ...seed, ...parsed };
        writeDb(merged);
        return merged;
    } catch {
        writeDb(seed);
        return seed;
    }
}

function writeDb(db) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function createSeedData() {
    const projectId = 'project_demo_001';
    const sprintOne = 'sprint_demo_001';
    const sprintTwo = 'sprint_demo_002';
    const rolePo = 'role_demo_po';
    const roleDev = 'role_demo_dev';
    const roleQa = 'role_demo_qa';
    const memberAna = 'member_demo_ana';
    const memberLuis = 'member_demo_luis';
    const epicAuth = 'epic_demo_auth';
    const epicReports = 'epic_demo_reports';

    return {
        users: [
            {
                id: 'user_demo_sergio',
                username: 'sergio',
                password: '123456',
                fullName: 'Sergio Gomez',
                email: 'sergio@managewise.local',
                plan: 'pro'
            }
        ],
        projects: [
            {
                id: projectId,
                name: 'ManageWise Demo',
                description: 'Workspace local con datos de ejemplo para probar la app sin backend.',
                ownerId: 'sergio',
                role: 'Product Owner'
            }
        ],
        roles: [
            { id: rolePo, label: 'Product Owner', value: 'PRODUCT_OWNER', color: '#f97316', projectId },
            { id: roleDev, label: 'Frontend Developer', value: 'FRONTEND_DEVELOPER', color: '#0ea5e9', projectId },
            { id: roleQa, label: 'QA Tester', value: 'QA_TESTER', color: '#22c55e', projectId }
        ],
        teamMembers: [
            {
                id: memberAna,
                fullName: 'Ana Torres',
                role: 'FRONTEND_DEVELOPER',
                email: 'ana@managewise.local',
                location: 'Lima, Peru',
                projectId
            },
            {
                id: memberLuis,
                fullName: 'Luis Ramirez',
                role: 'QA_TESTER',
                email: 'luis@managewise.local',
                location: 'Arequipa, Peru',
                projectId
            }
        ],
        epics: [
            { id: epicAuth, title: 'Autenticacion', description: 'warning', projectId },
            { id: epicReports, title: 'Reportes', description: 'success', projectId }
        ],
        sprints: [
            {
                id: sprintOne,
                name: 'Sprint 1 - MVP',
                goal: 'Validar el flujo principal de proyectos',
                endDate: daysFromNow(7),
                status: 'ACTIVE',
                projectId
            },
            {
                id: sprintTwo,
                name: 'Sprint 2 - Reportes',
                goal: 'Preparar analitica e integraciones',
                endDate: daysFromNow(21),
                status: 'PLANNING',
                projectId
            }
        ],
        userStories: [
            {
                id: 'story_demo_001',
                title: 'Login local para usuarios demo',
                statement: 'Como usuario quiero ingresar sin depender del backend para revisar la app.',
                epicId: epicAuth,
                sprintId: sprintOne,
                points: 5,
                assigneeId: memberAna,
                status: 'DONE',
                projectId
            },
            {
                id: 'story_demo_002',
                title: 'Dashboard con metricas del sprint',
                statement: 'Como product owner quiero ver avance y esfuerzo por miembro.',
                epicId: epicReports,
                sprintId: sprintOne,
                points: 8,
                assigneeId: memberLuis,
                status: 'IN_PROGRESS',
                projectId
            },
            {
                id: 'story_demo_003',
                title: 'Exportacion visual de reportes',
                statement: 'Como stakeholder quiero imprimir el reporte ejecutivo.',
                epicId: epicReports,
                sprintId: null,
                points: 3,
                assigneeId: null,
                status: 'TO_DO',
                projectId
            }
        ],
        meetings: [
            {
                id: 'meeting_demo_001',
                title: 'Daily Sprint',
                description: 'Seguimiento del avance diario',
                scheduledAt: meetingDate(1, 9, 30),
                meetingUrl: 'https://meet.google.com/',
                projectId
            }
        ],
        recordings: [
            {
                id: 'recording_demo_001',
                title: 'Kickoff del proyecto',
                recordedAt: meetingDate(-3, 12, 0),
                duration: '00:42:00',
                access: 'Publico',
                videoUrl: 'https://drive.google.com/',
                projectId
            }
        ],
        activities: [
            {
                id: 'activity_demo_001',
                projectId,
                authorName: 'Sergio',
                actionType: 'dev',
                content: 'creo la historia de login local',
                extraDetails: 'Lista para pruebas sin backend',
                createdAt: meetingDate(-1, 16, 15)
            },
            {
                id: 'activity_demo_002',
                projectId,
                authorName: 'ManageWise AI',
                actionType: 'ai',
                content: 'detecto buen avance del sprint',
                extraDetails: 'El sprint tiene puntos completados y tareas en progreso',
                createdAt: meetingDate(0, 10, 5)
            }
        ]
    };
}

function createUser(db, data) {
    const user = {
        id: createId('user'),
        username: data.username,
        password: data.password,
        fullName: data.fullName || data.username,
        email: data.email,
        plan: data.plan || 'pro'
    };

    db.users.push(user);
    return user;
}

function ensureWorkspaceForUser(db, user) {
    const hasProject = db.projects.some((project) => project.ownerId === user.username);
    if (hasProject) return;

    const project = {
        id: createId('project'),
        name: `Proyecto de ${user.username}`,
        description: 'Proyecto local creado automaticamente.',
        ownerId: user.username,
        role: 'Product Owner'
    };

    db.projects.push(project);
    seedProjectBasics(db, project.id);
}

function seedProjectBasics(db, projectId) {
    db.roles.push(
        { id: createId('role'), label: 'Product Owner', value: 'PRODUCT_OWNER', color: '#f97316', projectId },
        { id: createId('role'), label: 'Developer', value: 'DEVELOPER', color: '#0ea5e9', projectId },
        { id: createId('role'), label: 'QA Tester', value: 'QA_TESTER', color: '#22c55e', projectId }
    );

    db.epics.push(
        { id: createId('epic'), title: 'Core App', description: 'info', projectId },
        { id: createId('epic'), title: 'Experiencia de Usuario', description: 'success', projectId }
    );
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        plan: user.plan || 'pro'
    };
}

function createId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getCurrentUsername() {
    return window.localStorage.getItem('current_username') || 'Sistema';
}

function daysFromNow(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function meetingDate(dayOffset, hour, minute) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function empty(status = 204) {
    return new Response(null, { status });
}

function wait(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
