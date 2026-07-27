# -*- coding: utf-8 -*-
# Make "step" consistently स्टेप (not चरण / numeral-words) everywhere in Hindi.
import re, json

files = [
    'src/i18n/dictionary.ts',
    'src/components/methodology/GuideTabHi.tsx',
    'src/components/methodology/MethodologyTabHi.tsx',
    'src/i18n/translate.ts',
]
total = 0
for f in files:
    s = open(f, encoding='utf-8').read()
    c = s.count('चरण')
    s = s.replace('चरण', 'स्टेप')
    open(f, 'w', encoding='utf-8').write(s)
    total += c
    print(f, '->', c, 'replaced')

# Fix the three Step kickers explicitly (digits, uniform स्टेप).
p = 'src/i18n/dictionary.ts'
s = open(p, encoding='utf-8').read()
def set_val(text, key, newval):
    pat = re.compile(r"(['\"])" + re.escape(key) + r"\1(\s*:\s*(?:\n\s*)?)(['\"])(?:[^'\"\\]|\\.)*\3")
    return pat.subn(lambda m: m.group(1) + key + m.group(1) + ": " + json.dumps(newval, ensure_ascii=False), text, count=1)
for k, v in {"Step 1": "स्टेप 1", "Step 2": "स्टेप 2", "Step 3": "स्टेप 3"}.items():
    s, n = set_val(s, k, v)
    print(k, '=>', v, '(', n, ')')
open(p, 'w', encoding='utf-8').write(s)
print('total चरण replaced:', total)
