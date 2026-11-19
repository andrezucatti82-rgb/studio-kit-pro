"""Verify compact four-frame sequences, niche groups and centered brief icons."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8873/')
parser.add_argument('--out', default='projects/folio-frame-consistency/browser')
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
proxy_url = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{proxy_url.scheme}://{proxy_url.hostname}:{proxy_url.port}',
         'bypass': 'localhost,127.0.0.1'} if proxy_url.hostname else None
styles = ['explicador-orbita-frente-tras', 'food-asmr-com-narracao', 'design-suico',
          'fluxos-sankey', 'natural-joias-do-gesto-a-assinatura']

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'], proxy=proxy)
    for width in (320, 375, 768, 1024, 1440, 1680):
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.goto(args.base, timeout=45000).ok
        page.wait_for_function('window.ATLAS_READY')
        expect(page.locator('.folio-endorsement')).to_have_count(0)
        expect(page.locator('.folio-collection-back')).not_to_be_visible()
        if width >= 1200:
            brand = page.locator('.folio-brand').bounding_box()
            category = page.locator('.folio-category-bar>button').first.bounding_box()
            assert 0 <= category['x'] - brand['x'] - brand['width'] <= 35
        if width <= 700:
            page.locator('#folioCategoryToggle').click()
        page.locator('[data-folio-open-group=presentations]').click()
        page.locator('[data-folio-topic=profissional]').click()
        grouped = page.locator('#grid .folio-niche-section')
        assert grouped.count() >= 3
        assert len(set(grouped.locator('h2').all_text_contents())) == grouped.count()
        initial = 2 if width <= 700 else 3 if width < 900 else 4 if width < 1200 else 6
        counts = grouped.evaluate_all('es=>es.map(e=>e.querySelectorAll(".folio-card").length)')
        assert all(0 < count <= initial for count in counts), counts
        if width in (375, 1680):
            page.locator('#grid img').evaluate_all('async es=>await Promise.allSettled(es.filter(e=>e.getBoundingClientRect().top<innerHeight).map(e=>{e.loading="eager";return e.decode()}))')
            page.screenshot(path=out / f'{width}-niches.png')
        pages = page.locator('[data-niche-more]')
        identifier = pages.first.get_attribute('data-niche-more')
        section = page.locator('section[aria-labelledby=niche-' + identifier + ']')
        section.locator('[data-niche-more]').click()
        assert section.locator('.folio-card').count() > initial
        expect(section.locator('.folio-cover').nth(initial)).to_be_focused()
        page.locator('#search').fill('dentista')
        expect(page.locator('#grid .folio-niche-section')).to_have_count(0)

        heights = []
        for style in styles:
            assert page.evaluate('(id)=>Boolean(AtlasApp.getStyle(id))', style)
            page.evaluate('(id)=>AtlasApp.detail(id)', style)
            sheet = page.locator('.film-sheet')
            expect(sheet).to_be_visible()
            frames = sheet.locator('[data-frame-index]')
            assert frames.evaluate_all('es=>es.map(e=>Number(e.dataset.frameIndex))') == [0, 1, 2, 3]
            bounds = frames.evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.top,r.width,r.height]})')
            assert all(max(v)-min(v) < 1 for v in zip(*bounds)), (style, width, bounds)
            assert frames.evaluate_all('''es=>es.every(e=>{
                const media=e.firstElementChild.getBoundingClientRect(),well=e.getBoundingClientRect();
                return media.width<=well.width+1 && media.height<=well.height+1;
            })'''), (style, width, 'artwork clipped by frame')
            height = bounds[0][2]
            assert height <= (230 if width <= 700 else 400), (width, height)
            heights.append(height)
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            if width in (375, 1680) and style in styles[:2]:
                frames.locator('img').evaluate_all('async es=>await Promise.all(es.map(e=>{e.loading="eager";return e.decode()}))')
                page.screenshot(path=out / f'{width}-{style}.png')
            if style == styles[0]:
                frames.nth(1).click()
                expect(page.locator('#sequencePosition')).to_have_text('2 / 4')
                expect(page.locator('#sequenceViewport img')).to_have_css('position', 'absolute')
                page.keyboard.press('Escape')
            page.locator('#detailDialog [data-close]').click()
        assert max(heights) - min(heights) < 1, (width, heights)

        page.evaluate('AtlasApp.chooseStyle("design-suico"); AtlasApp.detail("fluxos-sankey");')
        page.locator('[data-style-complement=fluxos-sankey]').click()
        page.keyboard.press('Escape')
        details = page.locator('details').filter(has=page.locator('#selectionList')).last
        details.evaluate('e=>e.open=true')
        buttons = page.locator('#selectionList button[data-remove]')
        expect(buttons).to_have_count(2)
        for button in buttons.all():
            assert button.evaluate('''e=>{
                const a=e.getBoundingClientRect(),b=e.querySelector("svg").getBoundingClientRect();
                return Math.abs((a.left+a.right-b.left-b.right)/2)<1
                    && Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<1;
            }''')
        assert page.locator('.brief-style-image').evaluate_all('es=>es.every(e=>getComputedStyle(e).backgroundColor==="rgb(21, 21, 21)")')
        assert not errors, errors
        print(f'{width}px: quadros de {heights[0]:.1f}px, nichos, ícones centrais e cabeçalho', flush=True)
        page.close()
    browser.close()
