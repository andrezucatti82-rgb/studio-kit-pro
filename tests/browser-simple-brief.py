"""Single-style flow, permanently visible filters and descriptive handoff."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import argparse,json
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8770/');parser.add_argument('--out',default='projects/folio-green/simple');args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
report={'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,1440]:
  context=b.new_context(viewport={'width':width,'height':900});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(args.base);page.wait_for_function('window.ATLAS_READY && document.body.dataset.folio')
  page.locator('#folioContinue').click();page.locator('#guidedSubject').fill('Apresentar um consultório com naturalidade');page.locator('#folioContinue').click();page.locator('#guidedBrowse').click()
  page.locator('[data-folio-collection="explanations"]').first.click();page.locator('#grid [data-choose]').first.click();style=page.evaluate('AtlasCurrentChoice().selectedStyles[0].id')
  page.locator('#folioContinue').click();expect(page.locator('#guidedSubject')).to_have_value('Apresentar um consultório com naturalidade')
  for step in range(4):
   if width<=700:
    assert page.evaluate('''()=>{const mark=document.querySelector('.folio-brand').getBoundingClientRect(),cta=document.querySelector('#folioContinue').getBoundingClientRect(),help=document.querySelector('#folioHeader>nav:last-of-type').getBoundingClientRect();return mark.right+5<=cta.left&&cta.right+5<=help.left}'''),(width,step)
   page.locator('#folioContinue').click()
  expect(page.locator('#handoff')).to_be_visible()
  assert page.evaluate('AtlasCurrentChoice().selectedStyles.length')==1
  prompt=page.locator('#promptOutput').input_value();assert 'visualDescription' in prompt and 'colorAndLighting' in prompt and 'typography' in prompt and 'não precisa baixar' in prompt
  page.evaluate('(id)=>AtlasApp.detail(id)',style);expect(page.locator('#detailDialog')).to_be_visible();assert page.locator('#detailDialog [data-add], #detailDialog [data-frame], #detailDialog [data-board]').count()==0
  before=page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)');page.locator('#detailDialog [data-similar]').click();expect(page.locator('#folioCollectionTitle')).to_contain_text('Estilos parecidos')
  assert page.evaluate('JSON.stringify(AtlasApp.exportBundle().project)')==before
  ids=page.locator('#grid [data-style-id]').evaluate_all('es=>es.map(e=>e.dataset.styleId)');assert 0<len(ids)<=24 and style not in ids
  expect(page.locator('#kind')).to_be_visible();expect(page.locator('#favoriteFilter')).to_be_visible();assert page.locator('#videoFilter, #folioCategoryFilters, .extra-filters').count()==0
  page.locator('#grid [data-detail]').first.click();page.locator('#detailDialog [data-choose]').click();expect(page.locator('#topic')).to_be_visible();assert page.evaluate('AtlasCurrentChoice().selectedStyles.length')==1 and page.evaluate('AtlasCurrentChoice().selectedStyles[0].id')!=style
  page.locator('#briefVisual [data-detail]').click();expect(page.locator('#detailDialog')).to_be_visible();page.locator('#folioContinue').click();expect(page.locator('#handoff')).to_be_visible();assert page.locator('#folioPanelHost').is_hidden()
  page.locator('#folioHeader .folio-brand').click();page.locator('#folioBrowseAll').click();page.evaluate('scrollTo(0,1200)');assert abs(page.locator('#folioHeader').bounding_box()['y'])<1
  assert not page.locator('#selectionTray').is_visible() and not page.locator('.mobile-app-nav').is_visible() and page.locator('.folio-to-top').count()==0
  page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'catalogue-{width}.png'),animations='disabled')
  page.evaluate('AtlasApp.detail("natural-advocacia-antes-da-assinatura-uma-conversa")');page.screenshot(path=str(out/f'framing-{width}.png'),full_page=True,animations='disabled')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');report['viewports'].append({'width':width,'singleStyle':True,'similarPreservesProject':True,'draftResumed':True,'descriptivePrompt':True,'visibleFilters':True,'stickyHeader':True});context.close()
 b.close()
assert not report['errors'],report
(out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
