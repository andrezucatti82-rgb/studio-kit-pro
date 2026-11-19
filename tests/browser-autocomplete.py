"""Local search predictions and optional embedded-Page parity; no search API."""
from pathlib import Path
from urllib.parse import urlparse
import argparse,json,mimetypes,os
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8770/');p.add_argument('--out',default='projects/disteven-segmented/search');p.add_argument('--page');args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True);dist=Path(__file__).resolve().parents[1]/'style-atlas/dist'
v=urlparse(os.environ.get('HTTPS_PROXY',''));proxy={'server':f'{v.scheme}://{v.hostname}:{v.port}','bypass':'127.0.0.1,localhost'} if v.hostname else None
if proxy and v.username:proxy.update(username=v.username,password=v.password or '')
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy=proxy)
 for embedded in ([False,True] if args.page else [False]):
  for width in [375,1440]:
   context=b.new_context(viewport={'width':width,'height':812},has_touch=width<700,reduced_motion='reduce')
   if width<700:context.add_init_script('''const vv=Object.assign(new EventTarget(),{height:812,width:375,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});window.testKeyboard=h=>{vv.height=h;vv.dispatchEvent(new Event('resize'));};''')
   if embedded:
    context.add_init_script('''window.openai={widgetState:null,setWidgetState:async function(v){this.widgetState=v}};Object.defineProperty(window,'localStorage',{get(){throw Error('Page must not access localStorage')}});''')
    context.route('**/autocomplete-candidate',lambda route:route.fulfill(body=Path(args.page).read_text(),content_type='text/html'))
    def runtime(route):
     file=(dist/urlparse(route.request.url).path.lstrip('/')).resolve();assert file.is_relative_to(dist)
     route.fulfill(path=str(file),content_type=mimetypes.guess_type(file.name)[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
    context.route('https://disteven.runtime/**',runtime)
   page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(args.base+('autocomplete-candidate' if embedded else ''));page.wait_for_function('window.ATLAS_READY')
   page.evaluate('AtlasApp.chooseStyle("vidro-e-refracao")');before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)');search=page.locator('#search');search.fill('dent')
   panel=page.locator('#searchSuggestions');expect(panel).to_be_visible();assert page.locator('#searchSuggestions [role=option]').count()<=6;assert panel.evaluate('e=>getComputedStyle(e).position')=='absolute'
   assert not page.locator('#searchSuggestions img').count();assert not page.locator('.search-tags').count()
   page.keyboard.press('ArrowUp');last=page.locator('#searchSuggestions [role=option]').last;expect(last).to_have_attribute('aria-selected','true');page.keyboard.press('Escape');expect(panel).not_to_be_visible();expect(search).to_be_focused()
   search.fill('dent');page.keyboard.press('ArrowDown');page.keyboard.press('Enter');expect(search).to_have_value('dentista');expect(panel).not_to_be_visible();assert int(page.locator('#resultCount').inner_text().split()[0])>0
   search.fill('dentista az');expect(panel).to_be_visible();option=page.locator('#searchSuggestions button').filter(has_text='dentista azul');expect(option).to_have_count(1);option.click();expect(search).to_have_value('dentista azul');expect(search).to_be_focused();expect(panel).not_to_be_visible();assert page.locator('#grid [data-style-id]').count()>0
   search.fill('cachoro');expect(panel).to_be_visible();page.locator('#searchSuggestions button').filter(has_text='cachorro').first.click();expect(search).to_have_value('cachorro');assert page.locator('#grid [data-style-id="pet-em-uso-cotidiano"]').count()==1
   search.fill('zzqxnqzz');expect(panel).not_to_be_visible();expect(page.locator('#empty')).to_be_visible()
   search.fill('<img src=x onerror=alert(1)>');expect(panel).not_to_be_visible();assert not page.locator('#searchSuggestions img').count()
   search.fill('implan');expect(panel).to_be_visible();assert page.locator('#searchSuggestions span').first.inner_text()=='implante'
   if width<700:
    page.evaluate('testKeyboard(360)');page.wait_for_function('document.body.dataset.distevenKeyboard==="true"');page.wait_for_function('document.querySelector("#searchSuggestions").getBoundingClientRect().bottom<=visualViewport.height-46');assert search.bounding_box()['y']>=page.locator('#distevenHeader').bounding_box()['height']
    page.evaluate('testKeyboard(812)');page.wait_for_function('!document.body.dataset.distevenKeyboard')
   page.screenshot(path=str(out/f'suggestions-{width}-{embedded}.png'),animations='disabled')
   page.keyboard.press('Tab');expect(panel).not_to_be_visible();assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   report['checks'].append({'width':width,'embedded':embedded,'keyboardAndPointer':True,'typoSuggestion':True,'compoundQueries':True,'stableResultsLayout':True,'projectPreserved':True,'localSearch':True})
   context.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
