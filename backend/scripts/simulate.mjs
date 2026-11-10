// Fills the chat with test users that talk to each other through the real API and socket.
// Usage: npm run simulate -- --users 6 --interval 4000 --with tu@correo.com
import { parseArgs } from 'node:util';
import { io } from 'socket.io-client';

const { values: opts } = parseArgs({
  options: {
    api: {
      type: 'string',
      default: process.env.API_URL ?? 'http://localhost:4000',
    },
    users: { type: 'string', default: '5' },
    interval: { type: 'string', default: '4000' },
    jitter: { type: 'string', default: '0.5' },
    duration: { type: 'string', default: '0' },
    with: { type: 'string' },
    help: { type: 'boolean', default: false },
  },
});

if (opts.help) {
  console.log(`Opciones:
  --users <n>        usuarios de prueba (por defecto 5)
  --interval <ms>    tiempo medio entre mensajes de cada usuario (por defecto 4000)
  --jitter <0-1>     variación aleatoria del intervalo (por defecto 0.5 = ±50 %)
  --duration <s>     segundos de simulación; 0 = hasta Ctrl+C (por defecto 0)
  --with <correo>    incluye a un usuario ya registrado en los chats
  --api <url>        URL del backend (por defecto http://localhost:4000)`);
  process.exit(0);
}

const API = opts.api.replace(/\/$/, '');
const USER_COUNT = Number(opts.users);
const INTERVAL = Number(opts.interval);
const JITTER = Math.min(Math.max(Number(opts.jitter), 0), 1);
const DURATION = Number(opts.duration);
const PASSWORD = 'password123';

const NAMES = [
  'Laura',
  'Mateo',
  'Valentina',
  'Santiago',
  'Camila',
  'Andrés',
  'Isabella',
  'Julián',
  'Mariana',
  'Felipe',
  'Daniela',
  'Tomás',
];
const PHRASES = [
  'Hola, ¿cómo vas?',
  '¿Alguien revisó lo de ayer?',
  'Ya casi termino, dame cinco minutos',
  'Jaja, buenísimo',
  '¿Nos vemos a las 3?',
  'Perfecto, quedo atento',
  'Acabo de subir los cambios',
  '¿Me pasas el enlace?',
  'Listo, ya está desplegado',
  'Voy por un café, ¿alguien quiere?',
  'Eso no lo tenía en cuenta, buen punto',
  '¿Probaste reiniciando el servidor?',
  'Mañana lo revisamos con calma',
  'Gracias 🙌',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const time = () => new Date().toLocaleTimeString('es', { hour12: false });
const log = (text) => console.log(`[${time()}] ${text}`);

async function request(path, { cookie, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  const setCookie = res.headers.getSetCookie()[0];
  return { status: res.status, data, cookie: setCookie?.split(';')[0] };
}

// Registers the user, or logs in if the account already exists. Waits when rate limited.
async function signIn(name, email) {
  for (;;) {
    let res = await request('/auth/register', {
      body: { name, email, password: PASSWORD },
    });
    if (res.status === 409) {
      res = await request('/auth/login', {
        body: { email, password: PASSWORD },
      });
    }
    if (res.status === 429) {
      log(
        'Límite de 10 registros/inicios de sesión por minuto alcanzado. Esperando 60 s…',
      );
      await sleep(60_000);
      continue;
    }
    if (!res.cookie) {
      throw new Error(
        `No se pudo autenticar a ${email}: ${JSON.stringify(res.data)}`,
      );
    }
    return { ...res.data, cookie: res.cookie };
  }
}

function connect(user) {
  return new Promise((resolve, reject) => {
    const socket = io(API, {
      transports: ['websocket'],
      extraHeaders: { cookie: user.cookie },
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) =>
      reject(new Error(`${user.name}: ${error.message}`)),
    );
  });
}

async function main() {
  const health = await fetch(`${API}/auth/me`).catch(() => null);
  if (!health) {
    console.error(
      `No hay backend en ${API}. Arráncalo primero (docker compose up o npm run start:dev).`,
    );
    process.exit(1);
  }
  if (!Number.isInteger(USER_COUNT) || USER_COUNT < 2) {
    console.error('--users debe ser un número entero mayor o igual que 2');
    process.exit(1);
  }

  log(`Preparando ${USER_COUNT} usuarios de prueba en ${API}`);
  const bots = [];
  for (let i = 1; i <= USER_COUNT; i++) {
    const name = `${NAMES[(i - 1) % NAMES.length]} Bot ${i}`;
    bots.push(await signIn(name, `bot${i}@simulacion.test`));
    log(`  ${name} listo (bot${i}@simulacion.test / ${PASSWORD})`);
  }

  let guest = null;
  if (opts.with) {
    const { data: everyone } = await request('/users', {
      cookie: bots[0].cookie,
    });
    guest = everyone.find((u) => u.email === opts.with.toLowerCase());
    if (!guest) {
      console.error(
        `No existe ningún usuario con el correo ${opts.with}. Regístralo primero en la aplicación.`,
      );
      process.exit(1);
    }
    log(`Incluyendo a ${guest.name} en los chats`);
  }

  // Each bot gets a private chat with the next one, plus one group with everybody
  const chatsByBot = new Map(bots.map((b) => [b.id, []]));
  const createChat = async (owner, others) => {
    const { data: chat } = await request('/chats', {
      cookie: owner.cookie,
      body: { participantIds: others.map((u) => u.id) },
    });
    for (const p of chat.participants) chatsByBot.get(p.id)?.push(chat.id);
  };
  for (let i = 0; i < bots.length; i++) {
    await createChat(bots[i], [bots[(i + 1) % bots.length]]);
  }
  await createChat(bots[0], [...bots.slice(1), ...(guest ? [guest] : [])]);
  if (guest) {
    for (const bot of bots.slice(0, 3)) await createChat(bot, [guest]);
  }
  for (const [id, chats] of chatsByBot) chatsByBot.set(id, [...new Set(chats)]);
  log('Chats creados');

  const sockets = await Promise.all(bots.map(connect));
  log(
    `Conectados. Cada usuario escribe cada ${INTERVAL / 1000} s ±${Math.round(JITTER * 100)} %. Ctrl+C para parar.\n`,
  );

  let sent = 0;
  let failed = 0;
  let stopping = false;
  const timers = new Set();

  const scheduleNext = (bot, socket) => {
    if (stopping) return;
    const delay = INTERVAL * (1 - JITTER + Math.random() * 2 * JITTER);
    const timer = setTimeout(async () => {
      timers.delete(timer);
      const chatId = pick(chatsByBot.get(bot.id));
      const content = pick(PHRASES);
      try {
        const ack = await socket
          .timeout(8000)
          .emitWithAck('message:send', { chatId, content });
        if (ack.error) throw new Error(ack.error);
        sent++;
        log(`${bot.name}: ${content}`);
      } catch (error) {
        failed++;
        log(`${bot.name} no pudo enviar: ${error.message}`);
      }
      scheduleNext(bot, socket);
    }, delay);
    timers.add(timer);
  };

  const stop = () => {
    if (stopping) return;
    stopping = true;
    timers.forEach(clearTimeout);
    sockets.forEach((s) => s.disconnect());
    log(`Fin de la simulación: ${sent} mensajes enviados, ${failed} fallidos.`);
    process.exit(failed > 0 && sent === 0 ? 1 : 0);
  };
  process.on('SIGINT', stop);
  if (DURATION > 0) setTimeout(stop, DURATION * 1000);

  bots.forEach((bot, i) => scheduleNext(bot, sockets[i]));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
