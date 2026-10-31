import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks=[];completed=False

def cli(*args,script=None):
 p=subprocess.run(['agent-browser','--session','mro-production5','--json',*args],input=script,text=True,capture_output=True,timeout=50)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 r=json.loads(p.stdout)
 if not r['success']:raise RuntimeError(r)
 return r['data']
def js(code):return cli('eval','--stdin',script=code)['result']
def wait(code):cli('wait','--fn',code)
def click(sel):cli('scrollintoview',sel);cli('click',sel)
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
 if not passed:raise AssertionError((name,detail))
def pixels():return js("(()=>{let c=document.querySelector('.pdf-paper canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<180)n++;return n})()")
def pdf(page,total):wait(f"document.querySelector('.pdf-reader')?.dataset.renderedPage==='{page}' && document.querySelector('.pdf-reader')?.dataset.pageCount==='{total}' && document.querySelector('.pdf-reader')?.getAttribute('aria-busy')==='false'")
try:
 cli('--executable-path','/home/kartesiusw/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome','--args','--enable-unsafe-swiftshader','open','http://127.0.0.1:3101')
 cli('set','viewport','1440','1000')
 wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Production model loads all 434 source meshes',js("document.querySelector('.canvas-wrap').dataset.visibleMeshes==='434'"))
 check('PDF reader is not mounted before Manual tab is opened',js("!document.querySelector('.pdf-reader')"))
 click('.theme-toggle');cli('reload');wait("document.querySelector('.canvas-wrap')?.dataset.ready==='true'")
 check('Production dark preference survives reload',js("document.documentElement.dataset.theme==='dark' && document.querySelector('.theme-toggle').getAttribute('aria-label')==='Aktifkan mode terang'"))
 click('[data-source=roueG]');click('#workspace-tab-manuals');pdf(79,1112)
 worker=cli('network','requests','--filter','pdf.worker')
 check('Lazy manual module and local PDF worker load in production','pdf.worker' in json.dumps(worker),worker)
 check('Production POH decodes JPX images with local OpenJPEG',pixels()>3000,pixels())
 check('Document metadata preserves source, revision and applicability',js("document.querySelector('.manual-metadata').textContent.includes('20800277') && document.querySelector('.manual-document-heading a').href.includes('aeroelectric.com')"))
 cli('screenshot',str(ROOT/'reports/phase-5/production-manual-dark.png'))
 click('[aria-label="Halaman PDF berikutnya"]');pdf(80,1112)
 check('Production PDF navigation displays page 80',True)
 click('.manual-card:nth-child(2)');pdf(1,18)
 check('CAA certification reference renders in production',pixels()>1000)
 click('#workspace-tab-aircraft')
 check('Returning from reader preserves source component selection',js("document.querySelector('.selected-title').textContent==='Roda utama kiri'"))
 click('.add-finding')
 check('Production form has filled surfaces and linked help text',js("getComputedStyle(document.querySelector('[name=finding-description]')).backgroundColor==='rgb(16, 30, 40)' && !!document.querySelector('#finding-description-help')"))
 click('[aria-label="Tutup formulir temuan"]')
 click('#workspace-tab-manuals');click('.demo-launch')
 js("[...document.querySelector('dialog[open]').querySelectorAll('button')].find(e=>e.textContent.trim()==='Mulai presentasi').setAttribute('data-smoke-start','');true")
 click('[data-smoke-start]');wait("!!document.querySelector('.demo-walkthrough') && !document.querySelector('dialog[open]')")
 check('Starting presentation from Manual opens the summary with three samples',js("document.querySelector('#workspace-tab-dashboard').getAttribute('aria-selected')==='true' && document.querySelector('.findings-overview-button').textContent.includes('3')"))
 cli('screenshot',str(ROOT/'reports/phase-5/production-demo-dark.png'))
 cli('set','viewport','390','844')
 check('Production mobile layout has no horizontal overflow',js("document.documentElement.scrollWidth<=innerWidth"))
 errors=cli('errors');check('Production browser has no uncaught errors',not errors.get('errors'),errors)
 completed=True
finally:
 (ROOT/'reports/phase-5/production-smoke.json').write_text(json.dumps(dict(completed=completed,checks=checks),indent=2)+'\n')
 print(f'{sum(c["passed"] for c in checks)}/{len(checks)} production checks passed; completed={completed}',flush=True)
