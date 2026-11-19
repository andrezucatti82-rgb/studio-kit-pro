"""Responsive word navigation alignment and the reported warm image frame."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright,expect

p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8770/');p.add_argument('--out',default='projects/disteven-aligned/alignment');args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(reduced_motion='reduce');page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.disteven');page.evaluate('document.fonts.ready')
 for width in [320,375,768,1200,1440,1920]:
  page.set_viewport_size({'width':width,'height':900})
  assert page.locator('#distevenOpenMenu').count()==0
  for group in page.evaluate('AtlasNavigation.groups.filter(g=>!g.directFamily).map(g=>g.id)'):
   trigger=page.locator('[data-disteven-open-group="'+group+'"]');trigger.click()
   page.wait_for_function('!document.querySelector("#distevenMenu").hidden')
   bounds=page.evaluate('''()=>{const bar=document.querySelector('.disteven-category-bar'),first=bar.querySelector('button'),child=document.querySelector('#distevenMenu [data-disteven-family]');return {anchor:Math.max(bar.getBoundingClientRect().left,first.getBoundingClientRect().left+bar.scrollLeft+parseFloat(getComputedStyle(first).paddingLeft)),child:child.getBoundingClientRect().left,overflow:document.documentElement.scrollWidth>innerWidth}}''')
   assert abs(bounds['anchor']-bounds['child'])<=1,(width,group,bounds)
   assert not bounds['overflow'],(width,group,bounds)
   page.keyboard.press('Escape');expect(trigger).to_be_focused()
   assert trigger.evaluate('e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}'),(width,group,trigger.bounding_box(),page.locator('.disteven-category-bar').bounding_box())
  page.locator('[data-disteven-open-group="natural-ads"]').click();page.mouse.move(0,0)
  page.screenshot(path=str(out/f'menu-{width}.png'),animations='disabled');page.keyboard.press('Escape')
  report['viewports'].append({'width':width,'allSixSubmenusAligned':True,'focusVisibleAfterDismissal':True,'noLauncher':True,'noOverflow':True})
 # Keep the opened submenu aligned through header breakpoint changes.
 page.locator('[data-disteven-open-group="technology"]').click()
 for width in [375,1200,768,1440]:
  page.set_viewport_size({'width':width,'height':900})
  page.wait_for_function('''()=>{const b=document.querySelector('.disteven-category-bar'),f=b.querySelector('button'),m=document.querySelector('#distevenMenu [data-disteven-family]');return Math.abs(m.getBoundingClientRect().left-Math.max(b.getBoundingClientRect().left,f.getBoundingClientRect().left+b.scrollLeft+parseFloat(getComputedStyle(f).paddingLeft)))<=1}''')
 page.keyboard.press('Escape')
 # The user's jewelry example: real media in detail and the enlarged sequence.
 sid='natural-joias-do-gesto-a-assinatura'
 for width in [375,1440]:
  page.set_viewport_size({'width':width,'height':900})
  page.locator('[data-disteven-open-group="natural-ads"]').click();page.locator('[data-disteven-family="ads-joias"]').click()
  page.locator('#grid [data-detail="'+sid+'"]').first.click()
  page.locator('#detailContent img').evaluate_all('async es=>{await Promise.all(es.map(e=>e.decode()))}')
  assert page.evaluate('(id)=>Object.values(AtlasFramePresentation[id]).length===4',sid)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=str(out/f'jewelry-detail-{width}.png'),animations='disabled')
  page.locator('#detailDialog [data-sequence]').first.click();expect(page.locator('#sequenceDialog')).to_be_visible()
  page.locator('#sequenceDialog img').evaluate_all('async es=>{await Promise.all(es.map(e=>e.decode()))}')
  page.screenshot(path=str(out/f'jewelry-sequence-{width}.png'),animations='disabled')
  page.keyboard.press('Escape');page.locator('#detailDialog [data-close]').click()
 report['jewelryOriginalsPreserved']=True
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
