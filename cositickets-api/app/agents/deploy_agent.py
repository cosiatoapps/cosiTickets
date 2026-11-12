import argparse
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
GUARD_SCRIPT = ROOT_DIR / "cositickets-api" / "app" / "agents" / "architecture_guard.py"
ROUTERS_DIR = ROOT_DIR / "cositickets-api" / "app" / "routers"
README_PATH = ROOT_DIR / "README.md"


def run_cmd(cmd: list[str], cwd: Path = ROOT_DIR, check: bool = True) -> subprocess.CompletedProcess:
    print(f"  > {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=check)


def get_current_branch() -> str:
    res = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    return res.stdout.strip()


def get_latest_version() -> str:
    res = run_cmd(["git", "tag", "--sort=-v:refname"], check=False)
    tags = [t.strip() for t in res.stdout.splitlines() if t.strip().startswith("v")]
    return tags[0] if tags else "v2.1.0"


def get_next_version(bump: str = "patch") -> str:
    latest = get_latest_version().lstrip("v")
    parts = latest.split(".")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])

    if bump == "major":
        return f"v{major + 1}.0.0"
    if bump == "minor":
        return f"v{major}.{minor + 1}.0"
    return f"v{major}.{minor}.{patch + 1}"


def scan_api_endpoints_summary() -> str:
    """Escanea los routers MVC y genera una tabla resumida de endpoints activos."""
    if not ROUTERS_DIR.exists():
        return "_Routers no encontrados._"

    rows = [
        "| Módulo Router | Archivo | Endpoints Activos |",
        "| :--- | :--- | :---: |",
    ]
    total_endpoints = 0

    for router_file in sorted(ROUTERS_DIR.glob("*_router.py")):
        content = router_file.read_text(encoding="utf-8")
        matches = re.findall(r"@router\.(get|post|put|patch|delete)\(", content)
        count = len(matches)
        total_endpoints += count
        module_name = router_file.stem.replace("_router", "").capitalize()
        rows.append(f"| **{module_name}** | `app/routers/{router_file.name}` | `{count}` |")

    rows.append(f"| **Total API REST** | **5 Routers Modulares** | **`{total_endpoints}`** |")
    return "\n".join(rows)


def sync_readme_metadata(version: str, branch: str, message: str) -> None:
    """Actualiza métricas arquitectónicas, versión y changelog en README.md."""
    print("\n[3.5/5] Sincronizando documentación y métricas en README.md...")
    today = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not README_PATH.exists():
        README_PATH.write_text(
            "# 🎟️ CosiTickets — Plataforma Corporativa de Rifas Virtuales\n\n"
            "<!-- AUTO-STATUS:START -->\n<!-- AUTO-STATUS:END -->\n\n"
            "<!-- AUTO-DEPLOY-LOG:START -->\n<!-- AUTO-DEPLOY-LOG:END -->\n",
            encoding="utf-8",
        )

    content = README_PATH.read_text(encoding="utf-8")

    # 1. Bloque de estado técnico y conteo de endpoints MVC
    endpoints_table = scan_api_endpoints_summary()
    status_block = (
        "<!-- AUTO-STATUS:START -->\n"
        f"> **Versión Activa:** `{version}` | **Rama:** `{branch}` | **Último Build Docker Verificado:** `{today}`\n\n"
        "### 📊 Estado de Módulos Backend (Auto-generado por `deploy_agent.py`)\n\n"
        f"{endpoints_table}\n"
        "<!-- AUTO-STATUS:END -->"
    )

    if "<!-- AUTO-STATUS:START -->" in content and "<!-- AUTO-STATUS:END -->" in content:
        content = re.sub(
            r"<!-- AUTO-STATUS:START -->.*?<!-- AUTO-STATUS:END -->",
            status_block,
            content,
            flags=re.DOTALL,
        )
    else:
        content = content.rstrip() + "\n\n---\n\n" + status_block + "\n"

    # 2. Bloque de historial de despliegues (Changelog)
    new_log_line = f"- **`{version}`** (`{today}` · `{branch}`): {message}"

    if "<!-- AUTO-DEPLOY-LOG:START -->" in content and "<!-- AUTO-DEPLOY-LOG:END -->" in content:
        def insert_log(match: re.Match) -> str:
            existing = match.group(1).strip()
            lines = [line for line in existing.splitlines() if line.strip()]
            # Mantener los últimos 15 despliegues en el README
            updated_lines = [new_log_line] + lines[:14]
            return "<!-- AUTO-DEPLOY-LOG:START -->\n" + "\n".join(updated_lines) + "\n<!-- AUTO-DEPLOY-LOG:END -->"

        content = re.sub(
            r"<!-- AUTO-DEPLOY-LOG:START -->(.*?)<!-- AUTO-DEPLOY-LOG:END -->",
            insert_log,
            content,
            flags=re.DOTALL,
        )
    else:
        log_section = (
            "\n\n## 🚀 Historial de Despliegues Verificados\n\n"
            "<!-- AUTO-DEPLOY-LOG:START -->\n"
            f"{new_log_line}\n"
            "<!-- AUTO-DEPLOY-LOG:END -->\n"
        )
        content = content.rstrip() + log_section

    README_PATH.write_text(content, encoding="utf-8")
    print(f"  [OK] README.md actualizado con versión {version} y conteo de endpoints.")


