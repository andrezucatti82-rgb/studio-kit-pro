"""Exercise every DiSteven workspace and measure actionable text bounds."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8872/');p.add_argument('--out',default='projects/disteven-polish/after');p.add_argument('--widths',default='320,375,768,1024,1440,1920');a=p.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
report={'screens':[],'issues':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in map(int,a.widths.split(',')):
  context=b.new_context(viewport={'width':width,'height':900 if width>700 else 812},has_touch=width<=700,reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(a.base);page.wait_for_function('window.ATLAS_READY');page.evaluate('document.fonts.ready')
  def screen(name):
   if page.evaluate('document.documentElement.scrollWidth>innerWidth'):report['issues'].append({'width':width,'screen':name,'issue':'viewport overflow'})
   bad=page.locator('.primary,.outline,.button,.disteven-add,.disteven-panel-back,#sequencePrev,#sequenceNext').evaluate_all('''es=>es.filter(e=>e.getClientRects().length&&!e.disabled&&getComputedStyle(e).visibility!=='hidden').flatMap(e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect(),w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),rects=[];while(w.nextNode()){const n=w.currentNode;if(n.textContent.trim()&&n.parentElement.getClientRects().length){const range=document.createRange();range.selectNodeContents(n);for(const x of range.getClientRects())if(x.width&&x.height)rects.push(x)}}for(const svg of e.querySelectorAll('svg,small'))if(svg.getClientRects().length)rects.push(svg.getBoundingClientRect());
    const after=getComputedStyle(e,'::after'),aw=parseFloat(after.width),ah=parseFloat(after.height);if(after.content!=='none'&&after.display!=='none'&&aw>0&&ah>0){const right=r.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth);rects.push({left:right-aw,right,top:r.top+(r.height-ah)/2,bottom:r.top+(r.height+ah)/2})}
    const failures=[];if(r.height<43.5)failures.push('touch target');if(rects.length){const l=Math.min(...rects.map(x=>x.left)),rr=Math.max(...rects.map(x=>x.right)),t=Math.min(...rects.map(x=>x.top)),bb=Math.max(...rects.map(x=>x.bottom));if(l-r.left<11.5||r.right-rr<11.5)failures.push('label side clearance');if(t<r.top||bb>r.bottom)failures.push('label vertical clipping');if(Math.abs((l+rr-r.left-r.right)/2)>3)failures.push('label horizontal centering')}
    return failures.length?[{text:e.innerText.slice(0,75),id:e.id,failures}]:[]})''')
   report['issues'].extend({'width':width,'screen':name,**v} for v in bad)
   page.locator('img').evaluate_all('async es=>{await Promise.allSettled(es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).map(e=>{e.loading="eager";return e.decode()}))}')
   page.screenshot(path=str(out/f'{width}-{name}.png'),animations='disabled');report['screens'].append({'width':width,'screen':name});(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
  screen('01-home');assert page.locator('.disteven-category-bar button').count()==7
  if width<=375:assert page.locator('#search').evaluate('e=>{const s=getComputedStyle(e),c=document.createElement("canvas").getContext("2d");c.font=s.font;return c.measureText(e.placeholder).width<=e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)}'),'search hint must fit without a trailing icon'
  assert page.locator('.disteven-category-bar button').evaluate_all('es=>es.every(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1})'),'all category words must stay visible'
  page.locator('[data-disteven-open-group="natural-ads"]').click();screen('02-menu');page.locator('[data-disteven-family="ads-joias"]').click();screen('03-category')
  page.locator('#grid [data-detail]').first.click();screen('04-detail');page.locator('#detailDialog [data-sequence]').first.click();screen('05-sequence');page.keyboard.press('Escape');page.locator('#detailDialog [data-close]').click()
  page.locator('#distevenHeader .disteven-brand').click();page.locator('#distevenContinue').click();page.locator('#guidedSubject').fill('Apresentar minhas joias artesanais com acabamento natural e uma história elegante.');sizes=page.locator('#guidedDialog :is(input,select,textarea)').evaluate_all('es=>es.filter(e=>e.getClientRects().length).map(e=>parseFloat(getComputedStyle(e).fontSize))');assert len(sizes)>=4 and min(sizes)>=16;screen('06-guide-objective');page.locator('#distevenContinue').click();page.locator('#guidedBrowse').click();page.locator('[data-disteven-collection="explanations"]').first.click();screen('03b-collection');page.locator('#grid [data-choose]').first.click();page.locator('#distevenContinue').click()
  for n in range(4):
   if page.locator('#handoff').is_visible():break
   screen('06-guide-'+str(n));page.locator('#distevenContinue').click()
  expect(page.locator('#handoff')).to_be_visible();screen('07-review');page.locator('[data-edit-brief]').first.click();screen('08-brief');page.locator('#openFonts').click();screen('09-fonts');page.locator('#fontDialog [data-close]').click()
  page.locator('#briefForm .brief-extra summary').first.click();page.locator('#openMaterials').click();screen('10-materials');page.locator('#materialsDialog [data-close]').click()
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)');page.locator('#distevenHeader [data-app-view="help"]').click();screen('11-help');page.locator('#appHelp .workflow').scroll_into_view_if_needed();screen('12-help-workflow')
  page.evaluate('AtlasShell.view("project")');screen('13-project');page.locator('#distevenHeader .disteven-brand').click();page.locator('#search').fill('dent');screen('14-search');page.locator('#search').fill('zzqxnqzz');screen('15-empty')
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  assert page.locator('#distevenHeader').evaluate('e=>getComputedStyle(e).position')=='sticky'
  context.close()
 # Respect both reduced transparency and the established reduced motion preference.
 page=b.new_page(viewport={'width':375,'height':812},reduced_motion='reduce');page.context.new_cdp_session(page).send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'},{'name':'prefers-reduced-motion','value':'reduce'}]});page.goto(a.base);page.wait_for_function('window.ATLAS_READY');assert page.locator('#distevenHeader').evaluate('e=>getComputedStyle(e).backdropFilter')=='none';b.close()
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'screens':len(report['screens']),'issues':report['issues'],'errors':report['errors']}));assert not report['issues'] and not report['errors']
