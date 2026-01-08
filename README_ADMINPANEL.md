# Admin Panel (Angular + NestJS) - Docker from repo root

This repo includes an admin panel under `admin-panel/` and uses the root `docker-compose.yml`.

## Start

### 1) Build dist (required)

```bash
cd admin-panel/backend
npm ci
npm run build

cd ../frontend
npm ci
npm run build

cd ../../
```

### 2) Start containers

```bash
docker compose up -d
```

Then open:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3001`

Default first-run admin (only created if DB has zero users):

- username: `admin`
- password: `admin1234`

## Notes

- Backend mounts `./freeswitch` as `/usr/local/freeswitch/etc/freeswitch` and edits config files in-place.
- Backups are stored in `./admin-panel/data/backups/`.
- Backend dependencies are installed into a **persistent Docker volume** on first run, so it does **not** re-run `npm ci` every time.

## “FreePBX-like” features currently implemented

- **Extensions**: CRUD for `freeswitch/directory/default/<EXT>.xml` via UI (`/pbx/extensions`)
- **Trunks**: CRUD for `freeswitch/sip_profiles/external/<NAME>.xml` gateways via UI (`/pbx/trunks`)

If something isn’t covered yet, you can still edit any XML/Lua directly in the **Config Files** page.


