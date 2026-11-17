"""Actual brief/export/clipboard QA; no generation, installation or publication."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json
base=os.environ.get('GDA_QA_URL','http://127.0.0.1:8770/')
out=Path('projects/skill-system-browser');out.mkdir(parents=True,exist_ok=True)
result={'checks':[],'errors':[],'publicSite':{}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  live=browser.new_page();response=live.goto('https://videos.gerenciadordeanuncios.com.br/#briefSection',wait_until='domcontentloaded',timeout=30000);result['publicSite']={'status':response.status,'title':live.title(),'interactionTested':False};live.close()
 except Exception as e:result['publicSite']={'error':str(e),'interactionTested':False}
 for width in [375,1440]:
  context=browser.new_context(viewport={'width':width,'height':950},accept_downloads=True,permissions=['clipboard-read','clipboard-write'])
  page=context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.goto(base+'#briefSection');page.wait_for_function('window.ATLAS_READY===true');page.wait_for_selector('#guidedDialog[open]');result['checks'].append(f'{width}px: briefSection without selection opens guided start')
  page.goto(base+'?estilo=explicador-diagrama-ao-lado#briefSection');page.wait_for_function('window.ATLAS_READY===true');page.wait_for_selector('#briefDialog[open]');page.locator('#topic').fill('Explicar CRM com meu vídeo gravado');page.locator('#prepare').click();page.wait_for_selector('#handoff:not([hidden])')
  summary=page.locator('#styleIntentSummary').inner_text();assert 'Apresentador' in summary and 'Filme inteiro' in summary
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  for platform in ['chatgpt','claude']:
   page.locator('#handoffPlatform').select_option(platform);page.locator('#copyPrompt').click();copied=page.evaluate('navigator.clipboard.readText()');assert 'video-explicador-interativo' in copied and 'video-tratamento' in copied and 'INTENÇÃO E APLICAÇÃO' in copied
   assert page.locator('#chatLink').get_attribute('href')==('https://claude.ai/new' if platform=='claude' else 'https://chatgpt.com/')
  page.locator('#starterKit').evaluate('(e)=>e.open=true')
  with page.expect_download() as d:page.locator('[data-starter-file="projeto-video.json"]').click()
  file=out/f'project-{width}.json';d.value.save_as(str(file));bundle=json.loads(file.read_text());route=bundle['orchestrator']['skillRouting'];assert route['primarySkill']=='video-explicador-interativo';assert 'video-revisao' in route['modules'];assert route['version']==2 and 'video-tratamento' in route['modules'];assert bundle['project']['conversationPlatform']=='claude';assert route['filesTransferred'] is False
  page.screenshot(path=str(out/f'brief-{width}.png'),full_page=True,animations='disabled');page.reload();page.wait_for_function('window.ATLAS_READY===true');assert page.evaluate('AtlasCurrentChoice().selectedStyles[0].id')=='explicador-diagrama-ao-lado'
  result['checks'].append(f'{width}px: style intent, actual clipboard for both destinations, complete JSON download and restored selection')
  context.close()
 browser.close()
assert not result['errors'],result['errors']
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
