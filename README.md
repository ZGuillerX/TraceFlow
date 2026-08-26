# TraceFlow

De píxeles sueltos a curvas que puedes usar. TraceFlow convierte imágenes raster (PNG/JPG/WEBP) en SVG limpios y editables, con control real sobre el nivel de detalle, el suavizado de curvas, la cuantización de colores y el umbral entre capas — y puede quitar el fondo de una foto (con o sin vectorizar después) usando un modelo de segmentación por IA.

## Características

- **Vectorizar raster → SVG**, con vista previa en vivo del progreso (por etapas, vía streaming) y un comparador deslizable Original/Resultado.
- **Quitar fondo** con IA (`rembg` + `BiRefNet`), como paso previo a vectorizar o como herramienta independiente que exporta PNG con transparencia real. Selector de calidad (rápida vs. alta calidad).
- **Control fino del trazado**: nivel de detalle, suavizado de curvas (`corner_threshold`) y umbral de agrupación de colores (`layer_difference`), cada uno con un modo automático calibrado por defecto.
- **Súper-resolución automática** para imágenes chicas antes de vectorizar, para no perder detalle en iconos o capturas de baja resolución.
- **Inspector** con capas, propiedades reales del SVG (dimensiones, peso) y el código fuente, copiable con un clic.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4 (componentes `shadcn/ui` sobre Radix UI, enrutado con `wouter`, notificaciones con `sonner`).
- **Backend:** Python + FastAPI, con [`vtracer`](https://github.com/visioncortex/vtracer) para la vectorización, `rembg`/`BiRefNet` (ONNX Runtime) para quitar fondo, y un modelo de súper-resolución (EDSR, vía `super-image`) que agranda imágenes pequeñas antes de procesarlas.
- **Gestor de paquetes:** `pnpm` (frontend) y `pip` sobre un entorno virtual (backend).

## Estructura del proyecto

```
TraceFlow/
├── client/               # Frontend (React + Vite)
│   └── src/
│       ├── pages/        # Home, Workspace (Studio), BackgroundRemover, History
│       ├── components/
│       │   ├── studio/   # Componentes propios del Studio (header, comparador, inspector)
│       │   ├── workspace/# Panel de ajustes, lienzo de preview, slider a medida
│       │   └── ui/       # Componentes base de shadcn/ui
│       └── lib/          # Cliente de la API, recoloreado de SVG, utilidades
├── backend/              # Backend (FastAPI)
│   ├── main.py           # Punto de entrada: monta la API y sirve el frontend compilado
│   ├── api/
│   │   └── routers/      # Endpoints HTTP (vectorizar, quitar fondo)
│   ├── services/         # Orquestación del pipeline por etapas
│   ├── core/             # Config, rate limiting, timeouts, logging, seguridad
│   ├── pipeline/         # Pasos individuales: vectorizar, quitar fondo, cuantizar, escalar, validar
│   └── tests/            # pytest (backend/README de tests si aplica)
└── dist/                  # Build de producción del frontend (generado, no versionado)
```

## Requisitos previos

- [Node.js](https://nodejs.org/) 20+ y [pnpm](https://pnpm.io/) (`corepack enable` habilita `pnpm` en Node 20+ sin instalarlo aparte).
- Python 3.11+ y `pip`.

## Desarrollo

### Backend

Desde la raíz del proyecto:

```bash
py -m venv .venv                        # solo la primera vez
```

Activar el entorno virtual (elige el comando de tu shell):

```bash
# PowerShell
.venv\Scripts\Activate.ps1

# Git Bash / WSL
source .venv/Scripts/activate
```

Instalar dependencias y arrancar el servidor con recarga automática:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> El primer llamado a quitar fondo carga el modelo BiRefNet en memoria (puede tardar hasta un minuto en CPU); las siguientes peticiones son mucho más rápidas porque el modelo queda cacheado.

### Frontend

En otra terminal, desde la raíz del proyecto:

```bash
pnpm install
pnpm dev
```

Abre **http://localhost:5173** — el proxy de Vite reenvía las peticiones a `/api/*` hacia el backend en el puerto 8000, así que ambos procesos deben estar corriendo a la vez durante el desarrollo.

### Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Arranca el frontend en modo desarrollo con recarga en caliente. |
| `pnpm check` | Verifica tipos de TypeScript sin emitir archivos (`tsc --noEmit`). |
| `pnpm format` | Formatea el proyecto con Prettier. |
| `pnpm build` | Compila el frontend de producción a `dist/`. |
| `pnpm preview` | Sirve el build de `dist/` localmente, para probarlo antes de desplegar. |

El backend usa [`ruff`](https://docs.astral.sh/ruff/) para *lint* (configurado en `backend/pyproject.toml`). No es una dependencia del proyecto (no está en `requirements.txt`), así que instálalo aparte si quieres correrlo:

```bash
python -m pip install ruff
cd backend
python -m ruff check .
```

## Build de producción

```bash
pnpm build
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

FastAPI detecta la carpeta `dist/` y sirve el frontend compilado y la API desde el mismo proceso — no hace falta un servidor separado para archivos estáticos.

## Configuración

Los límites y tiempos de espera del backend viven en `backend/core/config.py`:

- `CORS_ALLOWED_ORIGINS`: orígenes permitidos para llamar a la API. En desarrollo usa `localhost:5173` por defecto; en producción, configúralo con la variable de entorno `TRACEFLOW_CORS_ORIGINS` (lista de orígenes separados por comas, ej. `TRACEFLOW_CORS_ORIGINS=https://traceflow.app,https://www.traceflow.app`).
- `PROCESSING_TIMEOUT_SECONDS`: tiempo máximo por petición de vectorizado/quitar fondo (cubre el arranque en frío del modelo).
- `MAX_UPLOAD_SIZE_BYTES`: tamaño máximo de archivo aceptado.
- `MAX_IMAGE_PIXELS`: resolución máxima aceptada (ancho × alto), protección contra imágenes con una resolución desproporcionada a su peso en disco.
- `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS`: límite general de peticiones por IP.
- `VECTORIZE_BURST_MAX_REQUESTS` / `VECTORIZE_BURST_WINDOW_SECONDS`: límite de ráfaga corta específico para los endpoints de vectorizado.

El backend responde con headers de seguridad HTTP básicos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) en toda respuesta, y loguea (sin exponer al cliente) cualquier excepción no anticipada del pipeline.

## API

Todos los endpoints reciben la imagen como `multipart/form-data` bajo el campo `file`.

| Endpoint | Descripción |
| --- | --- |
| `POST /api/vectorize` | Vectoriza la imagen y devuelve el SVG completo en una sola respuesta. |
| `POST /api/vectorize/stream` | Igual, pero transmite cada etapa del pipeline por *server-sent events* según se completa (para la barra de progreso en vivo). |
| `POST /api/remove-background` | Quita el fondo con IA y devuelve un PNG con transparencia real. Acepta `quality=fast\|high`. |

## Licencia

MIT — ver [LICENSE](LICENSE).
