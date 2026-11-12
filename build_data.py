#!/usr/bin/env python3
"""Собирает js/data.js из текстовых файлов data/*.txt.

Запуск из корня проекта:  python3 tools/build_data.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = sorted((ROOT / "data").glob("*.txt"))
OUT = ROOT / "js" / "data.js"


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def parse():
    verbs, errors = [], []
    cur = meaning = None
    for path in SRC:
        for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = raw.strip()
            where = f"{path.name}:{n}"
            if not line or line.startswith("#"):
                continue
            if line.startswith("="):
                parts = [p.strip() for p in line[1:].split("|")]
                name = parts[0]
                display = parts[1] if len(parts) > 1 and parts[1] else name
                alts = [a.strip() for a in parts[2].split(",")] if len(parts) > 2 and parts[2] else []
                cur = {
                    "id": slug(name),
                    "name": name,
                    "display": display,
                    "alts": alts,
                    "group": name.split()[0],
                    "meanings": [],
                }
                verbs.append(cur)
                meaning = None
            elif line.startswith("- "):
                if cur is None:
                    errors.append(f"{where}: значение вне глагола")
                    continue
                m = re.match(r"^- (?:\[(.+?)\]\s*)?(.+)$", line)
                meaning = {
                    "id": f"{cur['id']}-{len(cur['meanings']) + 1}",
                    "pattern": m.group(1) or "",
                    "ru": m.group(2).strip(),
                    "examples": [],
                }
                cur["meanings"].append(meaning)
            elif line.startswith("~ "):
                if meaning is None:
                    errors.append(f"{where}: дефиниция вне значения")
                    continue
                meaning["en"] = line[2:].strip()
            elif line[0] in ">+":
                if meaning is None:
                    errors.append(f"{where}: пример вне значения")
                    continue
                kind = "fipi" if line.startswith(">f ") else "orig" if line[0] == ">" else "extra"
                body = line[3:] if kind == "fipi" else line[2:]
                if " | " not in body:
                    errors.append(f"{where}: нет разделителя ' | ' в примере")
                    continue
                en, ru = body.split(" | ", 1)
                meaning["examples"].append({"en": en.strip(), "ru": ru.strip(), "src": kind})
            else:
                errors.append(f"{where}: непонятная строка: {line[:40]}")
    return verbs, errors


def main():
    verbs, errors = parse()
    seen = set()
    for v in verbs:
        if v["id"] in seen:
            errors.append(f"дубль глагола: {v['name']}")
        seen.add(v["id"])
        if not v["meanings"]:
            errors.append(f"{v['name']}: нет значений")
        for m in v["meanings"]:
            if not m.get("en"):
                errors.append(f"{m['id']}: нет английской дефиниции")
            if not m["examples"]:
                errors.append(f"{m['id']}: нет примеров")
            if not any(e["src"] != "extra" for e in m["examples"]):
                errors.append(f"{m['id']}: нет оригинального примера")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    verbs.sort(key=lambda v: (v["group"], v["name"]))
    OUT.write_text(
        "// Сгенерировано tools/build_data.py — не редактируйте вручную, правьте data/*.txt\n"
        "window.PV_DATA = " + json.dumps(verbs, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    meanings = sum(len(v["meanings"]) for v in verbs)
    examples = sum(len(m["examples"]) for v in verbs for m in v["meanings"])
    groups = len({v["group"] for v in verbs})
    print(f"OK: {len(verbs)} глаголов, {meanings} значений, {examples} примеров, {groups} базовых глаголов")


if __name__ == "__main__":
    main()
