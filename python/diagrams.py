"""
diagrams.py

Drawing helpers for the load diagram, SFD, and BMD. Kept separate from
beam.py (the math) and main.py (the program flow), so each file has a
single job: beam.py solves, diagrams.py draws, main.py runs the show.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from loads import PointLoad, UDL


def draw_point_load(ax, position, magnitude):
    ax.annotate(
        '', xy=(position, 0), xytext=(position, 1),
        arrowprops=dict(arrowstyle='->', color='tab:orange', linewidth=2),
    )
    ax.text(position, 1.05, f"{magnitude:.0f} N", ha='center', color='tab:orange')


def draw_udl(ax, start, end, intensity):
    arrow_positions = np.linspace(start, end, 6)
    for pos in arrow_positions:
        ax.annotate(
            '', xy=(pos, 0), xytext=(pos, 0.6),
            arrowprops=dict(arrowstyle='->', color='tab:green', linewidth=1.5),
        )
    ax.plot([start, end], [0.6, 0.6], color='tab:green', linewidth=1.5)
    mid = (start + end) / 2
    ax.text(mid, 0.7, f"{intensity:.0f} N/m", ha='center', color='tab:green')


def draw_support(ax, position, reaction, beam_length, support_type):
    tri_width = beam_length * 0.05
    tri_height = beam_length * 0.03

    apex = (position, 0)
    base_left = (position - tri_width / 2, -tri_height)
    base_right = (position + tri_width / 2, -tri_height)

    triangle = patches.Polygon(
        [apex, base_left, base_right],
        closed=True, facecolor='white', edgecolor='black', linewidth=1.5, zorder=3,
    )
    ax.add_patch(triangle)

    if support_type == 'pinned':
        ground_y = -tri_height
        ax.plot(
            [position - tri_width * 0.9, position + tri_width * 0.9],
            [ground_y, ground_y], color='black', linewidth=1.5,
        )
        for hx in np.linspace(position - tri_width * 0.8, position + tri_width * 0.8, 6):
            ax.plot(
                [hx, hx - tri_width * 0.2],
                [ground_y, ground_y - tri_height * 0.6],
                color='black', linewidth=1,
            )
        label_y = -tri_height - tri_height * 0.9
    else:
        roller_y = -tri_height - tri_height * 0.35
        for cx in [position - tri_width * 0.25, position + tri_width * 0.25]:
            circle = patches.Circle(
                (cx, roller_y), radius=tri_height * 0.35,
                facecolor='white', edgecolor='black', linewidth=1.5, zorder=3,
            )
            ax.add_patch(circle)
        ax.plot(
            [position - tri_width * 0.9, position + tri_width * 0.9],
            [roller_y - tri_height * 0.35, roller_y - tri_height * 0.35],
            color='black', linewidth=1.5,
        )
        label_y = roller_y - tri_height * 1.1

    ax.text(position, label_y, f"R = {reaction:.0f} N", ha='center')


def plot_beam_results(beam, r_a, r_b):
    """Build and display the load diagram + SFD + BMD for a solved beam."""
    x_values = np.linspace(0, beam.length, 400)
    v_values = [beam.shear_at(xv) for xv in x_values]
    m_values = [beam.moment_at(xv) for xv in x_values]

    fig, axes = plt.subplots(
        3, 1, figsize=(10, 10), sharex=True,
        gridspec_kw={'height_ratios': [1, 2, 2]},
    )

    load_ax = axes[0]
    load_ax.plot([0, beam.length], [0, 0], color='black', linewidth=3, zorder=2)

    for load in beam.loads:
        if isinstance(load, PointLoad):
            draw_point_load(load_ax, load.position, load.magnitude)
        elif isinstance(load, UDL):
            draw_udl(load_ax, load.start, load.end, load.intensity)

    draw_support(load_ax, beam.support_a, r_a, beam.length, support_type='pinned')
    draw_support(load_ax, beam.support_b, r_b, beam.length, support_type='roller')

    load_ax.set_ylim(-1.0, 1.3)
    load_ax.set_yticks([])
    load_ax.set_title("Load Diagram")

    axes[1].plot(x_values, v_values, color='tab:blue')
    axes[1].axhline(0, color='black', linewidth=0.8)
    axes[1].set_ylabel("Shear Force V(x) [N]")
    axes[1].set_title("Shear Force Diagram (SFD)")
    axes[1].grid(True)

    axes[2].plot(x_values, m_values, color='tab:red')
    axes[2].axhline(0, color='black', linewidth=0.8)
    axes[2].set_ylabel("Bending Moment M(x) [N.m]")
    axes[2].set_xlabel("Position along beam, x [m]")
    axes[2].set_title("Bending Moment Diagram (BMD)")
    axes[2].grid(True)

    plt.tight_layout()
    plt.show()