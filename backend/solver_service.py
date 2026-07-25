"""
solver_service.py

The actual "solve this beam" logic, with ZERO web-framework
dependency -- takes a plain dict in, returns a plain (JSON-safe) dict
out. api.py is just a thin FastAPI wrapper around solve_beam() below;
keeping this separate means the logic can be tested and reused
without needing a running web server (or even FastAPI installed).
"""

from beam import Beam
from loads import PointLoad, UDL
from cross_sections import rectangle, hollow_rectangle, circle, hollow_circle, channel, i_section, t_section
from stress import bending_stress, max_shear_stress, max_von_mises_stress

SECTION_BUILDERS = {
    "rectangle": lambda p: rectangle(p["b"], p["h"]),
    "hollow_rectangle": lambda p: hollow_rectangle(p["b_out"], p["h_out"], p["b_in"], p["h_in"]),
    "circle": lambda p: circle(p["d"]),
    "hollow_circle": lambda p: hollow_circle(p["d_out"], p["d_in"]),
    "channel": lambda p: channel(p["H"], p["B"], p["tw"], p["tf"]),
    "i_section": lambda p: i_section(p["H"], p["B"], p["tw"], p["tf"]),
    "t_section": lambda p: t_section(p["H"], p["B"], p["tw"], p["tf"]),
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
      "udls": [{"intensity": float, "start": float, "end": float}, ...],
      "section_type": str, "section_params": {...},
      "E": float
    }
    Returns a plain dict, safe to json.dumps() directly -- every
    number is explicitly cast to a native Python float, since numpy
    scalars (which sneak in via stress.py's np.linspace-based scans)
    are NOT JSON-serializable by default.
    """
    beam = Beam(length=payload["length"], support_a=payload["support_a"], support_b=payload["support_b"])
    for pl in payload.get("point_loads", []):
        beam.add_load(PointLoad(magnitude=pl["magnitude"], position=pl["position"]))
    for udl in payload.get("udls", []):
        beam.add_load(UDL(intensity=udl["intensity"], start=udl["start"], end=udl["end"]))

    r_a, r_b = beam.solve_reactions()
    beam.solve()

    section = build_section(payload["section_type"], payload["section_params"])
    E = payload["E"]
    beam.solve_deflection(E, section["I"])

    n = n_points
    length = payload["length"]
    x_values = [length * i / (n - 1) for i in range(n)]
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

    vm_idx = max(range(len(vm_values)), key=lambda i: vm_values[i])
    defl_idx = max(range(len(deflection_values)), key=lambda i: abs(deflection_values[i]))

    # section dict has 'q_func'/'b_func' callables -- not JSON-safe, and
    # not needed by the frontend (the backend already used them to
    # produce the curves above), so strip them before returning.
    section_public = {k: float(v) for k, v in section.items() if k not in ("q_func", "b_func")}

    return {
        "reactions": {"a": float(r_a), "b": float(r_b)},
        "curves": {
            "x": [float(v) for v in x_values],
            "V": [float(v) for v in v_values],
            "M": [float(v) for v in m_values],
            "sigma": [float(v) for v in sigma_values],
            "deflection": [float(v) for v in deflection_values],
            "von_mises": [float(v) for v in vm_values],
        },
        "key_points": [
            {
                "x": float(row["x"]),
                "V_left": float(row["V_left"]),
                "V_right": float(row["V_right"]),
                "M": float(row["M"]),
                "labels": row["labels"],
            }
            for row in key_points
        ],
        "governing": {
            "max_moment": {"x": float(max_moment_row["x"]), "value": float(max_moment_row["M"])},
            "max_shear": {"x": float(max_shear_row["x"]), "value": float(max_shear_row["V"])},
            "max_shear_stress": {
                "value": float(shear_stress_result["tau"]),
                "y": float(shear_stress_result["y"]),
            },
            "max_von_mises": {"x": float(x_values[vm_idx]), "value": float(vm_values[vm_idx])},
            "max_deflection": {"x": float(x_values[defl_idx]), "value": float(deflection_values[defl_idx])},
        },
        "section": section_public,
    }
