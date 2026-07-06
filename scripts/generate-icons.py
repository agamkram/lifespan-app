#!/usr/bin/env python3
"""Generate Lifespan home-screen icons."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

BG = (15, 20, 25)
ACCENT = (61, 156, 245)
ACCENT_SOFT = (93, 181, 255)
MUTED = (36, 48, 68)
TEXT = (232, 237, 244)


def draw_lifespan_gauge(draw: ImageDraw.ImageDraw, size: int) -> None:
    cx = size * 0.5
    cy = size * 0.54
    radius = size * 0.28
    track_w = max(8, size // 28)

    # Background track: ~300° arc, open at the bottom.
    draw.arc(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        start=220,
        end=500,
        fill=MUTED,
        width=track_w,
    )

    # Filled lifespan arc: current age → projected end.
    draw.arc(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        start=250,
        end=430,
        fill=ACCENT,
        width=track_w,
    )

    # Current-age marker on the arc.
    age_deg = math.radians(250)
    age_x = cx + radius * math.cos(age_deg)
    age_y = cy + radius * math.sin(age_deg)
    age_r = max(4, size // 34)
    draw.ellipse(
        (age_x - age_r, age_y - age_r, age_x + age_r, age_y + age_r),
        fill=TEXT,
    )

    # Projected-end marker on the arc.
    end_deg = math.radians(430)
    end_x = cx + radius * math.cos(end_deg)
    end_y = cy + radius * math.sin(end_deg)
    ring_r = max(6, size // 26)
    draw.ellipse(
        (end_x - ring_r, end_y - ring_r, end_x + ring_r, end_y + ring_r),
        outline=ACCENT_SOFT,
        width=max(2, size // 72),
    )
    inner_r = max(3, size // 42)
    draw.ellipse(
        (end_x - inner_r, end_y - inner_r, end_x + inner_r, end_y + inner_r),
        fill=ACCENT,
    )

    # Horizontal baseline with tick marks (period life table cue).
    left = size * 0.22
    right = size * 0.78
    base_y = size * 0.78
    bar_h = max(4, size // 52)
    draw.rounded_rectangle(
        (left, base_y, right, base_y + bar_h),
        radius=bar_h // 2,
        fill=MUTED,
    )
    fill_w = (right - left) * 0.58
    draw.rounded_rectangle(
        (left, base_y, left + fill_w, base_y + bar_h),
        radius=bar_h // 2,
        fill=ACCENT,
    )
    for tick in (0.0, 0.25, 0.5, 0.75, 1.0):
        tx = left + (right - left) * tick
        draw.line(
            (tx, base_y - size * 0.03, tx, base_y + bar_h + size * 0.018),
            fill=TEXT + (120,),
            width=max(1, size // 180),
        )


def build_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG + (255,))

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (size * 0.18, size * 0.18, size * 0.82, size * 0.82),
        fill=(61, 156, 245, 34),
    )
    canvas = Image.alpha_composite(
        canvas,
        glow.filter(ImageFilter.GaussianBlur(radius=size // 22)),
    )

    draw = ImageDraw.Draw(canvas)
    draw_lifespan_gauge(draw, size)
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