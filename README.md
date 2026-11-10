# Chat en tiempo real

Aplicación de chat donde los usuarios se registran, inician sesión, crean conversaciones (individuales o de grupo) con otros usuarios y se envían mensajes al instante mediante WebSockets. El historial queda guardado en PostgreSQL.

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Socket.IO client.
- **Backend:** NestJS 12, Socket.IO, TypeORM, PostgreSQL 16.

## Manual de ejecución

### Opción 1: Docker (un solo comando)

Requisito: Docker con Docker Compose.

```bash
docker compose up --build
```

Cuando termine de arrancar, abre http://localhost:3000. La API queda en http://localhost:4000 y la base de datos se crea y migra sola.

Para probar el chat entre dos personas, abre la aplicación en dos navegadores distintos (o en una ventana normal y otra de incógnito) y registra un usuario en cada uno.

Para detenerlo: `docker compose down` (añade `-v` si también quieres borrar los datos).

> El `docker-compose.yml` trae un `JWT_SECRET` de ejemplo para uso local. Fuera de tu máquina, define uno propio en un archivo `.env` junto al compose: `JWT_SECRET=...`.

### Opción 2: en local

Requisitos: Node.js 22 o superior y PostgreSQL 16 (sirve cualquier instalación local o un contenedor).

**0. Dependencias.** Desde la raíz del proyecto, una sola vez después de clonarlo o descomprimirlo:

```bash
npm run setup
```

Instala el backend y el frontend a partir de sus `package-lock.json`. Hazlo también antes de abrir el proyecto en el editor; sin las dependencias, VS Code marca errores de tipos.

**1. Base de datos**

```bash
createuser -P --createdb chat   # contraseña: chat (CREATEDB permite crear la base de tests)
createdb -O chat chat
```

O con Docker: `docker run -d --name chat-db -e POSTGRES_USER=chat -e POSTGRES_PASSWORD=chat -e POSTGRES_DB=chat -p 5432:5432 postgres:16-alpine`

**2. Backend** (puerto 4000)

```bash
cd backend
cp .env.example .env      # cambia JWT_SECRET por un valor aleatorio
npm run start:dev
```

Las tablas se crean automáticamente al arrancar (migraciones de TypeORM).

**3. Frontend** (puerto 3000), en otra terminal

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000.

> `npm run setup` usa `npm ci`, que instala exactamente las versiones del `package-lock.json`. Con algunas versiones de npm 10, `npm install` falla resolviendo dependencias peer de Vitest; si necesitas usarlo, actualiza npm a la versión 11.

### Si el editor marca errores en rojo

- `Cannot find type definition file for 'node'` o `'vitest/globals'` en `backend/tsconfig.json`: faltan las dependencias. Ejecuta `npm run setup` en la raíz y, en VS Code, `TypeScript: Restart TS Server`. Docker no lo evita: instala las dependencias dentro de la imagen, no en tu carpeta.
- Si siguen apareciendo con las dependencias instaladas, el editor está usando otra versión de TypeScript: `TypeScript: Select TypeScript Version` → `Use Workspace Version`.

### Variables de entorno

| Servicio | Variable | Descripción | Por defecto |
|---|---|---|---|
| backend | `DATABASE_URL` | Conexión a PostgreSQL | obligatoria |
| backend | `JWT_SECRET` | Clave para firmar la sesión (mínimo 32 caracteres) | obligatoria |
| backend | `PORT` | Puerto HTTP y WebSocket | `4000` |
| backend | `FRONTEND_URL` | Origen permitido por CORS | `http://localhost:3000` |
| backend | `SESSION_TTL_SECONDS` | Duración de la sesión | `86400` (24 h) |
| backend | `COOKIE_SECURE` | `true` cuando se sirve por HTTPS | `false` |
| frontend | `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:4000` |

### Tests

| Comando | Qué ejecuta | Requisitos |
|---|---|---|
| `npm run test:docker` | Backend y frontend dentro de contenedores | Docker. Sin npm: `docker compose run --rm backend-test` y `docker compose run --rm frontend-test` |
| `npm test` | Backend y frontend en tu máquina | Node 22, `npm run setup` y PostgreSQL local |
| `npm --prefix frontend test` | Solo el frontend | `npm run setup` |

- **Backend (e2e):** levanta la aplicación completa contra una base de datos real y prueba el registro, el login, la protección de rutas y del socket, la creación de chats, el envío de mensajes, el historial y que un usuario no reciba mensajes de chats ajenos. Usa una base de datos aparte, `chat_test`, que se crea sola la primera vez. Se puede usar otra con `TEST_DATABASE_URL`.
- **Frontend (unitarios y de componentes):** validación de formularios, formato de fechas, el estado de chats y mensajes (orden, duplicados y no leídos), las pantallas de login y registro, y el envío de mensajes (Enter, envíos duplicados, errores y desconexión).

Los servicios `backend-test` y `frontend-test` del `docker-compose.yml` solo se ejecutan cuando se llaman; `docker compose up` no los arranca. La primera ejecución tarda un poco más porque instala dependencias dentro del contenedor.

### Simulación de usuarios

Para ver la aplicación con actividad, hay un script que registra usuarios de prueba y los pone a conversar por la API y el socket reales. Necesita el backend arrancado (con Docker o en local) y las dependencias instaladas (`npm run setup`):

```bash
npm run simulate                                   # 5 usuarios, un mensaje cada ~4 s por usuario
npm run simulate -- --users 8 --with tu@correo.com  # te incluye en los chats para verlo en el navegador
npm run simulate -- --help                         # todas las opciones
```

