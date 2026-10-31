"""Classification, real PDF targets and stable finding identity in a private profile."""
import json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports/phase-9'
URL=os.environ.get('MRO_VERIFY_URL','http://127.0.0.1:3100');PROD=':3101' in URL
checks=[];completed=False;QUICK=os.environ.get('MRO_VERIFY_QUICK')=='1';RESUME=os.environ.get('MRO_VERIFY_FROM')
previous=[];prior_failed=[]
if RESUME:
 prior=REPORT/('production-ui-verification.json' if PROD else 'ui-verification.json')
 previous=json.loads(prior.read_text())['checks']
 prior_failed=[c for c in previous if not c['passed']]
 assert not prior_failed or (RESUME=='tablet' and all(c['name']=='Tablet hierarchy retains 44px touch targets and no horizontal overflow' for c in prior_failed)), 'Cannot resume across unaddressed failures'
 previous=[c for c in previous if c['passed']]
 prior.with_name(('production-before-tablet-retry.json' if RESUME=='tablet' else 'production-before-ocr-retry.json') if PROD else 'development-before-retry.json').write_text(prior.read_text())
catalog=json.loads((REPORT/'classification-catalog.json').read_text());coverage=catalog['coverage']
def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-classification9','--json',*args],input=script,text=True,capture_output=True,timeout=60)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 r=json.loads(p.stdout)
 if not r['success']:raise RuntimeError(r)
 return r['data']
def js(s):return cli('eval','--stdin',script=s)['result']
def wait(s):cli('wait','--fn',s)
def click(s):cli('scrollintoview',s);cli('click',s)
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
 if not passed:raise AssertionError((name,detail))
def part(source):
 if js("getComputedStyle(document.querySelector('.component-panel')).display==='none'"):click('.mobile-tree-toggle')
 cli('fill','[aria-label="Cari komponen atau nama objek"]',source)
 click('[data-source='+json.dumps(source)+']')
 wait('document.querySelector(".component-manual")?.dataset.referenceSource==='+json.dumps(source))
 if js("getComputedStyle(document.querySelector('.component-panel')).display!=='none'"):cli('fill','[aria-label="Cari komponen atau nama objek"]','')
