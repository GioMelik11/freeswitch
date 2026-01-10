#!/usr/bin/env sh
set -eu

# Fast-ish local builder:
# - uses npm install (not npm ci)
# - skips install if node_modules exists and package-lock.json did not change

cd "$(dirname "$0")"

LOCK="package-lock.json"
STAMP="node_modules/.lockfile.sha1"

hash_lock() {
  if command -v sha1sum >/dev/null 2>&1; then
    sha1sum "$LOCK" | awk '{print $1}'
  else
    # macOS fallback
    shasum -a 1 "$LOCK" | awk '{print $1}'
  fi
}

need_install=1
if [ -d node_modules ] && [ -f "$LOCK" ] && [ -f "$STAMP" ]; then
  cur="$(hash_lock)"
  prev="$(cat "$STAMP" 2>/dev/null || true)"
  if [ "$cur" = "$prev" ]; then
    need_install=0
  fi
fi

if [ "$need_install" -eq 1 ]; then
  echo "[backend] installing deps (npm install)..."
  npm install
  mkdir -p node_modules
  hash_lock > "$STAMP"
else
  echo "[backend] deps unchanged; skipping npm install"
fi

echo "[backend] building dist..."
npm run build


