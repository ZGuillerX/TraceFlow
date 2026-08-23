# TraceFlow

De píxeles sueltos a curvas que puedes usar. Vectorización de imágenes (PNG/JPG/WEBP → SVG) con control real sobre el trazado, y eliminación de fondo antes de vectorizar.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (shadcn/ui, wouter)
- **Backend:** Python (FastAPI) + [vtracer](https://github.com/visioncortex/vtracer) para la vectorización, `rembg`/`BiRefNet` para quitar fondo de fotos, y un modelo de super-resolución (EDSR) que agranda imágenes chicas antes de vectorizar

## Desarrollo

Backend:

```bash
cd backend
../.venv/Scripts/activate  # o `py -m venv ../.venv` si no existe
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend (en otra terminal, en la raíz del proyecto):

```bash
pnpm install
pnpm dev
```

Abre http://localhost:5173 — el proxy de Vite reenvía `/api/*` al backend en el puerto 8000.

## Producción

```bash
pnpm build              # genera dist/ con el frontend compilado
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

FastAPI sirve el frontend compilado (`dist/`) y la API desde el mismo proceso.
