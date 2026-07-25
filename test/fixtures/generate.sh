#!/usr/bin/env bash
set -euo pipefail

# Generates WebM fixture files for e2e tests.
# Requires Docker (runs FFmpeg in a container).

FIXTURES_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Generating solid-red-1s.webm..."
docker run --rm -v "$FIXTURES_DIR:/out" jrottenberg/ffmpeg \
	-f lavfi -i "color=c=red:s=640x480:d=1" \
	-c:v libvpx -r 30 \
	/out/solid-red-1s.webm

echo "Done. Fixtures written to $FIXTURES_DIR"
