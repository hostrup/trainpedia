#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[1/5] Kvalitets-gates: lint + typecheck...${NC}"
npm run lint
npm run check

echo -e "${BLUE}[2/5] Tests...${NC}"
if npm run test; then
  echo -e "${GREEN}✓ Tests grønne${NC}"
else
  echo -e "${RED}✗ Tests fejlede! Afbryder udrulning.${NC}"
  exit 1
fi

echo -e "\n${BLUE}[3/5] Committer og pusher til Git...${NC}"
MSG="${1:-Auto-deploy via AI agent}"
git add .
if ! git diff-index --quiet HEAD --; then
  git commit -m "$MSG"
  git push
  echo -e "${GREEN}✓ Kildekoden er synkroniseret!${NC}"
else
  git push || true
  echo -e "${GREEN}✓ Ingen lokale ændringer at committe.${NC}"
fi

echo -e "\n${BLUE}[4/5] Genbygger og opdaterer Docker-containeren...${NC}"
# M1: Afvikling af databasemigreringer under deployment
npx prisma db push
docker compose -f /hostrup/docker/docker-compose.yml --env-file /hostrup/docker/.env up -d --build trainpedia

echo -e "\n${BLUE}[5/5] Verificerer container status...${NC}"
sleep 3
if docker ps | grep -q trainpedia; then
  echo -e "${GREEN}✓ Docker-container kører stabilt!${NC}"
else
  echo -e "${RED}✗ Advarsel: Containeren fejlede opstart.${NC}"
  exit 1
fi
