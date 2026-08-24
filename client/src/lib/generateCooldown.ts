const COOLDOWN_KEY = "traceflow_generate_cooldown";
const STREAK_KEY = "traceflow_cancel_streak";
const SHORT_COOLDOWN_MS = 2000;
const LONG_COOLDOWN_MS = 30000;
const STREAK_RESET_MS = 20000;
const STREAK_LIMIT = 3;

export interface Cooldown {
  until: number;
  message: string;
}

interface Streak {
  count: number;
  lastAt: number;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Cooldown activo ahora mismo (si lo hay) -- persistido en
 * localStorage para que sobreviva un refresh de página: sin esto, el
 * usuario podría esquivar el bloqueo simplemente recargando. */
export function getActiveCooldown(): Cooldown | null {
  const cooldown = readJson<Cooldown>(COOLDOWN_KEY);
  if (!cooldown || cooldown.until <= Date.now()) {
    localStorage.removeItem(COOLDOWN_KEY);
    return null;
  }
  return cooldown;
}

/** Se llama cada vez que el usuario cancela una vectorización en
 * curso. Las primeras veces da un respiro corto (2s) para que el
 * trabajo pendiente en el backend tenga tiempo de liberarse antes del
 * siguiente intento. Si cancela demasiado seguido (3+ veces en menos
 * de 20s), en vez de seguir mandando peticiones que el rate limiter
 * del backend terminaría rechazando de todas formas, se bloquea
 * localmente por más tiempo con el mismo estilo de mensaje. */
export function registerCancel(): Cooldown {
  const now = Date.now();
  const prevStreak = readJson<Streak>(STREAK_KEY);
  const streak: Streak =
    prevStreak && now - prevStreak.lastAt <= STREAK_RESET_MS
      ? { count: prevStreak.count + 1, lastAt: now }
      : { count: 1, lastAt: now };
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));

  const cooldown: Cooldown =
    streak.count >= STREAK_LIMIT
      ? {
          until: now + LONG_COOLDOWN_MS,
          message: `Demasiadas peticiones. Espera ${LONG_COOLDOWN_MS / 1000}s antes de intentar de nuevo.`,
        }
      : { until: now + SHORT_COOLDOWN_MS, message: "" };

  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldown));
  return cooldown;
}

/** El backend rechazo la peticion con un 429 real (limite de tasa,
 * distinto del limite de concurrencia -- ver TooManyRequestsError):
 * su mensaje y tiempo de espera ya son exactos, asi que el cooldown
 * local se sincroniza con esos mismos valores en vez de usar los
 * genericos de registerCancel(). */
export function applyServerCooldown(seconds: number, message: string): Cooldown {
  const cooldown: Cooldown = { until: Date.now() + seconds * 1000, message };
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldown));
  return cooldown;
}
