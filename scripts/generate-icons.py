#!/usr/bin/env python3
"""Generate Death Clock home-screen icons."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

BG = (15, 20, 25)
ACCENT = (61, 156, 245)
WARNING = (245, 158, 11)
SURFACE = (36, 48, 68)


def draw_hourglass(draw: ImageDraw.ImageDraw, center: tuple[int, int], size: int) -> None:
    cx, cy = center
    w = size
    h = int(size * 1.35)
    left = cx - w // 2
    right = cx + w // 2
    top = cy - h // 2
    bottom = cy + h // 2
    mid = cy

    frame_w = max(3, size // 14)
    draw.rounded_rectangle(
        (left, top, right, bottom),
        radius=max(6, size // 10),
        outline=ACCENT,
        width=frame_w,
    )

    sand_top = [
        (left + frame_w * 2, top + frame_w * 2),
        (right - frame_w * 2, top + frame_w * 2),
        (cx, mid - size * 0.08),
    ]
    sand_bottom = [
        (cx, mid + size * 0.08),
        (left + frame_w * 3, bottom - frame_w * 2),
        (right - frame_w * 3, bottom - frame_w * 2),
    ]
    draw.polygon(sand_top, fill=WARNING)
    draw.polygon(sand_bottom, fill=WARNING)

    neck = max(3, size // 18)
    draw.rectangle(
        (cx - neck, mid - neck, cx + neck, mid + neck),
        fill=SURFACE,
    )
    draw.ellipse(
        (cx - neck * 1.4, mid - neck * 1.4, cx + neck * 1.4, mid + neck * 1.4),
        fill=WARNING,
    )


def build_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (size * 0.18, size * 0.18, size * 0.82, size * 0.82),
        fill=(245, 158, 11, 24),
    )
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(radius=size // 40)))

    draw = ImageDraw.Draw(canvas)
    draw_hourglass(draw, (size // 2, size // 2), int(size * 0.34))
    return canvas.convert("RGB")


def save_icons() -> None:
    icon_512 = build_icon(512)
    icon_512.save(ROOT / "icon-512.png", "PNG")
    icon_180 = icon_512.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(ROOT / "apple-touch-icon.png", "PNG")
    print(f"Wrote {ROOT / 'icon-512.png'}")
    print(f"Wrote {ROOT / 'apple-touch-icon.png'}")


if __name__ == "__main__":
    save_icons()