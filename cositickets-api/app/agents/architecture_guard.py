import ast
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
API_APP_DIR = ROOT_DIR / "cositickets-api" / "app"
UI_SRC_DIR = ROOT_DIR / "cositickets-ui" / "src"


class ArchitectureViolation(Exception):
    pass


def check_backend_mvc() -> list[str]:
    violations = []

    # 1. Validar app/main.py limpio
    main_file = API_APP_DIR / "main.py"
    if main_file.exists():
        tree = ast.parse(main_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                if node.func.attr in {"get", "post", "put", "patch", "delete"}:
                    violations.append(f"[Backend] main.py contiene endpoint directo en línea {node.lineno}. Usa app/routers/.")
                if node.func.attr in {"query", "execute", "commit"}:
                    violations.append(f"[Backend] main.py ejecuta consultas DB en línea {node.lineno}. Usa app/controllers/.")

    # 2. Validar que app/routers/ no acceda directo a DB o Modelos
    routers_dir = API_APP_DIR / "routers"
    if routers_dir.exists():
        for py_file in routers_dir.glob("*.py"):
            if py_file.name == "__init__.py":
                continue
            tree = ast.parse(py_file.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom) and node.module and "models" in node.module:
                    violations.append(f"[Backend] Router '{py_file.name}' importa modelos directamente. Delega al Controller.")
                if isinstance(node, ast.Attribute) and node.attr in {"query", "commit", "with_for_update"}:
                    violations.append(f"[Backend] Router '{py_file.name}' contiene lógica SQL/DB en línea {node.lineno}.")

    # 3. Validar estructura obligatoria de carpetas MVC
    required_dirs = ["core", "models", "schemas", "controllers", "routers", "agents"]
    for d in required_dirs:
        if not (API_APP_DIR / d).exists():
            violations.append(f"[Backend] Falta directorio arquitectónico obligatorio: app/{d}")

    return violations


def check_frontend_mvc() -> list[str]:
    violations = []
    if not UI_SRC_DIR.exists():
        return violations

    # Validar que las vistas no usen fetch() ni CosiAPI directamente
    views_dir = UI_SRC_DIR / "views"
    files_to_check = list(views_dir.glob("*.tsx")) if views_dir.exists() else []
    app_tsx = UI_SRC_DIR / "App.tsx"
    if app_tsx.exists():
        files_to_check.append(app_tsx)

    for tsx_file in files_to_check:
        content = tsx_file.read_text(encoding="utf-8")
        if "fetch(" in content:
            violations.append(f"[Frontend] Vista '{tsx_file.name}' invoca fetch() directamente. Usa useCosiController.")
        if "CosiAPI." in content:
            violations.append(f"[Frontend] Vista '{tsx_file.name}' acoplada a CosiAPI. Mueve la llamada al Controller.")

    return violations


def run_guard() -> int:
    print("Ejecutando Agente Validador de Arquitectura MVC - CosiTickets...")
    errors = check_backend_mvc() + check_frontend_mvc()

    if errors:
        print("\n[FALLO DE ARQUITECTURA] Se detectaron desviaciones del patrón MVC:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("[OK] Arquitectura MVC verificada al 100% en Backend (FastAPI) y Frontend (React).")
    return 0


if __name__ == "__main__":
    sys.exit(run_guard())