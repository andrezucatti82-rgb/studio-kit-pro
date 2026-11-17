#!/bin/sh
set -eu
studio_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$studio_root"
if test -x .studio-tools/node/bin/node; then PATH="$studio_root/.studio-tools/node/bin:$PATH"; export PATH; fi
case "${1:-help}" in
 codex|claude) exec "$1";;
 atlas) exec node scripts/serve-atlas.mjs;;
 doctor) exec node scripts/doctor.mjs;;
 *) printf '%s\n' 'Use: sh studio.sh codex | claude | atlas | doctor' 'Tutorial: docs/COMECE-AQUI.html';;
esac
