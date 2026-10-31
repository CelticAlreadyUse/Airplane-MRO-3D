"""Repair evidence, examiner decisions, material usage/returns and legacy storage."""
import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports/phase-11'
URL=os.environ.get('MRO_VERIFY_URL','http://127.0.0.1:3100');PROD=':3101' in URL
checks=[];completed=False

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-repair11','--json',*args],input=script,text=True,capture_output=True,timeout=60)
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
def tab(name):click('#workspace-tab-'+name);wait(f"document.querySelector('#workspace-tab-{name}').getAttribute('aria-selected')==='true'")
def shot(name):cli('screenshot',str(REPORT/(('production-' if PROD else '')+name)))
def rows(space='practice'):
 script="""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readonly'),r=t.objectStore('findings').getAll();const photos=ps=>Promise.all(ps.map(async p=>({id:p.id,name:p.name,bytes:p.blob.size,sha:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await p.blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('')})));t.oncomplete=async()=>{db.close();resolve(await Promise.all(r.result.map(async f=>({...f,photos:await photos(f.photos),...(f.repairCards?{repairCards:await Promise.all(f.repairCards.map(async c=>({...c,beforePhotos:await photos(c.beforePhotos),afterPhotos:await photos(c.afterPhotos)})))}:{})}))))};t.onerror=()=>reject(t.error)}})"""
 return js(script.replace('mro-visual-findings-demo','mro-visual-scenario-v1' if space=='scenario' else 'mro-visual-findings-demo'))
def job(id='repair-a'):return next(f for f in rows() if f['id']==id)
def stock():return js("[2,3,4].map(i=>parseInt(document.querySelector('[data-part-id=inv-01]').children[i].textContent))")
def open_card(id='repair-a'):
 tab('work');click('[data-finding-id='+id+'] .work-repair-action');wait("document.querySelector('.repair-dialog').open")
def fill_card(technician='Teknisi Demo',action='Penggantian dan pengamatan ulang dicatat sebagai simulasi pengerjaan.'):
 cli('fill','[name=repair-technician]',technician);cli('fill','[name=repair-actions]',action);cli('fill','[name=repair-reference]','Dokumen pengerjaan DEMO-01, rev 1, bagian pengamatan.')
 cli('upload','[aria-label="Foto sesudah pengerjaan"]',str(ROOT/'mro-web/public/demo/ilustrasi-roueG.jpg'))
 wait("document.querySelectorAll('[data-stage=after] figure').length===1 && !document.querySelector('.repair-dialog button[type=submit]').disabled")
def save_card():click('.repair-dialog button[type=submit]');wait("!document.querySelector('.repair-dialog').open")
def dispose(kind,qty=1):
 tab('inventory');click('[data-request-id=issued-a] .'+('use' if kind=='used' else 'return')+'-material');wait("document.querySelector('.material-dialog').open")
 cli('fill','[name=request-quantity]',str(qty));cli('fill','[name=material-actor]','Pelaksana Demo')
 if kind=='used':cli('fill','[name=material-serial]','LOT-DEMO-11')
 cli('fill','[name=request-note]','Catatan jumlah material untuk pengerjaan simulasi.');click('.material-dialog button[type=submit]');wait("!document.querySelector('.material-dialog').open")
