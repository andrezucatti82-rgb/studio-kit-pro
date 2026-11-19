"""Real document-flow navigation; no modal layers, lost brief or trapped focus."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json

parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8770/');parser.add_argument('--out',default='projects/disteven-inline/navigation');args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'viewports':[],'errors':[]}
def no_layer(page):
 assert page.locator(':modal').count()==0
 assert page.evaluate('getComputedStyle(document.body).overflowY')!='hidden'
 assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
def current(page,id):
 expect(page.locator('#'+id)).to_be_visible();assert page.locator('body').get_attribute('data-disteven-panel')==id
 assert page.locator('#'+id).evaluate('e=>getComputedStyle(e).position')=='static'
 no_layer(page)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(375,812),(1440,1000)]:
  context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.disteven');page.evaluate('document.fonts.ready')
  original=page.locator('.app-main').evaluate('e=>e.getBoundingClientRect().top+scrollY')
  trigger=page.locator('[data-disteven-open-group="natural-ads"]');trigger.click()
  assert page.locator('#distevenMenu').evaluate('e=>e.tagName')=='SECTION'
  assert page.locator('#distevenMenu').evaluate('e=>getComputedStyle(e).position')=='static'
  assert page.locator('.app-main').evaluate('e=>e.getBoundingClientRect().top+scrollY')>original+100
  assert page.locator('.app-main').evaluate('e=>getComputedStyle(e).filter')=='none'
  assert page.locator('.app-main').evaluate('e=>e.getBoundingClientRect().top')>=page.locator('#distevenMenu').evaluate('e=>e.getBoundingClientRect().bottom')
  no_layer(page);page.screenshot(path=str(out/f'menu-{width}.png'),animations='disabled')
  # The surrounding page stays usable; clicking it does not dismiss a popup.
  page.locator('#distevenCollectionTitle').click();expect(page.locator('#distevenMenu')).to_be_visible()
  assert page.locator('#distevenMenu [data-disteven-family]').count()==11
  page.locator('#distevenMenu [data-disteven-family="ads-pets"]').click();expect(page.locator('#distevenMenu')).not_to_be_visible()
  page.locator('[data-disteven-open-group="natural-ads"]').click();page.keyboard.press('Escape');expect(page.locator('[data-disteven-open-group="natural-ads"]')).to_be_focused()
  page.locator('[data-disteven-open-group="natural-ads"]').click();page.locator('[data-disteven-open-group="natural-ads"]').click();expect(page.locator('#distevenMenu')).not_to_be_visible()
  page.locator('#distevenHeader .disteven-brand').click();page.locator('[data-disteven-collection="explanations"]').first.click();page.locator('#grid [data-choose]').first.click()
  saved=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')
  # A full style and a nested original frame are sequential pages, not layers.
  page.locator('#grid [data-detail]').first.click();current(page,'detailDialog');page.screenshot(path=str(out/f'detail-{width}.png'),animations='disabled')
  page.locator('#detailDialog [data-sequence]').first.click();current(page,'sequenceDialog');expect(page.locator('#detailDialog')).not_to_be_visible()
  page.keyboard.press('Escape');current(page,'detailDialog');page.locator('#detailDialog [data-close]').click();expect(page.locator('#biblioteca')).to_be_visible()
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==saved
  page.locator('#distevenContinue').click();expect(page.locator('#briefDialog')).to_be_visible()
  assert page.locator('#selectionList [data-contributions]').count()==0
  assert page.locator('body').get_attribute('data-disteven-panel') is None;no_layer(page)
  page.locator('#topic').fill('Como o CRM conecta site, formulários e anúncios.')
  page.locator('#openFonts').click();current(page,'fontDialog');page.locator('#fontDialog [data-close]').click();expect(page.locator('#briefDialog')).to_be_visible();assert page.locator('#topic').input_value().startswith('Como o CRM')
  page.locator('#distevenContinue').click();assert 'Como o CRM' in page.locator('#promptOutput').input_value();no_layer(page)
  # Header navigation must exit a nested workspace, with no hidden active panel.
  page.locator('#distevenHeader .disteven-brand').click();page.locator('[data-disteven-collection="explanations"]').first.click();page.locator('#grid [data-detail]').first.click();current(page,'detailDialog')
  page.locator('#distevenHeader .disteven-brand').click();expect(page.locator('#distevenDiscovery')).to_be_visible();assert page.locator('#distevenPanelHost').is_hidden()
  page.locator('[data-disteven-collection="explanations"]').first.click();page.locator('#grid [data-detail]').first.click();current(page,'detailDialog')
  if width>900:
   page.locator('[data-disteven-open-group="presenters"]').click();expect(page.locator('#grid')).to_be_visible();assert page.locator('#distevenPanelHost').is_hidden()
   page.locator('#grid [data-detail]').first.click();current(page,'detailDialog')
  page.locator('#distevenHeader [data-app-view="help"]').click();expect(page.locator('#instalar')).to_be_visible();assert page.locator('#distevenPanelHost').is_hidden();no_layer(page)
  context.close()
  # The public brief anchor opens the beginner workflow as an inline page too.
  context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base+'#briefSection');page.wait_for_function('window.ATLAS_READY && document.body.dataset.disteven');current(page,'guidedDialog');page.locator('#guidedSubject').fill('Como organizar clientes no CRM');page.locator('#distevenContinue').click();page.locator('[data-guided-pick]').first.click();page.locator('#distevenContinue').click();page.locator('#distevenContinue').click();expect(page.locator('#guidedStep3')).to_be_visible();assert page.locator('#guidedTitle').bounding_box()['y']>=0;page.keyboard.press('Escape');expect(page.locator('#biblioteca')).to_be_visible();no_layer(page)
  report['viewports'].append({'width':width,'menuPushesContent':True,'backgroundUsable':True,'noModalLayers':True,'nestedPagesReturn':True,'briefAndScopesPreserved':True,'headerNavigationExitsPanels':True,'guidedPage':True});context.close()
 browser.close()
assert not report['errors'],report['errors']
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
