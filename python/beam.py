"""
beam.py

STEP 2: The actual solving logic.

Version 1 -- the beam's length, support positions, and loads all get
passed in as fixed numbers from main.py. A later version will let the
user type these in instead.

This file imports the data shapes from loads.py (the PointLoad and UDL
"boxes" we defined in step 1), then builds a Beam class that knows how
to solve itself: work out the support reactions, then build the shear
force V(x) and bending moment M(x) equations.
"""

import sympy as sp
from loads import PointLoad, UDL

# sp.symbols creates a "placeholder" variable for use in math expressions.
# Think of it as: "x is a variable we'll build equations out of, but we
# haven't plugged in a number yet."
x = sp.symbols('x', real=True)


class Beam:
    def __init__(self, length, support_a, support_b):
        # __init__ runs automatically whenever a new Beam is created.
        # "self" refers to "this particular beam".
        self.length = length
        self.support_a = support_a
        self.support_b = support_b
        self.loads = []  # starts empty -- we'll add loads to this next

    def add_load(self, load):
        # .append() adds an item to the end of a list
        self.loads.append(load)

    def solve_reactions(self):
        # STEP 2a: basic statics -- sum of forces = 0, sum of moments = 0.
        a = self.support_a
        b = self.support_b

        total_moment_about_a = 0.0
        total_downward_force = 0.0

        # "for load in self.loads" means: do the following once for
        # EACH item currently in the loads list
        for load in self.loads:
            if isinstance(load, PointLoad):
                # isinstance checks "what kind of thing is this?"
                total_downward_force += load.magnitude
                total_moment_about_a += load.magnitude * (load.position - a)
            elif isinstance(load, UDL):
                length = load.end - load.start
                resultant = load.intensity * length
                centroid = (load.start + load.end) / 2
                total_downward_force += resultant
                total_moment_about_a += resultant * (centroid - a)

        r_b = total_moment_about_a / (b - a)
        r_a = total_downward_force - r_b

        # store results on self so other methods can use them later
        self.reaction_a = r_a
        self.reaction_b = r_b
        return r_a, r_b

    def _critical_points(self):
        # STEP 2b: find every x-position where something changes --
        # a support, a point load, or the start/end of a UDL.
        # a "set" automatically removes duplicates, in case two things
        # happen to sit at the same position.
        pts = {0.0, self.length, self.support_a, self.support_b}
        for load in self.loads:
            if isinstance(load, PointLoad):
                pts.add(load.position)
            elif isinstance(load, UDL):
                pts.add(load.start)
                pts.add(load.end)
        return sorted(pts)  # sorted() returns them smallest to largest

    def solve(self):
        # STEP 2c: walk the beam left to right, one segment at a time,
        # building the shear force and bending moment equations.
        if not hasattr(self, 'reaction_a'):
            self.solve_reactions()

        crit = self._critical_points()

        # a dictionary maps a "key" to a "value" -- here, each critical
        # position maps to a small list [how much V jumps, how much M
        # jumps] right at that point.
        point_events = {p: [0.0, 0.0] for p in crit}

        point_events[self.support_a][0] += self.reaction_a
        point_events[self.support_b][0] += self.reaction_b

        for load in self.loads:
            if isinstance(load, PointLoad):
                point_events[load.position][0] -= load.magnitude

        v_pieces = []
        m_pieces = []
        v_start = 0.0
        m_start = 0.0

        # walking through each segment between critical points, left to right
        for i in range(len(crit) - 1):
            seg_start = crit[i]
            seg_end = crit[i + 1]

            dV, dM = point_events[seg_start]
            v_start += dV
            m_start += dM

            w_active = 0.0
            for load in self.loads:
                if isinstance(load, UDL) and load.start <= seg_start and load.end >= seg_end:
                    w_active += load.intensity

            xi = x - seg_start  # local distance from the start of this segment

            v_expr = v_start - w_active * xi
            m_expr = m_start + v_start * xi - w_active * xi**2 / 2

            is_last = (seg_end == crit[-1])
            cond = sp.And(x >= seg_start, x <= seg_end) if is_last \
                else sp.And(x >= seg_start, x < seg_end)

            v_pieces.append((sp.nsimplify(v_expr), cond))
            m_pieces.append((sp.nsimplify(m_expr), cond))

            v_start = float(v_expr.subs(x, seg_end))
            m_start = float(m_expr.subs(x, seg_end))

        self.V = sp.Piecewise(*v_pieces)
        self.M = sp.Piecewise(*m_pieces)
        return self.V, self.M

    def shear_at(self, xv):
        return float(self.V.subs(x, xv))

    def moment_at(self, xv):
        return float(self.M.subs(x, xv))