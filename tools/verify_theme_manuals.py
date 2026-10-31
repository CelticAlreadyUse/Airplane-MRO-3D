"""Browser checks for themes, PDF image rendering, navigation, and form contrast.
Runs only in the isolated mro-theme-validation profile; never connects user storage.
"""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/phase-5'
checks=[];completed=False

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-theme-validation','--json',*args],input=script,text=True,capture_output=True,timeout=60)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 result=json.loads(p.stdout)
 if not result['success']:raise RuntimeError(result)
 return result['data']
def js(code):return cli('eval','--stdin',script=code)['result']
def wait(code):cli('wait','--fn',code)
def click(selector):cli('scrollintoview',selector);cli('click',selector)
def check(name,result,detail=None):
 checks.append({'name':name,'passed':bool(result),'detail':detail})
 print(('PASS ' if result else 'FAIL ')+name,flush=True)
 if not result:raise AssertionError((name,detail))
def shot(name):cli('screenshot',str(REPORT/name))
def diagnostics():return js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics()")
def pdf_ready(page,total):wait(f"document.querySelector('.pdf-reader')?.dataset.renderedPage==='{page}' && document.querySelector('.pdf-reader')?.dataset.pageCount==='{total}' && document.querySelector('.pdf-reader')?.getAttribute('aria-busy')==='false'")
def pixels():return js("(()=>{let c=document.querySelector('.pdf-paper canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<180)n++;return {ink:n,width:c.width,height:c.height}})()")
CONTRAST="""(()=>{
 const lum=c=>{let a=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const ratio=(a,b)=>{a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 let e=document.querySelector('[name=finding-description]'),s=getComputedStyle(e),button=getComputedStyle(document.querySelector('.finding-form button.primary'));
 return {text:ratio(s.color,s.backgroundColor),placeholder:ratio(getComputedStyle(e,'::placeholder').color,s.backgroundColor),border:ratio(s.borderTopColor,s.backgroundColor),button:ratio(button.color,button.backgroundColor),field:s.backgroundColor,body:getComputedStyle(e.closest('.dialog-body')).backgroundColor}
})()"""
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open','http://127.0.0.1:3100')
 cli('set','viewport','1440','1000')
 js("localStorage.removeItem('mro-color-theme');localStorage.setItem('mro-presentation-space','practice');true")
 cli('set','media','dark');cli('reload')
 wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('System dark preference sets UI and 3D theme',js("document.documentElement.dataset.theme==='dark'") and diagnostics()['dark'])
 check('Source model still has all 434 identities and 392 textured objects',diagnostics()['meshCount']==434 and diagnostics()['texturedObjects']==392)
 cli('set','media','light');wait("document.documentElement.dataset.theme==='light'")
 check('Unselected theme follows live system changes',not diagnostics()['dark'])
 click('.theme-toggle');cli('set','media','light')
 check('Explicit dark preference overrides system and persists',js("document.documentElement.dataset.theme==='dark' && localStorage.getItem('mro-color-theme')==='dark'"))
 cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Dark preference survives reload',diagnostics()['dark'])
 shot('dark-desktop.png')
 click('[data-source=roueG]');wait("!document.querySelector('.add-finding').disabled")
 click('.add-finding')
 check('Inputs remain empty with visible guidance',js("document.querySelector('[name=finding-title]').value==='' && document.querySelector('#finding-title-help').textContent.includes('3–120')"))
 check('Required fields retain label, description and validation',js("(()=>{let e=document.querySelector('[name=finding-description]');return e.required && e.minLength===10 && e.getAttribute('aria-describedby').includes('finding-description-help')})()"))
 contrast=js(CONTRAST)
 check('Dark form has readable text, placeholders, borders and primary button',contrast['text']>=4.5 and contrast['placeholder']>=4.5 and contrast['border']>=3 and contrast['button']>=4.5,contrast)
 shot('form-dark-desktop.png')
 cli('fill','[name=finding-title]','[TEST] Field mode gelap')
 cli('fill','[name=finding-description]','Pengamatan uji tampilan gelap di profil pengujian terpisah.')
 click('.finding-form button[type=submit]');wait("!document.querySelector('dialog[open]')")
 check('Dark form saves a real component finding',js("document.querySelector('.component-finding-list').textContent.includes('[TEST] Field mode gelap')"))
 before=diagnostics()['camera']
 click('#workspace-tab-aircraft');cli('press','ArrowRight')
 check('Workspace tabs work by keyboard',js("document.querySelector('#workspace-tab-manuals').getAttribute('aria-selected')==='true' && document.activeElement.id==='workspace-tab-manuals'"))
 pdf_ready(79,1112)
 p=pixels();check('POH scanned page renders image ink, not an empty canvas',p['ink']>3000,p)
 check('POH metadata names training status, revision and applicability',js("document.querySelector('.manual-reference-note').textContent.includes('Arsip pelatihan') && document.querySelector('.manual-metadata').textContent.includes('20800277') && document.querySelector('.manual-metadata').textContent.includes('2002')"))
 check('Document source and controlled maintenance portal are linked',js("document.querySelector('.manual-document-heading a').href.includes('aeroelectric.com') && document.querySelector('.official-manual a').href==='https://pubs.txtav.com/'"))
 check('3D rendering pauses while reader is active',not diagnostics()['active'])
 shot('manual-dark-desktop.png')
 click('[aria-label="Halaman PDF berikutnya"]');pdf_ready(80,1112)
 check('Next-page control displays page 80',True)
 click('[aria-label="Halaman PDF sebelumnya"]');pdf_ready(79,1112)
 check('Previous-page control returns to page 79',True)
 old=pixels()['width'];click('[aria-label="Perbesar PDF"]');pdf_ready(79,1112)
 check('Zoom enlarges the rendered page',pixels()['width']>old)
 click('.pdf-fit');pdf_ready(79,1112)
 check('Fit mode switches to full-width reading',js("document.querySelector('.pdf-fit').textContent.includes('Sesuai lebar')"))
 check('Open/download actions point to the actual local PDF',js("document.querySelector('.pdf-file-actions a').href.includes('/manuals/c208-poh-training-1998.pdf#page=79') && document.querySelector('.pdf-file-actions a[download]').href.endsWith('.pdf')"))
 cli('fill','#pdf-page-number','99999');cli('press','Enter');pdf_ready(1112,1112)
 check('Page numbers are clamped to document bounds',js("document.querySelector('[aria-label=\"Halaman PDF berikutnya\"]').disabled"))
 click('.pdf-bottom-bar button:last-child');pdf_ready(1,1112)
 check('Start-of-file control opens temporary revision pages',pixels()['ink']>1000)
 cli('fill','#manual-search','sertifikasi')
 check('Catalog searches title/type and preserves reader',js("document.querySelectorAll('.manual-card').length===1 && document.querySelector('.manual-card').textContent.includes('Type Acceptance')"))
 click('.manual-card');pdf_ready(1,18)
 check('CAA reference opens with correct 18-page count and rendered text',pixels()['ink']>1000 and js("document.querySelector('.pdf-text p').textContent.includes('Type Acceptance Report')"))
 cli('fill','#manual-search','tidak cocok')
 check('No-result state explains how to recover',js("!!document.querySelector('.manual-no-results')"))
 cli('fill','#manual-search','')
 click('#workspace-tab-aircraft')
 after=diagnostics()['camera']
 check('Returning to aircraft preserves selected component and camera',js("document.querySelector('.selected-title').textContent==='Roda utama kiri'") and abs(before['radius']-after['radius'])<.01 and abs(before['alpha']-after['alpha'])<.001,{'before':before,'after':after})
 click('.theme-toggle');check('Light mode updates the 3D environment',not diagnostics()['dark'] and diagnostics()['clearColor'][0]>.9)
 shot('light-desktop.png')
 click('.add-finding');contrast=js(CONTRAST)
 check('Light fields retain readable placeholders and visible boundaries',contrast['text']>=4.5 and contrast['placeholder']>=4.5 and contrast['border']>=3 and contrast['button']>=4.5,contrast)
 shot('form-light-desktop.png');click('[aria-label="Tutup formulir temuan"]')
 click('#workspace-tab-manuals');pdf_ready(1,18)
 shot('manual-light-desktop.png')
 # A reader fetch failure must expose recovery without replacing catalogue data.
 js("window.__realFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/manuals/c208-poh-training-1998.pdf')?Promise.resolve(new Response('',{status:404})):window.__realFetch(url,...args);true")
 click('.manual-card:nth-child(1)');wait("!!document.querySelector('.pdf-error')")
 check('Failed PDF request presents retry and external open actions',js("!!document.querySelector('.pdf-error button') && !!document.querySelector('.pdf-file-actions a')"))
 js("window.fetch=window.__realFetch;true")
 click('.pdf-error button');pdf_ready(79,1112)
 check('PDF retry recovers a scanned page after failure',pixels()['ink']>3000)
 cli('set','viewport','390','844')
 click('.theme-toggle');pdf_ready(79,1112)
 cli('scrollintoview','.pdf-toolbar');shot('manual-dark-mobile.png')
 check('Mobile library and reader do not overflow page width',js("document.documentElement.scrollWidth<=innerWidth"))
 check('Mobile PDF controls remain usable and image is visible',pixels()['ink']>1000 and js("document.querySelector('.pdf-toolbar').getBoundingClientRect().width<=innerWidth"))
 click('#workspace-tab-aircraft');click('.add-finding')
 check('Mobile dark form uses legible 16px input text',js("getComputedStyle(document.querySelector('[name=finding-title]')).fontSize==='16px'"))
 shot('form-dark-mobile.png');click('[aria-label="Tutup formulir temuan"]')
 click('.theme-toggle');click('.add-finding');shot('form-light-mobile.png');click('[aria-label="Tutup formulir temuan"]')
 check('Mobile light form and header stay within viewport',js("document.documentElement.scrollWidth<=innerWidth"))
 # Storage failure still permits a session theme change.
 js("window.__storageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')};true")
 click('.theme-toggle');check('Theme toggle works when browser preference storage is blocked',js("document.documentElement.dataset.theme==='dark'"))
 js("Storage.prototype.setItem=window.__storageSet;true")
 errors=cli('errors')
 check('No uncaught browser errors',not errors.get('errors'),errors)
 completed=True
finally:
 (REPORT/'theme-manuals-verification.json').write_text(json.dumps({'completed':completed,'checks':checks},indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} checks passed; completed={completed}',flush=True)
