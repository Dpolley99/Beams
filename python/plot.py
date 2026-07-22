"""
plot.py

STEP 4: Turn the SFD/BMD numbers into an actual graph.

Version 1 -- same hardcoded beam as before. This file just adds
plotting on top of what beam.py already solves.
"""

import numpy as np
import matplotlib.pyplot as plt
from beam import Beam
from loads import PointLoad, UDL

# Recreate the same beam as in main.py
beam = Beam(length=16, support_a=2, support_b=10)
beam.add_load(UDL(intensity=150, start=5, end=11))
beam.add_load(PointLoad(magnitude=3000, position=7))

beam.solve_reactions()
beam.solve()

# STEP 4a: build a list of x-values spanning the beam, so we have
# something to plot against. np.linspace(start, stop, count) makes
# an evenly-spaced list -- here, 400 points from 0 to the beam length.
x_values = np.linspace(0, beam.length, 400)

# STEP 4b: evaluate V(x) and M(x) at every one of those x-values.
# This square-bracket syntax is called a "list comprehension" -- a
# compact way of writing a for-loop that builds a list.
# It is equivalent to:
#   v_values = []
#   for xv in x_values:
#       v_values.append(beam.shear_at(xv))
v_values = [beam.shear_at(xv) for xv in x_values]
m_values = [beam.moment_at(xv) for xv in x_values]

# STEP 4c: draw the two graphs, stacked on top of each other.
# plt.subplots(2, 1, ...) means "2 rows, 1 column" of plots.
fig, axes = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

# axes[0] is the TOP plot -- the shear force diagram
axes[0].plot(x_values, v_values, color='tab:blue')
axes[0].axhline(0, color='black', linewidth=0.8)  # a horizontal line at V=0, for reference
axes[0].set_ylabel("Shear Force V(x) [N]")
axes[0].set_title("Shear Force Diagram (SFD)")
axes[0].grid(True)

# axes[1] is the BOTTOM plot -- the bending moment diagram
axes[1].plot(x_values, m_values, color='tab:red')
axes[1].axhline(0, color='black', linewidth=0.8)
axes[1].set_ylabel("Bending Moment M(x) [N.m]")
axes[1].set_xlabel("Position along beam, x [m]")
axes[1].set_title("Bending Moment Diagram (BMD)")
axes[1].grid(True)

plt.tight_layout()  # tidies up spacing so labels don't overlap
plt.savefig("sfd_bmd.png", dpi=150)  # saves the plot as an image file
print("Saved plot to sfd_bmd.png")