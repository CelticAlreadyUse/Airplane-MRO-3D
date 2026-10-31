"""End-to-end findings checks in the dedicated mro-phase3 browser session.

Uses a separate browser profile from the user's in-app browser. This script clears
only the findings database inside that test session on startup.
"""
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/phase-3'
REPORT.mkdir(parents=True,exist_ok=True)
checks=[]
completed=False
def cli(*args,script=None):
    p=subprocess.run(['agent-browser','--session','mro-phase3','--json',*args],input=script,text=True,capture_output=True,timeout=45)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
    j=json.loads(p.stdout)
    if not j['success']:raise RuntimeError(j)
    return j['data']
def js(code):return cli('eval','--stdin',script=code)['result']
def wait(code):cli('wait','--fn',code)
def click(selector):cli('scrollintoview',selector);cli('click',selector)
def button(text):
    js("{document.querySelectorAll('[data-automation-click-target]').forEach(b=>b.removeAttribute('data-automation-click-target'));let root=document.querySelector('dialog[open]')??document;let b=[...root.querySelectorAll('button')].find(b=>b.textContent.trim()==="+json.dumps(text)+");if(!b)throw new Error('Button not found in active dialog');b.setAttribute('data-automation-click-target','');b.scrollIntoView({block:'nearest'});true}")
    cli('click','[data-automation-click-target]')
def check(name,result,detail=None):
    checks.append({'name':name,'passed':bool(result),'detail':detail})
    print(('PASS ' if result else 'FAIL ')+name,flush=True)
    if not result:raise AssertionError((name,detail))
def records():
    return js("""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{let db=q.result;let t=db.transaction('findings','readonly');let r=t.objectStore('findings').getAll();t.oncomplete=()=>{db.close();resolve(r.result.map(f=>({...f,photos:f.photos.map(p=>({id:p.id,name:p.name,mime:p.blob.type,bytes:p.blob.size}))})))};t.onerror=()=>{db.close();reject(t.error)}}})""")
def part(source):
    click(f'[data-source="{source}"]')
def new_finding(title,description):
    click('.add-finding')
    wait("!!document.querySelector('.finding-form') && !!document.querySelector('dialog[open] .finding-form')")
    cli('fill','[name="finding-title"]',title)
    cli('fill','[name="finding-description"]',description)
def submit_new():click('.finding-form button[type="submit"]')
def open_overview():
    click('.findings-overview-button')
    wait("document.querySelector('.overview-dialog').open")
def close_detail():
    click('.detail-dialog [aria-label="Tutup detail temuan"]')

