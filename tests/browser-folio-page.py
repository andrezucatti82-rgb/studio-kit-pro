"""Exercise the generated embedded Page with real local assets and widget storage."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import argparse,json
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser();parser.add_argument('--page',default='projects/folio-ui/page-embed.html');parser.add_argument('--assets',default='http://127.0.0.1:8770/');parser.add_argument('--out',default='projects/folio-ui/page-validation.json');args=parser.parse_args()
file=Path(args.page).resolve()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(file.parent)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
report={'checks':[],'errors':[],'embeddedBytes':file.stat().st_size}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':390,'height':844})
  context.add_init_script('''window.openai={widgetState:null,setWidgetState:async function(value){this.widgetState=value;}};Object.defineProperty(window,'localStorage',{get(){throw Error('Embedded Page must never read localStorage');}});''')
  context.route('https://folio.local/**',lambda route:route.fulfill(response=context.request.get(args.assets+route.request.url.removeprefix('https://folio.local/'))))
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{file.name}');page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio==="true"',timeout=45000)
  assert page.locator('.folio-shelf').count()==4
  page.locator('[data-folio-collection="explanations"]').first.click();style=page.locator('#grid [data-choose]').first.get_attribute('data-choose');page.locator('#grid [data-choose]').first.click()
  page.evaluate('AtlasApp.save()');assert page.evaluate('openai.widgetState.modelContent.selectedStyles[0].id')==style
  page.locator('#folioContinue').click();page.locator('#topic').fill('Explicar um serviço com o Fólio');page.locator('#folioContinue').click();expect(page.locator('#handoff')).to_be_visible()
  assert style in page.locator('#promptOutput').input_value()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  report['checks']=['embedded Fólio below 256 KiB','real catalogue and reference assets','collection and selection written to widget state','complete generated brief','localStorage access rejected by browser fixture','no viewport overflow']
  context.close();browser.close()
finally:server.shutdown();server.server_close()
assert report['embeddedBytes']<262144
assert not report['errors'],report['errors']
Path(args.out).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
