"""
solver_service.py

The actual "solve this beam" logic, with ZERO web-framework
dependency -- takes a plain dict in, returns a plain (JSON-safe) dict
out. api.py is just a thin FastAPI wrapper around solve_beam() below;
keeping this separate means the logic can be tested and reused
without needing a running web server (or even FastAPI installed).

UNITS: the solver itself (beam.py, cross_sections.py, stress.py) only
ever works in SI (meters, Newtons, Pascals) -- that's baked into every
formula we've verified. This file converts the incoming payload TO SI
before touching the solver, and converts the "headline" numeric
outputs (the ones a person reads directly -- reactions, curves,
governing values) FROM SI back to whichever units were requested, so
the same units apply on the way in and the way out.

Scope boundary, on purpose: the `section` dict and `shear_profile`
(y/tau/x_governing) stay in SI regardless of the requested units.
Those feed the frontend's DIAGRAMS (the cross-section silhouette, the
shear-stress-vs-height plot), which only care about internal ratios,
not the unit label -- converting them would touch working, tested
diagram-alignment code for no real benefit, so it's left as SI
internally. E is always GPa, per instruction, so there's no separate
"modulus" unit choice at all.
"""

from beam import Beam
from loads import PointLoad, DistributedLoad
from cross_sections import rectangle, hollow_rectangle, circle, hollow_circle, channel, i_section, t_section
from stress import bending_stress, max_shear_stress, max_von_mises_stress, shear_stress_profile
from units import to_si, from_si, LENGTH_TO_M, FORCE_TO_N, INTENSITY_TO_N_PER_M, MOMENT_TO_NM, DEFLECTION_TO_M

SECTION_BUILDERS = {
    "rectangle": lambda p: rectangle(p["b"], p["h"]),
    "hollow_rectangle": lambda p: hollow_rectangle(p["b_out"], p["h_out"], p["b_in"], p["h_in"]),
    "circle": lambda p: circle(p["d"]),
    "hollow_circle": lambda p: hollow_circle(p["d_out"], p["d_in"]),
    "channel": lambda p: channel(p["H"], p["B"], p["tw"], p["tf"]),
    "i_section": lambda p: i_section(p["H"], p["B"], p["tw"], p["tf"]),
    "t_section": lambda p: t_section(p["H"], p["B"], p["tw"], p["tf"]),
}

DEFAULT_UNITS = {
    # A strict no-op: a request that omits "units" entirely, or omits
    # some of its keys, gets EXACTLY the old (pre-units-feature)
    # behavior for whatever's missing -- everything already in SI, no
    # conversion applied. "mm is the sensible starting choice for
    # section dimensions" is a FRONTEND dropdown default, not a
    # backend fallback -- mixing those up is what silently broke the
    # unit conversion the first time around.
    "length": "m",
    "section_length": "m",
    "force": "N",
    "intensity": "N/m",
    "moment": "N.m",
    "deflection": "m",
}


def build_section(section_type, params):
    if section_type not in SECTION_BUILDERS:
        raise ValueError(f"Unknown section_type: {section_type}")
    return SECTION_BUILDERS[section_type](params)


