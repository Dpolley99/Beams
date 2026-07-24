"""
main.py

STEP 7: Ask the user for the beam's dimensions and loads, instead of
using fixed numbers written into the code.

This is now the single entry point for the whole program: collect
input -> build the beam -> solve it -> plot it. The beam only gets
built in ONE place, so there's no risk of main.py and the plot going
out of sync with each other.
"""

from beam import Beam
from loads import PointLoad, UDL
from diagrams import plot_beam_results
from cross_sections import rectangle, hollow_rectangle, circle, hollow_circle, channel, i_section, t_section
from stress import bending_stress, max_shear_stress, max_von_mises_stress
import numpy as np


def get_float(prompt):
    # input() shows the prompt and waits for the user to type something
    # and press Enter -- it always comes back as TEXT, even if the user
    # typed a number, so we have to convert it with float().
    # The while loop keeps asking again if that conversion fails
    # (e.g. the user typed "abc" by mistake).
    while True:
        text = input(prompt)
        try:
            return float(text)
        except ValueError:
            print("  Please enter a number (e.g. 12 or 12.5).")


def get_choice(prompt, valid_options):
    # same idea as get_float, but for picking a numbered menu option --
    # keeps asking until the answer is an integer AND one of the
    # allowed choices.
    while True:
        text = input(prompt)
        try:
            choice = int(text)
            if choice in valid_options:
                return choice
        except ValueError:
            pass
        print(f"  Please enter one of: {', '.join(str(o) for o in valid_options)}")


print("=== Beam setup ===")
beam_length = get_float("Beam length (m): ")
support_a = get_float("Position of front support / Ra, fixed (m from start): ")
support_b = get_float("Position of rear support / Rb, roller (m from start): ")

print("\n=== Point load ===")
point_load_magnitude = get_float("Point load magnitude (N, downward positive): ")
point_load_position = get_float("Point load position (m from start of beam): ")

print("\n=== Distributed load (UDL) ===")
udl_intensity = get_float("UDL intensity (N/m): ")
udl_start = get_float("UDL start position (m from start of beam): ")
udl_length = get_float("UDL length (m): ")
udl_end = udl_start + udl_length

beam = Beam(length=beam_length, support_a=support_a, support_b=support_b)
beam.add_load(PointLoad(magnitude=point_load_magnitude, position=point_load_position))
beam.add_load(UDL(intensity=udl_intensity, start=udl_start, end=udl_end))

r_a, r_b = beam.solve_reactions()
beam.solve()

print(f"\nReaction at support A: {r_a:.2f} N")
print(f"Reaction at support B: {r_b:.2f} N")

print("\n=== Key points (supports, loads, moment extrema) ===")
for row in beam.key_points_report():
    v = row['V_left'] if abs(row['V_left'] - row['V_right']) < 1e-6 \
        else f"{row['V_left']:.0f} -> {row['V_right']:.0f}"
    print(f"  x={row['x']:>6.2f} m | V={v} N | M={row['M']:>9.2f} N.m | {', '.join(row['labels'])}")

# STEP 9: cross-section for stress calculations -- now user-selectable.
print("\n=== Cross-section ===")
print("1. Rectangle")
print("2. Hollow rectangle")
print("3. Circle")
print("4. Hollow circle")
print("5. Channel (C-section)")
print("6. I-section")
print("7. T-section")
section_choice = get_choice("Choose a section type (1-7): ", range(1, 8))

if section_choice == 1:
    b = get_float("Width b (m): ")
    h = get_float("Height h (m): ")
    section = rectangle(b, h)
elif section_choice == 2:
    b_out = get_float("Outer width b_out (m): ")
    h_out = get_float("Outer height h_out (m): ")
    b_in = get_float("Inner width b_in (m): ")
    h_in = get_float("Inner height h_in (m): ")
    section = hollow_rectangle(b_out, h_out, b_in, h_in)
elif section_choice == 3:
    d = get_float("Diameter d (m): ")
    section = circle(d)
elif section_choice == 4:
    d_out = get_float("Outer diameter d_out (m): ")
    d_in = get_float("Inner diameter d_in (m): ")
    section = hollow_circle(d_out, d_in)
elif section_choice == 5:
    H = get_float("Overall height H (m): ")
    B = get_float("Flange width B (m): ")
    tw = get_float("Web thickness tw (m): ")
    tf = get_float("Flange thickness tf (m): ")
    section = channel(H, B, tw, tf)
elif section_choice == 6:
    H = get_float("Overall height H (m): ")
    B = get_float("Flange width B (m): ")
    tw = get_float("Web thickness tw (m): ")
    tf = get_float("Flange thickness tf (m): ")
    section = i_section(H, B, tw, tf)
else:  # section_choice == 7
    H = get_float("Overall height H (m): ")
    B = get_float("Flange width B (m): ")
    tw = get_float("Web thickness tw (m): ")
    tf = get_float("Flange thickness tf (m): ")
    section = t_section(H, B, tw, tf)

max_row = beam.max_moment_point()
print(f"\nGoverning section (max |M|): x={max_row['x']:.2f} m, M={max_row['M']:.2f} N.m")

max_bending_stress = bending_stress(max_row['M'], section)
print(f"Max bending stress: {max_bending_stress/1e6:.3f} MPa (at x={max_row['x']:.2f} m)")

max_v_row = beam.max_shear_point()
shear_result = max_shear_stress(max_v_row['V'], section['I'], section)
tau_max, y_at_max = shear_result['tau'], shear_result['y']
print(f"\nGoverning section (max |V|): x={max_v_row['x']:.2f} m, V={max_v_row['V']:.2f} N")
print(f"Max shear stress: {abs(tau_max)/1e6:.3f} MPa, occurring at y={y_at_max*1000:.2f} mm from the neutral axis")

# STEP 10: deflection -- needs Young's modulus (material stiffness).
print("\n=== Material ===")
E = get_float("Young's modulus E (Pa, e.g. 200e9 for steel): ")
beam.solve_deflection(E, section['I'])

# von Mises: scan every x on the plotting grid and report the worst one.
# (Unlike max |M| or max |V|, von Mises doesn't have as clean a way to
# pin down candidate x-positions in advance, since it depends on BOTH
# M(x) and V(x) together -- so this is found by dense numerical search
# over x, not a small set of exact critical points like the others.)
scan_x = np.linspace(0, beam.length, 400)
best_vm, best_vm_x = 0.0, 0.0
for xv in scan_x:
    result = max_von_mises_stress(beam.moment_at(xv), beam.shear_at(xv), section['I'], section)
    if result['von_mises'] > best_vm:
        best_vm, best_vm_x = result['von_mises'], xv
print(f"\nGoverning section (max von Mises stress): x={best_vm_x:.2f} m")
print(f"Max von Mises stress: {best_vm/1e6:.3f} MPa")

max_deflection = max(scan_x, key=lambda xv: abs(beam.deflection_at(xv)))
print(f"\nMax deflection: {beam.deflection_at(max_deflection)*1000:.3f} mm (at x={max_deflection:.2f} m)")

plot_beam_results(beam, section)