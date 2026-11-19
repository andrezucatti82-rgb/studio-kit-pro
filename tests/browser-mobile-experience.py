"""Touch navigation, compact menus and readable, aligned action buttons."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright,expect

p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8770/');p.add_argument('--out',default='projects/folio-mobile/browser');args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  context=b.new_context(viewport={'width':width,'height':812},has_touch=True,is_mobile=True,reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio');page.evaluate('document.fonts.ready')
  def screen(name):
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,name)
   page.locator('img').evaluate_all('async es=>{await Promise.all(es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).map(e=>{e.loading="eager";return e.decode()}))}')
   page.screenshot(path=str(out/f'{width}-{name}.png'),animations='disabled')
  def actions():
   bad=page.locator('.primary,.outline,.button,.folio-panel-back,#sequencePrev,#sequenceNext').evaluate_all('''es=>es.filter(e=>e.getClientRects().length&&!e.disabled&&!e.closest('.folio-catalogue-controls')&&getComputedStyle(e).visibility!=='hidden').flatMap(e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect(),bad=[];if(s.backgroundColor!=='rgb(226, 255, 59)')bad.push('fill');if(e.innerText.trim()&&parseFloat(s.fontSize)<15)bad.push('font');if(s.color!=='rgb(22, 27, 5)')bad.push('ink');if(r.height<43.5)bad.push('target');
    const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),rects=[];while(walker.nextNode()){const n=walker.currentNode;if(n.textContent.trim()&&n.parentElement.getClientRects().length){const range=document.createRange();range.selectNodeContents(n);for(const box of range.getClientRects())if(box.width&&box.height)rects.push(box)}}for(const svg of e.querySelectorAll('svg,small'))rects.push(svg.getBoundingClientRect());
    if(rects.length){const left=Math.min(...rects.map(x=>x.left)),right=Math.max(...rects.map(x=>x.right)),top=Math.min(...rects.map(x=>x.top)),bottom=Math.max(...rects.map(x=>x.bottom));if(Math.abs((left+right-r.left-r.right)/2)>3)bad.push('horizontal');if(Math.abs((top+bottom-r.top-r.bottom)/2)>3)bad.push('vertical')}
    return bad.length?[{text:e.innerText,bad,bg:s.backgroundColor,font:s.fontSize,id:e.id,height:r.height,minHeight:s.minHeight}]:[]})''')
   assert not bad,(width,bad)
  header=page.locator('#folioHeader').bounding_box();assert header['height']<=152,(width,header)
  assert page.locator('.folio-category-bar button').evaluate_all('es=>es.length===7&&es.every(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1})')
  assert page.locator('.folio-category-bar').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  screen('01-home');actions()
  for group in page.evaluate('AtlasNavigation.groups.filter(g=>!g.directFamily).map(g=>g.id)'):
   parent=page.locator('[data-folio-open-group="'+group+'"]');parent.tap();menu=page.locator('#folioMenu');expect(menu).to_be_visible()
   assert len(page.locator('.folio-text-links').evaluate('e=>getComputedStyle(e).gridTemplateColumns').split())==2
   assert page.locator('#folioMenu button:focus-visible').count()==0,'touch must not mark the first option as a keyboard target'
   assert menu.evaluate('e=>getComputedStyle(e).borderBottomWidth')=='0px'
   assert menu.bounding_box()['height']<=300,(width,group,menu.bounding_box())
   assert page.locator('#folioMenu button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=43.5)')
   parent.tap();expect(menu).not_to_be_visible()
  page.locator('[data-folio-open-group="natural-ads"]').tap();screen('02-menu');page.locator('[data-folio-family="ads-joias"]').tap();screen('03-category')
  page.locator('#grid [data-detail]').first.tap();screen('04-detail');actions()
  page.locator('#detailDialog [data-sequence]').first.tap();screen('05-sequence');actions();page.keyboard.press('Escape');page.locator('#detailDialog [data-close]').tap()
  page.locator('#folioHeader .folio-brand').tap();page.locator('#folioContinue').tap();screen('06-guide');actions();expect(page.locator('#guidedComplexity')).to_be_visible();assert page.locator('.guided-preferences').evaluate('e=>e.tagName')=='SECTION'
  assert page.locator('#guidedTitle').evaluate('e=>getComputedStyle(e).outlineStyle')=='none'
  assert page.locator('#guidedDialog :is(input,select,textarea)').evaluate_all('es=>es.filter(e=>e.getClientRects().length).every(e=>parseFloat(getComputedStyle(e).fontSize)>=16)')
  page.locator('#guidedSubject').fill('Apresentar um consultório com naturalidade');page.locator('#folioContinue').tap();screen('07-style');page.locator('#guidedBrowse').tap()
  page.locator('[data-folio-collection="explanations"]').first.tap();page.locator('#grid [data-choose]').first.tap();page.locator('#folioContinue').tap()
  for n in range(4):
   actions();assert page.evaluate('''()=>{const a=document.querySelector('.folio-brand').getBoundingClientRect(),b=document.querySelector('#folioContinue').getBoundingClientRect(),c=document.querySelector('#folioHeader .folio-help').getBoundingClientRect();return a.right+4<=b.left&&b.right+4<=c.left}'''),(width,n)
   screen('08-guide-'+str(n));page.locator('#folioContinue').tap()
  expect(page.locator('#handoff')).to_be_visible();screen('09-review');actions()
  # Edit a prepared brief, choose typography, then return without losing the topic.
  page.locator('[data-edit-brief]').first.tap();page.locator('#openFonts').tap();screen('10-fonts');page.locator('#fontDialog [data-close]').tap();expect(page.locator('#topic')).to_have_value('Apresentar um consultório com naturalidade')
  page.locator('#folioHeader [data-app-view="help"]').tap();screen('11-help');actions()
  report['viewports'].append({'width':width,'compactHeader':header['height'],'twoColumnSubmenus':True,'touchWithoutFocusBox':True,'actionsLimeAnd15px':True,'actionTextCentered':True,'guidedFlowCompleted':True,'briefPreserved':True,'noOverflow':True})
  context.close()
 # Keyboard users keep a visible non-rectangular focus cue and Escape return.
 page=b.new_page(viewport={'width':375,'height':812});page.goto(args.base);page.wait_for_function('window.ATLAS_READY');parent=page.locator('[data-folio-open-group="technology"]');parent.focus();page.keyboard.press('Enter');child=page.locator('#folioMenu [data-folio-family]').first;expect(child).to_be_focused();assert child.evaluate('e=>getComputedStyle(e).textDecorationLine')=='underline';assert child.evaluate('e=>getComputedStyle(e).outlineStyle')=='none';page.keyboard.press('Escape');expect(parent).to_be_focused();b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
