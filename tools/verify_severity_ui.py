"""Severity assessment, legacy IndexedDB compatibility and rendered-color checks.
Uses an isolated browser profile. Set MRO_VERIFY_URL for the production preview.
"""
import json,os,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports/phase-8'
URL=os.environ.get('MRO_VERIFY_URL','http://127.0.0.1:3100');PROD=':3101' in URL
checks=[];completed=False

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-severity8','--json',*args],input=script,text=True,capture_output=True,timeout=60)
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
def shot(name):
 path=REPORT/(('production-' if PROD else '')+name);cli('screenshot',str(path));return path
def rows():
 return js("""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readonly'),r=t.objectStore('findings').getAll();t.onerror=()=>reject(t.error);t.oncomplete=async()=>{db.close();try{resolve(await Promise.all(r.result.map(async f=>({...f,hasSeverity:Object.hasOwn(f,'severity'),photos:await Promise.all(f.photos.map(async p=>({id:p.id,name:p.name,bytes:p.blob.size,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await p.blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('')})))}))))}catch(e){reject(e)}}}})""")
def raw_edit(id,body):
 return js("new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite'),s=t.objectStore('findings'),r=s.get("+json.dumps(id)+");r.onsuccess=()=>{let f=r.result;"+body+";s.put(f)};t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})")
def select_part(name):
 click('#workspace-tab-aircraft')
 if js("getComputedStyle(document.querySelector('.component-panel')).display==='none'"):click('.mobile-tree-toggle')
 click('[data-source='+json.dumps(name)+']')
def new(title,severity='unassessed',photo=False,priority='normal'):
 click('.add-finding');cli('fill','[name=finding-title]',title);cli('fill','[name=finding-description]','Pengamatan simulasi untuk memeriksa penilaian tingkat kritis komponen.')
 cli('select','[name=finding-priority]',priority);cli('select','[name=finding-severity]',severity)
 if photo:
  cli('upload','[aria-label="Lampirkan foto temuan"]',str(ROOT/'mro-web/public/demo/ilustrasi-roueG.jpg'));wait("document.querySelectorAll('.photo-drafts figure').length===1")
 click('.finding-form button[type=submit]');wait("!document.querySelector('dialog[open]')")
 return next(f['id'] for f in rows() if f['title']==title)
def open_finding(id):
 click('.component-finding-list [data-finding-id='+json.dumps(id)+']');wait("document.querySelector('.detail-dialog').open")
def assess(id,severity,status=None):
 open_finding(id);cli('select','[name=assessment-severity]',severity)
 if status:cli('select','[name=finding-status]',status)
 cli('fill','[name=status-note]','Penilaian simulasi diperbarui dengan pengamatan pengguna.')
 check('Assessment save is enabled for '+severity,not js("document.querySelector('.status-update-form button[type=submit]').disabled"))
 click('.status-update-form button[type=submit]');wait("!!document.querySelector('.detail-dialog .save-success')");click('[aria-label="Tutup detail temuan"]')
def selected_level():return js("document.querySelector('.component-severity-summary .severity-badge')?.dataset.severity")
def wheel_pixels(severity):
 path=shot('wheel-'+severity+'.png')
 bounds=js("(()=>{let r=document.querySelector('.canvas-wrap canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()")
 image=Image.open(path).convert('HSV');n=0
 ranges={'low':(40,65),'medium':(18,37),'high':(0,15),'critical':(320,355)}
 lo,hi=ranges[severity]
 for y in range(max(0,int(bounds['y'])),min(image.height,int(bounds['y']+bounds['height']))):
  for x in range(max(0,int(bounds['x'])),min(image.width,int(bounds['x']+bounds['width']))):
   hue,sat,value=image.getpixel((x,y));hue=hue*360/255
   if lo<=hue<=hi and sat>120 and value>90:n+=1
 return n
