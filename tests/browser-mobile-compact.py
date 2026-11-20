"""Check mobile density, tap targets and layout across the major workspaces."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
parser.add_argument('--out', type=Path)
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None


def box(locator):
    size = locator.bounding_box()
    assert size, locator
    return size


def font(locator):
    return locator.evaluate('element => parseFloat(getComputedStyle(element).fontSize)')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'], proxy=proxy)
    for width in (320, 390, 430):
        page = browser.new_page(viewport={'width': width, 'height': 844}, has_touch=True, is_mobile=True, ignore_https_errors=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.goto(args.base, timeout=45000).ok
        page.wait_for_function('window.ATLAS_READY && history.state?.atlasNavigation', timeout=45000)
        page.evaluate('document.fonts.ready')

        def validate(view, item):
            expect(page.locator(item)).to_be_visible()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), view
            if args.out and width == 390:
                args.out.mkdir(exist_ok=True, parents=True)
                page.screenshot(path=str(args.out / f'{view}.png'), animations='disabled')

        categories = page.locator('#distevenCategoryToggle')
        search = page.locator('#search')
        expect(search).to_have_attribute('placeholder', 'Buscar estilos')
        c, s = box(categories), box(search)
        assert abs(c['y'] - s['y']) < 2 and c['x'] + c['width'] < s['x']
        assert min(c['height'], s['height'], box(page.locator('#distevenContinue'))['height']) >= 44
        assert font(search) == 16 and font(page.locator('#distevenDiscoveryTitle')) <= 24
        assert box(page.locator('#distevenHeader'))['height'] <= 56
        validate('biblioteca', '#distevenDiscoveryTitle')

        categories.tap()
        page.locator('[data-disteven-mobile-group=business]').tap()
        page.locator('[data-disteven-topic=comida]').tap()
        expect(page.locator('#distevenMenu .disteven-menu-list')).to_have_count(1)
        assert min(box(item)['height'] for item in page.locator('#distevenMenuDetail button').all()) >= 44
        validate('categorias', '#distevenMenuDetail')
        page.locator('[data-disteven-detail=cafes]').tap()
        validate('catalogo', '#distevenCollectionTitle')
        page.locator('#grid .disteven-cover').first.tap()
        validate('estilo', '#detailDialog .direction-header')
        page.locator('#detailDialog [data-sequence]').first.tap()
        validate('quadro', '#sequenceDialog')

        page.evaluate("AtlasInlinePanels.reset();document.getElementById('startGuided').click()")
        validate('guia', '#guidedStep0')
        assert font(page.locator('#guidedTitle')) <= 24
        assert font(page.locator('#guidedSubject')) == 16
        page.evaluate("AtlasInlinePanels.reset();AtlasApp.chooseStyle('publicidade-cinematografica');AtlasShell.openBrief({stage:'briefing'})")
        assert font(page.locator('#topic')) == 16
        page.locator('#topic').fill('Anunciar o novo café da minha loja')
        validate('briefing', '#briefForm')
        page.locator('#openFonts').tap()
        validate('fontes', '#fontDialog')
        page.evaluate('AtlasInlinePanels.reset()')
        page.locator('#distevenContinue').tap()
        validate('revisao', '#handoff')
        page.evaluate("AtlasShell.view('project')")
        validate('projeto', '#myProject')
        page.evaluate("AtlasShell.view('help')")
        validate('ajuda', '#instalar')
        assert not errors, errors
        print(f'{width}px: compact header, menu, catalogue, guide, request, project and help verified.', flush=True)
        page.close()
    browser.close()
