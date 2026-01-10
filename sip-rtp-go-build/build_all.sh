#!/bin/bash
# Build SIP+RTP Go bot image (sip-rtp-go:latest)
# Mirrors the style of freeswitch-build/build_all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================="
echo "SIP-RTP-Go Build Process"
echo "=========================================="
echo ""

echo "Step 1/1: Building sip-rtp-go image..."
echo "----------------------------------------"

# Build from this folder's docker-compose.yml (like freeswitch-build does)
cd "${SCRIPT_DIR}"
docker compose build

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "Image:"
echo "  sip-rtp-go:latest"
echo ""
echo "Run from repo root:"
echo "  cd \"${ROOT_DIR}\" && docker compose up -d sip-rtp-go"
echo ""


