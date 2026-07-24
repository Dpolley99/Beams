"""
loads.py

STEP 1: Define the data we'll work with.

This is version 1 of the beam solver -- everything here uses fixed
values written directly into the code. A later version will replace
these with values the user types in.

Right now, we just need a way to describe the two kinds of loads a
beam can carry: a single point load, and a distributed load spread
over a length. We use Python's @dataclass -- a quick way to define
"a box with a few labeled compartments," nothing more.
"""

from dataclasses import dataclass


@dataclass
class PointLoad:
    magnitude: float   # how strong the force is (downward = positive)
    position: float    # where along the beam it acts


@dataclass
class UDL:  # "Uniformly Distributed Load" -- like the weight of the
            # beam itself, spread evenly over some length
    intensity: float   # force per meter (downward = positive)
    start: float        # where the distributed load begins
    end: float           # where it ends