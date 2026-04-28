#!/usr/bin/env python3
"""Scan all project files and count total lines."""

import os
from pathlib import Path

# Directories to skip
SKIP_DIRS = {'.git', 'node_modules', 'venv', '__pycache__', '.idea', '.vscode', 'dist', 'build', '.vs', '.pytest_cache'}
# Binary extensions to skip
SKIP_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.pdf', '.docx', '.xlsx', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.wav'}
SKIP_FILES = {
    'front/src/package-lock.json',
    'debug.txt',
    'package-lock.json',
}

def count_lines(root: Path):
    total = 0
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Filter out skip dirs
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            fp = Path(dirpath) / fn
            if fp.suffix.lower() in SKIP_EXTS:
                continue
            rel_str = str(fp.relative_to(root)).replace('\\', '/')
            if rel_str in SKIP_FILES:
                continue
            try:
                lines = fp.read_text(encoding='utf-8', errors='ignore').splitlines()
                count = len(lines)
                rel = fp.relative_to(root)
                total += count
                results.append((rel, count))
            except Exception:
                pass
    return total, sorted(results, key=lambda x: x[0])

if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    total, results = count_lines(root)

    # Top 20 files by line count
    top = sorted(results, key=lambda x: x[1], reverse=True)[:20]

    print(f'=== Total lines: {total} ===\n')
    print('--- Top 20 files (by lines) ---')
    for rel, count in top:
        print(f'{str(rel):>50}  {count:>6}')
    print(f'\nTotal: {total} lines')
