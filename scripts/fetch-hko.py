# 下載香港天文台 1901–2100 公曆農曆對照表，抽出節氣日期 → tests/fixtures/hko-terms.json
# 格式：{ "2026": ["1-5", "1-20", ...] }，順序同表內出現順序（小寒…冬至）
import json, re, time, urllib.request
out = {}
for y in range(1901, 2101):
    url = f"https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T{y}c.txt"
    for attempt in range(3):
        try:
            text = urllib.request.urlopen(url, timeout=20).read().decode("utf-8-sig")
            break
        except Exception:
            time.sleep(2)
    else:
        raise SystemExit(f"fail {y}")
    days = []
    for line in text.splitlines():
        p = line.split()
        if len(p) > 3:
            m = re.match(r"(\d+)年(\d+)月(\d+)日", p[0])
            if m:
                days.append(f"{int(m[2])}-{int(m[3])}")
    assert len(days) == 24, (y, len(days))
    out[str(y)] = days
    time.sleep(0.2)
json.dump(out, open("tests/fixtures/hko-terms.json", "w", encoding="utf-8"), separators=(",", ":"))
print("ok", len(out))
