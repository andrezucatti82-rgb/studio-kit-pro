#!/bin/sh
set -eu
studio_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$studio_root"
if test -x .studio-tools/node/bin/node; then PATH="$studio_root/.studio-tools/node/bin:$PATH"; export PATH; fi
case "${1:-help}" in
 codex) exec codex -c mcp_servers.studio_curadoria.command=node -c "mcp_servers.studio_curadoria.args=['tools/curadoria/mcp.mjs']";;
 claude) exec claude;;
 atlas) exec node scripts/serve-atlas.mjs;;
 doctor) exec node scripts/doctor.mjs;;
 tools) shift; exec node scripts/free-tools.mjs "$@";;
 *) printf '%s\n' 'Use: sh studio.sh codex | claude | atlas | doctor | tools doctor' 'Tutorial: docs/COMECE-AQUI.html';;
esac
