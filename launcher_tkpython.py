"""Finding a Python interpreter that can actually open a Tk window.

`launcher.py` cannot `import tkinter` until this has run: on an interpreter
built without Tcl/Tk the import raises, and the whole point of the search is to
re-exec into one that has it. Keeping the search here leaves `launcher.py` as
the UI, and gives the interpreter hunt its own file to grow in.
"""

import os
import shutil
import subprocess
import sys


def python_has_tkinter(python: str) -> bool:
    try:
        result = subprocess.run(
            [python, "-c", "import _tkinter"],
            capture_output=True,
            timeout=10,
            check=False,
        )
        return result.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def brew_python_executable(major: int, minor: int) -> str | None:
    if sys.platform != "darwin" or not shutil.which("brew"):
        return None

    try:
        result = subprocess.run(
            ["brew", "--prefix", f"python@{major}.{minor}"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None

    python = os.path.join(result.stdout.strip(), "bin", "python3")
    if os.path.isfile(python):
        return python

    return None


def same_python(left: str, right: str) -> bool:
    try:
        return os.path.realpath(left) == os.path.realpath(right)
    except OSError:
        return False


def is_brew_python(python: str) -> bool:
    major, minor = sys.version_info[:2]
    brew_python = brew_python_executable(major, minor)
    return bool(brew_python and same_python(python, brew_python))


def preferred_brew_python_version() -> tuple[int, int]:
    if sys.platform == "darwin" and shutil.which("brew"):
        for major_minor in ("3.14", "3.13", "3.12", "3.11", "3.10"):
            major_s, minor_s = major_minor.split(".", 1)
            major, minor = int(major_s), int(minor_s)
            if brew_python_executable(major, minor):
                return major, minor

    return sys.version_info[:2]


def _brew_python_tk_install_message(major: int, minor: int, python: str) -> str:
    brew_python = f"python@{major}.{minor}"
    brew_tk = f"python-tk@{major}.{minor}"
    return (
        "launcher.py: Homebrew Python is installed but Tcl/Tk support is missing.\n\n"
        f"Python: {python} ({major}.{minor})\n\n"
        "Homebrew's python@3.x does not include Tk until you install python-tk:\n\n"
        f"  brew install {brew_python} {brew_tk}\n\n"
        "Then run from the repo root:\n"
        "  ./launch\n"
        f'  # or: LAUNCHER_PYTHON="$(brew --prefix {brew_python})/bin/python3" python3 launcher.py\n'
    )


def _exit_if_brew_python_missing_tk(python: str) -> None:
    if not is_brew_python(python) or python_has_tkinter(python):
        return

    major, minor = sys.version_info[:2]
    print(_brew_python_tk_install_message(major, minor, python), file=sys.stderr)
    sys.exit(1)


def _brew_python_with_tk() -> str | None:
    major, minor = sys.version_info[:2]
    python = brew_python_executable(major, minor)
    if python and python_has_tkinter(python):
        return python
    return None


def _tkinter_python_candidates() -> list[str]:
    seen: set[str] = set()
    candidates: list[str] = []

    def add(path: str | None) -> None:
        if not path:
            return
        resolved = os.path.realpath(path)
        if (
            resolved in seen
            or not os.path.isfile(resolved)
            or not os.access(resolved, os.X_OK)
        ):
            return
        seen.add(resolved)
        candidates.append(path)

    add(os.environ.get("LAUNCHER_PYTHON"))
    add(_brew_python_with_tk())
    if not is_brew_python(sys.executable):
        add("/usr/bin/python3")
    for name in ("python3", "python"):
        candidate = shutil.which(name)
        if candidate and not (
            is_brew_python(candidate) and not python_has_tkinter(candidate)
        ):
            add(candidate)

    return candidates


def ensure_tkinter_python() -> None:
    """Re-exec into an interpreter with Tk, or exit explaining how to get one."""
    launcher_python = os.environ.get("LAUNCHER_PYTHON")
    if launcher_python and python_has_tkinter(launcher_python):
        if not same_python(launcher_python, sys.executable):
            os.execv(launcher_python, [launcher_python, *sys.argv])
        return

    _exit_if_brew_python_missing_tk(sys.executable)

    if python_has_tkinter(sys.executable):
        return

    for python in _tkinter_python_candidates():
        if python_has_tkinter(python):
            os.execv(python, [python, *sys.argv])

    major, minor = sys.version_info[:2]
    brew_python = f"python@{major}.{minor}"
    brew_tk = f"python-tk@{major}.{minor}"

    print(
        f"launcher.py: Tkinter is not available in {sys.executable} "
        f"(Python {major}.{minor}).\n\n"
        "This launcher needs a Python build linked against Tcl/Tk.\n\n"
        f"  brew install {brew_python} {brew_tk}\n\n"
        "Then run:\n"
        "  ./launch\n",
        file=sys.stderr,
    )
    sys.exit(1)
