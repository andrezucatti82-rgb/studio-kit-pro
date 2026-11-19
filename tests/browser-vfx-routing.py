"""Actual clipboard, download and continuation checks; no video generation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os
out=Path('projects/vfx-browser');out.mkdir(parents=True,exist_ok=True)
report={'checks':[],'errors':[],'audiovisualValidation':'not_run'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [375,1440]:
  ctx=browser.new_context(viewport={'width':width,'height':950},accept_downloads=True,permissions=['clipboard-read','clipboard-write'])
  page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(os.environ.get('DISTEVEN_QA_URL','http://127.0.0.1:8770/')+'?estilo=rotoscopia#briefSection');page.wait_for_function('window.ATLAS_READY===true');assert page.evaluate('AtlasWorkflow.skillSystem.skills.length')==1;assert page.evaluate('AtlasWorkflow.skillSystem.modules.length')==7;page.wait_for_selector('#briefDialog:visible')
  page.locator('#topic').fill('Texto atrás da pessoa com oclusão fiel');page.locator('#prepare').click();page.wait_for_selector('#handoff:not([hidden])')
  for platform in ['chatgpt','claude']:
   page.locator('#handoffPlatform').select_option(platform);page.locator('#promptDetails').evaluate('(e)=>e.open=true');page.locator('#copyPrompt').click();prompt=page.evaluate('navigator.clipboard.readText()');assert 'VFX POR PLANO' in prompt and 'video-vfx' in prompt
   assert page.locator('#chatLink').get_attribute('href')==('https://claude.ai/code' if platform=='claude' else 'https://chatgpt.com/codex')
  page.locator('#starterKit').evaluate('(e)=>e.open=true')
  for name in ['pedido.txt','projeto-video.json']:
   with page.expect_download() as d:page.locator('[data-starter-file="'+name+'"]').click()
   d.value.save_as(str(out/f'{width}-{name}'))
  bundle=json.loads((out/f'{width}-projeto-video.json').read_text());assert bundle['request']==(out/f'{width}-pedido.txt').read_text();assert 'video-vfx' in bundle['orchestrator']['skillRouting']['modules'];assert bundle['orchestrator']['skillRouting']['version']==3
  assert bundle['brief']['selectedStyles'][0]['id']=='rotoscopia';assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(out/f'vfx-{width}.png'),full_page=True,animations='disabled')
  page.evaluate("AtlasApp.setStyleContributions('rotoscopia',[{aspect:'palette',scope:'details'}])")
  current=page.evaluate('AtlasApp.exportBundle()');assert 'video-vfx' not in current['orchestrator']['skillRouting']['modules'];assert 'VFX POR PLANO' not in current['request'];assert current['project']['styleContributions']['rotoscopia']==[{'aspect':'palette','scope':'details'}]
  page.reload();page.wait_for_function('window.ATLAS_READY===true');assert 'video-vfx' not in page.evaluate('AtlasApp.exportBundle().orchestrator.skillRouting.modules')
  page.evaluate("AtlasApp.setStyleContributions('rotoscopia',[{aspect:'masks',scope:'demonstration'}])")
  changed=page.evaluate("()=>{AtlasApp.requestAdjustment('effects');return AtlasApp.exportBundle()}");assert 'video-vfx' in changed['orchestrator']['skillRouting']['modules'];assert changed['brief']['adjustments'];assert changed['project']['styleContributions']['rotoscopia']==[{'aspect':'masks','scope':'demonstration'}]
  report['checks'].append(f'{width}px: both destinations clipboard, real TXT/JSON downloads, VFX route, palette-only exclusion, persisted scope and effects adjustment')
  ctx.close()
 browser.close()
assert not report['errors'],report['errors']
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
