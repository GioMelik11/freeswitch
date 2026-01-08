# FreeSWITCH Admin Panel (Angular + NestJS + SQLite)

This is an MVP admin panel to manage this repo’s FreeSWITCH configuration.

## What you get (MVP)

- Login (JWT, SQLite users)
- Module enable/disable (edits `freeswitch/autoload_configs/modules.conf.xml`)
- Config file browser + editor (safe path restriction + automatic backups)

## Run locally (no Docker)

Backend:

```bash
cd admin-panel/backend
npm install
npm run start:dev
```

Frontend:

```bash
cd admin-panel/frontend
npm install
npm start
```

Open `http://localhost:4200`.

Default first-run admin (only created if DB has zero users):

- username: `admin`
- password: `admin1234`

## Run with Docker

```bash
cd admin-panel
docker compose up -d --build
```

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3001`

## Notes

- Backend reads/writes configs under `../freeswitch` (mounted to `/freeswitch` in Docker).
- Backups are written to `admin-panel/data/backups/` by timestamp.


