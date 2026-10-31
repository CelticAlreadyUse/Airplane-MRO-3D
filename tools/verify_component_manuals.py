"""Verify source-backed 3D/component-to-PDF navigation in an isolated profile.
Default: dev port 3100. Set MRO_VERIFY_URL=http://127.0.0.1:3101 for production.
"""
import json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/phase-6'
URL=os.environ.get('MRO_VERIFY_URL','http://127.0.0.1:3100')
PRODUCTION=':3101' in URL
checks=[];completed=False
catalog=json.loads((REPORT/'reference-catalog.json').read_text())
classification=json.loads((ROOT/'reports/phase-9/classification-catalog.json').read_text())

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-ref-verification6','--json',*args],input=script,text=True,capture_output=True,timeout=60)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 r=json.loads(p.stdout)
 if not r['success']:raise RuntimeError(r)
 return r['data']
def js(code):return cli('eval','--stdin',script=code)['result']
def wait(code):cli('wait','--fn',code)
def click(selector):cli('scrollintoview',selector);cli('click',selector)
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
 if not passed:raise AssertionError((name,detail))
def part(source):click('[data-source='+json.dumps(source)+']')
def pdf(page,total=1112):wait(f"document.querySelector('.pdf-reader')?.dataset.renderedPage==='{page}' && document.querySelector('.pdf-reader')?.dataset.pageCount==='{total}' && document.querySelector('.pdf-reader')?.getAttribute('aria-busy')==='false'")
def pixels():return js("(()=>{let c=document.querySelector('.pdf-paper canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<180)n++;return n})()")
def back():click('.manual-reference-context button');wait("document.querySelector('#workspace-tab-aircraft').getAttribute('aria-selected')==='true'")
def shot(file):cli('screenshot',str(REPORT/(('production-' if PRODUCTION else '')+file)))
def camera():return js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().camera")
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open',URL)
 cli('set','viewport','1440','1000')
 js("localStorage.setItem('mro-color-theme','light');localStorage.setItem('mro-presentation-space','practice');true")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('All 434 source identities remain available',js("document.querySelector('.canvas-wrap').dataset.visibleMeshes==='434'"))
 check('Tree identifies all current shared manual references',js(f"document.querySelectorAll('.tree-manual-indicator').length==={classification['coverage']['linkedObjects']}"))
 for source,entry in catalog.items():
  part(source)
  detail=js("({source:document.querySelector('.component-manual').dataset.referenceSource,summary:document.querySelector('.component-manual-summary').textContent,pages:[...document.querySelectorAll('.component-manual-link')].map(e=>Number(e.dataset.pdfPage)),credit:document.querySelector('.component-manual-credit')?.textContent})")
  check('Reference card is attached to '+source,detail['source']==source and detail['summary']==entry['summary'] and detail['pages']==[c['pdfPage'] for c in entry['citations']] and 'arsip pelatihan' in detail['credit'],detail['pages'])
 for source in ['porteB','porteH']:
  part(source)
  check(source+' has an explicit unmatched state without invented citations',js("!!document.querySelector('.component-manual-empty') && !document.querySelector('.component-manual-link') && document.querySelector('.component-manual-summary').textContent.includes('belum dicocokkan')"))
 manifest=json.loads((ROOT/'mro-web/public/models/component-map.json').read_text())
 unknown=next(row['sourceName'] for row in classification['rows'] if row['manual'] is None and row['sourceName'] not in ['porteB','porteH'])
 cli('fill','[aria-label="Cari komponen atau nama objek"]',unknown);part(unknown)
 check('Unmapped source object has no fabricated manual function',js("!!document.querySelector('.component-manual-empty') && !document.querySelector('.component-manual-link')"),unknown)
 cli('fill','[aria-label="Cari komponen atau nama objek"]','semimonocoque')
 check('Component search includes manual summary keywords',js("document.querySelectorAll('.component-item').length===1 && document.querySelector('.component-item').dataset.source==='fuselage'"))
 cli('fill','[aria-label="Cari komponen atau nama objek"]','')
 click('#workspace-tab-manuals');pdf(79)
 check('Ordinary Manual tab still opens book title without component context',js("!document.querySelector('.manual-reference-context')"))
 click('.manual-card:nth-child(2)');pdf(1,18)
 cli('fill','#manual-search','sertifikasi');click('#workspace-tab-aircraft')
 fixtures=[('roueG',393,'landinggearsystem'),('fuselage',377,'airframe'),('ailes2',378,'empennage'),('aileronG',379,'flightcontrols'),('roueA',390,'groundcontrol'),('voletD',392,'wingflapsystem'),('porteAD',399,'cabinentrydoors'),('helice',428,'propeller'),('roueD',438,'brakesystem')]
 for source,page,heading in fixtures:
  part(source)
  selected=js("document.querySelector('.selected-title').textContent")
  prior=camera() if not PRODUCTION else None
  click(f'.component-manual-link[data-pdf-page="{page}"]');pdf(page)
  wait("document.querySelector('.pdf-text p').textContent.length>50")
  content=js("document.querySelector('.pdf-text p').textContent")
  context=js("document.querySelector('.manual-reference-context').textContent")
  check(f'{source} opens real source page {page} with matching subject',heading in re.sub('[^a-z]','',content.lower()) and pixels()>1500 and selected in context and f'PDF {page}' in context)
  if page==393:
   check('Jump from a different filtered document selects POH and clears catalog filter',js("document.querySelector('#manual-search').value==='' && document.querySelector('.manual-card.selected').textContent.includes('Pilot')"))
   check('Component context receives keyboard focus',js("document.activeElement.classList.contains('manual-reference-context')"))
   shot('linked-manual-light-desktop.png')
  back()
  check(f'Return from PDF {page} restores component and focus',js("document.querySelector('.selected-title').textContent") == selected and js("document.activeElement.id==='component-manual-title'"))
  if prior:
   after=camera()
   assert abs(prior['radius']-after['radius'])<.01 and abs(prior['alpha']-after['alpha'])<.001,(prior,after)
 if not PRODUCTION:check('All nine reader round trips preserve the 3D camera',True)
 # Same citation must jump again after the reader has been navigated elsewhere.
 part('roueG');click('[data-pdf-page="393"]');pdf(393)
 click('.pdf-bottom-bar button:last-child');pdf(1);back()
 click('[data-pdf-page="393"]');pdf(393)
 check('Repeated click on the same citation reopens its page',True)
 click('.manual-card:nth-child(2)');pdf(1,18)
 check('Manual catalog selection clears stale component context',js("!document.querySelector('.manual-reference-context')"))
 click('.manual-card:nth-child(1)');pdf(79)
 check('Manual catalog can return to POH title without a stale deep link',js("!document.querySelector('.manual-reference-context')"))
 # Retry must remember the requested citation rather than defaulting to the cover.
 click('.manual-card:nth-child(2)');pdf(1,18);click('#workspace-tab-aircraft');part('roueG')
 js("window.__refFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/manuals/c208-poh-training-1998.pdf')?Promise.resolve(new Response('',{status:404})):window.__refFetch(url,...args);true")
 click('[data-pdf-page="438"]');wait("!!document.querySelector('.pdf-error')")
 check('Linked PDF failure keeps requested component context',js("document.querySelector('.manual-reference-context').textContent.includes('PDF 438')"))
 js("window.fetch=window.__refFetch;true");click('.pdf-error button');pdf(438)
 check('Linked PDF retry recovers the requested page instead of the cover',pixels()>1500)
 back();click('.theme-toggle');shot('component-dark-desktop.png')
 click('[data-pdf-page="393"]');pdf(393);shot('linked-manual-dark-desktop.png');back()
 check('Linked cards and context work in dark mode',js("document.documentElement.dataset.theme==='dark' && getComputedStyle(document.querySelector('.component-manual')).backgroundColor!=='rgb(255, 255, 255)'"))
 cli('set','viewport','390','844')
 cli('scrollintoview','.component-manual');shot('component-dark-mobile.png')
 click('[data-pdf-page="438"]');pdf(438)
 check('Mobile deep link opens the matching page without page overflow',pixels()>1500 and js("document.documentElement.scrollWidth<=innerWidth"))
 check('Mobile jump scrolls component context to the top of the reader',js("Math.abs(document.querySelector('.manual-reference-context').getBoundingClientRect().top)<30"))
 shot('linked-manual-dark-mobile.png');back()
 check('Mobile return focuses component details without losing selection',js("document.querySelector('.selected-title').textContent==='Roda utama kiri' && document.activeElement.id==='component-manual-title' && document.documentElement.scrollWidth<=innerWidth"))
 cli('focus','[data-pdf-page="393"]');cli('press','Enter');pdf(393)
 check('Manual citation works from keyboard',True)
 errors=cli('errors');check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 (REPORT/('production-references.json' if PRODUCTION else 'reference-verification.json')).write_text(json.dumps(dict(completed=completed,url=URL,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
