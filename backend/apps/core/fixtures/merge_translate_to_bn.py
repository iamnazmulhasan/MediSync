#!/usr/bin/env python3
"""
Generate a single Django fixture for your unified table: core.doctorsadvice

Input files (place in same folder as this script):
  - doctorsadvice.json        (old model: core.doctorsadvice)
  - doctorsrestriction.json   (old model: core.doctorsrestriction)
  - lifestyleadvice.json      (old model: core.lifestyleadvice)

Output:
  - doctorsadvice_bn.json     (new fixture: core.doctorsadvice)

Notes:
  - Because your new model has only (doctor_type_id, name), this script prefixes category into the name:
      "পরামর্শ: " / "নিষেধ: " / "জীবনযাপন: "
  - Translation is rule-based + dictionary (offline). You can extend PHRASE_MAP / WORD_MAP anytime.
"""

import json
import re
from pathlib import Path

PREFIX = {
    "core.doctorsadvice": "পরামর্শ: ",
    "core.doctorsrestriction": "নিষেধ: ",
    "core.lifestyleadvice": "জীবনযাপন: ",
}

# Direct phrase translations (extend anytime)
PHRASE_MAP = {
    "Take medicines exactly as prescribed": "ডাক্তারের নির্দেশ অনুযায়ী ঠিকভাবে ওষুধ সেবন করুন",
    "Take medicines as prescribed": "ডাক্তারের নির্দেশ অনুযায়ী ওষুধ সেবন করুন",
    "Give medicines as prescribed": "ডাক্তারের নির্দেশ অনুযায়ী ওষুধ দিন",
    "Complete full course of antibiotics": "অ্যান্টিবায়োটিকের সম্পূর্ণ কোর্স শেষ করুন",
    "Complete full course of treatment": "চিকিৎসার সম্পূর্ণ কোর্স শেষ করুন",
    "Complete antibiotic course": "অ্যান্টিবায়োটিকের সম্পূর্ণ কোর্স শেষ করুন",
    "Take adequate rest": "পর্যাপ্ত বিশ্রাম নিন",
    "Take meals on time": "সময়ে খাবার খান",
    "Chew food properly": "খাবার ভালোভাবে চিবিয়ে খান",
    "Maintain food diary": "খাবারের ডায়েরি রাখুন",
    "Maintain personal hygiene": "ব্যক্তিগত পরিচ্ছন্নতা বজায় রাখুন",
    "Maintain menstrual calendar": "মাসিক/ঋতুচক্রের ক্যালেন্ডার রাখুন",
    "Attend follow-up visit": "ফলো-আপ ভিজিটে আসুন",
    "Attend regular follow-up": "নিয়মিত ফলো-আপ করুন",
    "Seek urgent care if symptoms worsen": "উপসর্গ বেড়ে গেলে দ্রুত জরুরি চিকিৎসা নিন",
    "Seek medical care if symptoms worsen": "উপসর্গ বেড়ে গেলে দ্রুত চিকিৎসা নিন",
    "Avoid smoking": "ধূমপান এড়িয়ে চলুন",
    "Avoid alcohol": "অ্যালকোহল এড়িয়ে চলুন",
    "Do not self-medicate": "নিজে নিজে ওষুধ খাবেন না",
    "Avoid self-medication": "নিজে নিজে ওষুধ খাবেন না",
    "Monitor blood pressure": "রক্তচাপ পর্যবেক্ষণ করুন",
    "Monitor body temperature": "শরীরের তাপমাত্রা পর্যবেক্ষণ করুন",
    "Use ORS during diarrhea": "ডায়রিয়া হলে ওআরএস ব্যবহার করুন",
    "Continue breastfeeding during illness": "অসুস্থ অবস্থায়ও বুকের দুধ খাওয়ানো চালিয়ে যান",
}

# Word-level fallbacks (case-insensitive)
WORD_MAP = {
    "Monitor": "পর্যবেক্ষণ করুন",
    "blood pressure": "রক্তচাপ",
    "blood sugar": "রক্তশর্করা",
    "temperature": "তাপমাত্রা",
    "regularly": "নিয়মিত",
    "follow-up": "ফলো-আপ",
    "visit": "ভিজিট",
    "reports": "রিপোর্ট",
    "investigations": "পরীক্ষা-নিরীক্ষা",
    "medicines": "ওষুধ",
    "medicine": "ওষুধ",
    "antibiotics": "অ্যান্টিবায়োটিক",
    "antibiotic": "অ্যান্টিবায়োটিক",
    "diet": "খাদ্যাভ্যাস",
    "exercise": "ব্যায়াম",
    "avoid": "এড়িয়ে চলুন",
    "emergency": "জরুরি",
    "care": "চিকিৎসা",
    "pain": "ব্যথা",
    "fever": "জ্বর",
    "card": "কার্ড",
    "vaccination": "টিকা",
    "hygiene": "পরিচ্ছন্নতা",
    "check-up": "চেক-আপ",
    "check up": "চেক-আপ",
    "schedule": "সূচি",
    "strictly": "কঠোরভাবে",
    "properly": "সঠিকভাবে",
    "daily": "প্রতিদিন",
    "as advised": "ডাক্তারের পরামর্শ অনুযায়ী",
    "if advised": "ডাক্তারের পরামর্শ অনুযায়ী",
}

def normalize_spaces(s: str) -> str:
    return re.sub(r"\\s+", " ", (s or "")).strip()

def translate_to_bn(text: str) -> str:
    text = normalize_spaces(text)
    if text in PHRASE_MAP:
        return PHRASE_MAP[text]

    out = text

    # Common phrase rules (keep acronyms like FBS/PPBS/HbA1c intact)
    out = out.replace("if advised", "ডাক্তারের পরামর্শ অনুযায়ী")
    out = out.replace("as advised", "ডাক্তারের পরামর্শ অনুযায়ী")
    out = out.replace("on time", "সময়ে")
    out = out.replace("properly", "সঠিকভাবে")
    out = out.replace("daily", "প্রতিদিন")
    out = out.replace("strictly", "কঠোরভাবে")

    # Apply WORD_MAP replacements (longest first)
    for en, bn in sorted(WORD_MAP.items(), key=lambda x: -len(x[0])):
        out = re.sub(rf"\\b{re.escape(en)}\\b", bn, out, flags=re.IGNORECASE)

    return out

def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def main():
    base = Path(".")
    inputs = [
        base / "doctors_advice.json",
        base / "doctors_restriction.json",
        base / "lifestyle_advice.json",
    ]
    for p in inputs:
        if not p.exists():
            raise SystemExit(f"Missing input file: {p.name}")

    advice = load_json(inputs[0])
    restriction = load_json(inputs[1])
    lifestyle = load_json(inputs[2])

    combined = []
    pk = 1

    for items in (advice, restriction, lifestyle):
        for it in items:
            src_model = it.get("model", "")
            fields = it.get("fields", {}) or {}
            doctor_type_id = fields.get("doctor_type_id")
            name_en = normalize_spaces(fields.get("name", ""))

            prefix = PREFIX.get(src_model, "")
            name_bn = translate_to_bn(name_en)

            combined.append({
                "model": "core.doctorsadvice",
                "pk": pk,
                "fields": {
                    "doctor_type_id": doctor_type_id,
                    "name": prefix + name_bn
                }
            })
            pk += 1

    out_path = base / "doctorsadvice_bn.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

    print(f"✅ Generated {out_path.name} with {len(combined)} rows.")

if __name__ == "__main__":
    main()
