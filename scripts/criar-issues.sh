#!/usr/bin/env bash
# Cria os rótulos e as issues do backlog (.planning/issues/*.md) no GitHub.
# Uso: scripts/criar-issues.sh [dono/repositorio]   (requer gh autenticado)
# Pode rodar de novo: rótulos são atualizados e issues com o mesmo título não são duplicadas.
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.planning/issues"

rotulo() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
rotulo "prioridade alta"    "b60205" "Precisa sair antes das demais"
rotulo "boa primeira issue" "7057ff" "Boa para quem está começando no projeto"
rotulo "ajuda bem-vinda"    "008672" "Mantenedores querem ajuda aqui"
rotulo "dado divergente"    "d93f0b" "Número diferente da fonte oficial"
rotulo "bug"                "d73a4a" "Algo não funciona"
rotulo "funcionalidade"     "a2eeef" "Nova funcionalidade"
rotulo "discussão"          "fbca04" "Precisa de conversa antes de código"
rotulo "ingestão"           "1d76db" "Coleta de dados das fontes oficiais"
rotulo "métricas"           "5319e7" "Definição ou cálculo de métricas"
rotulo "interface"          "c5def5" "Telas e componentes"
rotulo "câmara"             "0e8a16" "Câmara dos Deputados"
rotulo "senado"             "1f6feb" "Senado Federal"
rotulo "segurança"          "ee0701" "Segurança e privacidade"
rotulo "infra"              "bfdadc" "CI, testes, implantação"
rotulo "docs"               "0075ca" "Documentação"
rotulo "v2"                 "ededed" "Planejado para depois da v1"

existentes="$(gh issue list --repo "$REPO" --state all --limit 500 --json title -q '.[].title')"

for arq in "$DIR"/*.md; do
  if grep -q '^status: feito$' "$arq"; then continue; fi
  titulo="$(sed -n 's/^titulo: "\(.*\)"$/\1/p' "$arq")"
  rotulos="$(sed -n 's/^rotulos: \[\(.*\)\]$/\1/p' "$arq" | tr -d '"' | sed 's/, /,/g')"
  corpo="$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2' "$arq")"
  if grep -Fxq "$titulo" <<<"$existentes"; then
    echo "já existe: $titulo"
    continue
  fi
  gh issue create --repo "$REPO" --title "$titulo" --label "$rotulos" --body "$corpo" >/dev/null
  echo "criada: $titulo"
done
