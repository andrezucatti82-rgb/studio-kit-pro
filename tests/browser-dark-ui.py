"""Dark app presentation and compact category navigation over real project state."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8770/');parser.add_argument('--out',default='projects/folio-dark/ui');args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'checks':[],'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(375,812),(1440,1000)]:
  page=b.new_page(viewport={'width':width,'height':height},has_touch=width<=700);page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio')
  page.evaluate('document.fonts.ready')
  assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(16, 16, 16)'
  assert 'Folio UI' in page.evaluate('getComputedStyle(document.body).fontFamily')
  assert page.evaluate('getComputedStyle(document.body).colorScheme')=='dark'
  for weight in [400,500,600,700]:assert page.evaluate('async w=>(await document.fonts.load(w+\' 16px "Folio UI"\',"Fólio Ação Informações")).length>0',weight)
  page.locator('[data-folio-collection="explanations"]').first.click();page.locator('#grid [data-choose]').first.click();assert page.locator('#grid [data-choose]').first.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(226, 255, 59)';page.locator('#folioHeader .folio-brand').click()
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)');groups=page.evaluate('AtlasNavigation.groups');seen=set()
  for group in groups:
   trigger=page.locator('[data-folio-open-group="'+group['id']+'"]');trigger.click()
   if group.get('directFamily'):
    expect(page.locator('#folioMenu')).not_to_be_visible();assert page.evaluate('AtlasApp.categorySelection().family')==group['directFamily'];seen.add(group['directFamily'])
   else:
    assert page.evaluate('AtlasApp.categorySelection().group')==group['id']
    assert page.locator('#folioCollectionTitle').inner_text()==group['name']
    assert page.evaluate('(ids)=>[...document.querySelectorAll("#grid [data-style-id]")].every(e=>ids.includes(AtlasApp.getStyle(e.dataset.styleId).family))',group['families'])
    expect(page.locator('#folioMenu')).to_be_visible();ids=page.locator('#folioMenu [data-folio-family]').evaluate_all('es=>es.map(e=>e.dataset.folioFamily)');assert set(ids)==set(group['families']);seen.update(ids)
    assert page.locator('#folioMenu').bounding_box()['height']<420
    assert page.locator('#folioMenu [data-folio-family]').first.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
    assert page.locator('[data-folio-menu-back]').count()==0
    page.keyboard.press('Escape');expect(trigger).to_be_focused()
   assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  assert len(seen)==page.evaluate('AtlasApp.getCatalog().families.length')
  # Category words begin at the header; choosing one puts real styles next.
  page.locator('[data-folio-open-group="natural-ads"]').click()
  assert page.locator('#folioMenu .folio-menu-tools').count()==0
  first=page.locator('#folioMenu button').first.bounding_box();header=page.locator('#folioHeader').bounding_box();assert 0<=first['y']-header['y']-header['height']<=8
  page.screenshot(path=str(out/f'menu-{width}.png'),animations='disabled')
  page.locator('[data-folio-family="ads-pets"]').click();expect(page.locator('#grid .folio-cover').first).to_be_visible()
  header=page.locator('#folioHeader').bounding_box();cover=page.locator('#grid .folio-cover').first.bounding_box();assert 0<=cover['y']-header['y']-header['height']<=190
  assert not page.locator('#folioSearch').is_visible()
  assert page.locator('#folioCategoryFilters').count()==0
  expect(page.locator('#kind')).to_be_visible();assert page.locator('#videoFilter').count()==0
  page.locator('#favoriteFilter').click();expect(page.locator('#favoriteFilter')).to_have_attribute('aria-pressed','true');assert page.locator('#favoriteFilter').evaluate('e=>getComputedStyle(e,"::after").backgroundColor')=='rgb(226, 255, 59)'
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  page.locator('#favoriteFilter').click();page.screenshot(path=str(out/f'category-{width}.png'),animations='disabled')
  page.locator('#folioHeader .folio-brand').click();expect(page.locator('#folioSearch')).to_be_visible()
  assert page.locator('#folioOpenMenu').count()==0
  page.locator('[data-folio-open-group="natural-ads"]').click();page.keyboard.press('Escape');expect(page.locator('[data-folio-open-group="natural-ads"]')).to_be_focused()
  assert page.locator('#folioMenu input, #folioMenu small, #folioMenu svg, #folioMenu footer, #folioMenu h2, #folioMenu h3').count()==0
  page.set_viewport_size({'width':1440,'height':1000});page.locator('[data-folio-open-group="technology"]').focus();page.keyboard.press('Enter');family=page.locator('#folioMenu [data-folio-family]').first
  expect(family).to_be_focused();page.set_viewport_size({'width':375,'height':812});expect(family).to_be_focused();page.keyboard.press('Escape');expect(page.locator('[data-folio-open-group="technology"]')).to_be_focused()
  page.locator('[data-folio-open-group="technology"]').focus();page.keyboard.press('Enter');page.set_viewport_size({'width':1440,'height':1000});expect(page.locator('#folioMenu [data-folio-family]').first).to_be_focused();page.keyboard.press('Escape');expect(page.locator('[data-folio-open-group="technology"]')).to_be_focused()
  page.set_viewport_size({'width':width,'height':height})
  page.locator('#folioContinue').click()
  assert page.locator('#folioContinue').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(226, 255, 59)'
  assert page.locator('#folioContinue').evaluate('e=>getComputedStyle(e).color')=='rgb(22, 27, 5)'
  expect(page.locator('#topic')).to_be_visible()
  if width<=700:
   rect=page.locator('#topic').bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=height
   assert float(page.locator('#topic').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))>=16
  page.locator('#topic').fill('Explicar como um CRM organiza contatos e integra site, formulários e anúncios.');page.screenshot(path=str(out/f'form-{width}.png'),animations='disabled')
  page.locator('#folioContinue').click();assert 'Explicar como um CRM' in page.locator('#promptOutput').input_value()
  assert 'Folio UI' in page.locator('#handoffTitle').evaluate('e=>getComputedStyle(e).fontFamily')
  page.locator('#folioHeader .folio-brand').click();page.locator('#folioHeader [data-app-view="help"]').click();expect(page.locator('#instalar')).to_be_visible()
  assert page.locator('.skip-link').get_attribute('href')=='#installTitle'
  assert page.locator('#instalar').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(36, 36, 36)'
  assert 'Folio UI' in page.locator('#installTitle').evaluate('e=>getComputedStyle(e).fontFamily')
  cards=page.locator('#appHelp .workflow>div');assert cards.count()==3
  for card in cards.all():
   assert card.evaluate('e=>getComputedStyle(e).backgroundImage')=='none'
   contrast=card.evaluate('''e=>{const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),bg=lum(rgb(getComputedStyle(e).backgroundColor));return [e,e.querySelector("strong"),e.querySelector("b")].map(n=>{const fg=lum(rgb(getComputedStyle(n).color));return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)})}''')
   assert min(contrast)>=4.5,contrast
  page.locator('#appHelp .workflow').scroll_into_view_if_needed();page.screenshot(path=str(out/f'help-workflow-{width}.png'),animations='disabled')
  page.screenshot(path=str(out/f'help-{width}.png'),animations='disabled')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  report['viewports'].append({'width':width,'allCategoriesReachable':len(groups),'allFamiliesReachable':len(seen),'darkFields':True,'localFonts':4,'allHelpCardsContrast':True,'resizeFocusPreserved':True,'simpleTextMenu':True,'directCategoryLayout':True,'stateDrivenLimeAccent':True,'projectPreserved':True})
  page.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
