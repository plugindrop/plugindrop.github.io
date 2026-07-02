---
title: "How to Use a Limiter for Mastering: Complete 2026 Guide (Plugin Settings Included)"
description: "Learn how to use a limiter for mastering in 2026 — true peak, LUFS targeting, attack/release, and brick wall settings — with plugin recommendations from FabFilter Pro-L 2 to the free W1 Limiter."
pubDate: "2026-06-07T10:00:00Z"
tags: ["guide", "vst", "tutorials", "mastering", "limiter"]
affiliate: ""
evergreen: true
score: 8.00
heroImage: "/images/how-to-use-a-limiter-mastering.jpg"
draft: false
---

**TL;DR:** A limiter is the final stage of every master — it sets your true peak ceiling, targets streaming LUFS norms, and determines whether your track sounds punchy or crushed. FabFilter Pro-L 2 (~$179) is the consistent community recommendation for transparent brick-wall limiting. The free W1 Limiter is a capable starting point. Limiter 6 GE (~$26) sits between the two for producers who want per-stage metering without the Pro-L 2 price tag.

## Quick Picks at a Glance

| Plugin | Price | Best For | Get It |
|--------|-------|----------|--------|
| W1 Limiter | Free | Transparent brick-wall limiting for beginners | [Free via Plugin Boutique](https://www.pluginboutique.com/search?search_query=W1+Limiter&a_aid=69cb95abe1763&utm_source=plugindrop&utm_medium=article&utm_campaign=how-to-use-a-limiter-mastering) |
| Limiter 6 GE | ~$26 | Multi-stage limiting with per-module metering | [Plugin Boutique](https://www.pluginboutique.com/search?search_query=Limiter+6+GE&a_aid=69cb95abe1763&utm_source=plugindrop&utm_medium=article&utm_campaign=how-to-use-a-limiter-mastering) |
| FabFilter Pro-L 2 | ~$179 | Transparent or aggressive limiting with ISP metering | [Plugin Boutique](https://www.pluginboutique.com/search?search_query=FabFilter+Pro-L+2&a_aid=69cb95abe1763&utm_source=plugindrop&utm_medium=article&utm_campaign=how-to-use-a-limiter-mastering) |
| iZotope Ozone 11 Maximizer | ~$249 (Standard) | AI-assisted LUFS targeting for streaming platforms | [Plugin Boutique](https://www.pluginboutique.com/search?search_query=iZotope+Ozone+11&a_aid=69cb95abe1763&utm_source=plugindrop&utm_medium=article&utm_campaign=how-to-use-a-limiter-mastering) |

---

## What a Mastering Limiter Actually Does

The limiter is the most consequential plugin in a mastering chain — and the most misused. The goal is not to make a track as loud as possible. That thinking produced the loudness war era of the 2000s, a period producer communities consistently reference as an object lesson in what competitive volume does to dynamic quality.

In 2026, streaming platforms normalize loudness via LUFS measurement. A track mastered at -14 LUFS integrated plays back at the same perceived volume as one slammed to -7 LUFS. The loudness advantage is neutralized; only the dynamic quality survives.

What a mastering limiter actually controls:
- **True peak ceiling** — prevents inter-sample peaks from clipping downstream in the distribution chain
- **Transient-to-average ratio** — how aggressively the loudest hits are pushed into the average loudness

How hard you push the limiter determines whether the master sounds open and three-dimensional or flat and fatigued.

---

## The Four Settings That Matter

### 1. True Peak Ceiling

Set this to **-1.0 dBTP** for most streaming platforms. Some mastering engineers use -0.5 dBTP; Spotify and Apple Music both specify -1 dBTP in their loudness guidelines. Do not confuse this with the output ceiling in sample-domain limiters — true peak (TP) accounts for inter-sample peaks that only appear after D/A conversion. Every limiter recommended in this guide measures true peak correctly. The free W1 Limiter does not have a true peak mode, which is why it's a starting point rather than a professional tool.

### 2. Input Gain (The Loudness Driver)

The input gain knob is where you push the signal into the limiter to achieve your target LUFS. Start at 0 dB and bring it up until your integrated LUFS meter reads your target:

- **-14 LUFS**: Spotify default, Apple Music, Amazon Music
- **-16 LUFS**: Podcast and spoken word
- **-9 to -11 LUFS**: Club music, where dynamic range matters less and the platform normalization is closer to dance floor SPL expectations

A practical rule: if you're pushing more than 4-6 dB of gain reduction to hit -14 LUFS, your mix needs more work before mastering, not a harder limiter.

### 3. Release Time

Release time controls how quickly the limiter stops attenuating after a transient. This is the setting most directly responsible for the "pumping" artifact beginners complain about.

- **Auto release**: Use this by default in FabFilter Pro-L 2. It program-dependent adapts per transient, which prevents pumping on complex material.
- **Manual release (30–100ms)**: Useful on sustained, low-dynamic material like ambient or classical where auto-release can over-react.
- **Short release (10–20ms)**: Use on punchy electronic music where you want transients to recover quickly for a snappy feel — at the cost of slightly more coloration.

### 4. Algorithm / Limiting Mode

FabFilter Pro-L 2 offers eight algorithms. For 95% of mastering work, use:
- **Transparent**: Clean, modern, ideal for any genre
- **Aggressive**: Adds perceived loudness through saturation-like behavior — useful for rock, metal, or EDM where density is part of the aesthetic

Limiter 6 GE uses a multi-stage approach (RMS compressor → high-frequency limiter → true peak limiter) that produces a naturally musical response without requiring deep algorithm selection.

---

## Plugin Recommendations: Which to Buy

### Free: W1 Limiter
A clone of the Waves L1, W1 is a brick-wall limiter in sample domain only — no true peak detection. Use it to learn the concepts before spending money. It will not pass streaming platform technical requirements cleanly for professional release work, but it is functional and zero-risk to try.

### $26: Limiter 6 GE
The best value limiter available in 2026. Its six-module signal path (high-frequency limiter, compressor, peak limiter, clipper, true peak limiter, meter) gives you visibility into what each stage is doing, which makes it a better learning tool than Pro-L 2 despite costing a fraction of the price. The true peak module meets -1.0 dBTP requirements. Recommended for: bedroom producers doing their own mastering on a budget.

### $179: FabFilter Pro-L 2
The professional standard. Its ISP (inter-sample peak) metering is accurate, the eight algorithm modes cover every genre need, and the large visualizer makes gain reduction easy to read during playback. At full price it's a real investment; it goes on sale approximately once per year (usually Black Friday). See [when FabFilter Pro-L 2 goes on sale](/blog/when-does-fabfilter-pro-q-4-go-on-sale) before paying full price.

### ~$249: iZotope Ozone 11 Standard (includes Maximizer)
The Maximizer module inside Ozone 11 includes an AI Assistant that analyzes your track and sets a target LUFS automatically. For producers who don't want to learn the technical settings from scratch, this is the fastest path to a streaming-ready master. Ozone goes on sale frequently — sometimes down to $99 for Standard during seasonal sales.

---

## Step-by-Step: Mastering Limiter Workflow

1. **Bypass all limiting and check your pre-limiter peak level.** Aim for -6 to -3 dBFS peak before the limiter. If your mix is already peaking at -1 dBFS, lower your master fader or revisit your mix bus gain structure.
2. **Set true peak ceiling to -1.0 dBTP.**
3. **Engage auto release** (or set 50ms as a starting point if manual).
4. **Bring up input gain** until your integrated LUFS meter reads your target. Watch gain reduction — keep it under 3–4 dB for most genres.
5. **A/B the limited vs unlimited signal** at matched loudness using your DAW's gain compensation. If the limited version sounds worse, you're pushing too hard.
6. **Render and check** the final file's true peak reading in a tool like Youlean Loudness Meter (free) or in your DAW's export analyzer.

---

## When to Buy

**Buy Limiter 6 GE now at ~$26** — it rarely goes on deep sale and the discount rarely exceeds 20%. The full price is already low enough that waiting isn't worth it.

**Wait for a sale on FabFilter Pro-L 2.** At $179 full price, this is a Black Friday purchase. FabFilter typically discounts 25–40% in late November. See our [FabFilter sale tracker](/blog/when-does-fabfilter-pro-q-4-go-on-sale) to know when to pull the trigger.

**Wait for a sale on iZotope Ozone 11.** iZotope runs aggressive seasonal promotions (Cyber Monday, February, June) where Ozone Standard drops to $99–$149. Check Plugin Boutique's deal pages before buying at full price — this is one of the most heavily discounted plugins in production software.

**Start with W1 Limiter for free** if you're learning. There's no reason to buy anything until you understand gain reduction and LUFS targeting well enough to know what the paid tools improve on.
