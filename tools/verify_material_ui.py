"""Compatibility entry point: repair workflow supersedes direct-close material tests.
The historical phase-10 script is kept with its report artifacts.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_repair_ui.py')),run_name='__main__')