def pdf(page):wait(f"document.querySelector('.pdf-reader')?.dataset.renderedPage==='{page}' && document.querySelector('.pdf-reader')?.getAttribute('aria-busy')==='false'")
def back():click('.manual-reference-context button');wait("document.querySelector('#workspace-tab-aircraft').getAttribute('aria-selected')==='true'")
def shot(name):cli('screenshot',str(REPORT/(('production-' if PROD else '')+name)))
def rows():return js("new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readonly'),r=t.objectStore('findings').getAll();t.oncomplete=async()=>{db.close();resolve(await Promise.all(r.result.map(async f=>({...f,photos:await Promise.all(f.photos.map(async p=>({id:p.id,name:p.name,bytes:p.blob.size,sha:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await p.blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('')})))}))))};t.onerror=()=>reject(t.error)}})")
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open',URL)
 cli('set','viewport','1440','1000');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 js("localStorage.setItem('mro-color-theme','light');localStorage.setItem('mro-presentation-space','practice');true")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 # Seed a pre-classification finding with its old raw mesh label and an actual image.
 row=next(r for r in catalog['rows'] if r['sourceName']=='ALT.needle100')
 fixture=dict(id='classification-legacy-photo',aircraftId='cessna-208-demo',assetId=row['id'],sourceName='ALT.needle100',componentLabel='ALT.needle100',title='[TEST] Catatan sebelum klasifikasi',description='Catatan simulasi lama untuk instrumen.',category='inspection',priority='normal',severity='high',status='open',createdAt='2026-10-30T08:00:00.000Z',updatedAt='2026-10-30T08:00:00.000Z',revision=1,history=[dict(id='legacy-created',at='2026-10-30T08:00:00.000Z',actor='Pengguna demo',type='created',to='open',note='Catatan awal')])
 js("(async()=>{const blob=await (await fetch('/demo/ilustrasi-roueG.jpg')).blob();const f="+json.dumps(fixture)+";f.photos=[{id:'legacy-photo',name:'foto-lama.jpg',blob}];return await new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite');t.objectStore('findings').put(f);t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})})()")
 before=next(f for f in rows() if f['id']==fixture['id'])
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('434 source objects and all manual indicators remain in the tree',js(f"document.querySelectorAll('.component-item').length===434 && document.querySelectorAll('.tree-manual-indicator').length==={coverage['linkedObjects']}"))
 check('Counts distinguish classified, unresolved and shared manual references',js("document.querySelector('.tree-classification-summary').textContent.includes('373 terpilah') && document.querySelector('.tree-manual-summary').textContent.includes('365 objek')"))
 check('Old miscellaneous bucket is replaced by meaningful groups',js("![...document.querySelectorAll('.tree-group>summary')].some(e=>e.textContent.includes('Interior & lainnya')) && document.querySelectorAll('.tree-group').length===12"))
 check('Instrument subobjects are collapsed under one assembly initially',js("document.querySelector('[data-assembly=Altimeter]').open===false && document.querySelector('[data-assembly=Altimeter]').querySelectorAll('.component-item').length===16"))
 for term,source in [('ketinggian barometrik','ALT.needle100'),('kursi','sieges.009'),('laju naik','VSI.face'),('skala tekanan','ALT.inhg')]:
  cli('fill','[aria-label="Cari komponen atau nama objek"]',term)
  check('Search finds '+term,js('!!document.querySelector('+json.dumps('[data-source='+json.dumps(source)+']')+')'))
 cli('fill','[aria-label="Cari komponen atau nama objek"]','')
 part('ALT.needle100')
 check('Selection shows human instrument name and stable source identity',js("document.querySelector('.selected-title').textContent.includes('Altimeter') && document.querySelector('.component-manual').dataset.referenceSource==='ALT.needle100' && document.querySelector('[data-source=\"ALT.needle100\"]').closest('details').open"))
 check('Clearing search scrolls the expanded tree to the selected instrument',js("(()=>{let t=document.querySelector('.component-tree').getBoundingClientRect(),a=document.querySelector('.component-item.selected').getBoundingClientRect();return a.top>=t.top && a.bottom<=t.bottom})()"))
 check('Existing finding remains attached with its high-severity indicator',js("document.querySelector('.component-finding-list [data-finding-id=classification-legacy-photo]')!==null && document.querySelector('[data-source=\"ALT.needle100\"] .finding-count').classList.contains('severity-high')"))
 check('Classification does not rewrite legacy labels, photo bytes or history',next(f for f in rows() if f['id']==fixture['id'])==before)
 shot('classified-altimeter-desktop.png')
 fixtures=[('ALT.needle100',462,'altimeter','function'),('AI.float.001',463,'attitudeindicator','function'),('sieges.009',395,'headrests','function'),('intvitres',405,'cabinwindows','function'),('panel2',383,'instrumentpanel','system'),('CommUse100M',383,'avionicsequipment','location'),('KI227.card',571,'directionfinder','function'),('tank',413,'engineinstruments','system'),('pito',460,'pitotstatic','function'),('echappe',409,'exhaust','system'),('lampetrsG',447,'exteriorlighting','system'),('CLOCK.HourHand',382,'clock','location'),('PropPitch',412,'propellercontrollever','function'),('rose',385,'magnetic','location')]
 if RESUME:fixtures=[] if RESUME=='tablet' else fixtures[next(i for i,f in enumerate(fixtures) if f[0]==RESUME):]
 if QUICK:fixtures=[f for f in fixtures if f[0] in ['ALT.needle100','panel2','CommUse100M','KI227.card','tank','rose']]
 for source,page,heading,kind in fixtures:
  part(source);title=js("document.querySelector('.selected-title').textContent")
  check(source+' labels its reference coverage correctly',js("document.querySelector('.component-manual').dataset.coverage")==kind)
  click(f'.component-manual-link[data-pdf-page="{page}"]')
  wait('document.querySelector(".manual-reference-context strong")?.textContent==='+json.dumps(title))
  pdf(page)
  wait("(document.querySelector('.pdf-text p')?.textContent??'').toLowerCase().replace(/[^a-z]/g,'').includes("+json.dumps(heading)+")")
  text=js("document.querySelector('.pdf-text p').textContent")
  check(f'{source} opens matching real PDF page {page}',heading in re.sub('[^a-z]','',text.lower()) and js("document.querySelector('.manual-reference-context strong').textContent")==title)
  if source=='KI227.card':shot('adf-supplement.png')
  back();check(source+' returns to its selected object',js("document.querySelector('.selected-title').textContent")==title and js("document.activeElement.id==='component-manual-title'"))
 for source in ['Gearswitch','Mixture','vitre.004','Switch','porteB']:
  part(source);check(source+' keeps an explicit unmatched reference',js("document.querySelector('.component-manual').dataset.coverage==='unmatched' && !document.querySelector('.component-manual-link')"))
 shot('verification-group-desktop.png')
 part('ALT.face');click('.theme-toggle');cli('set','viewport','1024','768')
 if js("getComputedStyle(document.querySelector('.component-panel')).display==='none'"):click('.mobile-tree-toggle')
 check('Tablet hierarchy retains 44px touch targets and no horizontal overflow',js("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.tree-assembly>summary')].filter(e=>e.getBoundingClientRect().height>0).every(e=>e.getBoundingClientRect().height>=44) && document.querySelector('[data-source=\"ALT.face\"]').getBoundingClientRect().height>=44"))
 shot('tablet-tree-classification.png');click('.close-panel')
 cli('scrollintoview','.component-manual');shot('classified-altimeter-dark-tablet.png')
 click('[data-pdf-page="462"]');pdf(462);check('Tablet PDF navigation works in dark mode',js("document.documentElement.dataset.theme==='dark' && document.documentElement.scrollWidth<=innerWidth"));back()
 cli('set','viewport','768','1024');part('sieges.003');cli('scrollintoview','.component-manual')
 check('Portrait tablet shows readable classification without overflow',js("document.documentElement.scrollWidth<=innerWidth && document.querySelector('.selected-title').textContent.includes('Kursi')"));shot('classified-seats-portrait.png')
 click('[data-pdf-page="394"]');pdf(394);back()
 cli('set','viewport','390','844');part('AI.face' if any(r['sourceName']=='AI.face' for r in catalog['rows']) else 'AI.float');cli('scrollintoview','.component-manual')
 check('Phone selection and reference stay within the viewport',js("document.documentElement.scrollWidth<=innerWidth"));shot('classified-attitude-mobile.png')
 cli('focus','[data-pdf-page="463"]');cli('press','Enter');pdf(463)
 check('New family reference supports keyboard navigation',js("document.querySelector('.pdf-reader').dataset.renderedPage==='463'"));back()
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Legacy finding and image persist after all PDF trips and reload',next(f for f in rows() if f['id']==fixture['id'])==before)
 errors=cli('errors');check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 merged={c['name']:c for c in [*previous,*checks]};checks=list(merged.values())
 (REPORT/('production-ui-verification.json' if PROD else 'ui-verification.json')).write_text(json.dumps(dict(completed=completed,url=URL,quick=QUICK,resumedFrom=RESUME,retriedAssertions=prior_failed,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
 cli('close')
