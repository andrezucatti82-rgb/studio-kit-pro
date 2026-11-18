"""Real-browser discovery/brief regression, local assets only; no provider calls."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:8770/')
parser.add_argument('--out',default='projects/folio-ui/browser')
args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'checks':[],'errors':[],'viewports':[]}

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(375,812),(390,844),(430,932),(1440,1000)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,permissions=['clipboard-read','clipboard-write'])
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY===true && document.body.dataset.folio==="true"')
  page.evaluate('document.fonts.ready');page.locator('.folio-shelf').first.wait_for()
  page.wait_for_function('Array.from(document.querySelectorAll(".folio-shelf:first-child .folio-artwork img")).slice(0,2).every(e=>e.complete && e.naturalWidth>0)')
  assert page.locator('.folio-shelf').count()==4
  page.evaluate('''async()=>{await Promise.all(Array.from(document.querySelectorAll(".folio-shelf:first-child .folio-artwork img")).slice(0,2).map(e=>e.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}''')
  assert not page.locator('.app-mobile-brand').is_visible()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  # Every preview fills the same larger 3:4 frame without distorting its source.
  stage=page.locator('.folio-portrait').first.bounding_box();assert abs(stage['height']-stage['width']*4/3)<.6
  if width<=700:
   first=page.locator('.folio-shelf').first.locator('.folio-card').nth(0).bounding_box();second=page.locator('.folio-shelf').first.locator('.folio-card').nth(1).bounding_box()
   assert abs(first['y']-second['y'])<2 and second['x']+second['width']<=width-17
  assert page.locator('.folio-portrait').first.evaluate('e=>{const p=e.querySelector(".folio-artwork").firstElementChild;const a=e.getBoundingClientRect(),b=p.getBoundingClientRect();const [w,h]=e.style.getPropertyValue("--folio-source-ratio").split("/").map(Number);return b.left<=a.left+.6 && b.top<=a.top+.6 && b.right>=a.right-.6 && b.bottom>=a.bottom-.6 && Math.abs(b.width/b.height-w/h)<.002 && !e.querySelector(".folio-reference");}')
  page.screenshot(path=str(out/f'home-{width}.png'),full_page=False,animations='disabled')
  rail=page.locator('.folio-shelf-rail').first;rail.evaluate('(e)=>e.scrollLeft=220');assert rail.evaluate('(e)=>e.scrollLeft')>0
  page.locator('[data-folio-goal="present"]').click();expect(page.locator('#folio-shelf-people-and-business')).to_be_visible()
  page.locator('[data-folio-goal="sell"]').click();expect(page.locator('#folio-shelf-product-value')).to_be_visible()
  page.locator('[data-folio-goal="explain"]').click()
  page.locator('#folioNiche').select_option('dentistas')
  page.locator('[data-folio-collection="explanations"]').first.click()
  assert page.evaluate('AtlasFolio.getState().mode')=='collection'
  if width<=700:
   cells=page.locator('#grid .folio-card');a=cells.nth(0).bounding_box();b=cells.nth(1).bounding_box();assert abs(a['y']-b['y'])<2 and b['x']+b['width']<=width-17
  assert page.evaluate('Array.from(document.querySelectorAll("#grid [data-style-id]")).every(e=>FolioCollections.matchesNiche(AtlasApp.getStyle(e.dataset.styleId),"dentistas",FolioCollections.niches(AtlasApp.getCatalog().styles)))')
  page.screenshot(path=str(out/f'collection-{width}.png'),full_page=False,animations='disabled')
  first=page.locator('#grid [data-choose]').first;style_id=first.get_attribute('data-choose');first.click()
  assert page.evaluate('AtlasCurrentChoice().selectedStyles[0].id')==style_id
  assert page.locator('body').get_attribute('data-view')=='library'
  page.locator('#grid [data-fav]').first.click()
  # Repeated renders keep the horizontal collection position.
  page.locator('#grid').evaluate('(e)=>e.scrollLeft=100');left=page.locator('#grid').evaluate('(e)=>e.scrollLeft')
  page.evaluate('AtlasApp.refresh()');assert abs(page.locator('#grid').evaluate('(e)=>e.scrollLeft')-left)<2
  page.locator('#selectionTray [data-folio-choice]').click();expect(page.locator('#folioChoice')).to_be_visible()
  assert page.locator('#folioChoiceItems [data-remove]').count()==1
  page.screenshot(path=str(out/f'choice-{width}.png'),full_page=False,animations='disabled')
  page.locator('#folioChoiceContinue').click();expect(page.locator('#briefDialog')).to_be_visible()
  assert not page.locator('#folioChoice').is_visible()
  expect(page.locator('#briefTitle')).to_be_focused()
  page.locator('#topic').fill('Explicar como o serviço funciona, com exemplos visuais')
  page.locator('#prepare').click();expect(page.locator('#handoff')).to_be_visible()
  page.screenshot(path=str(out/f'brief-{width}.png'),full_page=False,animations='disabled')
  assert style_id in page.locator('#promptOutput').input_value()
  page.locator('#copyPrompt').click();assert style_id in page.evaluate('navigator.clipboard.readText()')
  page.locator('#starterKit').evaluate('(e)=>e.open=true')
  with page.expect_download() as download:page.locator('[data-starter-file="projeto-video.json"]').click()
  file=out/f'project-{width}.json';download.value.save_as(str(file));project=json.loads(file.read_text())
  assert project['brief']['selectedStyles'][0]['id']==style_id
  assert project['brief']['selectedStyles'][0]['visualSequence']['frames']
  # Reading a collection must not touch a prepared brief, its scopes or approvals.
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')
  page.locator('#folioHeader .folio-brand').click()
  page.locator('#folioHeader .folio-brand').click();page.locator('[data-folio-goal="sell"]').click()
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  page.locator('#folioOpenMenu').click();expect(page.locator('#folioMenu')).to_be_visible()
  page.locator('[data-folio-group="technology"]').click();expect(page.locator('#folioMenu')).to_be_visible()
  page.locator('[data-folio-family="software"]').click();expect(page.locator('#folioMenu')).not_to_be_visible()
  assert page.evaluate('AtlasApp.categorySelection().family')=='software'
  expect(page.locator('#folioCollectionTitle')).to_be_focused()
  page.locator('#folioOpenMenu').click();page.keyboard.press('Escape');assert page.evaluate('document.activeElement.id')=='folioOpenMenu'
  page.locator('#folioHeader .folio-brand').click();page.locator('#folioNiche').select_option('dentistas')
  page.locator('#search').fill('cachorro');assert page.evaluate('AtlasFolio.getState().niche')==''
  assert page.locator('#grid .folio-card').count()>0
  assert page.evaluate('AtlasApp.categorySelection().family')==''
  # Full-catalogue access and the existing compare tool remain reachable.
  page.locator('#folioHeader .folio-brand').click();page.locator('#folioBrowseAll').click()
  assert '1425' in page.locator('#resultCount').inner_text().replace('.','')
  page.locator('#grid [data-compare]').nth(0).check();page.locator('#grid [data-compare]').nth(1).check()
  page.locator('#compareOpen').click();expect(page.locator('#compareDialog')).to_be_visible()
  page.locator('#compareDialog [data-close]').click()
  # Persisted favorites and selection survive reload in the real site adapter.
  page.reload();page.wait_for_function('window.ATLAS_READY===true && document.body.dataset.folio==="true"')
  assert page.evaluate('AtlasCurrentChoice().selectedStyles[0].id')==style_id
  page.locator('#folioBrowseAll').click();page.locator('#folioCategoryFilters>summary').click();page.locator('#favoriteFilter').click()
  assert page.locator('#grid [data-style-id]').count()==1
  assert page.locator('#grid [data-style-id]').first.get_attribute('data-style-id')==style_id
  page.locator('#folioHeader [data-app-view="help"]').click();expect(page.locator('#instalar')).to_be_visible()
  page.screenshot(path=str(out/f'help-{width}.png'),full_page=False,animations='disabled')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  report['viewports'].append({'width':width,'height':height,'portraitRatio':stage['height']/stage['width']})
  report['checks'].append(f'{width}px: goals, niche, horizontal collections, selection, favorite, generated/copied/exported brief, unchanged project while browsing, category/niche menu dismissal, Escape focus, global search, compare, reload and installation help')
  context.close()
 # Render every real card through the same production adapter; inspect layout,
 # not fictional pixel content. Block image downloads for this geometry-only pass.
 report['catalogueGeometry']=[]
 for width in [375,1440]:
  context=browser.new_context(viewport={'width':width,'height':900})
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio==="true"')
  page.locator('#folioBrowseAll').click()
  context.route('**/*',lambda route:route.abort() if route.request.resource_type=='image' else route.continue_())
  geometry=page.evaluate('''()=>{
   const items=AtlasApp.getCatalog().styles;
   AtlasFolio.update({items,shown:items,selected:[],favorites:[],compared:[],family:'',group:'',query:'',kind:'',onlyFav:false,onlyVideo:false});
   const bad=[];
   for(const card of document.querySelectorAll('#grid .folio-card')){
    const stage=card.querySelector('.folio-portrait'),panel=stage.querySelector('.folio-artwork').firstElementChild;
    const a=stage.getBoundingClientRect(),b=panel.getBoundingClientRect();
    const [w,h]=FolioCollections.previewRatio(AtlasApp.getStyle(card.dataset.styleId)).split('/').map(Number);
    if(b.left>a.left+.6||b.top>a.top+.6||b.right<a.right-.6||b.bottom<a.bottom-.6||Math.abs(b.width/b.height-w/h)>.002||Math.abs(a.height-a.width*4/3)>.6||stage.querySelector('.folio-image-fill')||stage.querySelector('.folio-reference'))bad.push(card.dataset.styleId);
   }
   return {count:document.querySelectorAll('#grid .folio-card').length,bad};
  }''')
  assert geometry['count']==1425 and not geometry['bad'],geometry
  report['catalogueGeometry'].append({'width':width,**geometry})
  context.close()
 browser.close()

assert not report['errors'],report['errors']
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
