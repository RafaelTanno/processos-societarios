#!/bin/bash
# ============================================================
#  Processos Societários — GS2 Negócios
#  Clique duas vezes neste arquivo para abrir a ferramenta.
#  Para parar: feche esta janela do Terminal, ou tecle Ctrl+C.
# ============================================================

cd "$(dirname "$0")" || exit 1

echo ""
echo "  Processos Societários — GS2 Negócios"
echo "  ============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  O Node.js ainda não está instalado neste Mac."
  echo ""
  echo "  Ele é o programa que roda a ferramenta na sua máquina."
  echo "  É gratuito, oficial e a instalação leva cerca de 2 minutos:"
  echo ""
  echo "    1. Abra  https://nodejs.org/pt-br/download"
  echo "    2. Escolha a versão LTS, macOS, Apple Silicon (arm64), instalador .pkg"
  echo "    3. Abra o arquivo baixado e siga o instalador"
  echo "    4. Volte aqui e clique duas vezes neste arquivo de novo"
  echo ""
  echo "  Você só precisa fazer isso uma vez."
  echo ""
  read -n 1 -s -r -p "  Tecle qualquer coisa para abrir a página de download e fechar."
  open "https://nodejs.org/pt-br/download"
  exit 1
fi

# Instala as dependências da API na primeira vez
if [ ! -d "api/node_modules" ]; then
  echo "  Primeira execução: preparando a API (leva menos de um minuto)..."
  ( cd api && npm install --no-audit --no-fund --silent ) || {
    echo ""
    echo "  Não consegui preparar a API. Confira sua conexão e tente de novo."
    read -n 1 -s -r -p "  Tecle qualquer coisa para fechar."
    exit 1
  }
  echo "  Pronto."
  echo ""
fi

# Abre o navegador assim que o servidor subir
( sleep 2 && open "http://localhost:5173/login" ) &

node servidor-local.js 5173

echo ""
read -n 1 -s -r -p "  Servidor encerrado. Tecle qualquer coisa para fechar."
