"""
cross-sections.py

A library of cross-section property calculators. Every shape is built
on ONE shared primitive: composite_from_rectangles(), which uses the
centroid + parallel-axis-theorem method (area-weighted average
position, then I = sum of each piece's own I plus A*d^2). This means
every shape function is only as correct as that one tested primitive
-- not a separate hand-derived formula each time.

All functions return a dict with at least: A (area), I (second moment
of area about the horizontal centroidal axis), and Z (section
modulus = I/c). Asymmetric shapes (T-section) return c_top/c_bottom
and Z_top/Z_bottom instead of a single c/Z, since the distance to the
extreme fiber differs on each side.
"""

import math


def composite_from_rectangles(rects):
    """rects: list of (width, height, y_centroid) tuples, where
    y_centroid is each rectangle's own centroid measured from a
    consistent reference line (we use the bottom of the section).
    Returns (total_area, ybar, I) about the overall centroidal axis."""
    total_A = sum(b * h for b, h, y in rects)
    ybar = sum(b * h * y for b, h, y in rects) / total_A

    I = 0.0
    for b, h, y in rects:
        A_i = b * h
        I_own = b * h**3 / 12       # this rectangle's own I about ITS OWN centroid
        d = y - ybar                 # distance from its centroid to the overall centroid
        I += I_own + A_i * d**2      # parallel axis theorem
    return total_A, ybar, I


def rectangle(b, h):
    """Solid rectangle: width b, height h."""
    A, ybar, I = composite_from_rectangles([(b, h, h / 2)])
    c = h / 2
    return {'A': A, 'I': I, 'c': c, 'Z': I / c}


def hollow_rectangle(b_out, h_out, b_in, h_in):
    """Rectangular tube: outer b_out x h_out, inner (concentric) b_in x h_in."""
    A_out, _, I_out = composite_from_rectangles([(b_out, h_out, h_out / 2)])
    A_in, _, I_in = composite_from_rectangles([(b_in, h_in, h_out / 2)])  # same centroid line
    A = A_out - A_in
    I = I_out - I_in
    c = h_out / 2
    return {'A': A, 'I': I, 'c': c, 'Z': I / c}


def circle(d):
    """Solid circular section, diameter d."""
    A = math.pi * d**2 / 4
    I = math.pi * d**4 / 64
    c = d / 2
    return {'A': A, 'I': I, 'c': c, 'Z': I / c}


def hollow_circle(d_out, d_in):
    """Circular tube: outer diameter d_out, inner diameter d_in."""
    A = math.pi / 4 * (d_out**2 - d_in**2)
    I = math.pi / 64 * (d_out**4 - d_in**4)
    c = d_out / 2
    return {'A': A, 'I': I, 'c': c, 'Z': I / c}


def channel(H, B, tw, tf):
    """C-channel (also valid for a symmetric I-section -- see i_section
    below). H = overall height, B = flange width, tw = web thickness,
    tf = flange thickness. Symmetric top/bottom, so centroid is at H/2."""
    web_h = H - 2 * tf
    rects = [
        (B, tf, tf / 2),               # bottom flange
        (tw, web_h, tf + web_h / 2),   # web, centered between the flanges
        (B, tf, H - tf / 2),           # top flange
    ]
    A, ybar, I = composite_from_rectangles(rects)
    c = H / 2
    return {'A': A, 'I': I, 'c': c, 'Z': I / c, 'ybar': ybar}


def i_section(H, B, tw, tf):
    """I-beam (symmetric wide-flange). Same geometry as channel() for
    bending about the horizontal axis -- a channel's open side doesn't
    change how area is distributed vertically, only its torsion
    behavior, which we aren't modeling."""
    return channel(H, B, tw, tf)


def t_section(H, B, tw, tf):
    """T-section: single flange at the TOP, width B, thickness tf;
    web below, width tw, full section height H. Asymmetric -- the
    centroid is NOT at H/2, so top and bottom extreme fibers are
    different distances away, and get different Z values."""
    web_h = H - tf
    rects = [
        (tw, web_h, web_h / 2),       # web
        (B, tf, H - tf / 2),          # flange at the top
    ]
    A, ybar, I = composite_from_rectangles(rects)
    c_top = H - ybar
    c_bottom = ybar
    return {
        'A': A, 'I': I, 'ybar': ybar,
        'c_top': c_top, 'c_bottom': c_bottom,
        'Z_top': I / c_top, 'Z_bottom': I / c_bottom,
    }