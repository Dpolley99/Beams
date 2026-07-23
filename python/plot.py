"""
plot.py

STEP 5: Add a load diagram above the SFD/BMD (so it's clear at a
glance where every load and reaction acts), and display the result in
an interactive window instead of saving a file.
"""

import numpy as np
import matplotlib.pyplot as plt
from beam import Beam
from loads import PointLoad, UDL

# Recreate the same beam as before
beam = Beam(length=16, support_a=2, support_b=10)
beam.add_load(UDL(intensity=150, start=5, end=11))
beam.add_load(PointLoad(magnitude=3000, position=7))

r_a, r_b = beam.solve_reactions()
beam.solve()

x_values = np.linspace(0, beam.length, 400)
v_values = [beam.shear_at(xv) for xv in x_values]
m_values = [beam.moment_at(xv) for xv in x_values]


# STEP 5a: a "function" is a named, reusable block of code -- similar
# to the methods we wrote inside Beam, but standalone rather than tied
# to a class. We define one here for each piece of the load diagram, so
# we're not repeating the same drawing code for every load.

def draw_point_load(ax, position, magnitude):
    # draws a downward arrow at the load's position, with its magnitude
    # written above it
    ax.annotate(
        '', xy=(position, 0), xytext=(position, 1),
        arrowprops=dict(arrowstyle='->', color='tab:orange', linewidth=2),
    )
    ax.text(position, 1.05, f"{magnitude:.0f} N", ha='center', color='tab:orange')


def draw_udl(ax, start, end, intensity):
    # draws several small downward arrows spread across the loaded
    # region, plus a line connecting their tops, like a bracket
    arrow_positions = np.linspace(start, end, 6)
    for pos in arrow_positions:
        ax.annotate(
            '', xy=(pos, 0), xytext=(pos, 0.6),
            arrowprops=dict(arrowstyle='->', color='tab:green', linewidth=1.5),
        )
    ax.plot([start, end], [0.6, 0.6], color='tab:green', linewidth=1.5)
    mid = (start + end) / 2
    ax.text(mid, 0.7, f"{intensity:.0f} N/m", ha='center', color='tab:green')


def draw_support(ax, position, reaction):
    # a triangle marker represents a simple support, with the solved
    # reaction force written underneath
    ax.plot(position, 0, marker='^', markersize=16, color='black')
    ax.text(position, -0.35, f"R = {reaction:.0f} N", ha='center')


# STEP 5b: three stacked panels instead of two -- load diagram on top,
# then SFD, then BMD. height_ratios makes the schematic panel shorter
# than the two graphs below it.
fig, axes = plt.subplots(
    3, 1, figsize=(10, 10), sharex=True,
    gridspec_kw={'height_ratios': [1, 2, 2]},
)

# --- Top panel: load diagram ---
load_ax = axes[0]
load_ax.plot([0, beam.length], [0, 0], color='black', linewidth=3)  # the beam itself

for load in beam.loads:
    if isinstance(load, PointLoad):
        draw_point_load(load_ax, load.position, load.magnitude)
    elif isinstance(load, UDL):
        draw_udl(load_ax, load.start, load.end, load.intensity)

draw_support(load_ax, beam.support_a, r_a)
draw_support(load_ax, beam.support_b, r_b)

load_ax.set_ylim(-0.6, 1.3)
load_ax.set_yticks([])  # no y-axis numbers needed here -- it's a schematic, not a graph
load_ax.set_title("Load Diagram")

# --- Middle panel: SFD ---
axes[1].plot(x_values, v_values, color='tab:blue')
axes[1].axhline(0, color='black', linewidth=0.8)
axes[1].set_ylabel("Shear Force V(x) [N]")
axes[1].set_title("Shear Force Diagram (SFD)")
axes[1].grid(True)

# --- Bottom panel: BMD ---
axes[2].plot(x_values, m_values, color='tab:red')
axes[2].axhline(0, color='black', linewidth=0.8)
axes[2].set_ylabel("Bending Moment M(x) [N.m]")
axes[2].set_xlabel("Position along beam, x [m]")
axes[2].set_title("Bending Moment Diagram (BMD)")
axes[2].grid(True)

plt.tight_layout()

# STEP 5c: plt.show() opens an interactive window with the figure,
# instead of writing an image file to disk. Run this file locally in
# VS Code and a window will pop up with the plot -- nothing gets saved
# unless you choose to save it from inside that window.
plt.show()