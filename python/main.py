"""
main.py

STEP 3: Put it all together and run it.

Version 1 -- the beam length, support positions, and every load are
hardcoded below as fixed numbers. This is the simplest possible
working version. A later version will replace these fixed numbers
with values the user types in when running the program.
"""

from beam import Beam
from loads import PointLoad, UDL

# Create a beam: 16m long, supports (axles) at x=2 and x=10
beam = Beam(length=16, support_a=2, support_b=10)

# Add loads to it
beam.add_load(UDL(intensity=150, start=5, end=11))
beam.add_load(PointLoad(magnitude=3000, position=7))

# Solve for reactions (the support forces)
r_a, r_b = beam.solve_reactions()
print(f"Reaction at support A (x=2): {r_a:.2f} N")
print(f"Reaction at support B (x=10): {r_b:.2f} N")

# Solve for the shear force V(x) and bending moment M(x)
beam.solve()

print()
print("Shear force at a few points:")
for point in [0, 2, 5, 7, 10, 11, 16]:
    print(f"  V({point}) = {beam.shear_at(point):.2f} N")

print()
print("Bending moment at a few points:")
for point in [0, 2, 5, 7, 10, 11, 16]:
    print(f"  M({point}) = {beam.moment_at(point):.2f} N.m")