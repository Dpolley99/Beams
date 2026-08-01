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

from typing import List, Dict, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solver_service import solve_beam


class PointLoadIn(BaseModel):
    magnitude: float
    position: float


class DistributedLoadIn(BaseModel):
    start: float
    end: float
    start_intensity: float
    end_intensity: float


class UnitsIn(BaseModel):
    """Governs BOTH input parsing and output display for each
    category -- e.g. choosing length='mm' means positions are typed
    in mm AND read back in mm. Young's Modulus is intentionally NOT
    here -- it's always GPa, no unit choice, per instruction.

    Defaults are a strict no-op (everything already in SI) so a
    request that omits "units" entirely -- or omits some of its
    fields -- behaves EXACTLY as it did before this feature existed.
    Literal types mean FastAPI rejects an invalid unit string with a
    clear 422 error, rather than silently mis-converting."""
    length: Literal["m", "mm"] = "m"
    section_length: Literal["m", "mm"] = "m"
    force: Literal["N", "kN"] = "N"
    intensity: Literal["N/m", "kN/m", "N/mm", "kN/mm"] = "N/m"
    moment: Literal["N.m", "kN.m", "N.mm", "kN.mm"] = "N.m"
    deflection: Literal["m", "mm"] = "m"


class BeamRequest(BaseModel):
    length: float
    support_a: float
    support_b: float
    point_loads: List[PointLoadIn] = []
    distributed_loads: List[DistributedLoadIn] = []
    section_type: str
    section_params: Dict[str, float]
    E: float  # always GPa -- e.g. 200 for steel, not 200e9
    units: UnitsIn = UnitsIn()


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