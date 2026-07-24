"""
cross_sections.py

A library of cross-section property calculators. Every shape returns:
  A       -- area
  I       -- second moment of area about the horizontal centroidal axis
  c / Z   -- (symmetric shapes) distance to extreme fiber / section modulus
  c_top, c_bottom, Z_top, Z_bottom -- (asymmetric shapes, e.g. T-section)
  q_func  -- callable: y (measured from the neutral axis) -> Q(y), the
             first moment of area above height y about the neutral axis
  b_func  -- callable: y -> width of the section at that height
  y_min, y_max -- the valid range of y (bottom fiber to top fiber,
                  relative to the neutral axis)

q_func/b_func let stress.py compute tau(y) = V*Q(y)/(I*b(y)) IDENTICALLY
for every shape -- each shape only supplies its own Q(y)/b(y), derived
from real integration and checked against brute-force numerical
integration before being written here.

Everything is still built on ONE shared primitive,
composite_from_rectangles(), for A/I/centroid -- Q(y)/b(y) are shape-
specific because they depend on exactly how each shape's width changes
with height, which composite_from_rectangles() doesn't need to know.
"""

import math


def composite_from_rectangles(rects):
    """rects: list of (width, height, y_centroid) tuples, y_centroid
    measured from a consistent reference line (we use the bottom of
    the section). Returns (total_area, ybar, I) about the overall
    centroidal axis."""
    total_A = sum(b * h for b, h, y in rects)
    ybar = sum(b * h * y for b, h, y in rects) / total_A

    I = 0.0
    for b, h, y in rects:
        A_i = b * h
        I_own = b * h**3 / 12
        d = y - ybar
        I += I_own + A_i * d**2
    return total_A, ybar, I


def rectangle(b, h):
    """Solid rectangle: width b, height h."""
    A, ybar, I = composite_from_rectangles([(b, h, h / 2)])
    c = h / 2

    def q_func(y):
        if abs(y) > c:
            return 0.0
        return b / 2 * (c**2 - y**2)

    def b_func(y):
        return b if abs(y) <= c else 0.0

    return {'A': A, 'I': I, 'c': c, 'Z': I / c,
            'q_func': q_func, 'b_func': b_func, 'y_min': -c, 'y_max': c}


def hollow_rectangle(b_out, h_out, b_in, h_in):
    """Rectangular tube: outer b_out x h_out, inner (concentric) b_in x h_in."""
    A_out, _, I_out = composite_from_rectangles([(b_out, h_out, h_out / 2)])
    A_in, _, I_in = composite_from_rectangles([(b_in, h_in, h_out / 2)])
    A = A_out - A_in
    I = I_out - I_in
    c = h_out / 2

    def q_func(y):
        Y = abs(y)
        if Y > c:
            return 0.0
        if Y >= h_in / 2:
            return (b_out / 2) * (c**2 - Y**2)
        return (b_out / 2) * (c**2 - h_in**2 / 4) + (b_out - b_in) / 2 * (h_in**2 / 4 - Y**2)

    def b_func(y):
        Y = abs(y)
        if Y <= h_in / 2:
            return b_out - b_in
        elif Y <= c:
            return b_out
        return 0.0

    return {'A': A, 'I': I, 'c': c, 'Z': I / c,
            'q_func': q_func, 'b_func': b_func, 'y_min': -c, 'y_max': c}


def circle(d):
    """Solid circular section, diameter d."""
    r = d / 2
    A = math.pi * d**2 / 4
    I = math.pi * d**4 / 64

    def q_func(y):
        if abs(y) > r:
            return 0.0
        return (2 / 3) * (r**2 - y**2)**1.5

    def b_func(y):
        if abs(y) > r:
            return 0.0
        return 2 * math.sqrt(r**2 - y**2)

    return {'A': A, 'I': I, 'c': r, 'Z': I / r,
            'q_func': q_func, 'b_func': b_func, 'y_min': -r, 'y_max': r}


