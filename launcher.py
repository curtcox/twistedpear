#!/usr/bin/env python3

import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Optional

# macOS ships a deprecated system Tk that prints this on every launch.
os.environ.setdefault("TK_SILENCE_DEPRECATION", "1")


def _python_has_tkinter(python: str) -> bool:
    try:
        result = subprocess.run(
            [python, "-c", "import _tkinter"],
            capture_output=True,
            timeout=10,
        )
        return result.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def _brew_python_executable(major: int, minor: int) -> Optional[str]:
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


def _same_python(left: str, right: str) -> bool:
    try:
        return os.path.realpath(left) == os.path.realpath(right)
    except OSError:
        return False


def _is_brew_python(python: str) -> bool:
    major, minor = sys.version_info[:2]
    brew_python = _brew_python_executable(major, minor)
    return bool(brew_python and _same_python(python, brew_python))


def _preferred_brew_python_version() -> tuple[int, int]:
    if sys.platform == "darwin" and shutil.which("brew"):
        for major_minor in ("3.14", "3.13", "3.12", "3.11", "3.10"):
            major_s, minor_s = major_minor.split(".", 1)
            major, minor = int(major_s), int(minor_s)
            if _brew_python_executable(major, minor):
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
        f"  # or: LAUNCHER_PYTHON=\"$(brew --prefix {brew_python})/bin/python3\" python3 launcher.py\n"
    )


def _exit_if_brew_python_missing_tk(python: str) -> None:
    if not _is_brew_python(python) or _python_has_tkinter(python):
        return

    major, minor = sys.version_info[:2]
    print(_brew_python_tk_install_message(major, minor, python), file=sys.stderr)
    sys.exit(1)


def _brew_python_with_tk() -> Optional[str]:
    major, minor = sys.version_info[:2]
    python = _brew_python_executable(major, minor)
    if python and _python_has_tkinter(python):
        return python
    return None


def _tkinter_python_candidates() -> list[str]:
    seen: set[str] = set()
    candidates: list[str] = []

    def add(path: Optional[str]) -> None:
        if not path:
            return
        resolved = os.path.realpath(path)
        if resolved in seen or not os.path.isfile(resolved) or not os.access(resolved, os.X_OK):
            return
        seen.add(resolved)
        candidates.append(path)

    add(os.environ.get("LAUNCHER_PYTHON"))
    add(_brew_python_with_tk())
    if not _is_brew_python(sys.executable):
        add("/usr/bin/python3")
    for name in ("python3", "python"):
        candidate = shutil.which(name)
        if candidate and not (
            _is_brew_python(candidate) and not _python_has_tkinter(candidate)
        ):
            add(candidate)

    return candidates


def _ensure_tkinter_python() -> None:
    launcher_python = os.environ.get("LAUNCHER_PYTHON")
    if launcher_python and _python_has_tkinter(launcher_python):
        if not _same_python(launcher_python, sys.executable):
            os.execv(launcher_python, [launcher_python, *sys.argv])
        return

    _exit_if_brew_python_missing_tk(sys.executable)

    if _python_has_tkinter(sys.executable):
        return

    for python in _tkinter_python_candidates():
        if _python_has_tkinter(python):
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


_ensure_tkinter_python()

import threading
import tkinter as tk
from tkinter import messagebox, ttk


USAGE = """\
Usage:
  python3 launcher.py [launcher.txt]
  python3 launcher.py < launcher.txt
  ./launch

If launcher.txt exists in the current directory it is used by default.

Input format:
  # Comment lines are ignored.
  # Entries are separated by one or more blank lines.
  # Each entry is 1 to 4 lines.
  # Lines must start with one of:
  #   name:
  #   command:
  #   image:
  #   description:
  # Only command: is required.

Example:
  name: Demo
  command: ./bin/demo
  image: assets/demo.png
  description: Run the demo application.

  name: Importer
  command: python3 tools/importer.py
  description: Import data into the local database.
"""


@dataclass
class Entry:
    command: str
    name: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None


class ParseError(Exception):
    pass


