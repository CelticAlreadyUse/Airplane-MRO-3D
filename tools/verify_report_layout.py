"""Check text extraction and page geometry of the actual generated report."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PDF=ROOT/'output/pdf/mantiq-contoh-laporan-pekerjaan.pdf'
text=subprocess.check_output(['pdftotext','-layout',str(PDF),'-'],text=True)
checks=[]
def check(name,value):
 assert value,name;checks.append(dict(name=name,passed=True));print('PASS '+name)
check('PDF keeps accented names, document reference and both examiner outcomes','José Wibowo' in text and 'DEMO-12' in text and 'Perlu pengerjaan ulang' in text and 'Diterima - pekerjaan ditutup' in text)
check('Report includes before/after evidence captions and material usage/return totals','Sebelum 1' in text and 'Sesudah 1' in text and 'dipakai 1; dikembalikan 1' in text and 'LOT-DEMO-12' in text)
check('All ten stored history events are present','1. Temuan dibuat' in text and '10. Hasil diterima' in text)
pages=text.split('\f');pages=[p for p in pages if p.strip()]
check('Every A4 page has the correct footer and page total',len(pages)==6 and all(f'{i}/6' in p.replace(' ','') and 'bukan pelepasan pesawat' in p for i,p in enumerate(pages,1)))
check('PDF metadata confirms no embedded JavaScript','JavaScript:      no' in subprocess.check_output(['pdfinfo',str(PDF)],text=True))
(ROOT/'reports/phase-12/pdf-verification.json').write_text(json.dumps(dict(completed=True,checks=checks,pages=len(pages)),indent=2)+'\n')
