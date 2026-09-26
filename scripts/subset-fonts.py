# 從 src/ 收集實際用到的字元，把字型子集化成 woff2 → public/fonts/
# 原始字型（不入 git）放 fonts-src/：
#   MasaFont-Bold.ttf        https://github.com/max32002/masafont/raw/master/tw/MasaFont-Bold.ttf
#   LXGWWenKaiTC-Regular.ttf https://github.com/lxgw/LxgwWenkaiTC/releases/latest/download/LXGWWenKaiTC-Regular.ttf
# 執行：uvx --from fonttools --with brotli python scripts/subset-fonts.py
import pathlib, re
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
def strip_comments(code: str) -> str:
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    code = re.sub(r"<!--.*?-->", "", code, flags=re.S)
    return re.sub(r"(^|\s)//.*", "", code)

files = [p for p in (ROOT / "src").rglob("*") if p.suffix in {".ts", ".css"}] + [ROOT / "index.html"]
src_text = "".join(strip_comments(p.read_text(encoding="utf-8")) for p in files)

names = re.findall(r"name: '(.{2})'", (ROOT / "src/data/terms.ts").read_text(encoding="utf-8"))
assert len(names) == 24, names
# 書法大字：節氣名 + 標題用字
brush = set("".join(names) + "二十四節氣")
# 內文：src 內所有非 ASCII 字元（CJK、標點、拼音）+ ASCII
# 拼音以 toUpperCase() 顯示，帶聲調的大寫字母也要收
body = {c for c in src_text + src_text.upper() if ord(c) > 0x7F} | {chr(c) for c in range(0x20, 0x7F)}

def run(font, chars, out):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    f = subset.load_font(str(ROOT / "fonts-src" / font), opts)
    s = subset.Subsetter(opts)
    s.populate(text="".join(sorted(chars)))
    s.subset(f)
    dst = ROOT / "public/fonts" / out
    subset.save_font(f, str(dst), opts)
    # 子集後逐字確認有字形，缺字直接失敗（避免畫面默默 fallback 到系統字）
    from fontTools.ttLib import TTFont
    cmap = TTFont(str(dst)).getBestCmap()
    missing = sorted(c for c in chars if not c.isspace() and ord(c) not in cmap)
    assert not missing, f"{out} missing glyphs: {''.join(missing)}"
    print(f"{out}: {len(chars)} chars, {dst.stat().st_size // 1024} KB")

run("MasaFont-Bold.ttf", brush, "masa-brush.woff2")
run("LXGWWenKaiTC-Regular.ttf", body, "wenkai-body.woff2")