try:
    cli('set','viewport','1440','1000')
    cli('open','http://127.0.0.1:3100')
    js("localStorage.setItem('mro-presentation-space','practice');true")
    wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
    # Clear only our isolated automation profile; user's browser data is untouched.
    js("new Promise((resolve,reject)=>{let r=indexedDB.deleteDatabase('mro-visual-findings-demo');r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})")
    cli('reload')
    wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
    part('roueG')
    wait("!!document.querySelector('.add-finding')")
    new_finding('   ','Pengamatan uji valid untuk penyimpanan lokal.')
    check('Form inputs accept keyboard focus',js("document.activeElement.name")== 'finding-description')
    submit_new()
    wait("!!document.querySelector('.finding-form .form-error')")
    check('Whitespace title rejected without creating a record',len(records())==0)
    title='[TEST] Pengamatan roda kiri'
    cli('fill','[name="finding-title"]',title)
    cli('select','[name="finding-category"]','wear')
    cli('select','[name="finding-priority"]','high')
    fixture=REPORT/'invalid-image.jpg'
    fixture.write_bytes(b'This is not an image.')
    cli('upload','input[type="file"]',str(fixture))
    wait("document.querySelector('.finding-form .form-error')?.textContent.includes('tidak dapat dibaca')")
    check('Invalid image is rejected',js("document.querySelectorAll('.photo-drafts figure').length")==0)
    photo=str(ROOT/'reports/phase-1/caravan-geometry-preview.png')
    cli('upload','input[type="file"]',photo,photo,photo,photo)
    wait("document.querySelector('.finding-form .form-error')?.textContent.includes('paling banyak 3')")
    check('More than three photos rejected',js("document.querySelectorAll('.photo-drafts figure').length")==0)
    cli('upload','input[type="file"]',photo)
    wait("document.querySelectorAll('.photo-drafts figure').length===1")
    click('.photo-drafts figure button')
    check('Photo can be removed before saving',js("document.querySelectorAll('.photo-drafts figure').length")==0)
    cli('upload','input[type="file"]',photo)
    wait("document.querySelectorAll('.photo-drafts figure').length===1")
    cli('screenshot',str(REPORT/'new-finding-desktop.png'))
    js("window.__originalIdbTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(name,mode,...rest){if(mode==='readwrite')throw new DOMException('Test write blocked','QuotaExceededError');return window.__originalIdbTransaction.call(this,name,mode,...rest)};true")
    submit_new()
    wait("document.querySelector('.finding-form .form-error')?.textContent.includes('belum tersimpan')")
    check('Write failure keeps draft and photo, without false persistence',len(records())==0 and js("document.querySelector('[name=finding-title]').value")==title and js("document.querySelectorAll('.photo-drafts figure').length")==1)
    js("IDBDatabase.prototype.transaction=window.__originalIdbTransaction;true")
    submit_new()
    wait("!document.querySelector('dialog[open]')")
    first=records()[0]
    first_id=first['id']
    check('Finding saves against correct aircraft and source object',first['aircraftId']=='cessna-208-demo' and first['sourceName']=='roueG' and first['assetId']=='c208-source-0388',first['assetId'])
    check('Photo persists as resized JPEG Blob',first['photos'][0]['mime']=='image/jpeg' and 0<first['photos'][0]['bytes']<=1024*1024,first['photos'][0])
    check('Creation starts one history event and open status',first['status']=='open' and first['revision']==1 and len(first['history'])==1)
    check('Component list shows active finding badge',js("document.querySelector('[data-source=roueG] .finding-count')?.textContent")=='1')
    part('roueD')
    check('Other component does not inherit left-wheel findings',js("document.querySelectorAll('.component-finding-list .finding-row').length")==0)
    new_finding('[TEST] Pengamatan roda kanan','Catatan kedua untuk memastikan identitas komponen tetap terpisah.')
    submit_new();wait("!document.querySelector('dialog[open]')")
    check('Second component gets its own record',len(records())==2 and len({r['assetId'] for r in records()})==2)
    open_overview()
    cli('select','[aria-label="Filter status temuan"]','closed')
    check('Overview status filter shows empty state correctly',js("document.querySelectorAll('.overview-records .finding-row').length")==0)
    cli('select','[aria-label="Filter status temuan"]','all')
    cli('fill','[name="finding-search"]','roda kiri')
    check('Overview search finds matching component',js("document.querySelectorAll('.overview-records .finding-row').length")==1)
    click('.overview-records .finding-row')
    wait("document.querySelector('.detail-dialog').open")
    check('Saved photo renders in detail dialog',js("document.querySelector('.saved-photo-grid img')?.naturalWidth>0"))
    cli('select','[name="finding-status"]','in_progress')
    cli('fill','[name="status-note"]','     ')
    button('Simpan tindak lanjut')
    wait("!!document.querySelector('.detail-dialog .form-error')")
    check('Blank follow-up note rejected without changing history',len(next(r for r in records() if r['id']==first_id)['history'])==1)
    cli('fill','[name="status-note"]','Pengamatan diteruskan untuk pemeriksaan lebih lanjut.')
    button('Simpan tindak lanjut')
    wait("!!document.querySelector('.detail-dialog .save-success')")
    updated=next(r for r in records() if r['id']==first_id)
    check('Status and history commit together',updated['status']=='in_progress' and updated['revision']==2 and len(updated['history'])==2)
    check('Original description and photos survive status update',updated['description']==first['description'] and updated['photos']==first['photos'])
    close_detail();cli('reload')
    wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
    open_overview();cli('fill','[name="finding-search"]','roda kiri');click('.overview-records .finding-row')
    wait("document.querySelector('.detail-dialog').open")
    check('Records, history and photo survive reload',len(records())==2 and js("document.querySelectorAll('.finding-history li').length")==2 and js("document.querySelector('.saved-photo-grid img')?.naturalWidth>0"))

    # A real competing IndexedDB write leaves the open form's expected revision stale.
    js("""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite'),s=t.objectStore('findings'),r=s.get("""+json.dumps(first_id)+""");r.onsuccess=()=>{let f=r.result,at=new Date().toISOString();f.history.push({id:crypto.randomUUID(),at,actor:'Tab uji lain',type:'status_changed',from:f.status,to:'closed',note:'Perubahan bersamaan untuk pengujian.'});f.status='closed';f.revision++;f.updatedAt=at;s.put(f)};t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})""")
    cli('select','[name="finding-status"]','closed')
    cli('fill','[name="status-note"]','Draf lama tidak boleh menimpa perubahan tab lain.')
    button('Simpan tindak lanjut')
    wait("document.querySelector('.detail-dialog').textContent.includes('Gunakan versi terbaru')")
    concurrent=next(r for r in records() if r['id']==first_id)
    check('Stale revision cannot overwrite a concurrent status change',concurrent['revision']==3 and concurrent['status']=='closed' and len(concurrent['history'])==3)
    check('Conflict retains unsaved follow-up text',js("document.querySelector('[name=status-note]').value").startswith('Draf lama'))
    check('Closed record drops out of active finding map',not js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().findingAssetIds.includes("+json.dumps(first['assetId'])+")"))
    button('Gunakan versi terbaru')
    cli('select','[name="finding-status"]','open')
    button('Simpan tindak lanjut')
    wait("!!document.querySelector('.detail-dialog .save-success')")
    reopened=next(r for r in records() if r['id']==first_id)
    check('Rebased update appends history without losing earlier events',reopened['revision']==4 and reopened['status']=='open' and len(reopened['history'])==4)
    cli('scrollintoview','.finding-history')
    cli('screenshot',str(REPORT/'finding-history-desktop.png'))
    close_detail()
    part('roueG')
    click('[aria-label="Hapus pilihan komponen"]')
    check('Active findings feed 3D highlighting',js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().findingAssetIds.length")==2)
    cli('screenshot',str(REPORT/'findings-aircraft-desktop.png'))

    cli('set','viewport','390','844')
    click('.mobile-tree-toggle')
    cli('fill','[aria-label="Cari komponen atau nama objek"]','roueG');part('roueG')
    click('.add-finding');wait("!!document.querySelector('dialog[open] .finding-form')")
    check('Mobile dialog fits viewport without horizontal overflow',js("document.querySelector('dialog[open]').scrollWidth<=document.querySelector('dialog[open]').clientWidth && document.documentElement.scrollWidth<=innerWidth"))
    cli('fill','[name="finding-title"]','Draf sementara di ponsel')
    cli('screenshot',str(REPORT/'new-finding-mobile.png'))
    cli('press','Escape')
    check('Escape protects an unsaved draft',js("document.querySelector('dialog[open] .discard-confirm')!==null"))
    button('Kembali mengisi')
    check('Returning from discard prompt retains draft',js("document.querySelector('[name=finding-title]').value")=='Draf sementara di ponsel')
    button('Batal');button('Buang draf')
    check('Discard closes draft without creating a record',not js("!!document.querySelector('dialog[open]')") and len(records())==2)

    # Read denial must not turn a failed load into a misleading empty notebook.
    js("window.__originalIdbTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(name,mode,...rest){if(mode==='readonly')throw new DOMException('Test read blocked','SecurityError');return window.__originalIdbTransaction.call(this,name,mode,...rest)};document.dispatchEvent(new Event('visibilitychange'));true")
    wait("!!document.querySelector('.component-findings .form-error')")
    check('Read failure is visible and disables creation',js("document.querySelector('.add-finding').disabled"))
    js("IDBDatabase.prototype.transaction=window.__originalIdbTransaction;true")
    click('.component-findings .form-error button')
    wait("!document.querySelector('.component-findings .form-error') && !document.querySelector('.add-finding').disabled")
    check('Retry restores existing records after read failure',len(records())==2)

    js("""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite'),s=t.objectStore('findings'),r=s.get("""+json.dumps(first_id)+""");r.onsuccess=()=>s.put({...r.result,id:'phase3-test-invalid-row',title:123});t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})""")
    js("document.dispatchEvent(new Event('visibilitychange'));true")
    wait("document.querySelector('.component-findings .form-error')?.textContent.includes('tidak dapat dibaca')")
    check('Malformed stored row reports an error without deleting records',len(records())==3)
    js("""new Promise((resolve,reject)=>{let q=indexedDB.open('mro-visual-findings-demo',1);q.onsuccess=()=>{let db=q.result,t=db.transaction('findings','readwrite');t.objectStore('findings').delete('phase3-test-invalid-row');t.oncomplete=()=>{db.close();resolve(true)};t.onerror=()=>reject(t.error)}})""")
    click('.component-findings .form-error button')
    wait("!document.querySelector('.add-finding').disabled")
    check('Valid records remain readable after invalid test row is removed',len(records())==2)
    check('No uncaught browser errors',not cli('errors')['errors'],cli('errors')['errors'])
    cli('set','viewport','1440','1000')
    cli('screenshot',str(REPORT/'findings-component-desktop.png'))
    completed=True
finally:
    (REPORT/'browser-verification.json').write_text(json.dumps({'passed':completed and all(c['passed'] for c in checks),'completed':completed,'checks':checks,'environment':'Dedicated mro-phase3 session; local Nuxt dev server; headless Chromium/SwiftShader.'},indent=2))
