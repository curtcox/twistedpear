#!/usr/bin/env python3

import os
import sys
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from dataclasses import dataclass
from typing import Optional


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


class LauncherApp(tk.Tk):
    def __init__(self, entries: list[Entry]):
        super().__init__()
        self.entries = entries
        self.images: list[tk.PhotoImage] = []

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
            img = self._load_image(entry.image)
            if img:
                image_label = ttk.Label(card, image=img)
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

    def _load_image(self, path: str) -> Optional[tk.PhotoImage]:
        if not os.path.exists(path):
            print(f"Warning: image not found: {path}", file=sys.stderr)
            return None

        try:
            img = tk.PhotoImage(file=path)
            self.images.append(img)  # keep reference alive
            return img
        except tk.TclError as exc:
            print(f"Warning: could not load image {path!r}: {exc}", file=sys.stderr)
            return None

    def _run_entry(self, entry: Entry) -> None:
        try:
            process = subprocess.Popen(entry.command, shell=True)
        except Exception as exc:
            messagebox.showerror("Launch failed", f"Could not run:\n\n{entry.command}\n\n{exc}")
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
                    "Command exited nonzero",
                    f"{entry.name} exited with status {return_code}.\n\n{entry.command}",
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