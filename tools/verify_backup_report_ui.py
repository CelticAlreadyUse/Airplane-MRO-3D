"""Real backup/PDF downloads, atomic restore, stale-tab safety and responsive UI."""
import base64,json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports/phase-12'
URL=os.environ.get('MRO_VERIFY_URL','http://127.0.0.1:3100');PROD=':3101' in URL
checks=[];completed=False;fixture=REPORT/'fixture.backup.json'

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-backup12','--json',*args],input=script,text=True,capture_output=True,timeout=60)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 r=json.loads(p.stdout)
 if not r['success']:raise RuntimeError(r)
 return r['data']
def js(s):return cli('eval','--stdin',script=s)['result']
def wait(s):cli('wait','--fn',s)
def click(s):cli('scrollintoview',s);cli('click',s)
def check(name,value,detail=None):
 checks.append(dict(name=name,passed=bool(value),detail=detail));print(('PASS ' if value else 'FAIL ')+name,flush=True)
 if not value:raise AssertionError((name,detail))
def tab(name):click('#workspace-tab-'+name);wait(f"document.querySelector('#workspace-tab-{name}').getAttribute('aria-selected')==='true'")
def shot(name):cli('screenshot',str(REPORT/(('production-' if PROD else '')+name)))
def downloads():
 js("window.__downloads=[];window.__anchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){let d={name:this.download,ready:false};window.__downloads.push(d);fetch(this.href).then(r=>r.blob()).then(async b=>{d.type=b.type;const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));d.base64=btoa(s);d.size=a.length;d.ready=true})}return window.__anchorClick.call(this)};true")
def save_download(path,suffix):
 wait("window.__downloads.at(-1)?.ready&&window.__downloads.at(-1).name.endsWith("+json.dumps(suffix)+")")
 d=js("window.__downloads.filter(d=>d.ready&&d.name.endsWith("+json.dumps(suffix)+")).at(-1)")
 Path(path).write_bytes(base64.b64decode(d['base64']));return d
ROWS="""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readonly'),r=t.objectStore('findings').getAll();const photos=ps=>Promise.all(ps.map(async p=>({id:p.id,name:p.name,size:p.blob.size,sha:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await p.blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('')})));t.oncomplete=async()=>{db.close();resolve(await Promise.all(r.result.map(async f=>({...f,photos:await photos(f.photos),...(f.repairCards?{repairCards:await Promise.all(f.repairCards.map(async c=>({...c,beforePhotos:await photos(c.beforePhotos),afterPhotos:await photos(c.afterPhotos)})))}:{})}))))};t.onerror=()=>reject(t.error)}})"""
def rows(space='practice'):return js(ROWS.replace('mro-visual-findings-demo','mro-visual-scenario-v1' if space=='scenario' else 'mro-visual-findings-demo'))
def open_backup():tab('work');click('.open-backup');wait("document.querySelector('.backup-dialog').open")
def choose(path=fixture):
 cli('upload','[aria-label="Pilih file backup"]',str(path));wait("!!document.querySelector('.backup-preview') || !!document.querySelector('.backup-error')")
def restore():
 cli('check','[name=confirm-restore]');click('.restore-backup');wait("!!document.querySelector('.backup-success') || !!document.querySelector('.backup-error')")
