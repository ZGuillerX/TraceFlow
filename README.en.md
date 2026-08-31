<div align="center">

<h1>
  <img width="60" valign="middle" alt="TraceFlow logo" src="https://github.com/user-attachments/assets/064c90ff-6f2d-4a1f-9676-e80ad1ff6f45" />
  TraceFlow
</h1>

[🇪🇸 Español](README.md) | 🇬🇧 English

**From loose pixels to curves you can actually use.**

TraceFlow converts raster images (PNG/JPG/WEBP) into clean, editable SVGs, with real control over detail level, curve smoothing, color quantization, and layer thresholds — and it can remove the background from a photo (with or without vectorizing it afterward) using an AI segmentation model.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)

</div>

---

## Demo

https://github.com/user-attachments/assets/9411c3a7-d9c7-46ae-b753-328339690c8d

---

## Table of contents

- [Features](#features)
- [Stack](#stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Production build](#production-build)
- [Configuration](#configuration)
- [API](#api)
- [License](#license)

---

## Features

- 🎨 **Vectorize raster → SVG**, with a live progress preview (streamed stage by stage) and a draggable Original/Result comparator.
- ✂️ **Background removal** with AI (`rembg` + `BiRefNet`), either as a step before vectorizing or as a standalone tool that exports a PNG with real transparency. Quality selector (fast vs. high quality).
- 🎛️ **Fine-grained tracing control**: detail level, curve smoothing (`corner_threshold`), and color-grouping threshold (`layer_difference`), each with a calibrated automatic default.
- 🔍 **Automatic super-resolution** for small images before vectorizing, so detail isn't lost on icons or low-res screenshots.
- 🧩 **Inspector** with layers, real SVG properties (dimensions, file size), and the source code, copyable with one click.

---

## Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19 · Vite · TypeScript · Tailwind CSS 4 · `shadcn/ui` on top of Radix UI · `wouter` (routing) · `sonner` (notifications) |
| **Backend** | Python · FastAPI · [`vtracer`](https://github.com/visioncortex/vtracer) (vectorization) · `rembg` / `BiRefNet` via ONNX Runtime (background removal) · `super-image` (EDSR, super-resolution) |
| **Package management** | `pnpm` (frontend) · `pip` on a virtual environment (backend) |

---

## Project structure

```
TraceFlow/
├── client/               # Frontend (React + Vite)
│   └── src/
│       ├── pages/        # Home, Workspace (Studio), BackgroundRemover, History
│       ├── components/
│       │   ├── studio/   # Studio-specific components (header, comparator, inspector)
│       │   ├── workspace/# Settings panel, preview canvas, custom slider
│       │   └── ui/       # Base shadcn/ui components
│       └── lib/          # API client, SVG recoloring, utilities
├── backend/              # Backend (FastAPI)
│   ├── main.py           # Entry point: mounts the API and serves the compiled frontend
│   ├── api/
│   │   └── routers/      # HTTP endpoints (vectorize, remove background)
│   ├── services/         # Pipeline orchestration by stage
│   ├── core/             # Config, rate limiting, timeouts, logging, security
│   ├── pipeline/         # Individual steps: vectorize, remove background, quantize, scale, validate
│   └── tests/            # pytest (see backend README for tests if applicable)
└── dist/                  # Production frontend build (generated, not versioned)
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) (`corepack enable` enables `pnpm` on Node 20+ without installing it separately).
- Python 3.11+ and `pip`.

---

## Development

### Backend

From the project root:

```bash
py -m venv .venv                        # first time only
```

Activate the virtual environment (pick the command for your shell):

```bash
# PowerShell
.venv\Scripts\Activate.ps1

# Git Bash / WSL
source .venv/Scripts/activate
```

Install dependencies and start the dev server with auto-reload:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> The first call to remove background loads the BiRefNet model into memory (can take up to a minute on CPU); subsequent requests are much faster because the model stays cached.

### Frontend

In another terminal, from the project root:

```bash
pnpm install
pnpm dev
```

Open **http://localhost:5173** — the Vite proxy forwards requests to `/api/*` to the backend on port 8000, so both processes need to be running at the same time during development.

### Available scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the frontend in development mode with hot reload. |
| `pnpm check` | Type-checks TypeScript without emitting files (`tsc --noEmit`). |
| `pnpm test` | Runs the frontend test suite with Vitest. |
| `pnpm format` | Formats the project with Prettier. |
| `pnpm build` | Builds the production frontend into `dist/`. |
| `pnpm preview` | Serves the `dist/` build locally, to test it before deploying. |

The backend uses [`ruff`](https://docs.astral.sh/ruff/) for linting (configured in `backend/pyproject.toml`). It's not a project dependency (it's not in `requirements.txt`), so install it separately if you want to run it:

```bash
python -m pip install ruff
cd backend
python -m ruff check .
```

---

## Production build

```bash
pnpm build
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

FastAPI detects the `dist/` folder and serves the compiled frontend and the API from the same process — no separate static file server needed.

---

## Configuration

The backend's limits and timeouts live in `backend/core/config.py`:

| Variable | Description |
| --- | --- |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API. In development it defaults to `localhost:5173`; in production, set it via the `TRACEFLOW_CORS_ORIGINS` environment variable (comma-separated list, e.g. `TRACEFLOW_CORS_ORIGINS=https://traceflow.app,https://www.traceflow.app`). |
| `PROCESSING_TIMEOUT_SECONDS` | Maximum time per vectorize/background-removal request (covers the model's cold start). |
| `MAX_UPLOAD_SIZE_BYTES` | Maximum accepted file size. |
| `MAX_IMAGE_PIXELS` | Maximum accepted resolution (width × height), a safeguard against images with a resolution disproportionate to their file size. |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | General per-IP request limit. |
| `VECTORIZE_BURST_MAX_REQUESTS` / `VECTORIZE_BURST_WINDOW_SECONDS` | Short burst limit specific to the vectorize endpoints. |

The backend responds with basic HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) on every response, and logs (without exposing to the client) any unhandled exception from the pipeline.

---

## API

All endpoints receive the image as `multipart/form-data` under the `file` field.

| Endpoint | Description |
| --- | --- |
| `POST /api/vectorize` | Vectorizes the image and returns the full SVG in a single response. |
| `POST /api/vectorize/stream` | Same, but streams each pipeline stage via server-sent events as it completes (for the live progress bar). |
| `POST /api/remove-background` | Removes the background with AI and returns a PNG with real transparency. Accepts `quality=fast\|high`. |

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Made with 🧠 and Bézier curves · [Report a bug](../../issues) · [Request a feature](../../issues)

</div>
