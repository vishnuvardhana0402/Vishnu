"""Builds the Intent Email case study from case/intent-email/src.html.
   public:  case/intent-email/index.html          (REVIEW blocks removed)
   review:  case/intent-email/_review/index.html  (everything kept; keep it out of anything published)
   Run from the repository root:  python3 tools/build_intent.py"""
import re, os
src = open('case/intent-email/src.html', encoding='utf8').read()
public = re.sub(r'[ \t]*<!--REVIEW-->.*?<!--/REVIEW-->\n?', '', src, flags=re.S)
public = re.sub(r'<!--\n  Intent Email case study.*?-->\n', '', public, flags=re.S)
leak = [w for w in ('Lovable', 'Recykal', 'Voicebit', 'Mediamint', 'VC Mint', 'T-Hub', 'checklist', 'class="rv"') if w in public]
assert not leak, 'review-only text left in the public page: %s' % leak
open('case/intent-email/index.html', 'w', encoding='utf8').write(public)
os.makedirs('case/intent-email/_review', exist_ok=True)
review = src.replace('src="img/', 'src="../img/').replace('href="prototype/"', 'href="../prototype/"').replace('f.src = "prototype/"', 'f.src = "../prototype/"')
open('case/intent-email/_review/index.html', 'w', encoding='utf8').write(review)
print('public', len(public), 'review', len(review))
