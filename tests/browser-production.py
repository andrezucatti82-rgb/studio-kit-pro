"""Local integration QA, not creative approval or claimed listening.
Requires a running production:serve with a completed engineering POC in its root.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('DISTEVEN_QA_URL','http://127.0.0.1:8780')
root=Path(os.environ.get('DISTEVEN_QA_ROOT','projects/orchestrator-proof')).resolve()
out=root/'browser-qa';out.mkdir(exist_ok=True)
jobs=[json.loads(p.read_text()) for p in (root/'jobs').glob('*/job.json')]
job=next(j for j in sorted(jobs,key=lambda j:j['createdAt'],reverse=True) if j['state']=='completed')
result={'checks':[],'errors':[],'playback':'not_reviewed','listening':'not_run'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
 page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.goto(base);page.wait_for_function('window.ATLAS_READY===true')
 page.evaluate("()=>{AtlasApp.setPrincipalStyle('campanha-frase-que-reorganiza-o-quadro');AtlasShell.view('project')}")
 page.locator('#localProduction').scroll_into_view_if_needed()
 assert page.locator('#productionForm').is_visible()
 page.locator('#productionMedia').set_input_files(str(root/'fixture/source-original.mp4'))
 page.locator('#productionRights').fill('Original code-authored optical fixture, MIT')
 page.locator('#productionPrompt').fill('Uma ideia ganha espaço. O movimento organiza o argumento e conecta a conclusão.')
 page.locator('#productionStart').click()
 page.wait_for_function("document.getElementById('productionStatus').textContent.includes('aprovações visuais')",timeout=30000)
 assert page.locator('#productionPreparation').is_visible()
 with page.expect_download() as download:page.locator('#productionDraft').click()
 download.value.save_as(str(out/'draft-plan.json'))
 assert json.loads((out/'draft-plan.json').read_text())['styleId']=='campanha-frase-que-reorganiza-o-quadro'
 result['checks'].append('Real upload and deterministic planning through form; production blocked without scoped approvals; draft JSON downloads')
 page.evaluate('(id)=>localStorage.setItem("disteven-local-production-job",id)',job['id']);page.reload();page.wait_for_function('window.ATLAS_READY===true');page.evaluate("AtlasShell.view('project')")
 page.wait_for_selector('#productionResult:not([hidden])');page.locator('#productionResult').scroll_into_view_if_needed()
 page.wait_for_function("document.getElementById('productionVideo').readyState>=1")
 assert page.locator('#productionVideo').evaluate('(v)=>v.duration')==30
 with page.expect_download() as download:page.locator('#productionDownload').click()
 download.value.save_as(str(out/'downloaded-candidate.mp4'))
 assert (out/'downloaded-candidate.mp4').stat().st_size==job['result']['bytes']
 result['checks'].append('Completed job resumes after reload; real 30-second MP4 metadata loads and full download matches expected size')
 for width in [375,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.locator('#productionResult').scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  page.screenshot(path=str(out/f'production-{width}.png'),animations='disabled')
 result['checks'].append('Production result and controls fit 375, 768 and 1440-pixel viewports without horizontal overflow')
 # Observe the browser player running, but do not mislabel headless playback as audiovisual evaluation.
 page.locator('#productionVideo').evaluate('(v)=>{v.muted=true;v.currentTime=22.5;return v.play()}')
 page.wait_for_function("document.getElementById('productionVideo').currentTime>23")
 page.locator('#productionVideo').evaluate('(v)=>v.pause()')
 result['checks'].append('Browser video element advances across the transition; automated smoke test only, no continuous creative review')
 browser.close()
assert not result['errors'],result['errors']
(out/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
