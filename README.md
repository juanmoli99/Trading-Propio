# Sistema de Trading Automático Personal

## Requisitos

- Node.js
- pnpm
- PostgreSQL

## Estructura

- `backend/` — API y lógica del sistema
- `frontend/` — interfaz React
- `infra/` — infraestructura y despliegue
- `scripts/` — scripts operativos

## Backend

cd backend
pnpm install
pnpm run start:dev

## Frontend

cd frontend
pnpm install
pnpm run dev

## Build

Backend:

cd backend
pnpm run build

Frontend:

cd frontend
pnpm run build

## Seguridad

Nunca commitear archivos `.env`, credenciales ni API keys.

El sistema comenzará operando exclusivamente en modo PAPER.

LIVE permanecerá bloqueado hasta completar la fase de preparación correspondiente del roadmap.
