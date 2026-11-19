"""Check compact navigation, discovery recovery and nearby production actions."""
import argparse
import os
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8873/')
args=parser.parse_args()
env=urlsplit(os.environ.get('HTTPS_PROXY',''))
proxy={'server':f'{env.scheme}://{env.hostname}:{env.port}','bypass':'localhost,127.0.0.1'} if env.hostname else None

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],proxy=proxy)
 for width in (320,375,768,1440):
  page=browser.new_page(viewport={'width':width,'height':812},has_touch=width<=700,reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  assert page.goto(args.base,timeout=40000).ok
  expect(page.locator('body')).to_have_attribute('data-disteven','true',timeout=30000)
  trigger=page.locator('#distevenCategoryToggle')
  if width<=700:
   expect(page.locator('#distevenCategoryBar')).not_to_be_visible()
   assert page.locator('#distevenHeader').bounding_box()['height']<90
   trigger.click()
   expect(trigger).to_have_attribute('aria-expanded','true')
   expect(page.locator('#distevenMenu [data-disteven-mobile-group]')).to_have_count(6)
  else:
   expect(trigger).not_to_be_visible()
   expect(page.locator('#distevenCategoryBar')).to_be_visible()
  page.locator('[data-disteven-mobile-group=business]' if width<=700 else '[data-disteven-open-group=business]').click()
  page.locator('[data-disteven-topic=casa]').click()
  page.locator('[data-disteven-detail=moveis]').click()
  expect(page.locator('#distevenCollectionTitle')).to_have_text('Móveis e decoração')
  expect(page.locator('#distevenResultCount')).to_be_visible()
  if width<=700:
   expect(trigger).to_have_attribute('aria-expanded','false')
   expect(page.locator('#distevenCategoryBar')).not_to_be_visible()
  card=page.locator('#grid .disteven-cover').first
  card.click()
  expect(page.locator('#detailDialog')).to_be_visible()
  page.locator('#detailDialog [data-sequence]').first.click()
  expect(page.locator('#sequenceDialog .sequence-navigation')).to_be_visible()
  assert page.locator('.sequence-navigation').bounding_box()['y'] < page.locator('#sequenceViewport').bounding_box()['y']
  page.keyboard.press('Escape')
  expect(page.locator('#detailDialog')).to_be_visible()
  page.locator('#detailDialog [data-close]').click()
  expect(card).to_be_focused()
  search=page.locator('#search')
  search.fill('zzqxnqzz')
  expect(page.locator('#emptyTitle')).to_have_text('Nenhum resultado')
  expect(page.locator('#distevenResultCount')).to_have_text('0 estilos')
  page.locator('#distevenEditSearch').click()
  expect(search).to_be_focused()
  page.locator('#distevenSearchClear').click()
  expect(search).to_have_value('')
  page.locator('#distevenHomeFavorites').click()
  expect(page.locator('#emptyTitle')).to_have_text('Nenhum favorito encontrado')
  page.locator('#reset').click()
  expect(page.locator('#distevenCollectionTitle')).to_have_text('Todos os estilos')
  page.evaluate("AtlasApp.chooseStyle('publicidade-cinematografica'); AtlasShell.openBrief()")
  page.locator('#topic').fill('Exemplo para validar a navegação')
  page.locator('#distevenContinue').click()
  expect(page.locator('#chatLink')).to_be_visible()
  assert page.locator('#chatLink').bounding_box()['y']<page.locator('#requestSummary').bounding_box()['y']
  page.locator('#promptDetails > summary').click()
  expect(page.locator('#copyPrompt')).to_be_visible()
  page.locator('#distevenHeader [data-app-view=help]').click()
  expect(page.locator('#helpBack')).to_have_text('← Voltar ao briefing')
  page.locator('#helpBack').click()
  expect(page.locator('#handoff')).to_be_visible()
  page.locator('[data-edit-brief=topic]').click()
  expect(page.locator('#topic')).to_be_focused()
  expect(page.locator('#topic')).to_have_value('Exemplo para validar a navegação')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert not errors,errors
  print(f'{width}px: categorias, foco, busca, favoritos, revisão e volta da ajuda',flush=True)
  page.close()
 browser.close()
