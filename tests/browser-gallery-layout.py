from pathlib import Path
import json,argparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8770/');parser.add_argument('--out',default='projects/folio-fullbleed/layout');args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'layouts':[],'motion':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
 for width,height in [(320,720),(375,812),(768,1024),(1024,900),(1440,1000),(1920,1080)]:
  page=b.new_page(viewport={'width':width,'height':height},has_touch=width<=700)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folioDensity')
  page.evaluate('document.fonts.ready')
  page.locator('.folio-shelf').first.locator('.folio-artwork img').evaluate_all('async es=>{await Promise.all(es.map(async e=>{e.loading="eager";await e.decode()}))}')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  columns=2 if width<=700 else 3 if width<900 else 4 if width<1200 else 6
  cards=page.locator('.folio-shelf').first.locator('.folio-card')
  rects=[cards.nth(i).bounding_box() for i in range(columns)]
  assert abs(rects[0]['y']-rects[-1]['y'])<.6 and rects[-1]['x']+rects[-1]['width']<=width-16
  page.screenshot(path=str(out/f'home-{width}.png'),animations='disabled')
  page.locator('#folioBrowseAll').click()
  assert len(page.locator('#grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns').split())==columns
  stage=page.locator('#grid .folio-portrait').first
  compact=stage.bounding_box();assert abs(compact['width']*4/3-compact['height'])<.6
  # Every source covers its frame at native aspect ratio; no decorative fill.
  page.route('**/*',lambda route:route.abort() if route.request.resource_type=='image' else route.continue_())
  result=page.evaluate('''()=>{let items=AtlasApp.getCatalog().styles;AtlasFolio.update({items,shown:items,selected:[],favorites:[],compared:[],family:'',group:'',query:'',kind:'',onlyFav:false,onlyVideo:false});return {count:items.length,bad:[...document.querySelectorAll('#grid .folio-portrait')].filter(e=>{let a=e.getBoundingClientRect(),b=e.querySelector('.folio-artwork').firstElementChild.getBoundingClientRect(),[w,h]=e.style.getPropertyValue('--folio-source-ratio').split('/').map(Number);return b.left>a.left+.6||b.top>a.top+.6||b.right<a.right-.6||b.bottom<a.bottom-.6||Math.abs(b.width/b.height-w/h)>.002||!!e.querySelector('.folio-image-fill')}).length}}''')
  assert result=={'count':1425,'bad':0},result
  assert page.locator('.folio-to-top').count()==0
  report['layouts'].append({'width':width,'columns':columns,'all1425FillFrame':True,'uniformThreeByFourHeight':True,'compactHeight':compact['height']})
  page.close()
 for reduced in ['no-preference','reduce']:
  page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion=reduced)
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folioDensity')
  cover=page.locator('.folio-cover').first
  page.locator('.folio-shelf').first.locator('.folio-artwork img').evaluate_all('async es=>{await Promise.all(es.map(async e=>{e.loading="eager";await e.decode()}))}')
  cover.hover();bounds=cover.bounding_box();page.mouse.move(bounds['x']+bounds['width']*.4,bounds['y']+bounds['height']*.4)
  assert cover.evaluate('e=>getComputedStyle(e,"::after").content')=='none'
  assert not cover.evaluate('e=>e.classList.contains("is-lit")')
  if reduced=='reduce':assert cover.evaluate('e=>getComputedStyle(e).transform')=='none'
  page.screenshot(path=str(out/f'hover-{reduced}.png'),animations='disabled')
  report['motion'].append({'reducedMotion':reduced,'passed':True});page.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
