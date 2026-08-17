#!/bin/zsh
set -e

cd "$(dirname "$0")"

PORT=4173
URL="http://127.0.0.1:${PORT}/admin"

if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  echo "쌤노리 로컬 관리자 서버가 이미 실행 중입니다."
else
  echo "쌤노리 로컬 관리자 서버를 시작합니다."
  nohup node local-admin/server.js > .local-admin.log 2>&1 &
  sleep 1
fi

echo "관리자 페이지를 엽니다: ${URL}"
open "${URL}"

echo ""
echo "서버 로그: $(pwd)/.local-admin.log"
echo "서버를 종료하려면 터미널에서 다음 명령을 실행하세요:"
echo "kill \$(lsof -ti tcp:${PORT})"