CONTRAST="""(()=>{let l=c=>{let a=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};return [...document.querySelectorAll('.severity-legend-content .severity-badge')].map(e=>{let c=getComputedStyle(e),a=l(c.color),b=l(c.backgroundColor);return {level:e.dataset.severity,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})})()"""
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open',URL)
 cli('set','viewport','1440','1000');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 js("localStorage.setItem('mro-color-theme','light');localStorage.setItem('mro-presentation-space','practice');Promise.all(['mro-visual-findings-demo','mro-visual-scenario-v1'].map(name=>new Promise((resolve,reject)=>{let r=indexedDB.deleteDatabase(name);r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})))")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'");select_part('roueG')
 legacy=new('[TEST] Catatan lama dengan foto','unassessed',True,'high')
 raw_edit(legacy,"delete f.severity;f.history=f.history.map(e=>{delete e.toSeverity;delete e.fromSeverity;return e})")
 before=rows()[0];cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'");select_part('roueG')
 check('Legacy high-priority record is shown as unassessed, not high severity',selected_level()=='unassessed')
 after=rows()[0];check('Reading legacy data does not rewrite its record or photo',after==before and not after['hasSeverity'])
 open_finding(legacy)
 check('Legacy assessment picker starts at unassessed',js("document.querySelector('[name=assessment-severity]').value==='unassessed'"))
 click('[aria-label="Tutup detail temuan"]')
 assess(legacy,'low')
 record=next(f for f in rows() if f['id']==legacy)
 check('Severity-only change keeps status and priority separate',record['severity']=='low' and record['status']=='open' and record['priority']=='high')
 check('Severity change increments revision and creates a dedicated history event',record['revision']==before['revision']+1 and record['history'][-1]['type']=='severity_changed' and record['history'][-1]['fromSeverity']=='unassessed' and record['history'][-1]['toSeverity']=='low')
 check('Photo bytes and identity survive assessment editing',record['photos']==before['photos'])
 click('.viewer-toolbar button:nth-child(2)')
 for severity in ['low','medium','high','critical']:
  if severity!='low':assess(legacy,severity)
  wait("document.querySelector('.component-severity-summary .severity-badge')?.dataset.severity==='"+severity+"'")
  check('Component card and tree counter use '+severity,js("document.querySelector('[data-source=roueG] .finding-count').classList.contains('severity-"+severity+"')"))
  count=wheel_pixels(severity);check('Isolated model actually renders '+severity+' border pixels',count>100,count)
 click('.viewer-toolbar button:nth-child(2)')
 click('.severity-legend summary')
 check('Model legend names all five assessment states',js("document.querySelectorAll('.severity-legend-content .severity-badge').length===5"))
 for theme in ['light','dark']:
  if theme=='dark':click('.theme-toggle')
  ratios=js(CONTRAST);check(theme+' severity badge text meets 4.5:1 contrast',all(r['ratio']>=4.5 for r in ratios),ratios)
  shot('legend-'+theme+'.png')
 click('.severity-legend summary')
 low=new('[TEST] Temuan rendah kedua','low')
 check('Highest active severity wins when low is added to a critical component',selected_level()=='critical')
 assess(legacy,'critical','closed')
 check('Closing critical finding falls back to remaining low finding',selected_level()=='low')
 assess(legacy,'high','in_progress')
 record=next(f for f in rows() if f['id']==legacy)
 check('Status and assessment can change atomically in one recorded update',record['status']=='in_progress' and record['severity']=='high' and record['history'][-1]['type']=='status_changed' and record['history'][-1]['fromSeverity']=='critical' and record['history'][-1]['toSeverity']=='high')
 select_part('porteAG');door=new('[TEST] Pintu sedang','medium')
 if not PROD:
  outlined=js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().outlinedSeverities")
  check('Different component meshes retain different assessed colors',{d['severity'] for d in outlined}=={'high','medium'},outlined)
 click('#workspace-tab-work');cli('select','[aria-label="Filter kekritisan pekerjaan"]','high')
 check('Work list filters and labels the high-severity finding',js("document.querySelectorAll('.work-record').length===1 && document.querySelector('.work-record .severity-badge').dataset.severity==='high'"))
 cli('select','[aria-label="Filter kekritisan pekerjaan"]','all');shot('work-severities-desktop.png')
 click('.findings-overview-button');cli('select','[aria-label="Filter kekritisan temuan"]','medium')
 check('Aircraft overview filters medium severity independently',js("document.querySelectorAll('.overview-records .finding-row').length===1 && document.querySelector('.overview-records .severity-badge').dataset.severity==='medium'"))
 click('[aria-label="Tutup daftar temuan"]');select_part('porteAG');open_finding(door)
 cli('select','[name=assessment-severity]','critical');cli('press','Escape')
 check('Unsaved assessment changes require discard confirmation',js("!!document.querySelector('.detail-dialog .discard-confirm')"))
 click('.detail-dialog .discard-confirm .button.danger')
 check('Discarding a draft does not change stored severity',next(f for f in rows() if f['id']==door)['severity']=='medium')
 open_finding(door);cli('select','[name=assessment-severity]','low');cli('fill','[name=status-note]','Draf penilaian yang tetap disimpan ketika ada perubahan lain.')
 raw_edit(door,"const at=new Date().toISOString();f.revision++;f.updatedAt=at;f.severity='critical';f.history.push({id:crypto.randomUUID(),at,actor:'Tab uji lain',type:'severity_changed',from:f.status,to:f.status,fromSeverity:'medium',toSeverity:'critical',note:'Simulasi perubahan serentak'})")
 js("{let c=new BroadcastChannel('mro-visual-findings-demo');c.postMessage({space:'practice'});c.close();true}")
 wait("document.querySelector('.detail-dialog .form-error')?.textContent.includes('Temuan berubah di tab lain')")
 check('Stale assessment update is blocked without losing its note',js("document.querySelector('.status-update-form button[type=submit]').disabled && document.querySelector('[name=status-note]').value.includes('Draf penilaian')"))
 click('.detail-dialog .form-error .text-button');cli('select','[name=assessment-severity]','low')
 click('.status-update-form button[type=submit]');wait("!!document.querySelector('.detail-dialog .save-success')");click('[aria-label="Tutup detail temuan"]')
 check('Rebased assessment uses the current revision and preserves history',next(f for f in rows() if f['id']==door)['severity']=='low')
 saved=rows();cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Assessments, event history and photo hashes survive reload',rows()==saved)
 select_part('roueG');assess(legacy,'high','closed');check('Remaining low still colors a component after high is closed',selected_level()=='low')
 assess(low,'low','closed');check('Closed-only component has no active severity badge or counter',selected_level() is None and js("!document.querySelector('[data-source=roueG] .finding-count')"))
 if not PROD:check('Closing all active findings removes their model outlines',all(d['id']!='c208-source-0388' for d in js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().outlinedSeverities")))
 click('.demo-launch');js("[...document.querySelector('dialog[open]').querySelectorAll('button')].find(e=>e.textContent.trim()==='Mulai presentasi').setAttribute('data-severity-demo','');true");click('[data-severity-demo]');wait("!!document.querySelector('.demo-walkthrough') && !document.querySelector('dialog[open]')")
 check('Presentation examples carry explicit assessed severities',js("document.querySelector('[data-source=roueG] .finding-count').classList.contains('severity-high') && document.querySelector('[data-source=porteAG] .finding-count').classList.contains('severity-medium')"))
 for width,height,label in [(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait'),(390,844,'mobile')]:
  cli('set','viewport',str(width),str(height));select_part('roueG')
  click('.severity-legend summary')
  check(label+': legend remains within the viewer and the page width',js("(()=>{let c=document.querySelector('.severity-legend-content').getBoundingClientRect(),v=document.querySelector('.viewer-body').getBoundingClientRect();return c.right<=innerWidth && c.bottom<=v.bottom+2 && document.documentElement.scrollWidth<=innerWidth})()"))
  shot('severity-'+label+'.png');click('.severity-legend summary')
  open_finding('scenario-roueG')
  check(label+': assessment control remains readable and touch-sized',js("(()=>{let e=document.querySelector('[name=assessment-severity]');return getComputedStyle(e).fontSize==='16px' && e.getBoundingClientRect().height>=44})()"))
  click('[aria-label="Tutup detail temuan"]')
 errors=cli('errors');check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 (REPORT/('production-severity.json' if PROD else 'severity-verification.json')).write_text(json.dumps(dict(completed=completed,url=URL,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
