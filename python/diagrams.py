"""
diagrams.py

Drawing helpers for the load diagram, SFD, BMD, bending stress curve,
and the shear stress profile through the cross-section. Layout: load
diagram and shear stress profile share the top row (profile to the
right, since it's a property of the cross-section, not of position
along the beam); SFD, BMD, and bending stress stack below, full width.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from loads import PointLoad, UDL
from stress import bending_stress, shear_stress_rectangle_profile, max_shear_stress_rectangle


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

    triangle = patches.Polygon([apex, base_left, base_right], closed=True,
                                facecolor='white', edgecolor='black', linewidth=1.5, zorder=3)
    ax.add_patch(triangle)

    if support_type == 'pinned':
        ground_y = -tri_height
        ax.plot([position - tri_width * 0.9, position + tri_width * 0.9], [ground_y, ground_y],
                color='black', linewidth=1.5)
        for hx in np.linspace(position - tri_width * 0.8, position + tri_width * 0.8, 6):
            ax.plot([hx, hx - tri_width * 0.2], [ground_y, ground_y - tri_height * 0.6],
                    color='black', linewidth=1)
        label_y = -tri_height - tri_height * 0.9
    else:
        roller_y = -tri_height - tri_height * 0.35
        for cx in [position - tri_width * 0.25, position + tri_width * 0.25]:
            circle = patches.Circle((cx, roller_y), radius=tri_height * 0.35,
                                     facecolor='white', edgecolor='black', linewidth=1.5, zorder=3)
            ax.add_patch(circle)
        ax.plot([position - tri_width * 0.9, position + tri_width * 0.9],
                [roller_y - tri_height * 0.35, roller_y - tri_height * 0.35], color='black', linewidth=1.5)
        label_y = roller_y - tri_height * 1.1

    ax.text(position, label_y, f"R = {reaction:.0f} N", ha='center')


def annotate_shear_values(ax, rows):
    for row in rows:
        xp, v_left, v_right = row['x'], row['V_left'], row['V_right']
        jumps = abs(v_left - v_right) > 1e-6
        if jumps:
            ax.plot(xp, v_left, 'o', color='tab:blue', markersize=4)
            ax.plot(xp, v_right, 'o', color='tab:blue', markersize=4)
            ax.annotate(f"{v_left:.0f}", (xp, v_left), textcoords="offset points",
                        xytext=(-6, 6 if v_left >= 0 else -12), fontsize=8, ha='right', color='tab:blue')
            ax.annotate(f"{v_right:.0f}", (xp, v_right), textcoords="offset points",
                        xytext=(6, 6 if v_right >= 0 else -12), fontsize=8, ha='left', color='tab:blue')
        else:
            ax.plot(xp, v_left, 'o', color='tab:blue', markersize=4)
            ax.annotate(f"{v_left:.0f}", (xp, v_left), textcoords="offset points",
                        xytext=(0, 6 if v_left >= 0 else -12), fontsize=8, ha='center', color='tab:blue')


def annotate_moment_values(ax, rows, max_x):
    for row in rows:
        xp, m = row['x'], row['M']
        is_max = abs(xp - max_x) < 1e-6
        ax.plot(xp, m, 'o', color='tab:red', markersize=7 if is_max else 4, zorder=5)
        text = f"{m:.0f}" + (" (MAX)" if is_max else "")
        ax.annotate(text, (xp, m), textcoords="offset points",
                    xytext=(0, 8 if m >= 0 else -14), fontsize=8, ha='center',
                    color='tab:red', fontweight='bold' if is_max else 'normal')


def annotate_stress_values(ax, rows, Z, max_x):
    """Same idea as annotate_moment_values, but converts M -> stress
    (MPa) via sigma = M/Z for each key point."""
    for row in rows:
        xp = row['x']
        sigma_mpa = bending_stress(row['M'], Z) / 1e6
        is_max = abs(xp - max_x) < 1e-6
        ax.plot(xp, sigma_mpa, 'o', color='tab:purple', markersize=7 if is_max else 4, zorder=5)
        text = f"{sigma_mpa:.2f}" + (" (MAX)" if is_max else "")
        ax.annotate(text, (xp, sigma_mpa), textcoords="offset points",
                    xytext=(0, 8 if sigma_mpa >= 0 else -14), fontsize=8, ha='center',
                    color='tab:purple', fontweight='bold' if is_max else 'normal')


def draw_shear_stress_profile(ax, beam, section):
    """The classic 'stress vs height' picture: a parabola for a solid
    rectangle, evaluated at the beam's worst-case (max |V|) section --
    this is the governing profile for shear design."""
    max_v_row = beam.max_shear_point()
    V_critical = max_v_row['V']
    h = 2 * section['c']  # full height, since c = h/2 for a rectangle

    y_values = np.linspace(-h / 2, h / 2, 200)
    tau_values = shear_stress_rectangle_profile(V_critical, section['I'], h, y_values)
    tau_mpa = [t / 1e6 for t in tau_values]

    ax.plot(tau_mpa, y_values, color='tab:brown', linewidth=2)
    ax.fill_betweenx(y_values, 0, tau_mpa, color='tab:brown', alpha=0.15)
    ax.axhline(0, color='black', linewidth=0.6, linestyle='--')
    ax.axvline(0, color='black', linewidth=0.6)

    tau_max_mpa = max_shear_stress_rectangle(V_critical, section['A']) / 1e6
    ax.plot(tau_max_mpa, 0, 'o', color='tab:brown', markersize=6, zorder=5)
    ax.annotate(f"tau_max = {tau_max_mpa:.3f} MPa\n(at neutral axis, y=0)",
                (tau_max_mpa, 0), textcoords="offset points", xytext=(-90, -25),
                fontsize=8, color='tab:brown')

    ax.set_title(f"Shear Stress Profile\n(at governing section x={max_v_row['x']:.2f} m)", fontsize=10)
    ax.set_xlabel("Shear stress [MPa]")
    ax.set_ylabel("Height through section, y [m]")


def plot_beam_results(beam, section):
    """Build and display: load diagram + shear stress profile (top
    row), then SFD, BMD, and bending stress stacked below."""
    x_values = np.linspace(0, beam.length, 400)
    v_values = [beam.shear_at(xv) for xv in x_values]
    m_values = [beam.moment_at(xv) for xv in x_values]
    sigma_values_mpa = [bending_stress(m, section['Z']) / 1e6 for m in m_values]

    rows = beam.key_points_report()
    max_moment_row = beam.max_moment_point()

    fig = plt.figure(figsize=(10, 13))
    gs = fig.add_gridspec(4, 2, height_ratios=[1, 2, 2, 2], width_ratios=[3, 1.4])

    load_ax = fig.add_subplot(gs[0, 0])
    shear_profile_ax = fig.add_subplot(gs[0, 1])
    # NOTE: column 0 only (not gs[row, :]) -- this keeps SFD/BMD/stress
    # the same width as the load diagram, matching it visually. The
    # column-1 cells in rows 1-3 are simply left empty (blank space),
    # rather than letting the lower plots stretch wider than the load
    # diagram above them.
    sfd_ax = fig.add_subplot(gs[1, 0])
    bmd_ax = fig.add_subplot(gs[2, 0])
    stress_ax = fig.add_subplot(gs[3, 0])

    # --- Load diagram ---
    load_ax.plot([0, beam.length], [0, 0], color='black', linewidth=3, zorder=2)
    for load in beam.loads:
        if isinstance(load, PointLoad):
            draw_point_load(load_ax, load.position, load.magnitude)
        elif isinstance(load, UDL):
            draw_udl(load_ax, load.start, load.end, load.intensity)
    draw_support(load_ax, beam.support_a, beam.reaction_a, beam.length, support_type='pinned')
    draw_support(load_ax, beam.support_b, beam.reaction_b, beam.length, support_type='roller')
    load_ax.set_ylim(-1.0, 1.3)
    load_ax.set_yticks([])
    load_ax.set_title("Load Diagram")

    # --- Shear stress profile (through the cross-section) ---
    draw_shear_stress_profile(shear_profile_ax, beam, section)

    # --- SFD ---
    sfd_ax.plot(x_values, v_values, color='tab:blue')
    sfd_ax.axhline(0, color='black', linewidth=0.8)
    annotate_shear_values(sfd_ax, rows)
    sfd_ax.set_ylabel("Shear Force V(x) [N]")
    sfd_ax.set_title("Shear Force Diagram (SFD)")
    sfd_ax.grid(True)

    # --- BMD ---
    bmd_ax.plot(x_values, m_values, color='tab:red')
    bmd_ax.axhline(0, color='black', linewidth=0.8)
    annotate_moment_values(bmd_ax, rows, max_moment_row['x'])
    bmd_ax.set_ylabel("Bending Moment M(x) [N.m]")
    bmd_ax.set_title("Bending Moment Diagram (BMD)")
    bmd_ax.grid(True)

    # --- Bending stress ---
    stress_ax.plot(x_values, sigma_values_mpa, color='tab:purple')
    stress_ax.axhline(0, color='black', linewidth=0.8)
    annotate_stress_values(stress_ax, rows, section['Z'], max_moment_row['x'])
    stress_ax.set_ylabel("Bending Stress sigma(x) [MPa]")
    stress_ax.set_xlabel("Position along beam, x [m]")
    stress_ax.set_title("Bending Stress Diagram")
    stress_ax.grid(True)

    plt.tight_layout()
    plt.show()