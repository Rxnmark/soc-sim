from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from simulation_endpoints import register_simulation_routes
from debug_simulation import router as debug_router
from main_api import register_all_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routes
register_simulation_routes(app)
app.include_router(debug_router)
register_all_routes(app)