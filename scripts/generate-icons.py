#!/usr/bin/env python3
"""Generate Lifespan home-screen icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

BG = (15, 20, 25)
ACCENT = (61, 156, 245)
ACCENT_SOFT = (93, 181, 255)
SAND = (147, 197, 253)
SAND_DEEP = (61, 156, 245)
FRAME = (232, 237, 244)
SURFACE = (26, 35, 49)


def hourglass_polygon_points(
    cx: float,
    cy: float,
    half_w: float,
    half_h: float,
    inset: float,
) -> tuple[list[tuple[float, float]], list[tuple[float, float]], list[tuple[float, float]]]:
    top = cy - half_h
    bottom = cy + half_h
    mid = cy
    neck = max(2.0, half_w * 0.14)

    top_chamber = [
        (cx - half_w, top),
        (cx + half_w, top),
        (cx + inset, mid - neck),
        (cx - inset, mid - neck),
    ]
    bottom_chamber = [
        (cx - inset, mid + neck),
        (cx + inset, mid + neck),
        (cx + half_w, bottom),
        (cx - half_w, bottom),
    ]
    frame = [
        (cx - half_w, top),
        (cx + half_w, top),
        (cx + half_w, bottom),
        (cx - half_w, bottom),
    ]
    return top_chamber, bottom_chamber, frame


def draw_hourglass(draw: ImageDraw.ImageDraw, size: int) -> None:
    cx = size * 0.5
    cy = size * 0.5
    half_w = size * 0.19
    half_h = size * 0.3
    inset = size * 0.055
    frame_w = max(3, size // 48)

    top_chamber, bottom_chamber, _ = hourglass_polygon_points(
        cx, cy, half_w, half_h, inset
    )

    # Outer frame plates.
    draw.rounded_rectangle(
        (cx - half_w - frame_w, cy - half_h - frame_w * 1.6, cx + half_w + frame_w, cy - half_h + frame_w * 2.2),
        radius=size // 36,
        fill=SURFACE,
        outline=ACCENT,
        width=frame_w,
    )
    draw.rounded_rectangle(
        (cx - half_w - frame_w, cy + half_h - frame_w * 2.2, cx + half_w + frame_w, cy + half_h + frame_w * 1.6),
        radius=size // 36,
        fill=SURFACE,
        outline=ACCENT,
        width=frame_w,
    )

    # Glass chambers.
    draw.polygon(top_chamber, fill=SURFACE + (255,))
    draw.polygon(bottom_chamber, fill=SURFACE + (255,))
    draw.polygon(top_chamber, outline=ACCENT_SOFT, width=max(2, size // 96))
    draw.polygon(bottom_chamber, outline=ACCENT_SOFT, width=max(2, size // 96))

    # Sand: upper chamber mostly full, lower chamber partially filled.
    top_sand = [
        (cx - half_w + inset * 0.55, cy - half_h + inset * 0.7),
        (cx + half_w - inset * 0.55, cy - half_h + inset * 0.7),
        (cx + inset * 0.72, cy - inset * 0.35),
        (cx - inset * 0.72, cy - inset * 0.35),
    ]
    draw.polygon(top_sand, fill=SAND)

    stream_w = max(2, size // 64)
    draw.rectangle(
        (cx - stream_w, cy - inset * 0.2, cx + stream_w, cy + inset * 0.55),
        fill=SAND_DEEP,
    )

    bottom_sand = [
        (cx - inset * 0.72, cy + inset * 0.55),
        (cx + inset * 0.72, cy + inset * 0.55),
        (cx + half_w - inset * 0.65, cy + half_h - inset * 0.55),
        (cx - half_w + inset * 0.65, cy + half_h - inset * 0.55),
    ]
    draw.polygon(bottom_sand, fill=SAND_DEEP)

    # Neck ring.
    neck_r = max(4, size // 40)
    draw.ellipse(
        (cx - neck_r, cy - neck_r, cx + neck_r, cy + neck_r),
        fill=ACCENT,
        outline=FRAME,
        width=max(1, size // 128),
    )

    # Side frame rails.
    draw.line(
        (cx - half_w, cy - half_h, cx - half_w, cy + half_h),
        fill=ACCENT,
        width=frame_w,
    )
    draw.line(
        (cx + half_w, cy - half_h, cx + half_w, cy + half_h),
        fill=ACCENT,
        width=frame_w,
    )


def build_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG + (255,))

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (size * 0.2, size * 0.2, size * 0.8, size * 0.8),
        fill=(61, 156, 245, 30),
    )
    canvas = Image.alpha_composite(
        canvas,
        glow.filter(ImageFilter.GaussianBlur(radius=size // 20)),
    )

    draw = ImageDraw.Draw(canvas)
    draw_hourglass(draw, size)
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