def hollow_circle(d_out, d_in):
    """Circular tube: outer diameter d_out, inner diameter d_in."""
    r_out, r_in = d_out / 2, d_in / 2
    A = math.pi / 4 * (d_out**2 - d_in**2)
    I = math.pi / 64 * (d_out**4 - d_in**4)

    def q_func(y):
        if abs(y) > r_out:
            return 0.0
        outer = (2 / 3) * (r_out**2 - y**2)**1.5
        inner = (2 / 3) * (r_in**2 - y**2)**1.5 if abs(y) <= r_in else 0.0
        return outer - inner

    def b_func(y):
        if abs(y) > r_out:
            return 0.0
        outer = 2 * math.sqrt(r_out**2 - y**2)
        inner = 2 * math.sqrt(r_in**2 - y**2) if abs(y) <= r_in else 0.0
        return outer - inner

    return {'A': A, 'I': I, 'c': r_out, 'Z': I / r_out,
            'q_func': q_func, 'b_func': b_func, 'y_min': -r_out, 'y_max': r_out}


def channel(H, B, tw, tf):
    """C-channel (also valid for a symmetric I-section -- see
    i_section below). H = overall height, B = flange width,
    tw = web thickness, tf = flange thickness. Symmetric top/bottom,
    so the centroid is at H/2."""
    web_h = H - 2 * tf
    rects = [
        (B, tf, tf / 2),
        (tw, web_h, tf + web_h / 2),
        (B, tf, H - tf / 2),
    ]
    A, ybar, I = composite_from_rectangles(rects)
    c = H / 2
    web_half = H / 2 - tf   # distance from centroid to where the web ends / flange begins

    def q_func(y):
        Y = abs(y)
        if Y > c:
            return 0.0
        if Y >= web_half:
            return (B / 2) * (c**2 - Y**2)
        return (B / 2) * (c**2 - web_half**2) + (tw / 2) * (web_half**2 - Y**2)

    def b_func(y):
        Y = abs(y)
        if Y <= web_half:
            return tw
        elif Y <= c:
            return B
        return 0.0

    return {'A': A, 'I': I, 'c': c, 'Z': I / c, 'ybar': ybar,
            'q_func': q_func, 'b_func': b_func, 'y_min': -c, 'y_max': c}


def i_section(H, B, tw, tf):
    """I-beam (symmetric wide-flange). Identical geometry to channel()
    for bending/shear about the horizontal axis."""
    return channel(H, B, tw, tf)


def t_section(H, B, tw, tf):
    """T-section: single flange at the TOP, width B, thickness tf;
    web below, width tw, full section height H. Asymmetric -- the
    centroid is NOT at H/2, so q_func/b_func are built using y measured
    relative to the actual centroid, with different distances to the
    top and bottom extreme fibers."""
    web_h = H - tf
    rects = [
        (tw, web_h, web_h / 2),
        (B, tf, H - tf / 2),
    ]
    A, ybar, I = composite_from_rectangles(rects)
    c_top = H - ybar
    c_bottom = ybar
    web_h_rel = web_h - ybar   # where the web ends / flange begins, relative to centroid

    def q_func(y):
        if y < -c_bottom or y > c_top:
            return 0.0
        if y >= web_h_rel:
            return B * (c_top**2 - y**2) / 2
        return tw * (web_h_rel**2 - y**2) / 2 + B * (c_top**2 - web_h_rel**2) / 2

    def b_func(y):
        if y < -c_bottom or y > c_top:
            return 0.0
        return B if y >= web_h_rel else tw

    return {
        'A': A, 'I': I, 'ybar': ybar,
        'c_top': c_top, 'c_bottom': c_bottom,
        'Z_top': I / c_top, 'Z_bottom': I / c_bottom,
        'q_func': q_func, 'b_func': b_func, 'y_min': -c_bottom, 'y_max': c_top,
    }