def verify_docker_stack() -> bool:
    print("\n[3/5] Verificando salud de contenedores Docker...")
    run_cmd(["docker", "start", "cosi_postgres_local"], check=False)

    build = subprocess.run(["docker", "compose", "up", "-d", "--build"], cwd=ROOT_DIR)
    if build.returncode != 0:
        print("[ERROR] Falló la compilación de Docker Compose.")
        return False

    print("  Esperando respuesta de cositickets_api en http://localhost:8000/api/v1/system/health ...")
    for _ in range(15):
        try:
            with urllib.request.urlopen("http://localhost:8000/api/v1/system/health", timeout=3) as resp:
                if resp.status == 200:
                    print("  [OK] API respondiendo 200 OK y contenedores activos.")
                    return True
        except Exception:
            time.sleep(2)

    print("[ERROR] La API no respondió en el tiempo esperado tras compilar Docker.")
    return False


def git_commit_and_push(message: str, target_version: str, create_tag: bool) -> None:
    print("\n[5/5] Sincronizando cambios con GitHub (cosiatoapps/cosiTickets)...")
    branch = get_current_branch()
    status = run_cmd(["git", "status", "--porcelain"]).stdout.strip()

    if status:
        run_cmd(["git", "add", "."])
        subprocess.run(["git", "commit", "-m", message], cwd=ROOT_DIR, check=True)
    else:
        print("  Sin cambios pendientes por commitear en el árbol de trabajo.")

    if create_tag:
        print(f"  Creando etiqueta de versión: {target_version}")
        run_cmd(["git", "tag", "-a", target_version, "-m", f"{target_version}: {message}"])

    print(f"  Enviando rama '{branch}' hacia origin...")
    push_branch = subprocess.run(["git", "push", "-u", "origin", branch], cwd=ROOT_DIR)
    if push_branch.returncode != 0:
        print(f"[ERROR] No se pudo hacer push de la rama {branch}.")
        sys.exit(1)

    if create_tag:
        subprocess.run(["git", "push", "origin", "--tags"], cwd=ROOT_DIR, check=True)

    print(f"\n[ÉXITO] Versión {target_version} compilada en Docker, README actualizado y publicada en GitHub ({branch}).")


def main():
    parser = argparse.ArgumentParser(description="Agente de Compilación Docker, Sync README y Auto-Push Git - CosiTickets")
    parser.add_argument("-m", "--message", required=True, help="Mensaje descriptivo del commit / versión")
    parser.add_argument("--bump", choices=["patch", "minor", "major"], default="patch", help="Incremento SemVer")
    parser.add_argument("--tag", action="store_true", help="Generar etiqueta SemVer vX.Y.Z y subirla a GitHub")
    args = parser.parse_args()

    print("=== AGENTE DE DESPLIEGUE CONTINUO COSITICKETS ===")

    # 1. Auditoría MVC
    print("\n[1/5] Validando arquitectura MVC...")
    guard = subprocess.run([sys.executable, str(GUARD_SCRIPT)], cwd=ROOT_DIR)
    if guard.returncode != 0:
        print("[ABORTADO] Corrige las desviaciones de arquitectura MVC antes de compilar.")
        sys.exit(1)

    # 2 y 3. Compilación y Healthcheck Docker
    print("\n[2/5] Compilando imágenes Docker (API + UI)...")
    if not verify_docker_stack():
        sys.exit(1)

    # 4. Actualizar README.md con versión, métricas de endpoints y changelog
    branch = get_current_branch()
    target_version = get_next_version(args.bump) if args.tag else get_latest_version()
    sync_readme_metadata(version=target_version, branch=branch, message=args.message)

    # 5. Git Commit + Tag + Push automático
    git_commit_and_push(message=args.message, target_version=target_version, create_tag=args.tag)


if __name__ == "__main__":
    main()