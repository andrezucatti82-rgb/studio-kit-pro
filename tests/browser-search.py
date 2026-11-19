"""Search behavior, page/local modes and responsiveness; does not publish or generate media."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,time
r=Path.cwd();out=r/'projects/search-improvement/browser';out.mkdir(parents=True,exist_ok=True);base=os.environ.get('DISTEVEN_QA_URL','http://127.0.0.1:8770/');result={'checks':[],'errors':[],'queryMilliseconds':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,page_mode in [(375,False),(1440,False),(375,True),(1440,True)]:
  context=b.new_context(viewport={'width':width,'height':1000});page=context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
  if page_mode:
   page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('Page must not use localStorage')}});window.openai={widgetState:null,setWidgetState:async s=>{window.openai.widgetState=s}};")
   page.route('**/search-page-candidate',lambda route:route.fulfill(body=(r/'style-atlas/records/page-embed.html').read_text(),content_type='text/html'))
   page.route('**/assets/catalog-data-*.js',lambda route:route.fulfill(body=(r/'style-atlas/dist/assets'/route.request.url.split('/')[-1]).read_text(),content_type='application/javascript'))
   page.route('https://videos.gerenciadordeanuncios.com.br/assets/**',lambda route:route.fulfill(path=str(r/'style-atlas/dist/assets'/route.request.url.split('/assets/',1)[1])))
  page.goto(base+('search-page-candidate' if page_mode else ''),wait_until='domcontentloaded');page.wait_for_function('window.ATLAS_READY===true');page.evaluate("AtlasApp.setCategoryGroup('natural-ads');AtlasApp.chooseStyle('vidro-e-refracao');AtlasShell.view('library')")
  before=page.evaluate('AtlasCurrentChoice().selectedStyles.map(s=>s.id)');search=page.locator('#search');search.fill('cachorro');page.wait_for_function('document.getElementById("searchScope").hidden===false');assert page.evaluate('AtlasApp.categorySelection().group')==''
  assert page.locator('#categoryExplorer').is_hidden();assert page.locator('#categoryResultsTitle').inner_text()=='Resultados da busca';assert page.locator('#grid [data-style-id="pet-em-uso-cotidiano"]').count()==1
  count=page.locator('#resultCount').inner_text();assert int(count.split()[0])>=30
  original=page.locator('#grid .card').evaluate_all('(els)=>els.map(e=>e.dataset.styleId)');search.fill('CÃES');assert page.locator('#grid .card').evaluate_all('(els)=>els.map(e=>e.dataset.styleId)')==original;assert page.evaluate('AtlasCurrentChoice().selectedStyles.map(s=>s.id)')==before
  while page.locator('#loadMore').is_visible():page.locator('#loadMore').click()
  assert page.locator('#grid [data-style-id="ads26-pets-a-agua-encontra-o-desenho-do-produto"]').count()==1
  assert page.locator('#grid [data-style-id="ads26-pets-a-cama-encontra-o-lugar-do-gato"]').count()==0;assert page.locator('#grid [data-style-id="ads26-pets-a-compra-certa-para-o-aquario"]').count()==0
  page.locator('#familySelect').evaluate("e=>{e.value='ads-pets';e.dispatchEvent(new Event('change',{bubbles:true}))}");assert page.locator('#searchEverywhere').is_visible();page.locator('#searchEverywhere').click();assert page.evaluate('AtlasApp.categorySelection().family')==''
  search.fill('gatos');assert page.locator('#grid [data-style-id="ads26-pets-a-cama-encontra-o-lugar-do-gato"]').count()==1
  search.fill('aquários');assert page.locator('#grid [data-style-id="ads26-pets-a-compra-certa-para-o-aquario"]').count()==1
  search.fill('planta baixa')
  while page.locator('#loadMore').is_visible():page.locator('#loadMore').click()
  assert page.locator('#grid [data-style-id="explicador-diagrama-ao-lado"]').count()==1
  search.fill('avatar diagrama');assert page.locator('#grid .card').count()>0
  search.fill('cachorro xyzzy');assert page.locator('#empty').is_visible();search.fill('cachorro');search.focus();page.locator('#grid img').first.wait_for();page.wait_for_function('document.querySelector("#grid img").complete');page.screenshot(path=str(out/f'search-{width}-{"page" if page_mode else "site"}.png'),animations='disabled')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert search.evaluate('e=>document.activeElement===e');assert page.locator('.search-tags').count()==0
  times=page.evaluate("()=>{const i=AtlasSearch.createIndex(AtlasApp.getCatalog().styles,AtlasApp.getCatalog().search);return ['cachorro','mãos','avatar diagrama','xyzzy'].map(q=>{const t=performance.now();i.search(q);return performance.now()-t})}");result['queryMilliseconds']+=times
  search.fill('');assert page.locator('#searchScope').is_hidden();assert page.locator('#categoryExplorer').is_visible();assert page.evaluate('AtlasCurrentChoice().selectedStyles.map(s=>s.id)')==before
  result['checks'].append(f'{width}px {"Page" if page_mode else "site"}: global tags and synonyms, dog/cat/aquarium precision, pagination, category refinement, multiword queries, focus/selection preserved, no overflow');context.close()
 b.close()
assert not result['errors'],result['errors'];(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
