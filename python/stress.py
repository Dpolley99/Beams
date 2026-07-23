"""
stress.py

Bending and shear stress calculations, built on the beam's solved
M(x)/V(x) plus a chosen cross-section's properties (from
cross_sections.py). Shear stress formulas here are specific to a solid
rectangle for now -- Q(y) for other shapes is deferred until the
frontend work, per plan.
"""


def bending_stress(M, Z):
    """sigma(x) = M(x) / Z -- direct scaling of the bending moment by
    the section's (constant, for now) section modulus."""
    return M / Z


def max_shear_stress_rectangle(V, A):
    """tau_max = 1.5 * V / A for a solid rectangle. This is the exact
    peak of the parabolic shear stress distribution, and it always
    occurs at the neutral axis (mid-height) for a rectangle."""
    return 1.5 * V / A


def shear_stress_rectangle_profile(V, I, h, y_values):
    """tau(y) = (V / (2*I)) * (h^2/4 - y^2), for y measured from the
    neutral axis (mid-height). Derived from tau = V*Q/(I*b), where for
    a rectangle Q(y) = (b/2)*(h^2/4 - y^2) and b cancels with the b in
    the denominator -- so the profile doesn't actually depend on width
    at all for a solid rectangle, only on height."""
    return [(V / (2 * I)) * (h**2 / 4 - y**2) for y in y_values]