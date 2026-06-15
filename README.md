# ManageWise

Frontend React + Vite preparado para funcionar sin backend. Todas las llamadas `GET`, `POST`, `PUT` y `DELETE` de la app se atienden con una API local en el navegador usando `localStorage`.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Puedes iniciar sesion con cualquier usuario y contrasena. Si quieres ver data demo desde el primer login:

- Usuario: `sergio`
- Contrasena: `123456`

## Data local

La API local vive en `src/services/localApi.js` y se instala desde `src/main.jsx`.

- No necesita backend.
- Persiste cambios en `localStorage`.
- Incluye proyectos, sprints, historias, miembros, roles, reuniones, grabaciones, reportes y actividad demo.
- Si quieres resetear los datos, borra la clave `managewise_local_api_v1` del `localStorage` del navegador.

## Netlify

El proyecto ya incluye `netlify.toml`.

Configuracion recomendada:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`

Para desplegar desde GitHub, conecta el repo en Netlify y usa la configuracion anterior. No hace falta crear variables de entorno, pero si quieres declararla manualmente puedes usar:

```bash
VITE_API_BASE_URL=/local-api
```
