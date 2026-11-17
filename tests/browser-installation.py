"""Real site navigation, storyboard steps, ZIP download and tutorial; no AI generation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,hashlib,zipfile
base=os.environ.get('GDA_QA_URL','http://127.0.0.1:8770/')
out=Path('projects/installer-browser');out.mkdir(parents=True,exist_ok=True)
expect_ready=os.environ.get('GDA_EXPECT_PACKAGE_READY','1')=='1'
result={'checks':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width in [375,1440]:
  context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True,permissions=['clipboard-read','clipboard-write']);page=context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.goto(base+'#instalar');page.wait_for_function('window.ATLAS_READY===true');page.wait_for_function('document.body.dataset.view==="help"');page.wait_for_function('!document.getElementById("installationStatus").textContent.includes("Conferindo")')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  receipt=page.request.get(base+'installation.json').json();assert receipt['sourceReady']==expect_ready
  if expect_ready:
   with page.expect_download() as d:page.locator('#downloadStudioKit').click()
   file=out/f'installer-{width}.zip';d.value.save_as(str(file));assert hashlib.sha256(file.read_bytes()).hexdigest()==receipt['sha256']
   with zipfile.ZipFile(file) as z:assert json.loads(z.read('Studio-Kit-Pro/install-manifest.json'))['sourceRevision']==receipt['sourceRevision']
  else:assert page.locator('#downloadStudioKit').get_attribute('aria-disabled')=='true'
  with page.expect_popup() as popup:page.locator('#installationTutorial').click()
  tutorial=popup.value;tutorial.wait_for_load_state();assert 'Da instalação ao seu primeiro vídeo' in tutorial.inner_text('h1');assert 'Codex' in tutorial.inner_text('body');tutorial.close()
  page.goto(base+'?estilo=explicador-diagrama-ao-lado');page.wait_for_function('window.ATLAS_READY===true');page.evaluate("AtlasApp.chooseStyle('explicador-diagrama-ao-lado')")
  # Open the exact reference through its rendered selection, without relying on a viewport-specific category drawer.
  page.evaluate("AtlasShell.view('library')")
  page.locator('#briefVisual [data-detail]').evaluate('(e)=>e.click()');page.wait_for_selector('#detailDialog[open]')
  style=page.evaluate("AtlasApp.getStyle('explicador-diagrama-ao-lado')")
  for index,beat in enumerate(style['presenterEditing']['interactionPlan']['beats']):
   page.locator(f'[data-presenter-step="{index}"]').click();assert page.locator('[data-beat="graphicAction"]').inner_text()==beat['graphicAction'];assert page.locator('[data-beat="speechIntent"]').inner_text()==beat['speechIntent'];page.locator('[data-presenter-image]').wait_for();page.wait_for_function('document.querySelector("[data-presenter-image]").complete && document.querySelector("[data-presenter-image]").naturalWidth>0')
  if width==375:page.screenshot(path=str(out/'storyboard-mobile.png'),full_page=False,animations='disabled')
  page.locator('#detailDialog [data-choose]').click();page.locator('#topic').fill('Como conectar formulários de anúncio a um CRM');page.locator('#prepare').click();page.wait_for_selector('#handoff:not([hidden])');page.locator('#copyPrompt').click();assert 'interactionPlan' in page.evaluate('navigator.clipboard.readText()')
  page.locator('#starterKit').evaluate('(e)=>e.open=true')
  with page.expect_download() as d:page.locator('[data-starter-file="projeto-video.json"]').click()
  file=out/f'project-{width}.json';d.value.save_as(str(file));project=json.loads(file.read_text());assert project['brief']['selectedStyles'][0]['presenterEditing']['interactionPlan']['sourceTimes'] is None;assert 'video-tratamento' in project['orchestrator']['skillRouting']['modules']
  result['checks'].append(f'{width}px: install navigation, {"actual ZIP/hash" if expect_ready else "pending-package guard"}, tutorial, four storyboard beats, actual copied prompt and exported complete project')
  context.close()
 # A missing manifest must not leave a working but unchecked download button.
 context=browser.new_context();page=context.new_page();page.route('**/installation.json',lambda route:route.fulfill(status=503,body='unavailable'));page.goto(base+'#instalar');page.wait_for_function('document.getElementById("installationStatus").textContent.includes("Não foi possível")');assert page.locator('#downloadStudioKit').get_attribute('aria-disabled')=='true';result['checks'].append('failed package verification disables download');context.close();browser.close()
assert not result['errors'],result['errors']
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
