"""
beam.py

Solves for reactions, then builds V(x) and M(x) as piecewise
expressions. Also identifies every engineering-significant point:
supports, loads, and local extrema of the bending moment (found from
V(x) = 0, since dM/dx = V).

Distributed loads are now linear-in-x (DistributedLoad has independent
start/end intensities -- a plain UDL is just the case where they're
equal), so within a segment, the total distributed load intensity is
w(xi) = w0 + k*xi (not just a constant) -- this makes V(x) quadratic
and M(x) cubic per segment, generalizing the earlier constant-w case.
"""

import sympy as sp
from loads import PointLoad, DistributedLoad

x = sp.symbols('x', real=True)


class Beam:
    def __init__(self, length, support_a, support_b):
        self.length = length
        self.support_a = support_a
        self.support_b = support_b
        self.loads = []

    def add_load(self, load):
        self.loads.append(load)

    def solve_reactions(self):
        a, b = self.support_a, self.support_b
        total_moment_about_a = 0.0
        total_downward_force = 0.0

        for load in self.loads:
            if isinstance(load, PointLoad):
                total_downward_force += load.magnitude
                total_moment_about_a += load.magnitude * (load.position - a)
            elif isinstance(load, DistributedLoad):
                length = load.end - load.start
                w1, w2 = load.start_intensity, load.end_intensity
                resultant = (w1 + w2) / 2 * length
                # Moment about 'a', found by DIRECT integration rather
                # than resultant*centroid -- the resultant*centroid
                # shortcut divides by the resultant, which breaks when
                # the resultant is zero but the moment genuinely isn't
                # (e.g. an antisymmetric ramp load from +w to -w).
                # Derivation: with s = x-load.start (0..length),
                # w(s) = w1 + (w2-w1)/length*s, and
                # moment_about_a = (load.start - a)*resultant
                #                  + length^2*(w1 + 2*w2)/6
                moment_about_a = (load.start - a) * resultant + length**2 * (w1 + 2 * w2) / 6
                total_downward_force += resultant
                total_moment_about_a += moment_about_a

        r_b = total_moment_about_a / (b - a)
        r_a = total_downward_force - r_b
        self.reaction_a = r_a
        self.reaction_b = r_b
        return r_a, r_b

    def _critical_points(self):
        pts = {0.0, self.length, self.support_a, self.support_b}
        for load in self.loads:
            if isinstance(load, PointLoad):
                pts.add(load.position)
            elif isinstance(load, DistributedLoad):
                pts.add(load.start)
                pts.add(load.end)
        return sorted(pts)

    def _distributed_load_at_segment(self, seg_start, seg_end):
        """Sums every active DistributedLoad's contribution across this
        segment into ONE combined linear function w(xi) = w0 + k*xi
        (xi measured from seg_start) -- superposition holds since
        integration is linear, so multiple overlapping distributed
        loads just add together."""
        w0, k = 0.0, 0.0
        for load in self.loads:
            if isinstance(load, DistributedLoad) and load.start <= seg_start and load.end >= seg_end:
                span = load.end - load.start
                slope = (load.end_intensity - load.start_intensity) / span
                # this load's own intensity exactly AT seg_start
                w_at_seg_start = load.start_intensity + slope * (seg_start - load.start)
                w0 += w_at_seg_start
                k += slope
        return w0, k

    def solve(self):
        if not hasattr(self, 'reaction_a'):
            self.solve_reactions()

        crit = self._critical_points()
        point_events = {p: [0.0, 0.0] for p in crit}
        point_events[self.support_a][0] += self.reaction_a
        point_events[self.support_b][0] += self.reaction_b
        for load in self.loads:
            if isinstance(load, PointLoad):
                point_events[load.position][0] -= load.magnitude

        v_pieces, m_pieces = [], []
        self.point_values = {}   # x -> {'V_left', 'V_right', 'M'}
        self._segments = []       # for exact interior V=0 root-finding

        v_start, m_start = 0.0, 0.0

        for i in range(len(crit) - 1):
            seg_start, seg_end = crit[i], crit[i + 1]

            v_left, m_left = v_start, m_start
            dV, dM = point_events[seg_start]
            v_start += dV
            m_start += dM
            self.point_values[seg_start] = {'V_left': v_left, 'V_right': v_start, 'M': m_start}

            w0, k = self._distributed_load_at_segment(seg_start, seg_end)

            xi = x - seg_start
            v_expr = v_start - w0 * xi - k * xi**2 / 2
            m_expr = m_start + v_start * xi - w0 * xi**2 / 2 - k * xi**3 / 6

            is_last = (seg_end == crit[-1])
            cond = sp.And(x >= seg_start, x <= seg_end) if is_last else sp.And(x >= seg_start, x < seg_end)
            v_pieces.append((sp.nsimplify(v_expr), cond))
            m_pieces.append((sp.nsimplify(m_expr), cond))

            self._segments.append({'start': seg_start, 'end': seg_end, 'v_start': v_start, 'w0': w0, 'k': k})

            v_start = float(v_expr.subs(x, seg_end))
            m_start = float(m_expr.subs(x, seg_end))

        last = crit[-1]
        self.point_values[last] = {'V_left': v_start, 'V_right': v_start, 'M': m_start}

        self.V = sp.Piecewise(*v_pieces)
        self.M = sp.Piecewise(*m_pieces)
        return self.V, self.M

    def shear_at(self, xv):
        return float(self.V.subs(x, xv))

    def moment_at(self, xv):
        return float(self.M.subs(x, xv))

    def zero_shear_points(self):
        """x-positions strictly INSIDE a segment where V(x) = 0.

        V(xi) = v_start - w0*xi - k*xi^2/2, which is LINEAR when k=0
        (a plain UDL or no distributed load active) and QUADRATIC
        when k!=0 (a varying/trapezoidal load) -- a quadratic can have
        0, 1, or 2 roots inside one segment (the shear can cross zero
        twice under a tapering load), so both are found and checked."""
        roots = []
        for seg in self._segments:
            w0, k = seg['w0'], seg['k']
            v_start = seg['v_start']
            seg_len = seg['end'] - seg['start']

            if k == 0:
                if w0 != 0:
                    xi_root = v_start / w0
                    if 0 < xi_root < seg_len:
                        roots.append(seg['start'] + xi_root)
                continue

            # (k/2)*xi^2 + w0*xi - v_start = 0  ->  k*xi^2 + 2*w0*xi - 2*v_start = 0
            discriminant = (2 * w0)**2 - 4 * k * (-2 * v_start)
            if discriminant < 0:
                continue
            sqrt_d = discriminant**0.5
            for sign in (1, -1):
                xi_root = (-2 * w0 + sign * sqrt_d) / (2 * k)
                if 0 < xi_root < seg_len:
                    roots.append(seg['start'] + xi_root)
        return roots

    def key_points_report(self):
        """One row per engineering-significant point: every support,
        every load position, every distributed load start/end, and
        every interior V=0 point -- with V (left/right of any jump)
        and M at each."""
        labels = {}

        def add_label(pos, text):
            labels.setdefault(round(pos, 6), []).append(text)

        add_label(0.0, "Beam end")
        add_label(self.length, "Beam end")
        add_label(self.support_a, "Support A (Ra, fixed)")
        add_label(self.support_b, "Support B (Rb, roller)")
        for load in self.loads:
            if isinstance(load, PointLoad):
                add_label(load.position, "Point load")
            elif isinstance(load, DistributedLoad):
                kind = "UDL" if load.start_intensity == load.end_intensity else "Varying distributed load"
                add_label(load.start, f"{kind} start")
                add_label(load.end, f"{kind} end")

        zero_shear = self.zero_shear_points()
        for xr in zero_shear:
            add_label(xr, "V = 0")

        all_x = sorted(set(list(self.point_values.keys()) + [round(r, 6) for r in zero_shear]))

        rows = []
        for xp in all_x:
            if xp in self.point_values:
                vals = self.point_values[xp]
                v_left, v_right, m = vals['V_left'], vals['V_right'], vals['M']
            else:
                v_left = v_right = self.shear_at(xp)
                m = self.moment_at(xp)

            # a point load/reaction can flip V from + to -, which is
            # also a local extreme of M, even though it's an instant
            # jump rather than a smooth crossing
            crosses_zero = (v_left * v_right < 0)
            label_list = labels.get(round(xp, 6), [])
            if crosses_zero and "V = 0" not in label_list:
                label_list = label_list + ["(shear crosses zero here)"]

            rows.append({'x': xp, 'labels': label_list, 'V_left': v_left, 'V_right': v_right, 'M': m})

        return rows

    def max_moment_point(self):
        """The single point with the largest |M| -- the design-critical
        section of the beam."""
        rows = self.key_points_report()
        return max(rows, key=lambda r: abs(r['M']))

    def max_shear_point(self):
        """The point along the beam with the largest |V| (checking
        both sides of any jump, since V can differ left vs right of a
        point load or reaction) -- the worst-case section for shear."""
        rows = self.key_points_report()
        best_x, best_v = 0.0, 0.0
        for row in rows:
            for v in (row['V_left'], row['V_right']):
                if abs(v) > abs(best_v):
                    best_x, best_v = row['x'], v
        return {'x': best_x, 'V': best_v}

    def solve_deflection(self, E, I):
        """Computes the beam's deflection curve y(x), assuming a
        constant EI (uniform section) along the whole beam.

        Method: EI*y''(x) = M(x). Integrating twice gives a
        'particular' curve Y_p(x), built assuming slope=0 and y=0 at
        x=0 -- but that assumption is almost certainly wrong for the
        REAL beam, since we don't actually know the slope or
        deflection at x=0. So the true solution is
            y(x) = Y_p(x) + theta0*x + y0
        (adding a straight line doesn't change y'', so it's still a
        valid solution to the same M(x)) -- theta0 and y0 are found
        from the two conditions we DO know: y=0 at both supports."""
        if not hasattr(self, 'M'):
            self.solve()

        EI = E * I
        theta_pieces, y_pieces = [], []
        theta_start, y_start = 0.0, 0.0

        for seg in self._segments:
            seg_start, seg_end = seg['start'], seg['end']
            v_start, w0, k = seg['v_start'], seg['w0'], seg['k']
            m_start = self.point_values[seg_start]['M']

            xi = x - seg_start
            m_expr = m_start + v_start * xi - w0 * xi**2 / 2 - k * xi**3 / 6

            # indefinite-integrate, then subtract the value at
            # seg_start -- gives the definite integral from seg_start
            # to x, without the "same symbol as integration bound"
            # ambiguity of writing sp.integrate(f, (x, seg_start, x))
            F = sp.integrate(m_expr, x)
            theta_expr = theta_start + (F - F.subs(x, seg_start)) / EI

            G = sp.integrate(theta_expr, x)
            y_expr = y_start + (G - G.subs(x, seg_start))

            is_last = (seg_end == self._segments[-1]['end'])
            cond = sp.And(x >= seg_start, x <= seg_end) if is_last else sp.And(x >= seg_start, x < seg_end)
            theta_pieces.append((sp.nsimplify(theta_expr), cond))
            y_pieces.append((sp.nsimplify(y_expr), cond))

            theta_start = float(theta_expr.subs(x, seg_end))
            y_start = float(y_expr.subs(x, seg_end))

        self.Theta_p = sp.Piecewise(*theta_pieces)
        self.Y_p = sp.Piecewise(*y_pieces)

        # solve for theta0, y0 using y(support_a)=0 and y(support_b)=0
        Yp_a = float(self.Y_p.subs(x, self.support_a))
        Yp_b = float(self.Y_p.subs(x, self.support_b))
        self.theta0 = (Yp_a - Yp_b) / (self.support_b - self.support_a)
        self.y0 = -self.theta0 * self.support_a - Yp_a
        self.EI = EI
        return None

    def deflection_at(self, xv):
        return self.y0 + self.theta0 * xv + float(self.Y_p.subs(x, xv))