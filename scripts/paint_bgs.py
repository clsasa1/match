#!/usr/bin/env python3
"""Painterly VN backgrounds — no photographs."""
from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

OUT = Path("/workspace/public/bg")
W, H = 1600, 900
RNG = np.random.default_rng(42)


def arr(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGB")).astype(np.float32)


def to_im(a: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")


def noise(h: int, w: int, scale: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    sh, sw = max(2, int(h / scale)), max(2, int(w / scale))
    small = rng.random((sh, sw)).astype(np.float32)
    im = Image.fromarray((small * 255).astype(np.uint8), "L").resize((w, h), Image.Resampling.BICUBIC)
    return np.asarray(im).astype(np.float32) / 255.0


def fbm(h: int, w: int, seed: int, octaves: int = 4) -> np.ndarray:
    a = np.zeros((h, w), np.float32)
    amp = 0.5
    s = 1.0
    for i in range(octaves):
        a += amp * noise(h, w, 18 * s, seed + i * 17)
        amp *= 0.5
        s *= 2.1
    a -= a.min()
    a /= a.max() + 1e-6
    return a


def lerp(a, b, t):
    a = np.array(a, np.float32)
    b = np.array(b, np.float32)
    t = np.asarray(t, np.float32)
    if t.ndim == 2:
        t = t[..., None]
    return a + (b - a) * np.clip(t, 0, 1)


def sky(top, bot, extra=None):
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    t = np.broadcast_to(y, (H, W))
    base = lerp(top, bot, t)
    n = fbm(H, W, 3)
    base = base + (n[..., None] - 0.5) * 18
    if extra:
        base = extra(base, x, y, n)
    return base


def grain(a: np.ndarray, amt: float = 10) -> np.ndarray:
    g = RNG.normal(0, amt, a.shape).astype(np.float32)
    return a + g


def vignette(a: np.ndarray, strength: float = 0.55) -> np.ndarray:
    y = np.linspace(-1, 1, H)[:, None]
    x = np.linspace(-1, 1, W)[None, :]
    r = np.sqrt(x * x * 0.7 + y * y)
    v = np.clip(1 - strength * np.clip(r - 0.25, 0, 1) ** 1.4, 0.15, 1)
    return a * v[..., None]


def dabs(draw: ImageDraw.ImageDraw, color, n, box, r0, r1, alpha=40):
    x0, y0, x1, y1 = box
    for _ in range(n):
        x = int(RNG.integers(x0, x1))
        y = int(RNG.integers(y0, y1))
        r = int(RNG.integers(r0, r1))
        c = tuple(int(np.clip(ch + RNG.integers(-18, 19), 0, 255)) for ch in color) + (alpha,)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)


def layer_dabs(base: np.ndarray, color, n, box, r0, r1, alpha=36) -> np.ndarray:
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dabs(ImageDraw.Draw(ov, "RGBA"), color, n, box, r0, r1, alpha)
    out = Image.alpha_composite(to_im(base).convert("RGBA"), ov)
    return arr(out.convert("RGB"))


def ellipse(a, cx, cy, rx, ry, color, alpha=0.5):
    yy, xx = np.ogrid[:H, :W]
    m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    k = np.clip(1 - m, 0, 1) ** 1.6 * alpha
    return a * (1 - k[..., None]) + np.array(color, np.float32) * k[..., None]


def rect(a, x0, y0, x1, y1, color, alpha=1.0):
    yy, xx = np.ogrid[:H, :W]
    m = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    c = np.array(color, np.float32)
    a[m] = a[m] * (1 - alpha) + c * alpha
    return a


def finish(a: np.ndarray, path: str, sat=1.05, contrast=1.08):
    a = vignette(grain(a, 7))
    im = to_im(a)
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = im.filter(ImageFilter.SMOOTH)
    im.save(OUT / path, "JPEG", quality=90)
    print("wrote", path)


def snowy_street():
    a = sky((28, 32, 48), (176, 142, 118))
    a = ellipse(a, 980, 210, 260, 160, (255, 196, 120), 0.45)
    a = ellipse(a, 980, 210, 90, 70, (255, 230, 180), 0.35)
    # buildings
    n = fbm(H, W, 11)
    for i, (x0, x1, h) in enumerate([(0, 280, 420), (240, 520, 360), (500, 780, 480), (1100, 1380, 400), (1340, 1600, 520)]):
        col = np.array([38, 36, 48]) + i * 6
        a = rect(a, x0, h, x1, 820, col, 0.92)
        for wy in range(h + 30, 800, 48):
            for wx in range(x0 + 18, x1 - 20, 36):
                if n[wy % H, wx % W] > 0.45:
                    a = rect(a, wx, wy, wx + 14, wy + 22, (255, 196, 110) if n[min(H-1,wy), min(W-1,wx)] > 0.62 else (22, 24, 36), 0.85)
    # snow ground
    y = np.linspace(0, 1, H)[:, None]
    snow = lerp((186, 168, 158), (232, 224, 218), fbm(H, W, 21))
    m = (y > 0.72)
    k = np.clip((y - 0.72) / 0.2, 0, 1)
    a = a * (1 - (m * k)[..., None]) + snow * (m * k)[..., None]
    # lamps
    for x in (360, 820, 1240):
        a = rect(a, x, 340, x + 8, 760, (40, 36, 32), 1)
        a = ellipse(a, x + 4, 330, 70, 50, (255, 190, 90), 0.4)
    finish(a, "street.jpg", sat=1.12)


def park():
    a = sky((186, 198, 210), (232, 226, 214))
    n = fbm(H, W, 8)
    # snow field
    y = np.linspace(0, 1, H)[:, None]
    ground = lerp((214, 210, 204), (236, 232, 226), n)
    k = np.clip((y - 0.48) * 3, 0, 1)
    a = a * (1 - k[..., None]) + ground * k[..., None]
    # birches
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    for i, x in enumerate(range(80, 1550, 95)):
        lean = int((n[10, x] - 0.5) * 40)
        d.line([(x, 120 + (i % 3) * 30), (x + lean, 820)], fill=(236, 232, 224, 230), width=10 + i % 5)
        d.line([(x + 3, 140), (x + lean + 3, 820)], fill=(48, 44, 42, 80), width=2)
        for _ in range(8):
            yy = int(RNG.integers(180, 620))
            d.line([(x - 2, yy), (x + 18, yy - 40)], fill=(230, 226, 218, 160), width=2)
    # bench
    d.rectangle([620, 640, 980, 655], fill=(72, 58, 46, 220))
    d.rectangle([630, 655, 642, 730], fill=(72, 58, 46, 220))
    d.rectangle([958, 655, 970, 730], fill=(72, 58, 46, 220))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    a = ellipse(a, 400, 160, 220, 80, (255, 255, 250), 0.25)
    finish(a, "park.jpg", sat=0.9, contrast=1.05)


def castle():
    a = sky((168, 176, 186), (210, 198, 186))
    n = fbm(H, W, 14)
    brick = lerp((118, 54, 42), (86, 38, 32), n)
    # mass
    a = rect(a, 180, 80, 1480, 860, (96, 44, 36), 0.15)
    yy, xx = np.ogrid[:H, :W]
    wall = (xx > 220) & (xx < 1420) & (yy > 70) & (yy < 860)
    a[wall] = brick[wall]
    # merlons
    for x in range(240, 1400, 70):
        a = rect(a, x, 70, x + 40, 130, (104, 48, 38), 1)
    # arch
    cy, cx, rx, ry = 860, 800, 210, 340
    m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
    m &= yy > 520
    skycol = lerp((186, 196, 186), (90, 110, 80), np.broadcast_to(np.linspace(0, 1, H, dtype=np.float32)[:, None], (H, W)))
    a[m] = skycol[m]
    # window
    a = rect(a, 760, 210, 840, 340, (210, 214, 208), 1)
    a = rect(a, 768, 218, 832, 332, (40, 48, 58), 1)
    # fir
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    for i, (x, y, s) in enumerate([(160, 820, 1.1), (1480, 860, 0.85)]):
        for k in range(7):
            w = int((90 - k * 8) * s)
            h = int(70 * s)
            yy0 = y - 80 - k * 55
            d.polygon([(x, yy0 - h), (x - w, yy0 + 20), (x + w, yy0 + 20)], fill=(28, 46, 36, 230))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    finish(a, "castle.jpg", sat=1.1)


def car_night(name, dash=(28, 26, 28), glow=(255, 170, 70)):
    a = sky((8, 10, 16), (18, 16, 20))
    # windshield
    a = ellipse(a, 800, 260, 900, 280, (30, 34, 48), 0.9)
    # bokeh city
    for _ in range(40):
        x, y = int(RNG.integers(80, 1520)), int(RNG.integers(80, 420))
        a = ellipse(a, x, y, int(RNG.integers(8, 28)), int(RNG.integers(6, 18)), glow, float(RNG.random() * 0.35 + 0.1))
    # dash
    yy, xx = np.ogrid[:H, :W]
    dashm = yy > 620 + ((xx - 800) ** 2) / 4800
    a[dashm] = np.array(dash, np.float32)
    a = ellipse(a, 800, 780, 500, 80, (12, 12, 14), 0.4)
    # wheel
    a = ellipse(a, 430, 860, 180, 70, (18, 16, 16), 0.9)
    finish(a, name, sat=0.85, contrast=1.15)


def wheat():
    a = sky((120, 168, 214), (242, 214, 140))
    a = ellipse(a, 1240, 180, 90, 90, (255, 230, 140), 0.7)
    n = fbm(H, W, 19, 5)
    y = np.linspace(0, 1, H)[:, None]
    field = lerp((186, 132, 46), (232, 188, 82), n)
    k = np.clip((y - 0.42) * 4, 0, 1)
    a = a * (1 - k[..., None]) + field * k[..., None]
    # stalks hint
    a = layer_dabs(a, (168, 110, 36), 180, (0, 480, 1600, 900), 4, 18, 28)
    finish(a, "wheat.jpg", sat=1.2)


def palace():
    a = sky((186, 206, 224), (236, 228, 210))
    n = fbm(H, W, 7)
    stone = lerp((228, 220, 204), (196, 186, 168), n)
    a = rect(a, 180, 160, 1420, 720, (220, 212, 196), 0.2)
    yy, xx = np.ogrid[:H, :W]
    body = (xx > 220) & (xx < 1380) & (yy > 180) & (yy < 700)
    a[body] = stone[body]
    # columns
    for x in range(300, 1300, 110):
        a = rect(a, x, 260, x + 36, 700, (236, 230, 216), 0.85)
        a = ellipse(a, x + 18, 250, 28, 18, (240, 234, 220), 0.9)
    a = rect(a, 220, 160, 1380, 210, (210, 200, 180), 1)
    # garden
    y = np.linspace(0, 1, H)[:, None]
    lawn = lerp((90, 120, 70), (140, 160, 90), n)
    k = np.clip((y - 0.76) * 6, 0, 1)
    a = a * (1 - k[..., None]) + lawn * k[..., None]
    finish(a, "palace.jpg")


def river():
    a = sky((118, 158, 196), (214, 200, 176))
    n = fbm(H, W, 22)
    y = np.linspace(0, 1, H)[:, None]
    water = lerp((70, 110, 140), (160, 186, 196), n)
    k = np.clip((y - 0.5) * 3, 0, 1)
    a = a * (1 - k[..., None]) + water * k[..., None]
    a = ellipse(a, 900, 520, 700, 40, (230, 230, 236), 0.18)
    # far bank
    a = rect(a, 0, 430, 1600, 510, (86, 92, 78), 0.55)
    finish(a, "river.jpg")


def gate():
    a = sky((176, 184, 196), (214, 206, 196))
    n = fbm(H, W, 5)
    stone = lerp((150, 148, 142), (92, 90, 88), n)
    yy, xx = np.ogrid[:H, :W]
    wall = ((xx < 520) | (xx > 1080)) & (yy > 80)
    a[wall] = stone[wall]
    arch = ((xx - 800) / 280) ** 2 + ((yy - 900) / 620) ** 2 < 1
    arch &= yy > 160
    a[arch] = lerp((186, 196, 186), (60, 70, 64), np.broadcast_to(np.linspace(0, 1, H, dtype=np.float32)[:, None], (H, W)))[arch]
    a = rect(a, 0, 820, 1600, 900, (70, 68, 64), 0.85)
    finish(a, "gate.jpg")


def bison():
    a = sky((186, 176, 150), (120, 128, 96))
    n = fbm(H, W, 31)
    y = np.linspace(0, 1, H)[:, None]
    grass = lerp((110, 108, 70), (70, 78, 48), n)
    k = np.clip((y - 0.45) * 3, 0, 1)
    a = a * (1 - k[..., None]) + grass * k[..., None]
    # trees
    a = layer_dabs(a, (36, 48, 32), 80, (0, 0, 1600, 520), 40, 120, 50)
    # animal silhouette
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    d.ellipse([620, 480, 980, 700], fill=(28, 22, 16, 230))
    d.ellipse([900, 430, 1040, 560], fill=(28, 22, 16, 230))
    d.polygon([(980, 470), (1120, 500), (980, 520)], fill=(28, 22, 16, 230))
    d.rectangle([680, 680, 710, 790], fill=(28, 22, 16, 230))
    d.rectangle([880, 680, 910, 790], fill=(28, 22, 16, 230))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    finish(a, "bison.jpg", sat=0.95)


def red_club():
    a = sky((18, 4, 8), (48, 8, 16))
    a = ellipse(a, 800, 200, 500, 180, (180, 20, 40), 0.45)
    a = ellipse(a, 400, 500, 260, 160, (120, 0, 30), 0.35)
    a = ellipse(a, 1200, 520, 300, 180, (160, 10, 50), 0.4)
    a = layer_dabs(a, (255, 40, 70), 60, (0, 0, 1600, 900), 20, 80, 24)
    finish(a, "red.jpg", sat=1.3, contrast=1.2)


def sunset():
    a = sky((255, 150, 70), (48, 36, 48))
    a = ellipse(a, 1100, 260, 140, 140, (255, 220, 140), 0.75)
    n = fbm(H, W, 9)
    y = np.linspace(0, 1, H)[:, None]
    street = lerp((62, 48, 44), (28, 24, 28), n)
    k = np.clip((y - 0.62) * 4, 0, 1)
    a = a * (1 - k[..., None]) + street * k[..., None]
    a = layer_dabs(a, (24, 20, 22), 30, (0, 200, 1600, 620), 20, 90, 70)
    finish(a, "sunset.jpg", sat=1.25)


def cg_cafe():
    a = sky((48, 32, 24), (92, 64, 48))
    # table
    a = rect(a, 0, 520, 1600, 900, (62, 40, 28), 0.95)
    n = fbm(H, W, 12)
    wood = lerp((90, 58, 36), (48, 30, 20), n)
    yy, xx = np.ogrid[:H, :W]
    a[520:] = wood[520:]
    # cups
    a = ellipse(a, 620, 560, 90, 40, (236, 232, 224), 1)
    a = ellipse(a, 620, 540, 70, 28, (40, 28, 22), 0.9)
    a = ellipse(a, 980, 580, 90, 40, (236, 232, 224), 1)
    a = ellipse(a, 980, 560, 70, 28, (40, 28, 22), 0.9)
    a = ellipse(a, 800, 200, 400, 160, (255, 180, 80), 0.2)
    finish(a, "cg-cafe.jpg", sat=1.15)


def tesla_garage():
    a = sky((18, 18, 20), (36, 34, 32))
    n = fbm(H, W, 16)
    floor = lerp((40, 38, 36), (22, 22, 24), n)
    y = np.linspace(0, 1, H)[:, None]
    k = np.clip((y - 0.55) * 3, 0, 1)
    a = a * (1 - k[..., None]) + floor * k[..., None]
    # yellow poles
    for x in (220, 1380):
        a = rect(a, x, 260, x + 36, 780, (210, 170, 40), 1)
        a = rect(a, x - 6, 250, x + 42, 280, (180, 140, 30), 1)
    # black car
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    d.rounded_rectangle([380, 430, 1220, 720], 46, fill=(10, 10, 12, 240))
    d.polygon([(520, 430), (640, 300), (980, 300), (1100, 430)], fill=(8, 8, 10, 240))
    d.ellipse([460, 640, 620, 800], fill=(16, 16, 18, 255))
    d.ellipse([980, 640, 1140, 800], fill=(16, 16, 18, 255))
    d.ellipse([500, 680, 580, 760], fill=(60, 60, 64, 255))
    d.ellipse([1020, 680, 1100, 760], fill=(60, 60, 64, 255))
    d.rectangle([640, 330, 980, 420], fill=(30, 48, 58, 180))
    d.rectangle([1180, 500, 1220, 560], fill=(200, 220, 255, 200))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    a = ellipse(a, 1200, 530, 80, 30, (180, 210, 255), 0.35)
    finish(a, "tesla.jpg", sat=0.8, contrast=1.12)


def drive_polo():
    car_night("drive.jpg", dash=(24, 22, 26), glow=(255, 150, 60))
    # extra wheel-left for Polo
    p = OUT / "drive.jpg"
    a = arr(Image.open(p))
    a = ellipse(a, 360, 840, 220, 90, (20, 18, 18), 0.7)
    finish(a, "drive.jpg", sat=0.8)


def novoselye():
    a = sky((210, 198, 176), (90, 86, 80))
    n = fbm(H, W, 4)
    tile = lerp((186, 176, 160), (150, 142, 128), n)
    y = np.linspace(0, 1, H)[:, None]
    k = np.clip((y - 0.62) * 4, 0, 1)
    a = a * (1 - k[..., None]) + tile * k[..., None]
    # glass wall
    a = rect(a, 80, 40, 1520, 700, (70, 110, 170), 0.35)
    a = rect(a, 80, 40, 160, 860, (36, 92, 168), 0.95)
    # warm interior
    a = ellipse(a, 800, 360, 500, 260, (255, 210, 140), 0.28)
    # two pairs of shoes silhouettes
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    d.ellipse([520, 700, 640, 760], fill=(40, 36, 32, 220))
    d.ellipse([650, 705, 770, 762], fill=(40, 36, 32, 220))
    d.ellipse([900, 698, 1030, 762], fill=(210, 210, 214, 220))
    d.ellipse([1040, 702, 1160, 764], fill=(210, 210, 214, 220))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    finish(a, "novoselye.jpg")


def kitchen_empty():
    a = sky((232, 214, 186), (196, 176, 150))
    n = fbm(H, W, 6)
    # cabinets
    a = rect(a, 0, 0, 1600, 220, (214, 196, 168), 0.95)
    a = rect(a, 0, 520, 1600, 900, (170, 140, 110), 0.9)
    wood = lerp((176, 132, 92), (140, 104, 72), n)
    yy, xx = np.ogrid[:H, :W]
    a[620:] = wood[620:]
    a = rect(a, 80, 250, 520, 520, (236, 228, 214), 0.7)  # window
    a = ellipse(a, 300, 360, 200, 120, (255, 220, 160), 0.25)
    a = rect(a, 1100, 240, 1540, 520, (80, 86, 78), 0.8)  # fridge
    finish(a, "kitchen.jpg", sat=1.05)


def relatives_table():
    a = sky((48, 36, 28), (90, 64, 46))
    n = fbm(H, W, 13)
    wood = lerp((110, 72, 42), (64, 40, 24), n)
    yy, xx = np.ogrid[:H, :W]
    a[380:] = wood[380:]
    a = ellipse(a, 800, 120, 500, 80, (255, 190, 90), 0.25)
    # plates
    for x, y in [(480, 520), (800, 500), (1120, 530), (640, 640), (960, 650)]:
        a = ellipse(a, x, y, 90, 36, (236, 228, 214), 0.95)
        a = ellipse(a, x, y, 50, 18, (180, 80, 50), 0.45)
    finish(a, "relatives.jpg", sat=1.12)


def alf_sofa():
    a = sky((48, 40, 36), (90, 72, 60))
    n = fbm(H, W, 18)
    sofa = lerp((46, 48, 42), (28, 30, 28), n)
    yy, xx = np.ogrid[:H, :W]
    a[420:] = sofa[420:]
    a = rect(a, 0, 0, 1600, 280, (36, 32, 30), 0.5)
    a = ellipse(a, 1200, 180, 180, 80, (255, 190, 100), 0.28)
    # sphynx
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov, "RGBA")
    d.ellipse([620, 480, 980, 700], fill=(210, 186, 150, 255))
    d.ellipse([900, 430, 1040, 580], fill=(210, 186, 150, 255))
    d.ellipse([930, 470, 955, 500], fill=(30, 24, 22, 255))
    d.polygon([(980, 440), (1010, 360), (1000, 450)], fill=(210, 186, 150, 255))
    d.polygon([(1020, 450), (1070, 380), (1035, 470)], fill=(210, 186, 150, 255))
    a = arr(Image.alpha_composite(to_im(a).convert("RGBA"), ov).convert("RGB"))
    finish(a, "cg-alf.jpg", sat=1.05)


def night_city():
    a = sky((8, 10, 22), (36, 28, 40))
    a = ellipse(a, 1100, 160, 40, 40, (230, 230, 210), 0.5)
    for x0, h in [(0, 480), (200, 360), (420, 520), (700, 300), (980, 440), (1240, 380), (1460, 560)]:
        a = rect(a, x0, h, x0 + 220, 900, (16, 18, 28), 0.92)
        for wy in range(h + 20, 860, 36):
            for wx in range(x0 + 16, x0 + 200, 28):
                if RNG.random() > 0.45:
                    a = rect(a, wx, wy, wx + 12, wy + 18, (255, 196, 90), 0.8)
    y = np.linspace(0, 1, H)[:, None]
    k = np.clip((y - 0.82) * 8, 0, 1)
    a = a * (1 - k[..., None]) + np.array([12, 12, 16], np.float32) * k[..., None]
    finish(a, "night.jpg", sat=0.9)


def main():
    snowy_street()
    park()
    castle()
    car_night("car.jpg")
    car_night("cg-car.jpg", dash=(20, 20, 24), glow=(255, 160, 80))
    night_city()
    drive_polo()
    wheat()
    palace()
    river()
    gate()
    bison()
    red_club()
    sunset()
    cg_cafe()
    tesla_garage()
    novoselye()
    kitchen_empty()
    relatives_table()
    alf_sofa()


if __name__ == "__main__":
    main()
