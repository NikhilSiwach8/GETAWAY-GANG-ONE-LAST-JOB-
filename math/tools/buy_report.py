"""Write the BONUS BUY section of docs/RTP_REPORT.md from the published buy-mode tables (exact, from weights).
Run: python3 math/tools/buy_report.py"""
import csv
import json
import math
import os
from fractions import Fraction

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LIB = os.path.join(ROOT, "math", "games", "getaway_gang", "library")
REPORT = os.path.join(ROOT, "docs", "RTP_REPORT.md")
START, END = "<!-- BUY-REPORT:START -->", "<!-- BUY-REPORT:END -->"
TITLES = {"heist": "THE HEIST", "escape": "THE PERFECT ESCAPE"}


def stats(mode):
    info = json.load(open(os.path.join(LIB, f"lut_weighting_{mode}.json")))
    cost = info["cost"]
    rows = [(int(w), int(p)) for _, w, p in csv.reader(open(os.path.join(LIB, "publish_files", f"lookUpTable_{mode}_0.csv")))]
    W = sum(w for w, _ in rows)
    mean = sum(w * p for w, p in rows) / 100 / W
    var = sum(w * (p / 100 - mean) ** 2 for w, p in rows) / W
    rtp = Fraction(sum(w * p for w, p in rows), 100 * W) / Fraction(cost).limit_denominator(1000)
    prob = lambda f: sum(w for w, p in rows if f(p / 100)) / W  # noqa: E731
    buckets = [(0, 0), (0.0001, cost * 0.5), (cost * 0.5, cost), (cost, cost * 2), (cost * 2, cost * 5), (cost * 5, 5000), (5000, 12000), (12000, 12000)]
    return info, cost, rtp, mean, math.sqrt(var) / cost, prob, buckets, len(rows)


lines = [START, "", "## Bonus buy modes", "", "Exact statistics of the published buy tables (`lookUpTable_heist_0.csv`, `lookUpTable_escape_0.csv`).", ""]
for mode in ("heist", "escape"):
    info, cost, rtp, mean, sd, prob, buckets, n = stats(mode)
    capp = prob(lambda x: x >= 12000)
    lines += [
        f"### {TITLES[mode]} — `{mode}`, price {cost:g}× bet",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Books | {n:,} |",
        f"| **RTP** (mean payout / price) | **{float(rtp) * 100:.4f}%** |",
        f"| Mean payout | {mean:,.2f}× bet |",
        f"| Standard deviation (× price) | {sd:.2f} |",
        f"| P(pays less than the price) | {prob(lambda x: x < cost) * 100:.1f}% |",
        f"| P(pays 0) | {prob(lambda x: x == 0) * 100:.2f}% |",
        f"| P(max win 12,000×) | 1 in {1 / capp:,.0f} ({info['max_win_books']} books) |" if capp else "| P(max win) | 0 |",
        f"| Natural RTP of the book sample (before trim) | {info['natural_rtp_of_book_sample'] * 100:.4f}% |",
        f"| Below-price re-weighting factor (RTP trim) | ×{info['below_price_trim_factor']:.5f} |",
        "",
        "| Payout (× bet) | Probability |",
        "|---|---:|",
    ]
    for lo, hi in buckets:
        if lo == hi:
            p = prob(lambda x, v=lo: x == v)
            label = f"exactly {lo:,.0f}"
        else:
            p = prob(lambda x, a=lo, b=hi: a <= x < b)
            label = f"{lo:,.4g} – {hi:,.4g}"
        lines.append(f"| {label} | {p * 100:.3f}% |")
    lines.append("")
lines.append(END)
text = open(REPORT, encoding="UTF-8").read()
block = "\n".join(lines)
if START in text:
    text = text[: text.index(START)] + block + text[text.index(END) + len(END):]
else:
    text = text.rstrip() + "\n\n" + block + "\n"
open(REPORT, "w", encoding="UTF-8").write(text)
print("updated", REPORT)
