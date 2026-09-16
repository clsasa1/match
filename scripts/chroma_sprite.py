#!/usr/bin/env python3
"""Hue-tolerant magenta chroma key for JPEG VN sprites."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def chroma_key(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mag = np.minimum(r, b) - g
    # Magenta: high R+B, low G. JPEG fringes are noisy, so be generous.
    score = mag - 0.35 * g
    alpha = np.clip((80.0 - score) / 55.0, 0.0, 1.0)
    # Kill obvious magenta cores hard
    hard = (g < 90) & (r > 150) & (b > 150) & (mag > 70)
    alpha = np.where(hard, 0.0, alpha)
    # Despill remaining fringe toward skin/cloth
    spill = np.clip(mag / 180.0, 0.0, 1.0) * (alpha > 0.05)
    r2 = r - spill * np.maximum(r - g, 0) * 0.55
    b2 = b - spill * np.maximum(b - g, 0) * 0.55
    g2 = g + spill * 8.0
    out = np.stack(
        [
            np.clip(r2, 0, 255),
            np.clip(g2, 0, 255),
            np.clip(b2, 0, 255),
            np.clip(alpha * 255.0, 0, 255),
        ],
        axis=-1,
    ).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(dst, "PNG", optimize=True)


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: chroma_sprite.py input.jpg output.png")
        sys.exit(1)
    chroma_key(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