def read_launcher_input() -> str:
    if len(sys.argv) > 1:
        path = sys.argv[1]
        if not os.path.exists(path):
            print(f"launcher.py: file not found: {path}", file=sys.stderr)
            sys.exit(2)

        with open(path, encoding="utf-8") as handle:
            data = handle.read()
    elif not sys.stdin.isatty():
        data = sys.stdin.read()
    elif os.path.exists("launcher.txt"):
        with open("launcher.txt", encoding="utf-8") as handle:
            data = handle.read()
    else:
        print(USAGE, file=sys.stderr)
        sys.exit(2)

    if not data.strip():
        print(USAGE, file=sys.stderr)
        sys.exit(2)

    return data


def parse_entries(text: str) -> list[Entry]:
    allowed_keys = {"name", "command", "image", "description"}

    entries_raw: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] = []

    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()

        if line.startswith("#"):
            continue

        if not line:
            if current:
                entries_raw.append(current)
                current = []
            continue

        current.append((line_no, line))

    if current:
        entries_raw.append(current)

    entries: list[Entry] = []

    for entry_index, raw_entry in enumerate(entries_raw, start=1):
        if len(raw_entry) > 4:
            line_no = raw_entry[4][0]
            raise ParseError(
                f"Entry {entry_index} has more than 4 lines; extra line starts at line {line_no}."
            )

        fields: dict[str, str] = {}

        for line_no, line in raw_entry:
            if ":" not in line:
                raise ParseError(f"Line {line_no}: expected key:value syntax.")

            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            if key not in allowed_keys:
                raise ParseError(
                    f"Line {line_no}: invalid key {key!r}; expected one of "
                    f"{', '.join(sorted(allowed_keys))}."
                )

            if key in fields:
                raise ParseError(f"Line {line_no}: duplicate key {key!r} in same entry.")

            fields[key] = value

        if "command" not in fields or not fields["command"]:
            first_line = raw_entry[0][0] if raw_entry else "unknown"
            raise ParseError(f"Entry starting at line {first_line}: command: is required.")

        entries.append(
            Entry(
                name=fields.get("name") or fields["command"],
                command=fields["command"],
                image=fields.get("image"),
                description=fields.get("description") or "",
            )
        )

    if not entries:
        raise ParseError("No entries found.")

    return entries


