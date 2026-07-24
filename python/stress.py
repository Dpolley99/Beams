"""
stress.py

Bending and shear stress calculations, built on the beam's solved
M(x)/V(x) plus a chosen cross-section's properties (from
cross_sections.py). Fully generic across every section shape -- shear
stress uses each section's own q_func/b_func, and bending stress
handles both symmetric (single Z) and asymmetric (Z_top/Z_bottom,
e.g. T-section) shapes through one function.
"""

import numpy as np


def bending_stress(M, section):
    """sigma = M/Z. For symmetric sections this is a single value.
    For asymmetric sections (Z_top != Z_bottom, e.g. T-section), the
    top and bottom fibers see different-magnitude stress for the same
    M -- we return whichever is larger in magnitude (the governing,
    worst-case fiber), per the earlier decision to track max-of-both
    rather than plot both curves separately."""
    if 'Z' in section:
        return M / section['Z']
    top = M / section['Z_top']
    bottom = M / section['Z_bottom']
    return top if abs(top) >= abs(bottom) else bottom


def shear_stress_profile(V, I, section, y_values):
    """tau(y) = V*Q(y) / (I*b(y)), evaluated at each y using the
    section's own q_func/b_func -- identical formula for every shape,
    only Q/b differ."""
    taus = []
    for y in y_values:
        b = section['b_func'](y)
        taus.append(V * section['q_func'](y) / (I * b) if b > 1e-12 else 0.0)
    return taus


def max_shear_stress(V, I, section, n=1000):
    """Scans y across the section's valid range to find the largest
    |tau|. We scan numerically rather than assume the neutral axis,
    since for asymmetric sections (T-section) the peak is not
    guaranteed to sit exactly at y=0 -- verified this by direct
    numerical check when deriving each shape's Q(y)."""
    y_values = np.linspace(section['y_min'], section['y_max'], n)
    taus = shear_stress_profile(V, I, section, y_values)
    idx = max(range(len(taus)), key=lambda i: abs(taus[i]))
    return {'tau': taus[idx], 'y': y_values[idx]}