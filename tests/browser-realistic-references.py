"""Reference-panel rendering/export QA. Fictional stills are not video proof."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import json,os
base=os.environ.get('GDA_QA_URL','http://127.0.0.1:8770/')
r=Path.cwd();out=r/'projects/realistic-reference-browser';out.mkdir(parents=True,exist_ok=True)
catalog=json.loads((r/'style-atlas/dist/catalog.json').read_text())
# The fixture permits early QA of atlas addressing before all generation jobs finish.
# Final QA uses the same addresses from the completed canonical catalogue.
sid='explicador-diagrama-ao-lado';s=next(s for s in catalog['styles'] if s['id']==sid);record=json.loads((r/'style-atlas/records/presenter-realistic'/f'{sid}.json').read_text());source=Image.open(r/'style-atlas/dist'/record['path']).convert('RGBA');w,h=source.size
crops=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]]
s['image']={**s['image'],'atlas':record['path'],'columns':1,'rows':1,'width':w//2,'height':h//2,'rect':crops[s['sequence']['heroIndex']]}
s['artDirection']={**s['artDirection'],'path':record['path']}
for i,f in enumerate(s['sequence']['frames']):f.update(src=record['path'],thumbnail=record['path'],crop=crops[i],width=w//2,height=h//2)
result={'checks':[],'errors':[],'canonicalComplete':all(x.get('sequence',{}).get('sourceKind')=='photorealistic_generated_reference' for x in catalog['styles'] if x.get('presenterEditing'))}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width in [375,1440]:
  context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True);page=context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)));page.route('**/catalog.json',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(catalog)))
  page.goto(base);page.wait_for_function('window.ATLAS_READY===true');page.evaluate(f"AtlasApp.detail('{sid}')");page.wait_for_selector('#detailDialog[open]')
  for index,crop in enumerate(crops):
   page.locator(f'[data-presenter-step="{index}"]').click();img=page.locator('[data-presenter-image-host] img');img.wait_for();page.wait_for_function('document.querySelector("[data-presenter-image-host] img").complete');panel=page.locator('[data-presenter-image-host] .reference-panel');box=panel.bounding_box();assert abs(box['width']/box['height']-(w/h))<.02
   with page.expect_download() as d:page.locator('#detailDialog [data-board]').first.click()
   board=out/f'board-{width}.png';d.value.save_as(str(board));assert Image.open(board).size==(w,h)
  with page.expect_download() as d:page.locator('#detailDialog [data-frame]').first.click()
  file=out/f'hero-{width}.png';d.value.save_as(str(file));export=Image.open(file).convert('RGBA');assert export.size==(w//2,h//2)
  crop=crops[s['sequence']['heroIndex']];x0,y0=int(w*crop[0]),int(h*crop[1]);
  for x,y in [(10,10),(w//4,h//4),(w//2-10,h//2-10)]:assert max(abs(a-b) for a,b in zip(source.getpixel((x0+x,y0+y)),export.getpixel((x,y))))<=2
  page.locator('#detailDialog [data-sequence]').first.click();page.wait_for_selector('#sequenceDialog[open]');assert page.locator('#sequenceImage').evaluate('(i)=>i.style.width')=='200%';page.locator('#sequenceDialog [data-close]').click()
  page.locator('#detailDialog').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(out/f'detail-{width}.png'),full_page=False,animations='disabled');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');result['checks'].append(f'{width}px: complete realistic panel, correct proportions, all four steps, exact-size/pixel PNG and complete-board export, expanded viewer crop')
  context.close()
 browser.close()
assert not result['errors'],result['errors']
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
