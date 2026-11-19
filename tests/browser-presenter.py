"""Optional live-browser QA of the new catalogue and exported presenter recipe; no generation."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os

base=os.environ.get('DISTEVEN_QA_URL','http://127.0.0.1:8770/')
out=Path(os.environ.get('DISTEVEN_QA_OUT','projects/presenter-browser-qa'));out.mkdir(parents=True,exist_ok=True)
result={'checks':[],'errors':[]}
def choose_family(page):
 if page.locator('#openCategories').is_visible():page.locator('#openCategories').click()
 page.locator('[data-nav-group="movement"]').click()
 page.locator('[data-nav-family="explicadores"]').click()
 if page.locator('#categoryDrawer').is_visible():page.locator('#exploreCategory').click()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
 page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.goto(base);page.wait_for_function('window.ATLAS_READY===true');choose_family(page)
 assert page.locator('#grid .card').count()==40
 page.locator('#loadMore').click();assert page.locator('#grid .card').count()==60
 options=page.locator('#presenterSector option').evaluate_all('(o)=>o.map(x=>({value:x.value,label:x.label}))');assert len(options)==18
 for option in options[1:]:
  page.select_option('#presenterSector',option['value']);assert page.locator('#grid .card').count() in [3,4]
  assert page.locator('#grid .card img').first.get_attribute('src').endswith('.png')
 page.select_option('#presenterSector','');page.screenshot(path=str(out/'catalogo-desktop.png'),animations='disabled')
 page.locator('#grid [data-detail]').first.click()
 assert 'A pessoa participa' in page.locator('#detailDialog').inner_text()
 with page.expect_download() as dl:page.locator('#detailDialog a[download]').click()
 dl.value.save_as(str(out/'prompt-site.txt'));assert 'trajetória' in (out/'prompt-site.txt').read_text()
 result['checks'].append('60 sector directions, 17 working sector filters, presenter requirements and actual prompt download')
 page.locator('#detailDialog [data-choose]').first.click();page.evaluate("AtlasShell.view('brief')")
 page.locator('#topic').fill('Explicar faturamento e custos com meu vídeo gravado')
 page.locator('#prepare').click();page.wait_for_selector('#handoff:not([hidden])')
 assert 'EDIÇÃO COM APRESENTADOR' in page.locator('#promptOutput').input_value()
 page.locator('#starterKit').evaluate('(e)=>e.open=true')
 with page.expect_download() as dl:page.locator('[data-starter-file="projeto-video.json"]').click()
 dl.value.save_as(str(out/'projeto-video.json'));bundle=json.loads((out/'projeto-video.json').read_text())
 assert bundle['orchestrator']['runtimeVersion']=='2.12.0'
 assert bundle['brief']['selectedStyles'][0]['presenterEditing']['automaticGestureTracking'] is False
 assert bundle['brief']['selectedStyles'][0]['executionPlan']['finishProfile']['target']=='social_media_not_cinema'
 result['checks'].append('Downloaded project retains actual recipe and runtime 2.12.0 without claiming automatic tracking')
 for width in [320,375,768,1440,1920]:
  tab=browser.new_page(viewport={'width':width,'height':950});tab.goto(base);tab.wait_for_function('window.ATLAS_READY===true');choose_family(tab)
  assert tab.locator('#grid .card').count()==40
  assert not tab.locator('#categoryDrawer').is_visible()
  assert tab.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  tab.wait_for_function('Array.from(document.querySelectorAll("#grid img")).filter(i=>{const r=i.getBoundingClientRect();return i.checkVisibility()&&r.top<innerHeight&&r.bottom>0}).every(i=>i.complete&&i.naturalWidth>0)')
  if width==375:tab.screenshot(path=str(out/'catalogo-mobile.png'),animations='disabled')
  tab.close()
 result['checks'].append('Visible catalogue, loaded frames and no overflow at 320, 375, 768, 1440 and 1920 pixels')
 browser.close()
assert not result['errors'],result['errors']
(out/'browser-new-styles.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
