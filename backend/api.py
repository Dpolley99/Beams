"""
api.py

Thin FastAPI wrapper around solver_service.solve_beam(). All the
actual logic lives in solver_service.py (tested standalone, no web
framework needed to test it) -- this file just handles HTTP: define
the request/response shape, receive JSON, call solve_beam(), return
JSON.

Run with:  uvicorn api:app --reload --port 8000
Then visit http://localhost:8000/docs for interactive API docs.
"""

from typing import List, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solver_service import solve_beam


class PointLoadIn(BaseModel):
    magnitude: float
    position: float


class UDLIn(BaseModel):
    intensity: float
    start: float
    end: float


class BeamRequest(BaseModel):
    length: float
    support_a: float
    support_b: float
    point_loads: List[PointLoadIn] = []
    udls: List[UDLIn] = []
    section_type: str
    section_params: Dict[str, float]
    E: float


app = FastAPI(title="Beam Solver API")

# Vite's default dev server runs on port 5173 -- without this, the
# browser blocks the frontend's requests to a different port (CORS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/solve")
def solve(request: BeamRequest):
    payload = request.dict()
    try:
        return solve_beam(payload)
    except ValueError as e:
        # e.g. an unknown section_type, or missing section_params keys
        raise HTTPException(status_code=400, detail=str(e))
