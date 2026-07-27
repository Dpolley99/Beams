"""
loads.py

Defines the load types a beam can carry.

DistributedLoad generalizes what used to be a separate UDL class: a
plain UDL is just the special case start_intensity == end_intensity.
Unifying them means the solver only needs ONE code path for
distributed loads (linear-in-x), instead of maintaining a constant-
intensity case and a linearly-varying case as separate, duplicated
logic.
"""

from dataclasses import dataclass


@dataclass
class PointLoad:
    magnitude: float   # how strong the force is (downward = positive)
    position: float    # where along the beam it acts


@dataclass
class DistributedLoad:
    start: float             # where the distributed load begins
    end: float               # where it ends
    start_intensity: float   # force per meter at x=start (downward = positive)
    end_intensity: float     # force per meter at x=end -- equal to start_intensity for a plain UDL