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
  page.locator('[data-folio-collection="explanations"]').first.click();page.locator('#grid [data-choose]').first.click();page.locator('#folioHeader .folio-brand').click()
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)');groups=page.evaluate('AtlasNavigation.groups');seen=set()
  for group in groups:
   if width>900:trigger=page.locator('[data-folio-open-group="'+group['id']+'"]');trigger.click()
   else:
    trigger=page.locator('#folioOpenMenu');trigger.click();assert page.locator('#folioMenuGroups .folio-group-option').count()==7
    assert len(page.locator('.folio-group-list').evaluate('e=>getComputedStyle(e).gridTemplateColumns').split())==2
    page.locator('[data-folio-group="'+group['id']+'"]').click()
   if group.get('directFamily'):
    expect(page.locator('#folioMenu')).not_to_be_visible();assert page.evaluate('AtlasApp.categorySelection().family')==group['directFamily'];seen.add(group['directFamily'])
   else:
    expect(page.locator('#folioMenu')).to_be_visible();ids=page.locator('#folioMenu [data-folio-family]').evaluate_all('es=>es.map(e=>e.dataset.folioFamily)');assert set(ids)==set(group['families']);seen.update(ids)
    if width<=900:
     assert not page.locator('.folio-group-list').is_visible()
     page.locator('[data-folio-menu-back]').click();assert page.locator('#folioMenuGroups .folio-group-option').count()==7
    else:assert page.locator('.folio-menu-detail').bounding_box()['x']>page.locator('.folio-group-list').bounding_box()['x']
    page.keyboard.press('Escape');expect(trigger).to_be_focused()
   assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  assert len(seen)==page.evaluate('AtlasApp.getCatalog().families.length')
  page.locator('#folioOpenMenu').click();page.locator('#folioMenuSearch').fill('dentistas');expect(page.locator('[data-folio-niche="dentistas"]')).to_be_visible();page.locator('[data-folio-niche="dentistas"]').click();expect(page.locator('#folioMenu')).not_to_be_visible()
  page.locator('#folioOpenMenu').click();page.keyboard.press('Escape');expect(page.locator('#folioOpenMenu')).to_be_focused()
  # A breakpoint can replace focused menu content or hide the original trigger.
  page.set_viewport_size({'width':1440,'height':1000})
  page.locator('[data-folio-open-group="commercial"]').click();page.locator('[data-folio-group="technology"]').click();page.set_viewport_size({'width':375,'height':812});expect(page.locator('#folioMenuDetailTitle')).to_be_focused();page.keyboard.press('Escape');expect(page.locator('#folioOpenMenu')).to_be_focused()
  page.locator('#folioOpenMenu').click();page.locator('[data-folio-group="technology"]').click();page.set_viewport_size({'width':1440,'height':1000});expect(page.locator('#folioMenuDetailTitle')).to_be_focused();page.keyboard.press('Escape');expect(page.locator('#folioOpenMenu')).to_be_focused()
  page.set_viewport_size({'width':width,'height':height})
  page.locator('#folioHeader [data-folio-choice]').first.click() if width>700 else page.locator('.mobile-app-nav [data-folio-choice]').click()
  page.locator('#folioChoiceContinue').click();expect(page.locator('#topic')).to_be_visible()
  if width<=700:
   rect=page.locator('#topic').bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=height
   assert float(page.locator('#topic').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))>=16
  page.locator('#topic').fill('Explicar como um CRM organiza contatos e integra site, formulários e anúncios.');page.screenshot(path=str(out/f'form-{width}.png'),animations='disabled')
  page.locator('#prepare').click();assert 'Explicar como um CRM' in page.locator('#promptOutput').input_value()
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
  report['viewports'].append({'width':width,'allCategoriesReachable':len(groups),'allFamiliesReachable':len(seen),'darkFields':True,'localFonts':4,'allHelpCardsContrast':True,'resizeFocusPreserved':True,'projectPreserved':True})
  page.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