def solve_beam(payload, n_points=400):
    """
    payload = {
      "length": float, "support_a": float, "support_b": float,
      "point_loads": [{"magnitude": float, "position": float}, ...],
      "distributed_loads": [{"start": float, "end": float,
                              "start_intensity": float, "end_intensity": float}, ...],
      "section_type": str, "section_params": {...},
      "E": float,  # always GPa
      "units": {"length": "m"|"mm", "section_length": "m"|"mm",
                "force": "N"|"kN",
                "intensity": "N/m"|"kN/m"|"N/mm"|"kN/mm",
                "moment": "N.m"|"kN.m"|"N.mm"|"kN.mm",
                "deflection": "m"|"mm"}  # all optional, default to the values above
    }
    Returns a plain dict, safe to json.dumps() directly -- every
    number is explicitly cast to a native Python float, since numpy
    scalars (which sneak in via stress.py's np.linspace-based scans)
    are NOT JSON-serializable by default.
    """
    units = {**DEFAULT_UNITS, **(payload.get("units") or {})}

    # ---- convert every input to SI before the solver sees any of it ----
    length_si = to_si(payload["length"], units["length"], LENGTH_TO_M)
    support_a_si = to_si(payload["support_a"], units["length"], LENGTH_TO_M)
    support_b_si = to_si(payload["support_b"], units["length"], LENGTH_TO_M)

    beam = Beam(length=length_si, support_a=support_a_si, support_b=support_b_si)

    for pl in payload.get("point_loads", []):
        beam.add_load(PointLoad(
            magnitude=to_si(pl["magnitude"], units["force"], FORCE_TO_N),
            position=to_si(pl["position"], units["length"], LENGTH_TO_M),
        ))
    for dl in payload.get("distributed_loads", []):
        beam.add_load(DistributedLoad(
            start=to_si(dl["start"], units["length"], LENGTH_TO_M),
            end=to_si(dl["end"], units["length"], LENGTH_TO_M),
            start_intensity=to_si(dl["start_intensity"], units["intensity"], INTENSITY_TO_N_PER_M),
            end_intensity=to_si(dl["end_intensity"], units["intensity"], INTENSITY_TO_N_PER_M),
        ))

    r_a, r_b = beam.solve_reactions()
    beam.solve()

    # section dimensions use their OWN independent unit choice
    # (section_length), not the beam-length one
    section_params_si = {k: to_si(v, units["section_length"], LENGTH_TO_M) for k, v in payload["section_params"].items()}
    section = build_section(payload["section_type"], section_params_si)

    E_pa = payload["E"] * 1e9  # E is always GPa, no unit choice
    beam.solve_deflection(E_pa, section["I"])

    n = n_points
    x_values = [length_si * i / (n - 1) for i in range(n)]
    v_values = [beam.shear_at(xv) for xv in x_values]
    m_values = [beam.moment_at(xv) for xv in x_values]
    sigma_values = [bending_stress(m, section) for m in m_values]
    deflection_values = [beam.deflection_at(xv) for xv in x_values]
    vm_values = [max_von_mises_stress(m, v, section["I"], section)["von_mises"]
                 for m, v in zip(m_values, v_values)]

    key_points = beam.key_points_report()
    max_moment_row = beam.max_moment_point()
    max_shear_row = beam.max_shear_point()
    shear_stress_result = max_shear_stress(max_shear_row["V"], section["I"], section)

    # the full shear stress profile (stress vs height) at the governing
    # (max |V|) section -- this stays in SI (see module docstring)
    profile_y = [section["y_min"] + (section["y_max"] - section["y_min"]) * i / 199 for i in range(200)]
    profile_tau = shear_stress_profile(max_shear_row["V"], section["I"], section, profile_y)

    vm_idx = max(range(len(vm_values)), key=lambda i: vm_values[i])
    defl_idx = max(range(len(deflection_values)), key=lambda i: abs(deflection_values[i]))

    # section dict has 'q_func'/'b_func' callables -- not JSON-safe, and
    # not needed by the frontend (the backend already used them to
    # produce the curves above), so strip them before returning. Stays
    # in SI -- see module docstring.
    section_public = {k: float(v) for k, v in section.items() if k not in ("q_func", "b_func")}

    # ---- convert the headline numeric outputs back to the requested units ----
    def L(v):   # length
        return from_si(v, units["length"], LENGTH_TO_M)

    def F(v):   # force
        return from_si(v, units["force"], FORCE_TO_N)

    def Mo(v):  # moment
        return from_si(v, units["moment"], MOMENT_TO_NM)

    def D(v):   # deflection
        return from_si(v, units["deflection"], DEFLECTION_TO_M)

    return {
        "reactions": {"a": float(F(r_a)), "b": float(F(r_b))},
        "curves": {
            "x": [float(L(v)) for v in x_values],
            "V": [float(F(v)) for v in v_values],
            "M": [float(Mo(v)) for v in m_values],
            "sigma": [float(v) for v in sigma_values],       # stress: always Pa internally, frontend fixes to MPa
            "deflection": [float(D(v)) for v in deflection_values],
            "von_mises": [float(v) for v in vm_values],       # stress: same as sigma
        },
        "key_points": [
            {
                "x": float(L(row["x"])),
                "V_left": float(F(row["V_left"])),
                "V_right": float(F(row["V_right"])),
                "M": float(Mo(row["M"])),
                "labels": row["labels"],
            }
            for row in key_points
        ],
        "governing": {
            "max_moment": {"x": float(L(max_moment_row["x"])), "value": float(Mo(max_moment_row["M"]))},
            "max_shear": {"x": float(L(max_shear_row["x"])), "value": float(F(max_shear_row["V"]))},
            "max_shear_stress": {
                "value": float(shear_stress_result["tau"]),   # stress: Pa, unconverted
                "y": float(shear_stress_result["y"]),          # SI -- section-internal, see docstring
            },
            "max_von_mises": {"x": float(L(x_values[vm_idx])), "value": float(vm_values[vm_idx])},
            "max_deflection": {"x": float(L(x_values[defl_idx])), "value": float(D(deflection_values[defl_idx]))},
        },
        "shear_profile": {
            "y": [float(v) for v in profile_y],    # SI -- section-internal, see docstring
            "tau": [float(v) for v in profile_tau],  # stress: Pa, unconverted
            "x_governing": float(L(max_shear_row["x"])),
        },
        "section": section_public,   # SI -- section-internal, see docstring
        "units": units,               # echoed back so the frontend knows what it's displaying
    }