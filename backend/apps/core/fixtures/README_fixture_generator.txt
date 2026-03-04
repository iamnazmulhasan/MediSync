How to generate your unified Bangla fixture (doctorsadvice_bn.json)
===============================================================

1) Create three input fixtures (exactly these names) in the same folder:
   - doctorsadvice.json        (old: core.doctorsadvice)
   - doctorsrestriction.json   (old: core.doctorsrestriction)
   - lifestyleadvice.json      (old: core.lifestyleadvice)

2) Run:
   python merge_translate_to_bn.py

3) It will generate:
   doctorsadvice_bn.json

4) Load into Django:
   python manage.py loaddata doctorsadvice_bn.json

Notes
-----
- Your new model has only (doctor_type_id, name). This script stores category as prefix:
  "পরামর্শ: " / "নিষেধ: " / "জীবনযাপন: "
- Translation is offline (dictionary + rules). For perfect Bangla, extend PHRASE_MAP/WORD_MAP.
