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

max_row = beam.max_moment_point()
print(f"\nGoverning section (max |M|): x={max_row['x']:.2f} m, M={max_row['M']:.2f} N.m")

plot_beam_results(beam)