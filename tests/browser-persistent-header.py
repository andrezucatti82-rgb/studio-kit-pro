"""Category navigation remains sticky across library, brief and internal pages."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8770/');p.add_argument('--out',default='projects/folio-header/browser');args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,768,1440]:
  context=b.new_context(viewport={'width':width,'height':900});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio')
  def fixed():
   expect(page.locator('.folio-category-bar')).to_be_visible();assert page.locator('.folio-category-bar button').count()==7
   assert page.locator('#folioOpenMenu').count()==0
   page.evaluate('scrollTo(0,1300)');assert abs(page.locator('#folioHeader').bounding_box()['y'])<1
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.evaluate('scrollTo(0,0)')
  fixed()
  if width>700:
   page.locator('[data-folio-open-group="natural-ads"]').click()
   parent=page.locator('[data-folio-open-group="natural-ads"]');child=page.locator('[data-folio-family="ads-moda"]')
   assert parent.evaluate('e=>getComputedStyle(e).fontSize')==child.evaluate('e=>getComputedStyle(e).fontSize')=='14px'
   assert page.locator('.folio-text-links').evaluate('e=>parseFloat(getComputedStyle(e).columnGap)')<=24
   if width>900:assert page.locator('.folio-text-links').evaluate('e=>Math.max(...getComputedStyle(e).gridTemplateColumns.split(" ").map(parseFloat))')<=230
   parent.hover();expect(parent).to_have_css('background-color','rgb(226, 255, 59)');expect(parent).to_have_css('color','rgb(22, 27, 5)')
   child.hover();assert child.evaluate('e=>getComputedStyle(e).color')=='rgb(226, 255, 59)'
   page.screenshot(path=str(out/f'compact-menu-{width}.png'),animations='disabled');page.keyboard.press('Escape');page.locator('#folioHeader .folio-brand').click()
  page.locator('[data-folio-collection="explanations"]').first.click();page.locator('#grid [data-choose]').first.click();page.locator('#folioContinue').click()
  page.locator('#topic').fill('Explicar um serviço com exemplos visuais');page.locator('#brand').fill('Minha marca');page.locator('#duration').select_option('45');page.locator('#topic').focus();fixed()
  page.screenshot(path=str(out/f'brief-{width}.png'),animations='disabled')
  page.locator('#openFonts').click();fixed();page.locator('#fontDialog [data-close]').click();page.locator('#folioContinue').click();expect(page.locator('#handoff')).to_be_visible();fixed()
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')
  page.locator('#briefVisual [data-detail]').click();fixed()
  page.locator('[data-folio-open-group="technology"]').click()
  expect(page.locator('#grid')).to_be_visible();page.locator('[data-folio-family="software"]').click();assert page.evaluate('AtlasApp.categorySelection().family')=='software'
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  page.locator('#folioContinue').click();expect(page.locator('#handoff')).to_be_visible();expect(page.locator('#topic')).to_have_value('Explicar um serviço com exemplos visuais');fixed()
  page.locator('#folioHeader [data-app-view="help"]').click();fixed()
  report['viewports'].append({'width':width,'categoriesPersistent':True,'mobileMenuPersistent':True,'stickyAcrossViews':True,'briefPreserved':True});context.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
