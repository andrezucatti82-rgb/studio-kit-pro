"""Visible editor geometry for layout-resizing and iOS-style visual viewports.
These are viewport simulations, not a physical iPhone keyboard test.
"""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:8770/');p.add_argument('--out',default='projects/folio-mobile/keyboard');args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'cases':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode in ['visual','layout']:
  context=b.new_context(viewport={'width':375,'height':812},has_touch=True,is_mobile=True,reduced_motion='reduce')
  if mode=='visual':
   context.add_init_script('''const vv=Object.assign(new EventTarget(),{height:812,width:375,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});window.testViewport=(height,offsetTop=0)=>{vv.height=height;vv.offsetTop=offsetTop;vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));};''')
  page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(args.base);page.wait_for_function('window.ATLAS_READY');page.locator('#folioContinue').tap();field=page.locator('#guidedSubject');field.focus()
  if mode=='visual':page.evaluate('testViewport(360)')
  else:page.set_viewport_size({'width':375,'height':360})
  page.wait_for_function('document.body.dataset.folioKeyboard==="true"')
  def visible():
   page.wait_for_function('''()=>{const a=document.activeElement.getBoundingClientRect(),v=visualViewport,h=document.querySelector('#folioHeader').getBoundingClientRect();return a.top>=Math.max(v.offsetTop,h.bottom)+10&&a.bottom<=v.offsetTop+v.height-46}''')
  visible();assert not page.locator('.folio-category-bar').is_visible();assert page.locator('#folioHeader').bounding_box()['height']<90
  text='Quero apresentar um serviço com exemplos reais.\n'+'Detalhes da ideia e materiais disponíveis.\n'*14
  page.keyboard.insert_text(text);visible();expect(field).to_have_value(text);assert field.evaluate('e=>e.scrollTop>0')
  if mode=='visual':page.evaluate('testViewport(330,25)');visible()
  page.screenshot(path=str(out/f'{mode}-editing.png'),animations='disabled')
  if mode=='visual':page.evaluate('testViewport(812)')
  else:page.set_viewport_size({'width':375,'height':812})
  page.wait_for_function('!document.body.dataset.folioKeyboard');expect(page.locator('.folio-category-bar')).to_be_visible();expect(field).to_have_value(text)
  # A brief field follows the same rule, including moving to another input.
  page.evaluate('localStorage.clear()');page.reload();page.wait_for_function('window.ATLAS_READY');page.locator('[data-folio-collection="explanations"]').first.tap();page.locator('#grid [data-choose]').first.tap();page.locator('#folioContinue').tap()
  topic=page.locator('#topic');topic.focus()
  if mode=='visual':page.evaluate('testViewport(360)')
  else:page.set_viewport_size({'width':375,'height':360})
  page.wait_for_function('document.body.dataset.folioKeyboard==="true"');visible();page.locator('#brand').focus();visible();page.keyboard.insert_text('Minha marca');expect(page.locator('#brand')).to_have_value('Minha marca')
  page.locator('#brand').blur();page.wait_for_function('!document.body.dataset.folioKeyboard');context.close()
  report['cases'].append({'mode':mode,'focusedFieldAboveKeyboard':True,'longTextCaretScrolls':True,'compactHeaderWhileEditing':True,'menuRestored':True,'textPreserved':True,'briefFieldsCovered':True})
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
