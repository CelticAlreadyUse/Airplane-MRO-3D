"""Compatibility entry point: the six-step guide replaces the phase-4 four-step tour.
Historical assertions are archived with the phase-13 report artifacts.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_dashboard_ui.py')),run_name='__main__')
