"""Standalone support pages retain readable controls and working navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json,os
from urllib.parse import urlparse
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8872/');p.add_argument('--out',default='projects/folio-polish/support');p.add_argument('--diagnostics-only',action='store_true');p.add_argument('--media-base');a=p.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
catalog=json.loads(Path('style-atlas/dist/catalog.json').read_text());style=catalog['styles'][0]['id'];report={'checks':[],'errors':[]}
urls=['research.html','download.html?style='+style+'&frame=0','sequencias.html','motion-campaign.html','automation-pilot.html','como-instalar.html']
v=urlparse(os.environ.get('HTTPS_PROXY',''));proxy={'server':f'{v.scheme}://{v.hostname}:{v.port}','bypass':'127.0.0.1,localhost'} if v.hostname else None
if proxy and v.username:proxy.update(username=v.username,password=v.password or '')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy=proxy)
 for width in ([] if a.diagnostics_only else [320,375,768,1440]):
  for url in urls:
   page=b.new_page(viewport={'width':width,'height':900 if width>700 else 812},reduced_motion='reduce');page.on('pageerror',lambda e:report['errors'].append(str(e)));
   if a.media_base:page.add_init_script('window.ATLAS_IMAGE_ASSET_BASE='+json.dumps(a.media_base))
   page.goto(a.base+url);page.evaluate('document.fonts.ready')
   if url.startswith('download'):page.wait_for_function('document.getElementById("save").disabled===false');expect(page.locator('#preview')).to_be_visible()
   if url=='como-instalar.html':page.locator('[role=tab]').last.click();assert page.locator('[role=tab][aria-selected=true]').count()==1
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,url,'overflow')
   assert page.evaluate('getComputedStyle(document.body).backgroundColor')=='rgb(16, 16, 16)',(width,url,'canvas')
   assert 'Folio UI' in page.evaluate('getComputedStyle(document.body).fontFamily')
   if url=='sequencias.html':
    page.locator('.frame-button').first.wait_for(state='visible')
    if a.media_base:assert page.locator('.frame-button img').first.get_attribute('src').startswith(a.media_base)
    assert page.locator('.mast .brand span').is_visible()
    if width<=375:assert page.locator('.progress').evaluate('e=>e.getBoundingClientRect().height<=parseFloat(getComputedStyle(e).lineHeight)*3'),'progress must stay readable above its action on narrow screens'
    frames=page.locator('.frame-button').evaluate_all('es=>es.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {padding:parseFloat(s.paddingLeft)+parseFloat(s.paddingTop),radius:parseFloat(s.borderTopLeftRadius),side:Math.min(r.width,r.height)}})');assert frames and all(x['padding']==0 and x['radius']<x['side']/4 for x in frames),'image controls must retain their full rectangular frame'
    assert page.locator('.intro p').evaluate('e=>{const c=getComputedStyle(e).color.match(/[0-9.]+/g).slice(0,3).map(Number);const l=c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);return (l+.05)/(.00518+.05)>=4.5}')
   buttons=page.locator('button:not(.frame-button),a.button,a.download').evaluate_all('''es=>es.filter(e=>e.getClientRects().length&&!e.disabled).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.innerText,id:e.id,height:r.height,left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight)}})''')
   for x in buttons:assert x['height']>=43.5 and min(x['left'],x['right'])>=12,(width,url,x)
   page.locator('img').evaluate_all('async es=>{await Promise.allSettled(es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight}).map(e=>{e.loading="eager";return e.decode()}))}')
   name=url.split('?')[0];page.screenshot(path=str(out/f'{width}-{name}.png'),animations='disabled')
   if url=='sequencias.html':page.locator('.frame-button').first.scroll_into_view_if_needed();page.screenshot(path=str(out/f'{width}-sequence-frames.png'),animations='disabled')
   report['checks'].append({'width':width,'page':name,'noOverflow':True,'buttonClearance':True,'localFont':True,'darkCanvas':True});page.close()
 # Failed catalogue loading must keep its recovery instructions readable.
 context=b.new_context(viewport={'width':375,'height':812});context.route('**/sequence-pilot.json',lambda route:route.abort());page=context.new_page();page.goto(a.base+'sequencias.html');expect(page.locator('#gallery .error')).to_be_visible()
 def contrast(locator):
  return locator.evaluate("""e=>{const rgb=s=>s.match(/[0-9.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),s=getComputedStyle(e),background=s.backgroundColor==='rgba(0, 0, 0, 0)'?getComputedStyle(document.body).backgroundColor:s.backgroundColor,a=lum(rgb(s.color)),b=lum(rgb(background));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}""")
 error_contrast=contrast(page.locator('#gallery .error'));page.screenshot(path=str(out/'catalogue-error.png'),animations='disabled');page.goto(a.base+'motion-campaign.html');footer_contrast=contrast(page.locator('footer'));page.locator('footer').scroll_into_view_if_needed();page.screenshot(path=str(out/'footer.png'),animations='disabled');context.close()
 report['recoveryContrast']=error_contrast;report['footerContrast']=footer_contrast
 print(json.dumps({'recoveryContrast':error_contrast,'footerContrast':footer_contrast}));assert min(error_contrast,footer_contrast)>=4.5
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
