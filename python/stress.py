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


def max_von_mises_stress(M, V, I, section, n=200):
    """von Mises combines a NORMAL stress and a SHEAR stress at the
    SAME point: sigma_vm = sqrt(sigma^2 + 3*tau^2). This is NOT just
    combining our existing 'max bending stress' (at the extreme fiber,
    where shear is actually zero) with our existing 'max shear stress'
    (at the neutral axis, where bending stress is actually zero) --
    that would silently just return the bending stress unchanged.
    Instead we scan through the section's height and, at EACH y,
    compute the LOCAL bending stress sigma(y)=M*y/I and LOCAL shear
    stress tau(y)=V*Q(y)/(I*b(y)) together, then take whichever y
    gives the largest combined von Mises value -- the true governing
    point, which for an I/T/channel section is often at the web-flange
    junction, not at either extreme fiber or the neutral axis."""
    y_values = np.linspace(section['y_min'], section['y_max'], n)
    best_vm, best_y, best_sigma, best_tau = 0.0, 0.0, 0.0, 0.0
    for y in y_values:
        b = section['b_func'](y)
        sigma = M * y / I
        tau = V * section['q_func'](y) / (I * b) if b > 1e-12 else 0.0
        vm = (sigma**2 + 3 * tau**2) ** 0.5
        if vm > best_vm:
            best_vm, best_y, best_sigma, best_tau = vm, y, sigma, tau
    return {'von_mises': best_vm, 'y': best_y, 'sigma': best_sigma, 'tau': best_tau}