# =============================================================================
# SCRIPT DE INICIALIZACION GIT & ARQUITECTURA DE RAMAS - COSITICKETS
# Repositorio destino: https://github.com/cosiatoapps/cosiTickets.git
# =============================================================================

$RepoUrl = "https://github.com/cosiatoapps/cosiTickets.git"

Write-Host "=== 1. Generando .gitignore corporativo en la raiz ===" -ForegroundColor Cyan
$gitignoreContent = @"
# Entornos y Secretos (NUNCA subir credenciales)
.env
.env.*
!.env.example

# Python / FastAPI
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
env/
.pytest_cache/
.coverage

# Node / React / Vite
node_modules/
cositickets-ui/node_modules/
cositickets-ui/dist/
cositickets-ui/.vite/
npm-debug.log*

# Docker y Datos Locales
postgres_data/
pgdata/
*.sql.bak

# IDEs y Sistema Operativo
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
.DS_Store
Thumbs.db
"@
Set-Content -Path ".gitignore" -Value $gitignoreContent -Encoding UTF8

Write-Host "=== 2. Generando .env.example como plantilla segura ===" -ForegroundColor Cyan
$envExampleContent = @"
ENVIRONMENT=local
DB_USER=devuser
DB_PASSWORD=cambiar_en_local
DB_NAME=cositickets_dev
DB_PORT=5432
DATABASE_URL=postgresql+psycopg2://devuser:cambiar_en_local@host.docker.internal:5432/cositickets_dev

SECRET_KEY=reemplazar_por_clave_jwt_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GEMINI_API_KEY=reemplazar_por_api_key_gemini
GEMINI_PRIMARY_IMAGE_MODEL=imagen-3.0-generate-002
GEMINI_FALLBACK_MODEL_1=imagen-3.0-fast-generate-001
GEMINI_FALLBACK_MODEL_2=imagen-2.0-generate-001
GEMINI_FALLBACK_MODEL_3=imagen-3.0-capability-001
IMAGE_GEN_MAX_RETRIES_PER_MODEL=2
IMAGE_GEN_RETRY_DELAY_SECONDS=2
"@
Set-Content -Path ".env.example" -Value $envExampleContent -Encoding UTF8

Write-Host "=== 3. Inicializando repositorio Git local ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init -b main
} else {
    git checkout -B main
}

# Verificar configuracion de usuario Git en VS Code
$gitUser = git config user.name
if (-not $gitUser) {
    Write-Host "Configurando identidad local de Git..." -ForegroundColor Yellow
    git config user.name "CosiatoApps Developer"
    git config user.email "dev@cosiatoapps.com"
}

Write-Host "=== 4. Instalando Hook pre-commit (Agente Validador MVC) ===" -ForegroundColor Cyan
$hookPath = ".git/hooks/pre-commit"
$hookContent = @"
#!/usr/bin/env bash
echo "[Git Hook] Ejecutando Agente Validador de Arquitectura MVC..."
if [ -f "cositickets-api/app/agents/architecture_guard.py" ]; then
    python cositickets-api/app/agents/architecture_guard.py
    STATUS=$?
    if [ $STATUS -ne 0 ]; then
        echo "[BLOQUEADO] El commit viola la arquitectura MVC. Corrige las observaciones arriba."
        exit 1
    fi
fi
exit 0
"@
Set-Content -Path $hookPath -Value $hookContent -Encoding ASCII

Write-Host "=== 5. Conectando remoto origin -> $RepoUrl ===" -ForegroundColor Cyan
$existingRemote = git remote
if ($existingRemote -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host "=== 6. Creando commit inicial v2.1.0 y estructura de ramas ===" -ForegroundColor Cyan
git add .
git commit -m "chore(arch): estructura base MVC CosiTickets v2.1.0, Docker y Architecture Guard"
git tag -a v2.1.0 -m "Release v2.1.0: Base MVC FastAPI + React + PostgreSQL 16"

# Crear ramas de ambientes
git checkout -b staging
git checkout -b develop

Write-Host "`n=== PROCESO COMPLETADO ===" -ForegroundColor Green
Write-Host "Rama activa actual: develop" -ForegroundColor Yellow
Write-Host "Para subir todas las ramas y etiquetas a GitHub ejecuta:" -ForegroundColor Cyan
Write-Host "  git push -u origin main"
Write-Host "  git push -u origin staging"
Write-Host "  git push -u origin develop"
Write-Host "  git push origin --tags"