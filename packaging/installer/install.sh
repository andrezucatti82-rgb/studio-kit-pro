#!/bin/sh
# Run after extracting the ZIP. No global Node installation or shell profile edits.
set -eu
studio_here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$studio_here"
printf '%s\n' 'Studio Kit Pro — instala o projeto, dependências e skills locais.' 'Precisa de internet. Pode solicitar senha do sistema para instalar Git/FFmpeg.'
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])>=22?0:1)' 2>/dev/null; then
  command -v curl >/dev/null || { echo 'Instale curl ou Node.js 22+ e execute novamente.'; exit 1; }
  case "$(uname -s)" in Darwin) studio_os=darwin;; Linux) studio_os=linux;; *) echo 'Use INSTALAR.cmd no Windows.'; exit 1;; esac
  case "$(uname -m)" in x86_64) studio_arch=x64;; arm64|aarch64) studio_arch=arm64;; *) echo 'Arquitetura não suportada. Instale Node.js 22+ manualmente.'; exit 1;; esac
  mkdir -p .studio-tools
  curl --fail --location --proto '=https' --tlsv1.2 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o .studio-tools/SHASUMS256.txt
  studio_name=$(awk -v suffix="-$studio_os-$studio_arch.tar.gz" '$2 ~ /^node-v24\./ && index($2,suffix)==length($2)-length(suffix)+1 {print $2; exit}' .studio-tools/SHASUMS256.txt)
  test -n "$studio_name" || { echo 'Distribuição Node.js não localizada.'; exit 1; }
  studio_expected=$(awk -v name="$studio_name" '$2==name {print $1}' .studio-tools/SHASUMS256.txt)
  curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/latest-v24.x/$studio_name" -o ".studio-tools/$studio_name"
  if command -v sha256sum >/dev/null 2>&1; then studio_actual=$(sha256sum ".studio-tools/$studio_name" | awk '{print $1}'); else studio_actual=$(shasum -a 256 ".studio-tools/$studio_name" | awk '{print $1}'); fi
  test "$studio_actual" = "$studio_expected" || { echo 'Falha de integridade do Node.js.'; exit 1; }
  tar -xzf ".studio-tools/$studio_name" -C .studio-tools
  PATH="$studio_here/.studio-tools/${studio_name%.tar.gz}/bin:$PATH"; export PATH
fi
node setup-studio.mjs --system-deps --open-tutorial "$@"
