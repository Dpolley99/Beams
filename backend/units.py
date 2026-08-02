"""
units.py

Pure unit-conversion helpers -- no beam/stress logic here at all, so
this can be tested completely in isolation. Everything converts TO
the solver's internal SI convention (meters, Newtons, Pascals) on the
way in, and FROM SI to the user's chosen display units on the way out.

Scope (metric only, per current decision):
  length            -- m, mm             (beam geometry: length, support/load positions)
  section_length    -- m, mm             (cross-section dimensions -- independent choice from beam length)
  force             -- N, kN             (point loads, reactions, shear force)
  intensity         -- N/m, kN/m, N/mm, kN/mm   (distributed load start/end intensity)
  modulus           -- Pa, MPa, GPa      (Young's modulus, E)
  moment            -- N.m, kN.m, N.mm, kN.mm   (bending moment, for display)
  deflection         -- m, mm            (deflection, for display)

Stress (bending/shear/von Mises) is NOT in this module -- it's always
displayed in MPa with no user choice, same fixed convention the
frontend already applies (divide Pa by 1e6), so there's nothing to
convert there.
"""

LENGTH_TO_M = {"m": 1.0, "mm": 0.001}
FORCE_TO_N = {"N": 1.0, "kN": 1000.0}
MODULUS_TO_PA = {"Pa": 1.0, "MPa": 1e6, "GPa": 1e9}
INTENSITY_TO_N_PER_M = {"N/m": 1.0, "kN/m": 1000.0, "N/mm": 1000.0, "kN/mm": 1e6}
MOMENT_TO_NM = {"N.m": 1.0, "kN.m": 1000.0, "N.mm": 0.001, "kN.mm": 1.0}
DEFLECTION_TO_M = {"m": 1.0, "mm": 0.001}


def to_si(value, unit, table):
    """value (in `unit`) -> SI base unit, using the given conversion table."""
    if unit not in table:
        raise ValueError(f"Unknown unit '{unit}', expected one of {list(table)}")
    return value * table[unit]


def from_si(value_si, unit, table):
    """SI base unit -> value in `unit`, using the given conversion table."""
    if unit not in table:
        raise ValueError(f"Unknown unit '{unit}', expected one of {list(table)}")
    return value_si / table[unit]