def _resolve_image_path(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.join(os.getcwd(), path)


def _collect_image_paths(entries: list[Entry]) -> list[str]:
    seen: set[str] = set()
    paths: list[str] = []

    for entry in entries:
        if not entry.image or entry.image in seen:
            continue
        seen.add(entry.image)
        paths.append(entry.image)

    return paths


def _has_pillow() -> bool:
    try:
        import PIL.Image  # noqa: F401
        import PIL.ImageTk  # noqa: F401
    except ImportError:
        return False
    return True


def _has_sips() -> bool:
    return sys.platform == "darwin" and shutil.which("sips") is not None


def _tk_supports_png(master: tk.Misc, path: str) -> bool:
    try:
        img = tk.PhotoImage(master=master, file=path)
    except tk.TclError:
        return False

    master.tk.call("image", "delete", str(img))
    return True


def _is_macos_system_python(python: str) -> bool:
    return sys.platform == "darwin" and _same_python(python, "/usr/bin/python3")


def _available_image_backends(master: tk.Misc, sample_png: Optional[str]) -> list[str]:
    backends: list[str] = []

    if sample_png and os.path.isfile(sample_png) and _tk_supports_png(master, sample_png):
        backends.append("tk-png")
    if _has_pillow():
        backends.append("pillow")

    return backends


def _image_dependency_instructions() -> str:
    python = sys.executable
    runtime_major, runtime_minor = sys.version_info[:2]
    if _is_brew_python(python):
        major, minor = runtime_major, runtime_minor
    else:
        major, minor = _preferred_brew_python_version()
    brew_python = f"python@{major}.{minor}"
    brew_tk = f"python-tk@{major}.{minor}"

    lines = [
        "launcher.py: Preview images need a Python/Tk build that can load PNG files.",
        "",
        f"Python: {python} ({runtime_major}.{runtime_minor})",
        "",
    ]

    if _is_brew_python(python) and not _python_has_tkinter(python):
        lines.extend(
            [
                "Homebrew Python is installed but python-tk is missing:",
                f"  brew install {brew_python} {brew_tk}",
                "",
            ]
        )
    elif _is_macos_system_python(python):
        lines.extend(
            [
                "macOS /usr/bin/python3 uses an older Tk that cannot load PNG previews.",
                "Install Homebrew Python with Tk support:",
                f"  brew install {brew_python} {brew_tk}",
                f"  LAUNCHER_PYTHON=\"$(brew --prefix {brew_python})/bin/python3\" ./launch",
                "",
                "Or install Pillow for the current interpreter:",
                f"  {python} -m pip install --user pillow",
                "",
            ]
        )
    else:
        lines.extend(
            [
                "Install Homebrew Python with Tk support:",
                f"  brew install {brew_python} {brew_tk}",
                f"  LAUNCHER_PYTHON=\"$(brew --prefix {brew_python})/bin/python3\" ./launch",
                "",
                f"Or install Pillow for the current interpreter:",
                f"  {python} -m pip install --user pillow",
                "",
            ]
        )

    lines.extend(
        [
            "Run the launcher from the repo root:",
            "  ./launch",
        ]
    )
    return "\n".join(lines)


class PreviewImageLoader:
    _PREVIEW_MAX_WIDTH = 320
    _PREVIEW_MAX_HEIGHT = 200

    def __init__(self, master: tk.Misc):
        self.master = master
        self.photos: list[tk.PhotoImage] = []
        self._pil_images: list[object] = []
        self._temp_paths: list[str] = []
        self._cache: dict[str, tk.PhotoImage] = {}

    def cleanup(self) -> None:
        for tmp_path in self._temp_paths:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        self._temp_paths.clear()

    def _fit_preview(self, img: tk.PhotoImage) -> tk.PhotoImage:
        width = img.width()
        height = img.height()
        factor = max(
            (width + self._PREVIEW_MAX_WIDTH - 1) // self._PREVIEW_MAX_WIDTH,
            (height + self._PREVIEW_MAX_HEIGHT - 1) // self._PREVIEW_MAX_HEIGHT,
            1,
        )
        if factor <= 1:
            return img
        return img.subsample(factor, factor)

    def _convert_image_for_tk(self, path: str) -> Optional[str]:
        if not _has_sips():
            return None

        handle, tmp_path = tempfile.mkstemp(suffix=".gif", prefix="launcher-img-")
        os.close(handle)
        try:
            subprocess.run(
                ["sips", "-s", "format", "gif", path, "--out", tmp_path],
                check=True,
                capture_output=True,
                text=True,
            )
        except (OSError, subprocess.CalledProcessError):
            os.unlink(tmp_path)
            return None

        self._temp_paths.append(tmp_path)
        return tmp_path

    def _photo_from_file(self, path: str) -> tk.PhotoImage:
        try:
            return tk.PhotoImage(master=self.master, file=path)
        except tk.TclError:
            pass

        if _has_pillow():
            from PIL import Image, ImageTk  # type: ignore[import-untyped]

            pil_image = Image.open(path)
            self._pil_images.append(pil_image)
            return ImageTk.PhotoImage(pil_image, master=self.master)

        converted = self._convert_image_for_tk(path)
        if converted:
            return tk.PhotoImage(master=self.master, file=converted)

        raise tk.TclError(f"no Tk-compatible loader for {path!r}")

    def load(self, path: str) -> tk.PhotoImage:
        if path in self._cache:
            return self._cache[path]

        resolved = _resolve_image_path(path)
        if not os.path.isfile(resolved):
            raise FileNotFoundError(resolved)

        img = self._fit_preview(self._photo_from_file(resolved))
        self.photos.append(img)
        self._cache[path] = img
        return img


def _ensure_image_support(entries: list[Entry], master: tk.Misc) -> PreviewImageLoader:
    image_paths = _collect_image_paths(entries)
    if not image_paths:
        return PreviewImageLoader(master)

    missing = [
        path
        for path in image_paths
        if not os.path.isfile(_resolve_image_path(path))
    ]
    if missing:
        print(
            "launcher.py: Preview image file(s) not found "
            f"(paths are relative to {os.getcwd()!r}):\n"
            + "\n".join(f"  - {path}" for path in missing),
            file=sys.stderr,
        )
        sys.exit(1)

    sample_png = _resolve_image_path(image_paths[0])
    backends = _available_image_backends(master, sample_png)
    if not backends:
        print(_image_dependency_instructions(), file=sys.stderr)
        sys.exit(1)

    loader = PreviewImageLoader(master)
    try:
        for path in image_paths:
            loader.load(path)
    except (OSError, tk.TclError) as exc:
        print(
            f"launcher.py: Could not load preview image {path!r}: {exc}\n\n"
            f"{_image_dependency_instructions()}",
            file=sys.stderr,
        )
        loader.cleanup()
        sys.exit(1)

    return loader


class LauncherApp(tk.Tk):
    def __init__(self, entries: list[Entry]):
        super().__init__()
        self.entries = entries
        self.image_loader = _ensure_image_support(entries, self)

        self.title("Launcher")
        self.geometry("760x520")
        self.minsize(520, 320)

        self._build_ui()

    def _build_ui(self) -> None:
        outer = ttk.Frame(self, padding=12)
        outer.pack(fill=tk.BOTH, expand=True)

        title = ttk.Label(outer, text="Launcher", font=("", 18, "bold"))
        title.pack(anchor=tk.W, pady=(0, 10))

        canvas = tk.Canvas(outer, highlightthickness=0)
        scrollbar = ttk.Scrollbar(outer, orient=tk.VERTICAL, command=canvas.yview)
        content = ttk.Frame(canvas)

        content.bind(
            "<Configure>",
            lambda _event: canvas.configure(scrollregion=canvas.bbox("all")),
        )

        window_id = canvas.create_window((0, 0), window=content, anchor="nw")

        def resize_content(event: tk.Event) -> None:
            canvas.itemconfigure(window_id, width=event.width)

        canvas.bind("<Configure>", resize_content)
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        for i, entry in enumerate(self.entries):
            self._add_card(content, entry, i)

    def _add_card(self, parent: ttk.Frame, entry: Entry, index: int) -> None:
        card = ttk.Frame(parent, padding=10, relief=tk.RIDGE)
        card.pack(fill=tk.X, expand=True, pady=(0, 10))

        if entry.image:
            img = self.image_loader.load(entry.image)
            image_label = tk.Label(card, image=img, borderwidth=0)
            image_label.image = img
            image_label.grid(row=0, column=0, rowspan=3, padx=(0, 12), sticky=tk.NW)

        text_col = 1
        card.columnconfigure(text_col, weight=1)

        name = ttk.Label(card, text=entry.name or f"Tool {index + 1}", font=("", 13, "bold"))
        name.grid(row=0, column=text_col, sticky=tk.W)

        desc = ttk.Label(
            card,
            text=entry.description or "",
            wraplength=480,
            justify=tk.LEFT,
        )
        desc.grid(row=1, column=text_col, sticky=tk.W, pady=(4, 6))

        command = ttk.Label(
            card,
            text=entry.command,
            wraplength=480,
            foreground="#555555",
        )
        command.grid(row=2, column=text_col, sticky=tk.W)

        run_button = ttk.Button(
            card,
            text="Run",
            command=lambda e=entry: self._run_entry(e),
        )
        run_button.grid(row=0, column=2, rowspan=3, padx=(12, 0), sticky=tk.NE)

    def destroy(self) -> None:
        self.image_loader.cleanup()
        super().destroy()

    def _run_entry(self, entry: Entry) -> None:
        try:
            process = subprocess.Popen(entry.command, shell=True)
        except Exception as exc:
            messagebox.showerror(
                "Launch failed",
                f"Could not start {entry.name}.\n\n"
                f"Command:\n{entry.command}\n\n"
                f"Error:\n{exc}\n\n"
                "Check that npm/node are on PATH and run this launcher from the repo root.",
            )
            return

        threading.Thread(
            target=self._wait_for_process,
            args=(entry, process),
            daemon=True,
        ).start()

    def _wait_for_process(self, entry: Entry, process: subprocess.Popen) -> None:
        return_code = process.wait()
        if return_code != 0:
            self.after(
                0,
                lambda: messagebox.showwarning(
                    "Command finished with an error",
                    f"{entry.name} exited with status {return_code}.\n\n"
                    f"Command:\n{entry.command}\n\n"
                    "See the terminal where you started the launcher for build or runtime logs.",
                ),
            )


def main() -> int:
    text = read_launcher_input()

    try:
        entries = parse_entries(text)
    except ParseError as exc:
        print(f"launcher.py: {exc}", file=sys.stderr)
        return 1

    app = LauncherApp(entries)
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())