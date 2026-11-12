import argparse
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
GUARD_SCRIPT = ROOT_DIR / "cositickets-api" / "app" / "agents" / "architecture_guard.py"


def run_cmd(cmd: list[str], cwd: Path = ROOT_DIR, check: bool = True) -> subprocess.CompletedProcess:
    print(f"  > {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=check)


def get_current_branch() -> str:
    res = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    return res.stdout.strip()


def get_next_version(bump: str = "patch") -> str:
    res = run_cmd(["git", "tag", "--sort=-v:refname"], check=False)
    tags = [t.strip() for t in res.stdout.splitlines() if t.strip().startswith("v")]
    if not tags:
        return "v2.1.0"

    latest = tags[0].lstrip("v")
    parts = latest.split(".")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])

    if bump == "major":
        return f"v{major + 1}.0.0"
    if bump == "minor":
        return f"v{major}.{minor + 1}.0"
    return f"v{major}.{minor}.{patch + 1}"


def verify_docker_stack() -> bool:
    print("\n[3/4] Verificando salud de contenedores Docker...")
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


def git_commit_and_push(message: str, bump: str, create_tag: bool) -> None:
    print("\n[4/4] Sincronizando cambios con GitHub (cosiatoapps/cosiTickets)...")
    branch = get_current_branch()
    status = run_cmd(["git", "status", "--porcelain"]).stdout.strip()

    if status:
        run_cmd(["git", "add", "."])
        subprocess.run(["git", "commit", "-m", message], cwd=ROOT_DIR, check=True)
    else:
        print("  Sin cambios pendientes por commitear en el árbol de trabajo.")

    if create_tag:
        new_tag = get_next_version(bump)
        print(f"  Creando etiqueta de versión: {new_tag}")
        run_cmd(["git", "tag", "-a", new_tag, "-m", f"{new_tag}: {message}"])

    print(f"  Enviando rama '{branch}' hacia origin...")
    push_branch = subprocess.run(["git", "push", "-u", "origin", branch], cwd=ROOT_DIR)
    if push_branch.returncode != 0:
        print(f"[ERROR] No se pudo hacer push de la rama {branch}.")
        sys.exit(1)

    if create_tag:
        subprocess.run(["git", "push", "origin", "--tags"], cwd=ROOT_DIR, check=True)

    print(f"\n[ÉXITO] Versión compilada en Docker y publicada en GitHub ({branch}).")


def main():
    parser = argparse.ArgumentParser(description="Agente de Compilación Docker y Auto-Push Git - CosiTickets")
    parser.add_argument("-m", "--message", required=True, help="Mensaje descriptivo del commit / versión")
    parser.add_argument("--bump", choices=["patch", "minor", "major"], default="patch", help="Incremento SemVer")
    parser.add_argument("--tag", action="store_true", help="Generar etiqueta SemVer vX.Y.Z y subirla a GitHub")
    args = parser.parse_args()

    print("=== AGENTE DE DESPLIEGUE CONTINUO COSITICKETS ===")

    # 1. Auditoría MVC
    print("\n[1/4] Validando arquitectura MVC...")
    guard = subprocess.run([sys.executable, str(GUARD_SCRIPT)], cwd=ROOT_DIR)
    if guard.returncode != 0:
        print("[ABORTADO] Corrige las desviaciones de arquitectura MVC antes de compilar.")
        sys.exit(1)

    # 2 y 3. Compilación y Healthcheck Docker
    print("\n[2/4] Compilando imágenes Docker (API + UI)...")
    if not verify_docker_stack():
        sys.exit(1)

    # 4. Git Commit + Tag + Push automático
    git_commit_and_push(message=args.message, bump=args.bump, create_tag=args.tag)


if __name__ == "__main__":
    main()