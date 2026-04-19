import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE_DIR = Path(r"C:\Program Files\RStudio\resources\app\resources\dictionaries")
AFF_PATH = SOURCE_DIR / "en_US.aff"
DIC_PATH = SOURCE_DIR / "en_US.dic"
CUSTOM_PATH = ROOT / "customWords.json"
OUTPUT_PATH = ROOT / "words.json"

ALPHA_RE = re.compile(r"^[a-z]+$")


def load_custom_words():
    data = json.loads(CUSTOM_PATH.read_text(encoding="utf-8"))
    return set(data.get("allow", [])), set(data.get("deny", []))


def load_affixes():
    affixes = {"PFX": {}, "SFX": {}}
    lines = AFF_PATH.read_text(encoding="latin-1").splitlines()
    index = 0

    while index < len(lines):
        line = lines[index].strip()
        parts = line.split()
        if len(parts) == 4 and parts[0] in {"PFX", "SFX"}:
            kind, flag, cross, count = parts[0], parts[1], parts[2], int(parts[3])
            rules = []
            for offset in range(1, count + 1):
                rule_parts = lines[index + offset].split()
                strip_part = "" if rule_parts[2] == "0" else rule_parts[2]
                add_part = "" if rule_parts[3] == "0" else rule_parts[3]
                condition = rule_parts[4]
                rules.append(
                    {
                        "strip": strip_part,
                        "add": add_part,
                        "condition": re.compile(f"{condition}$" if kind == "SFX" else f"^{condition}"),
                        "cross": cross == "Y",
                    }
                )
            affixes[kind][flag] = rules
            index += count + 1
            continue
        index += 1

    return affixes


def apply_affix(word, kind, rule):
    if kind == "SFX":
        if rule["strip"] and not word.endswith(rule["strip"]):
            return None
        if not rule["condition"].search(word):
            return None
        stem = word[: len(word) - len(rule["strip"])] if rule["strip"] else word
        return stem + rule["add"]

    if rule["strip"] and not word.startswith(rule["strip"]):
        return None
    if not rule["condition"].search(word):
        return None
    stem = word[len(rule["strip"]) :] if rule["strip"] else word
    return rule["add"] + stem


def expand_entry(word, flags, affixes):
    forms = {word}
    prefixes = []
    suffixes = []

    for flag in flags:
        for rule in affixes["PFX"].get(flag, []):
            derived = apply_affix(word, "PFX", rule)
            if derived:
                forms.add(derived)
                prefixes.append((derived, rule))
        for rule in affixes["SFX"].get(flag, []):
            derived = apply_affix(word, "SFX", rule)
            if derived:
                forms.add(derived)
                suffixes.append((derived, rule))

    for prefixed, prefix_rule in prefixes:
        if not prefix_rule["cross"]:
            continue
        for flag in flags:
            for suffix_rule in affixes["SFX"].get(flag, []):
                if not suffix_rule["cross"]:
                    continue
                derived = apply_affix(prefixed, "SFX", suffix_rule)
                if derived:
                    forms.add(derived)

    for suffixed, suffix_rule in suffixes:
        if not suffix_rule["cross"]:
            continue
        for flag in flags:
            for prefix_rule in affixes["PFX"].get(flag, []):
                if not prefix_rule["cross"]:
                    continue
                derived = apply_affix(suffixed, "PFX", prefix_rule)
                if derived:
                    forms.add(derived)

    return forms


def build_word_sets():
    affixes = load_affixes()
    allow_words, deny_words = load_custom_words()
    full_words = set()

    with DIC_PATH.open("r", encoding="latin-1") as handle:
        next(handle, None)
        for raw in handle:
            entry = raw.strip()
            if not entry:
                continue
            base, _, flag_blob = entry.partition("/")
            if base.lower() != base:
                continue
            flags = list(flag_blob)
            for form in expand_entry(base, flags, affixes):
                if 3 <= len(form) <= 8 and ALPHA_RE.fullmatch(form):
                    full_words.add(form)

    full_words.update(word for word in allow_words if 3 <= len(word) <= 8 and ALPHA_RE.fullmatch(word))
    full_words.difference_update(deny_words)

    common_words = {
        word
        for word in full_words
        if 4 <= len(word) <= 6
    }

    return {
        "full": sorted(full_words),
        "common": sorted(common_words),
    }


if __name__ == "__main__":
    payload = build_word_sets()
    OUTPUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Generated full={len(payload['full'])} common={len(payload['common'])}")
