#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

echo "=== admin-panel: build backend dist ==="
(cd backend && ./build_dist.sh)

echo ""
echo "=== admin-panel: build frontend dist ==="
(cd frontend && ./build_dist.sh)

echo ""
echo "OK"