Los usuarios se llaman «Nombre Bot N», con correo `botN@simulacion.test` y contraseña `password123`, así que también puedes iniciar sesión como cualquiera de ellos. Si ya existen, el script inicia sesión en lugar de registrarlos, y si alcanza el límite de 10 registros por minuto espera en vez de fallar. Se detiene con `Ctrl+C` o con `--duration <segundos>`.

## Funcionalidades

- Registro, inicio y cierre de sesión. Las rutas del chat y la conexión por socket solo están disponibles con sesión válida.
- Listado de usuarios y creación de chats con una o varias personas. Si el chat con esos mismos participantes ya existe, se abre el existente en lugar de duplicarlo.
- Listado de chats ordenado por actividad, con el último mensaje.
- Mensajes en tiempo real con remitente y hora. Cada usuario recibe solo los mensajes de los chats en los que participa.
- Historial persistente con paginación («Cargar mensajes anteriores»).
- Validación en frontend y backend con mensajes claros: campos vacíos, formato de correo, correo ya registrado, credenciales inválidas.
- Indicadores de carga (spinners y skeletons) y botones deshabilitados mientras hay una petición en curso.
- Aviso de «sin conexión» y reconexión automática. Al reconectar se recuperan los mensajes que llegaron mientras tanto.
- Notificaciones de mensajes nuevos: contador de no leídos en cada chat, aviso dentro de la app cuando escriben en un chat que no tienes abierto, total de no leídos en el título de la pestaña y notificación del sistema cuando la pestaña está en segundo plano (se activa con el botón de la campana).
- Animaciones en la aparición de mensajes, el cambio de chat y los diálogos. Diseño responsive.

## Decisiones técnicas

**Sesión en cookie httpOnly en lugar de token en `localStorage`.** El JWT no es accesible desde JavaScript, así que un XSS no puede robarlo. La cookie es `SameSite=Lax`, lo que bloquea su envío en peticiones POST de otros sitios, y CORS solo acepta el origen del frontend. El mismo mecanismo autentica el socket: el servidor valida la cookie durante el handshake y rechaza la conexión si no es válida.

**Una sala de Socket.IO por usuario.** Al conectar, cada socket se une a `user:<id>`. Cuando llega un mensaje, el servidor lo guarda y lo emite a las salas de los participantes del chat. Así un usuario solo recibe mensajes de sus chats sin tener que gestionar suscripciones por conversación, los chats nuevos funcionan sin pasos extra y varias pestañas del mismo usuario se mantienen sincronizadas.

**Envío por socket con acknowledgement.** El cliente envía `message:send` y espera la confirmación del servidor, que devuelve el mensaje guardado o un error de validación. Mientras tanto el botón queda deshabilitado (sin envíos duplicados) y, si falla, el texto se conserva para reintentar.

**PostgreSQL + TypeORM con migraciones.** Los datos son relacionales (usuarios, chats, participantes, mensajes), así que una base relacional con claves foráneas e índices encaja mejor que una documental. No se usa `synchronize`: el esquema se crea con una migración explícita.

**Context API para el estado global.** Tres contextos con responsabilidades separadas: `AuthContext` (sesión), `SocketContext` (conexión y su estado) y `ChatsContext` (chats, mensajes y no leídos, con `useReducer`). No hace falta una librería externa para este tamaño de aplicación.

**Notificaciones sin dependencias.** Los avisos dentro de la app y el contador se construyen con el estado del chat; las notificaciones del sistema usan la Notification API del navegador. El permiso se pide solo cuando el usuario pulsa la campana, porque los navegadores bloquean las peticiones que nadie ha solicitado.

**Contraseñas con bcrypt** (12 rondas). El login responde igual, y tarda lo mismo, si el correo no existe o si la contraseña es incorrecta, para no revelar qué cuentas existen. Registro y login tienen límite de 10 intentos por minuto.

## Estructura

```
backend/src
├── auth/        registro, login, sesión (JWT en cookie) y guard
├── users/       entidad y listado de usuarios
├── chats/       chats, mensajes, gateway de Socket.IO
├── database/    migraciones
└── config.ts    variables de entorno validadas al arrancar

frontend/src
├── app/         rutas: /login, /register, /chats, /chats/[chatId]
├── components/  ui (botón, campo, avatar…) y chat (lista, conversación, composer…)
├── context/     auth, socket y chats
└── lib/         cliente HTTP, tipos, validación y formato de fechas
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea la cuenta e inicia sesión |
| POST | `/auth/login` | Inicia sesión |
| POST | `/auth/logout` | Cierra sesión |
| GET | `/auth/me` | Usuario de la sesión actual |
| GET | `/users` | Resto de usuarios |
| GET | `/chats` | Chats del usuario |
| POST | `/chats` | Crea (o devuelve el existente) `{ participantIds }` |
| GET | `/chats/:id/messages?before=&limit=` | Historial paginado |

Eventos de Socket.IO:

| Evento | Dirección | Contenido |
|---|---|---|
| `message:send` | cliente → servidor | `{ chatId, content }`, responde `{ message }` o `{ error }` |
| `message:new` | servidor → cliente | mensaje nuevo en uno de tus chats |
| `chat:new` | servidor → cliente | te han añadido a un chat |

## Limitaciones conocidas

- El cierre de sesión borra la cookie, pero el JWT sigue siendo válido hasta que expira. Para invalidarlo de inmediato haría falta guardar las sesiones en el servidor.
- La sesión del socket se comprueba al conectar y en cada envío. Si expira, el servidor desconecta y el cliente vuelve al login.
- El contador de no leídos vive en el navegador: al recargar la página vuelve a cero. Persistirlo requiere guardar en el servidor hasta dónde ha leído cada participante.
- No hay indicadores de «escribiendo» ni confirmaciones de lectura; no eran parte del alcance.