def close_backup():click('[aria-label="Tutup data dan backup"]');wait("!document.querySelector('.backup-dialog').open")
def job():return next(f for f in rows() if f['id']=='backup-report-example')
def stock():return js("[2,3,4].map(i=>parseInt(document.querySelector('[data-part-id=inv-01]').children[i].textContent))")
def open_detail():
 tab('work');click('[data-finding-id=backup-report-example] .button.primary');wait("document.querySelector('.detail-dialog').open")
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open',URL)
 cli('set','viewport','1440','1000');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 js("localStorage.setItem('mro-color-theme','light');localStorage.setItem('mro-presentation-space','practice');Promise.all(['mro-visual-findings-demo','mro-visual-scenario-v1'].map(name=>new Promise((resolve,reject)=>{let q=indexedDB.deleteDatabase(name);q.onsuccess=()=>resolve(true);q.onerror=()=>reject(q.error)})))")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'");downloads();open_backup()
 click('.export-backup');wait("!!document.querySelector('.backup-success')")
 empty=REPORT/('production-empty.backup.json' if PROD else 'empty.backup.json');save_download(empty,'.json')
 check('Empty mode can be backed up as a self-contained valid file',json.loads(empty.read_text())['records']==[])
 choose();check('Import preview shows jobs, all photo attachments, cards and material requests',js("[...document.querySelectorAll('.backup-counts strong')].map(e=>e.textContent).join(',')==='2,5,2,1'"))
 check('Replacement is disabled until the user explicitly acknowledges it',js("document.querySelector('.restore-backup').disabled"));shot('backup-preview-desktop.png')
 restore();check('Validated backup restores both jobs with a restore audit event',len(rows())==2 and job()['history'][-1]['type']=='backup_restored' and job()['revision']>1000000000000)
 original=json.loads(fixture.read_text());photo_hash=next(iter(original['photos']))
 check('Original and repair photo bytes survive the browser restore',job()['photos'][0]['sha']==photo_hash and job()['repairCards'][1]['afterPhotos'][0]['sha']==photo_hash)
 before=rows()
 invalid=json.loads(fixture.read_text());h=next(iter(invalid['photos']));invalid['photos'][h]['base64']='A'+invalid['photos'][h]['base64'][1:]
 bad=REPORT/'invalid-photo.backup.json';bad.write_text(json.dumps(invalid))
 choose(bad);check('Modified image data is rejected before any database changes',js("document.querySelector('.backup-error').textContent.includes('checksum')") and rows()==before)
 click('.export-backup');wait("!!document.querySelector('.backup-success')")
 exported=REPORT/('production-browser.backup.json' if PROD else 'browser.backup.json');save_download(exported,'.json');export_json=json.loads(exported.read_text())
 check('Real backup download preserves all material/review data and deduplicates photos',len(export_json['records'])==2 and len(export_json['photos'])==1 and next(r for r in export_json['records'] if r['id']=='backup-report-example')['repairCards'][1]['review']['result']=='accepted')
 choose()
 # Simulate a valid write from another tab after the preview was prepared.
 js("new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite'),s=t.objectStore('findings'),r=s.get('backup-report-example');r.onsuccess=()=>{let f=r.result;f.title='Catatan diperbarui tab lain';f.revision++;f.updatedAt=new Date().toISOString();s.put(f)};t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})")
 changed=rows();restore();check('A changed target invalidates the preview instead of overwriting new work',js("document.querySelector('.backup-error').textContent.includes('berubah')") and rows()==changed)
 choose();cli('check','[name=confirm-restore]')
 js("window.__oldPut=IDBObjectStore.prototype.put;window.__putCount=0;IDBObjectStore.prototype.put=function(...args){if(this.name==='findings'&&++window.__putCount===2)throw new DOMException('Test restore write failure','QuotaExceededError');return window.__oldPut.apply(this,args)};true")
 click('.restore-backup');wait("!!document.querySelector('.backup-error')")
 check('Failure during replacement rolls back deletions and earlier writes atomically',rows()==changed)
 js("IDBObjectStore.prototype.put=window.__oldPut;true")
 choose();stale_revision=job()['revision'];restore();check('Repeated restore replaces records without duplicating jobs or part quantities',len(rows())==2 and job()['revision']>stale_revision)
 if not PROD:
  err=js("(async()=>{let r=await import('/_nuxt/utils/findingsRepository.ts');try{await r.changeFindingStatus('backup-report-example',"+str(stale_revision)+",'closed','Uji draf lama setelah restore.','practice','high');return 'accepted'}catch(e){return e.message}})()")
  check('Open drafts from before restore cannot overwrite restored data', 'sudah berubah' in err)
 close_backup();tab('inventory');check('Restored material ledger derives the original stock exactly once',stock()==[3,1,2])
 open_detail();check('Restoration is labelled in the existing history',js("document.querySelector('.finding-history').textContent.includes('Data dipulihkan dari backup')"))
 click('.export-work-report');wait("!!document.querySelector('.work-report-export .save-success') || !!document.querySelector('.work-report-export .form-error')")
 pdf=REPORT/('production-browser-report.pdf' if PROD else 'browser-report.pdf');d=save_download(pdf,'.pdf')
 check('Work report downloads a real PDF from the persisted job snapshot',d['type']=='application/pdf' and pdf.read_bytes().startswith(b'%PDF-'))
 text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
 check('Downloaded PDF includes photos, both repair outcomes, Unicode names and restore history',all(s in text for s in ['José Wibowo','Perlu pengerjaan ulang','Diterima - pekerjaan ditutup','Sebelum 1','Sesudah 1','LOT-DEMO-12','Data dipulihkan dari backup']))
 shot('work-report-download.png');click('[aria-label="Tutup detail temuan"]')
 practice_before=rows()
 click('.demo-launch');click('.demo-dialog .button.primary');wait("localStorage.getItem('mro-presentation-space')==='scenario' && !document.querySelector('.demo-dialog').open")
 open_backup();click('.export-backup');wait("!!document.querySelector('.backup-success')")
 scenario_file=REPORT/('production-scenario.backup.json' if PROD else 'scenario.backup.json');save_download(scenario_file,'.json')
 check('Presentation exports its own three records and repair evidence',json.loads(scenario_file.read_text())['space']=='scenario' and len(json.loads(scenario_file.read_text())['records'])==3)
 choose(scenario_file);restore();check('Presentation restore never modifies practice records',rows()==practice_before and len(rows('scenario'))==3)
 choose(fixture);check('Cross-mode preview explicitly identifies the backup destination',js("document.querySelector('.backup-preview-heading').textContent.includes('latihan')"))
 restore();check('Restoring another mode activates that mode without resetting its restored data',js("localStorage.getItem('mro-presentation-space')==='practice'") and len(rows())==2 and len(rows('scenario'))==3)
 close_backup();cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Restored records, card images and mode choice persist after reload',job()['repairCards'][1]['afterPhotos'][0]['sha']==photo_hash and js("localStorage.getItem('mro-presentation-space')==='practice'"))
 # Retry an asset failure: report generation stays local and leaves data untouched.
 downloads();open_detail();before_font=rows()
 js("window.__reportFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/fonts/reports/')?Promise.resolve(new Response('',{status:404})):window.__reportFetch(url,...args);true")
 click('.export-work-report');wait("!!document.querySelector('.work-report-export .form-error')")
 check('A missing report asset gives a recoverable error without modifying work',rows()==before_font and js("window.__downloads.length===0"))
 js("window.fetch=window.__reportFetch;true");click('.export-work-report');wait("!!document.querySelector('.work-report-export .save-success')")
 check('Retry can generate the report after assets become available',js("window.__downloads.length===1"));click('[aria-label="Tutup detail temuan"]')
 cli('set','viewport','1024','768');open_backup();choose()
 check('Tablet backup preview and controls fit the viewport',js("document.documentElement.scrollWidth<=innerWidth && document.querySelector('.restore-backup').getBoundingClientRect().height>=44 && parseFloat(getComputedStyle(document.querySelector('[name=backup-space]')).fontSize)>=16"));shot('backup-tablet.png');close_backup()
 click('.theme-toggle');cli('set','viewport','390','844');open_backup();choose()
 check('Dark phone preview preserves readable controls without horizontal overflow',js("document.documentElement.scrollWidth<=innerWidth && document.documentElement.dataset.theme==='dark'"));shot('backup-dark-mobile.png');close_backup()
 open_detail();check('PDF action remains reachable with a 44px touch target on phone',js("document.querySelector('.export-work-report').getBoundingClientRect().height>=44"));shot('report-action-mobile.png')
 errors=cli('errors');check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 (REPORT/('production-backup-ui.json' if PROD else 'backup-ui.json')).write_text(json.dumps(dict(completed=completed,url=URL,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
 cli('close')
