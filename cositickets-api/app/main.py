from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.routers import (
    auth_router,
    admin_router,
    organizer_router,
    customer_router,
    system_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CosiTickets API",
    description="Motor de rifas virtuales bajo arquitectura MVC, RBAC estricto y concurrencia segura.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(admin_router.router, prefix="/api/v1/admin", tags=["Administrador (RBAC)"])
app.include_router(organizer_router.router, prefix="/api/v1/organizer", tags=["Organizador / Manager"])
app.include_router(customer_router.router, prefix="/api/v1", tags=["Portal Cliente & Tablero Público"])
app.include_router(system_router.router, prefix="/api/v1/system", tags=["Sistema & Health"])
app.include_router(system_router.router, prefix="/api/v1", tags=["Compatibilidad Sistema"])