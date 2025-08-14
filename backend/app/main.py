from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes.classify import router as classify_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Mount static folder (if you have one like Flask's static/)
static_dir = os.path.join(os.getcwd(), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# CORS: allow everything like in Flask's CORS(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify_router)

# Optionally provide a startup event to log that workflow is ready
@app.on_event("startup")
def on_startup():
    print("FastAPI backend starting. /classify endpoint ready.")