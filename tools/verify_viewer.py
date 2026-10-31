"""Browser checks for the local viewer, using the installed agent-browser CLI.

Start the site and an agent-browser session named mro-caravan before running.
All evaluated geometry/camera diagnostics read the live Babylon scene.
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT/'reports/phase-2'
REPORT.mkdir(parents=True,exist_ok=True)
checks = []
completed = False

def cli(*args, script=None):
    result = subprocess.run(['agent-browser','--session','mro-caravan','--json',*args],
                            input=script,text=True,capture_output=True,timeout=45)
    if result.returncode:
        raise RuntimeError(result.stdout+result.stderr)
    parsed = json.loads(result.stdout)
    if not parsed['success']:
        raise RuntimeError(parsed)
    return parsed.get('data')

def js(source):
    return cli('eval','--stdin',script=source)['result']

def check(name, condition, detail=None):
    checks.append({'name':name,'passed':bool(condition),'detail':detail})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)
    if not condition:
        raise AssertionError((name,detail))

def diagnostics():
    return js("document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics()")

def click_text(label):
    return cli('find','role','button','click','--name',label,'--exact')

def click_part(name):
    selector=f'[data-source="{name}"]'
    cli('scrollintoview',selector)
    cli('click',selector)

try:
    cli('set','viewport','1440','900')
    js("localStorage.setItem('mro-presentation-space','practice');true")
    cli('reload')
    cli('wait','--fn',"document.querySelector('.canvas-wrap')?.dataset.ready === 'true'")
    initial = diagnostics()
    check('434 asset objects and 80,695 triangles loaded',initial['meshCount']==434 and initial['triangles']==80695,initial)
    cli('screenshot',str(REPORT/'viewer-desktop.png'))

    # Real pointer events on the aircraft, rather than invoking Vue selection handlers.
    cli('mouse','move','620','560'); cli('mouse','down'); cli('mouse','up')
    picked = js("document.querySelector('.selected-title')?.textContent")
    check('Clicking aircraft geometry selects an object',bool(picked),picked)

    click_part('roueG')
    check('Component list updates detail panel',js("document.querySelector('.selected-title').textContent")=='Roda utama kiri')
    before = diagnostics()['camera']
    click_text('Fokus')
    after = diagnostics()['camera']
    check('Focus moves camera to selected component',after['radius']<before['radius'] and after['target']!=before['target'],after)
    click_text('Isolasi')
    isolated = diagnostics()
    check('Isolation leaves only selected mesh visible',isolated['visibleCount']==1,isolated['visibleCount'])
    cli('screenshot',str(REPORT/'viewer-isolated.png'))

    click_part('roueD')
    changed = diagnostics()
    check('Changing selection while isolated moves camera and keeps one mesh',changed['visibleCount']==1 and changed['camera']['target']!=isolated['camera']['target'])
    click_text('Isolasi')
    click_text('Transparansi')
    transparent = diagnostics()
    check('Transparency changes live non-selected mesh visibility',transparent['transparentCount']==433 and transparent['visibleCount']==434,transparent['transparentCount'])
    click_text('Reset')
    check('Reset restores all meshes and clears selection',diagnostics()['visibleCount']==434 and diagnostics()['transparentCount']==0 and not js("!!document.querySelector('.selected-title')"))
    reset_camera=diagnostics()['camera']
    check('Reset restores the intended perspective orientation',abs(reset_camera['alpha']-2.35)<0.01 and abs(reset_camera['beta']-1.10)<0.01,reset_camera)

    cli('fill','input[aria-label="Cari komponen atau nama objek"]','roueG')
    check('Search matches source object name',js("document.querySelectorAll('.component-item').length")==1)
    click_part('roueG')
    cli('fill','input[aria-label="Cari komponen atau nama objek"]','no-such-component')
    check('Empty search offers recovery',js("!!document.querySelector('.empty-search')"))
    click_text('Hapus pencarian')
    click_text('Reset')

    angles=[]
    expected=[(math.pi/2,math.pi/2),(-math.pi/2,math.pi/2),(math.pi/2,0.03),(math.pi,math.pi/2),(2.35,1.10)]
    for label in ['Kiri','Kanan','Atas','Depan','Perspektif']:
        click_text(label)
        angles.append(diagnostics()['camera'])
    check('View presets change live camera angles',len({round(x['alpha'],2) for x in angles})>=4 and min(x['beta'] for x in angles)<0.1)
    check('View presets match their intended orientations',all(abs(a['alpha']-e[0])<0.01 and abs(a['beta']-e[1])<0.01 for a,e in zip(angles,expected)),angles)

    # Exercise camera input with actual pointer drag and wheel.
    before=diagnostics()['camera']
    cli('mouse','move','690','490'); cli('mouse','down'); cli('mouse','move','790','530'); cli('mouse','up')
    cli('wait','--fn',"Math.abs(document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().camera.alpha - "+str(before['alpha'])+") > 0.01")
    check('Pointer drag rotates camera',abs(diagnostics()['camera']['alpha']-before['alpha'])>0.01)
    radius=diagnostics()['camera']['radius']
    # This CLI version sends native wheel commands at (0,0). Dispatch at the
    # canvas instead to test Babylon's actual wheel listener on the right target.
    js("document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel',{deltaY:-180,bubbles:true,cancelable:true}))")
    cli('wait','--fn',"Math.abs(document.querySelector('.canvas-wrap').__vueParentComponent.exposed.getDiagnostics().camera.radius - "+str(radius)+") > 0.01")
    check('Canvas wheel event changes zoom',abs(diagnostics()['camera']['radius']-radius)>0.01)
    click_text('Reset')

    cli('click','#tab-component'); cli('focus','#tab-component'); cli('press','ArrowRight')
    check('Information tabs support keyboard navigation',js("document.activeElement.id")=='tab-model' and js("document.querySelector('#tab-model').getAttribute('aria-selected')")=='true')
    cli('click','#tab-component')

    for width,height,label in [(1024,768,'tablet'),(390,844,'mobile')]:
        cli('set','viewport',str(width),str(height))
        check(f'{label}: no horizontal page overflow',js('document.documentElement.scrollWidth <= innerWidth'))
        if label=='mobile':
            cli('click','.mobile-tree-toggle')
            check('Mobile component panel opens',js("document.querySelector('#component-panel').classList.contains('panel-open')"))
            cli('fill','input[aria-label="Cari komponen atau nama objek"]','roueG')
            click_part('roueG')
            check('Mobile selection closes panel and updates details',not js("document.querySelector('#component-panel').classList.contains('panel-open')") and js("document.querySelector('.selected-title').textContent")=='Roda utama kiri')
        cli('screenshot','--full',str(REPORT/f'viewer-{label}.png'))
    errors = cli('errors')['errors']
    check('No uncaught browser errors during normal interactions',not errors,errors)

    # Failure injection: ensure user can recover from an unavailable model.
    # Temporarily hide only the web copy; the source/export assets remain intact.
    # A real HTTP 404 avoids relying on browser-tool interception support.
    asset=ROOT/'mro-web/public/models/caravan-demo.glb'
    hold=asset.with_suffix('.glb.hold')
    cli('network','unroute')
    asset.rename(hold)
    try:
        cli('reload')
        cli('wait','--text','Model belum tersedia')
        check('Failed model request shows error and retry',js("!!document.querySelector('.viewer-error')"))
    finally:
        hold.rename(asset)
    click_text('Coba lagi')
    cli('wait','--fn',"document.querySelector('.canvas-wrap')?.dataset.ready === 'true'")
    check('Retry recovers model without page reload',diagnostics()['meshCount']==434)
    cli('set','viewport','1440','900')
    click_text('Reset')
    cli('screenshot',str(REPORT/'viewer-desktop.png'))
    completed = True
finally:
    (REPORT/'browser-verification.json').write_text(json.dumps({
        'passed':completed and bool(checks) and all(x['passed'] for x in checks),
        'completed':completed,
        'checks':checks,
        'environment':'Local Nuxt dev server, headless Chromium with SwiftShader; not target-device performance certification.',
    },indent=2))
