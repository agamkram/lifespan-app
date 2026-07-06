#!/usr/bin/env python3
"""Generate Lifespan home-screen icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

BG = (15, 20, 25)
ACCENT = (61, 156, 245)
MUTED = (36, 48, 68)
TEXT = (232, 237, 244)


def survival_curve_points(size: int) -> list[tuple[float, float]]:
    margin = size * 0.18
    width = size - margin * 2
    height = size * 0.42
    base_y = size * 0.62
    steps = [
        (0.0, 1.0),
        (0.22, 0.96),
        (0.42, 0.9),
        (0.58, 0.78),
        (0.72, 0.58),
        (0.84, 0.34),
        (1.0, 0.08),
    ]
    return [
        (margin + width * x, base_y - height * y)
        for x, y in steps
    ]


def draw_grid(draw: ImageDraw.ImageDraw, size: int) -> None:
    step = size // 8
    for i in range(1, 8):
        x = i * step
        y = i * step
        draw.line((x, size * 0.18, x, size * 0.82), fill=MUTED + (70,), width=1)
        draw.line((size * 0.18, y, size * 0.82, y), fill=MUTED + (70,), width=1)


def build_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (size * 0.12, size * 0.22, size * 0.88, size * 0.88),
        fill=(61, 156, 245, 28),
    )
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(radius=size // 28)))

    draw = ImageDraw.Draw(canvas)
    draw_grid(draw, size)

    points = survival_curve_points(size)
    line_w = max(3, size // 42)
    draw.line(points, fill=ACCENT, width=line_w, joint="curve")

    for idx, point in enumerate(points[::2]):
        radius = max(2, size // 52) if idx else max(3, size // 38)
        fill = TEXT if idx == 0 else ACCENT
        x, y = point
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius),
            fill=fill,
        )

    end_x, end_y = points[-1]
    ring = max(4, size // 24)
    draw.ellipse(
        (end_x - ring, end_y - ring, end_x + ring, end_y + ring),
        outline=ACCENT,
        width=max(2, size // 64),
    )

    bar_left = size * 0.2
    bar_right = size * 0.8
    bar_y = size * 0.8
    draw.rounded_rectangle(
        (bar_left, bar_y, bar_right, bar_y + size * 0.05),
        radius=size // 64,
        fill=MUTED,
    )
    draw.rounded_rectangle(
        (bar_left, bar_y, bar_left + (bar_right - bar_left) * 0.62, bar_y + size * 0.05),
        radius=size // 64,
        fill=ACCENT,
    )

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