def examiner(result='accepted',name='Pemeriksa Demo'):
 cli('fill','[name=repair-inspector]',name);cli('select','[name=repair-result]',result);cli('fill','[name=repair-review-note]','Hasil pemeriksaan simulasi telah ditinjau dan dicatat.')
 for key in ['record','photos','materials']:
  cli('check' if result=='accepted' else 'uncheck','[name=review-check-'+key+']')
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open',URL)
 cli('set','viewport','1440','1000');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 js("localStorage.setItem('mro-color-theme','light');localStorage.setItem('mro-presentation-space','practice');true")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 js("""(async()=>{let blob=await(await fetch('/demo/ilustrasi-roueG.jpg')).blob();const at='2026-10-31T01:00:00.000Z',base={aircraftId:'cessna-208-demo',assetId:'c208-source-0388',sourceName:'roueG',componentLabel:'Roda utama kiri',title:'[TEST] Pengerjaan dan pemeriksaan',description:'Pengamatan awal sebelum pengerjaan simulasi.',category:'wear',priority:'normal',createdAt:at,updatedAt:at,revision:1,history:[{id:'original-event',at,actor:'Pengguna demo',type:'created',to:'open',note:'Catatan awal tersimpan.'}],photos:[]};return new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite'),s=t.objectStore('findings');s.clear();s.put({...base,id:'repair-a',status:'in_progress',severity:'high',photos:[{id:'old-photo',name:'foto-awal.jpg',blob}],materialRequests:[{id:'issued-a',partId:'inv-01',quantity:2,note:'Dua unit sudah diserahkan sebelum fitur pemakaian.',status:'issued',createdAt:at,updatedAt:at}]});s.put({...base,id:'repair-b',status:'in_progress'});s.put({...base,id:'legacy-c',status:'closed'});s.put({...base,id:'repair-d',status:'in_progress',materialRequests:[{id:'issued-d',partId:'inv-04',quantity:2,note:'Material untuk pengujian transaksi bersamaan.',status:'issued',createdAt:at,updatedAt:at}]});t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})})()""")
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'");before=job()
 tab('work');wait("document.querySelectorAll('.work-record').length===4")
 check('Legacy jobs and issued parts load without migration',len(rows())==4 and 'repairCards' not in job('legacy-c') and 'dispositions' not in before['materialRequests'][0])
 click('[data-finding-id=legacy-c] .button.primary');wait("document.querySelector('.detail-dialog').open")
 check('Legacy closed work is labelled without invented repair evidence',js("document.querySelector('.work-repair-summary').textContent.includes('Catatan lama')"));click('[aria-label="Tutup detail temuan"]')
 open_card();check('Unaccounted materials block repair submission',js("document.querySelector('.repair-dialog button[type=submit]').disabled && document.querySelector('.repair-dialog .repair-notice').textContent.includes('catat seluruh')"));click('[aria-label="Tutup kartu pengerjaan"]')
 tab('inventory');check('Active queue includes old issued material still needing accounting',js("!!document.querySelector('[data-request-id=issued-a] .use-material')") and stock()==[2,1,1])
 dispose('used');check('Usage records serial/lot without consuming stock twice',stock()==[2,1,1] and job()['materialRequests'][0]['dispositions'][0]['serialLot']=='LOT-DEMO-11')
 dispose('returned');check('Partial unused return restores physical stock exactly once',stock()==[3,1,2] and sum(e['quantity'] for e in job()['materialRequests'][0]['dispositions'])==2)
 cli('select','[aria-label="Filter permintaan sparepart"]','all');check('Fully accounted requests no longer offer duplicate usage or returns',not js("!!document.querySelector('[data-request-id=issued-a] .return-material')"));shot('material-usage-return-ledger.png')
 # The existing request / prepare / handover flow must still lead into usage accounting.
 tab('work');click('[data-finding-id=repair-b] .request-material');wait("document.querySelector('.material-dialog').open");cli('select','[name=request-part]','inv-07');cli('fill','[name=request-note]','Pelumas untuk pekerjaan simulasi.');click('.material-dialog button[type=submit]');wait("!document.querySelector('.material-dialog').open")
 req_b=job('repair-b')['materialRequests'][-1]['id'];tab('inventory')
 for action in ['prepare','issue']:
  target='[data-request-id='+json.dumps(req_b)+'] .'+action+'-material'
  wait('!!document.querySelector('+json.dumps(target)+')')
  click(target);wait("document.querySelector('.material-dialog').open");cli('fill','[name=request-note]','Tindakan penyiapan / penyerahan simulasi.');click('.material-dialog button[type=submit]');wait("!document.querySelector('.material-dialog').open")
 check('New requests still pass through preparation and handover',job('repair-b')['materialRequests'][-1]['status']=='issued')
 target='[data-request-id='+json.dumps(req_b)+'] .use-material'
 wait('!!document.querySelector('+json.dumps(target)+')')
 click(target);wait("document.querySelector('.material-dialog').open");cli('fill','[name=material-actor]','Teknisi Lain');cli('fill','[name=request-note]','Seluruh jumlah dipakai untuk pekerjaan ini.');click('.material-dialog button[type=submit]');wait("!document.querySelector('.material-dialog').open")
 check('Freshly issued parts can be fully accounted before a repair card',job('repair-b')['materialRequests'][-1]['dispositions'][0]['quantity']==1)
 if not PROD:
  r=js("""(async()=>{let r=await import('/_nuxt/utils/findingsRepository.ts'),f=(await r.listFindings()).find(x=>x.id==='repair-d');const result=await Promise.allSettled([1,2].map(()=>r.changeFindingMaterial(f.id,f.revision,{kind:'disposition',requestId:'issued-d',disposition:'returned',quantity:2,actor:'Gudang Demo',note:'Pengembalian bersamaan dalam uji.'})));return result.map(x=>x.status)})()""")
  check('Concurrent real return transactions cannot restock twice',sorted(r)==['fulfilled','rejected']);js("document.dispatchEvent(new Event('visibilitychange'));true")
  err=js("(async()=>{let r=await import('/_nuxt/utils/findingsRepository.ts');try{await r.changeFindingStatus('repair-a',3,'closed','Mencoba melewati pemeriksaan.');return 'accepted'}catch(e){return e.message}})()")
  check('Repository prevents direct closure before repair/review', 'kartu pengerjaan' in err)
 open_card();fill_card();check('Before evidence is reused without modifying the original photo',js("document.querySelectorAll('[data-stage=before] figure').length===1") and job()['photos']==before['photos']);shot('repair-card-before-after.png')
 js("window.__repairTx=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(name,mode,...rest){if(mode==='readwrite')throw new DOMException('Test full storage','QuotaExceededError');return window.__repairTx.call(this,name,mode,...rest)};true")
 click('.repair-dialog button[type=submit]');wait("!!document.querySelector('.repair-dialog .form-error')")
 check('Failed card write preserves action text, staged photos and old data',not job().get('repairCards') and js("document.querySelector('[name=repair-actions]').value.length>10 && document.querySelectorAll('[data-stage=after] figure').length===1"))
 js("IDBDatabase.prototype.transaction=window.__repairTx;true");save_card()
 pending=job();check('Complete repair card enters pending review with material snapshot',pending['status']=='awaiting_review' and pending['repairCards'][0]['materials'][0]['used']==1 and pending['repairCards'][0]['materials'][0]['returned']==1)
 check('Pending review freezes material requests in the work UI',js("document.querySelector('[data-finding-id=repair-a] .request-material').disabled"))
 open_card();check('Examiner sees action, document, before/after evidence and material snapshot',js("document.querySelector('.repair-readout').textContent.includes('LOT-DEMO-11') && document.querySelectorAll('.repair-readout .repair-evidence img').length===2"));shot('review-evidence.png')
 examiner(name='Teknisi Demo');click('.repair-dialog button[type=submit]');wait("!!document.querySelector('.repair-dialog .form-error')")
 check('Self-review is rejected without losing the examiner draft',job()['status']=='awaiting_review' and js("document.querySelector('.repair-dialog .form-error').textContent.includes('berbeda')"))
 examiner('rework');save_card();check('Rework decision keeps the first card and examiner note',job()['status']=='rework' and job()['repairCards'][0]['review']['result']=='rework')
 open_card();fill_card(action='Pengerjaan ulang simulasi setelah membaca catatan pemeriksa.');save_card()
 check('Resubmission creates a new evidence cycle and retains the rejected one',len(job()['repairCards'])==2 and job()['repairCards'][0]['review']['result']=='rework' and 'review' not in job()['repairCards'][1])
 open_card();examiner();save_card();accepted=job()
 check('Examiner acceptance closes work and retains both cycles',accepted['status']=='closed' and accepted['repairCards'][1]['review']['result']=='accepted' and len(accepted['repairCards'])==2)
 click('[data-finding-id=repair-a] .button.primary');wait("document.querySelector('.detail-dialog').open")
 check('Existing history includes usage, return, submission, rework and acceptance',js("(()=>{let t=document.querySelector('.finding-history').textContent;return ['Pemakaian part','Part dikembalikan','Kartu pengerjaan diajukan','Pengerjaan ulang diminta','Hasil diterima'].every(s=>t.includes(s))})()"));shot('closed-work-with-history.png');click('[aria-label="Tutup detail temuan"]')
 check('Original photo bytes, source identity and damage level survive all cycles',accepted['photos']==before['photos'] and accepted['assetId']==before['assetId'] and accepted['severity']==before['severity'])
 if not PROD:
  r=js("""(async()=>{let r=await import('/_nuxt/utils/findingsRepository.ts'),blob=await(await fetch('/demo/ilustrasi-roueG.jpg')).blob(),f=(await r.listFindings()).find(x=>x.id==='repair-b'),end=new Date(Date.now()-60000).toISOString(),start=new Date(Date.now()-600000).toISOString();f=await r.changeFindingRepair(f.id,f.revision,{kind:'submit',draft:{technician:'Teknisi Lain',startedAt:start,completedAt:end,actions:'Tindakan simulasi untuk uji pemeriksaan serentak.',reference:'Dokumen demo rev 1.',beforePhotos:[{id:'b-before',name:'before.jpg',blob}],afterPhotos:[{id:'b-after',name:'after.jpg',blob}]}});const command={kind:'review',cardId:f.repairCards.at(-1).id,inspector:'Pemeriksa Lain',result:'accepted',note:'Pemeriksaan bersamaan untuk pengujian.',checks:['record','photos','materials']};const result=await Promise.allSettled([1,2].map(()=>r.changeFindingRepair(f.id,f.revision,command)));return result.map(x=>x.status)})()""")
  check('Concurrent review transactions accept exactly once',sorted(r)==['fulfilled','rejected'])
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'");tab('inventory')
 check('Repair cards, photo hashes and returned stock persist after reload',job()['repairCards']==accepted['repairCards'] and stock()==[3,1,2])
 # Mode separation and a ready-to-present sample card.
 click('.demo-launch');click('.demo-dialog .button.primary');wait("localStorage.getItem('mro-presentation-space')==='scenario' && !document.querySelector('.demo-dialog').open")
 scenario=rows('scenario');sample=next(f for f in scenario if f['sourceName']=='helice')
 check('Presentation includes a clearly simulated accepted repair card',sample['status']=='closed' and sample['repairCards'][0]['review']['result']=='accepted' and 'ilustrasi' in sample['repairCards'][0]['actions'].lower())
 tab('inventory');check('Presentation stock remains independent from practice returns',stock()==[4,1,3] and job()['repairCards']==accepted['repairCards'])
 click('.demo-launch');click('.demo-dialog .button.primary');wait("!document.querySelector('.demo-dialog').open")
 check('Resetting presentation does not erase practice evidence',job()['repairCards']==accepted['repairCards'])
 click('.demo-launch');click('.demo-dialog .dialog-footer .button:not(.primary)');wait("localStorage.getItem('mro-presentation-space')==='practice' && !document.querySelector('.demo-dialog').open")
 # Work-detail entry point, larger controls and draft protection on tablet/phone.
 cli('set','viewport','1024','768');tab('work');click('[data-finding-id='+('repair-b' if PROD else 'repair-d')+'] .button.primary');wait("document.querySelector('.detail-dialog').open");click('.open-repair-card');wait("document.querySelector('.repair-dialog').open")
 check('Finding details open the card without stacking dialogs',not js("document.querySelector('.detail-dialog').open"))
 cli('fill','[name=repair-technician]','Teknisi Tablet')
 check('Tablet card fields fit and use readable 16px text',js("document.documentElement.scrollWidth<=innerWidth && parseFloat(getComputedStyle(document.querySelector('[name=repair-technician]')).fontSize)>=16"));shot('repair-card-tablet.png')
 click('[aria-label="Tutup kartu pengerjaan"]');wait("!!document.querySelector('.repair-dialog .discard-confirm')");check('Unsaved repair evidence prompts before discarding',True);click('.repair-dialog .discard-confirm .button.danger')
 click('.theme-toggle');cli('set','viewport','390','844');open_card('repair-b' if PROD else 'repair-d')
 check('Mobile card and fixed footer fit the viewport',js("document.documentElement.scrollWidth<=innerWidth && document.querySelector('.repair-dialog button[type=submit]').getBoundingClientRect().height>=44"));shot('repair-card-dark-mobile.png');click('[aria-label="Tutup kartu pengerjaan"]')
 errors=cli('errors');check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 (REPORT/('production-repair-ui.json' if PROD else 'repair-ui.json')).write_text(json.dumps(dict(completed=completed,url=URL,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
 cli('close')
