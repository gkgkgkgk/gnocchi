from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    ai,
    ai_tools,
    cookbooks,
    health,
    images,
    imports,
    ingredients,
    recipes,
    singletons,
    tags,
    units,
)

app = FastAPI(title="Gnocchi API", version="1.0.1")

# No auth: any device on the tailnet is trusted. CORS is wide open in dev;
# in prod the frontend and API share an origin (Caddy proxies /api to us),
# so CORS never fires.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(recipes.router)
app.include_router(cookbooks.router)
app.include_router(tags.router)
app.include_router(units.router)
app.include_router(ingredients.router)
app.include_router(singletons.router)
app.include_router(ai_tools.router)
app.include_router(imports.router)
app.include_router(ai.router)
app.include_router(images.router)
