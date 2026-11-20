"""Verify guide density and consistent style details with the live CSS."""
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
    bounds = locator.bounding_box()
    assert bounds, locator
    return bounds


def font(locator):
    return float(locator.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))


with sync_playwright() as playwright:
    for kind, widths in [('chromium', (768, 1024, 1680)), ('webkit', (320, 390))]:
        options = {'proxy': proxy}
        if kind == 'chromium':
            options.update(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        browser = getattr(playwright, kind).launch(**options)
        for width in widths:
            mobile = width < 701
            page = browser.new_page(viewport={'width': width, 'height': 844}, is_mobile=mobile, has_touch=mobile,
                                    reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            assert page.goto(args.base, timeout=45000).ok
            page.wait_for_function('window.ATLAS_READY')
            page.locator('#distevenContinue').click()
            guide = page.locator('#guidedDialog')
            expect(guide).to_be_visible()
            title = guide.locator('#guidedTitle')
            expect(title).to_have_text('Conte sua ideia')
            close = box(guide.locator('.guided-header [data-close]'))
            heading = box(title)
            stages = box(guide.locator('.guided-progress'))
            assert close['x'] > heading['x'] and abs(close['y']-heading['y']) < 14
            assert (stages['x'] > heading['x'] and stages['x'] < close['x']) if width>=1000 else (stages['y'] > heading['y']+heading['height'])
            goal, subject, sources = [guide.locator('#guided'+name) for name in ('Objective','Subject','StartingMaterial')]
            assert box(goal)['height'] <= 48 and font(goal) == (16 if mobile else 14)
            if mobile:
                assert close['height'] >= 44
                assert box(goal)['x'] == box(subject)['x'] == box(sources)['x']
                assert box(goal)['y'] < box(subject)['y'] < box(sources)['y']
            else:
                assert box(goal)['x'] < box(sources)['x']
                assert abs(box(goal)['y']-box(sources)['y']) < 1
            assert box(guide.locator('#guidedNext'))['y'] < 730
            if args.out and width in (390,1680):
                args.out.mkdir(parents=True, exist_ok=True)
                guide.screenshot(path=args.out/f'{width}-guide.png')
            subject.fill('Apresentar uma fragrância artesanal')
            sources.select_option('video')
            guide.locator('#guidedNext').click()
            expect(guide.locator('#guidedStep1')).to_be_visible()
            guide.locator('#guidedBack').click()
            expect(subject).to_have_value('Apresentar uma fragrância artesanal')
            expect(sources).to_have_value('video')
            guide.locator('[data-close]').click()

            for style in ('explicador-perfumaria-assinatura-em-notas','natural-moda-feminina-uma-peca-o-seu-dia','design-suico'):
                page.evaluate('(id)=>AtlasApp.detail(id)', style)
                detail = page.locator('#detailDialog')
                overview = detail.locator('.direction-overview')
                summary = overview.locator('.direction-summary')
                expect(summary.locator('h3')).to_have_text('Resumo do estilo')
                assert summary.locator('p').text_content() == page.evaluate('(id)=>AtlasApp.getStyle(id).uses', style)
                film = overview.locator('.film-sheet')
                assert font(summary.locator('h3')) == font(film.locator('h3'))
                assert font(film.locator('figcaption p').first) <= font(summary.locator('p'))
                assert all(film.locator('figure').evaluate_all("""figures=>figures.map(f=>
                  Math.abs(f.querySelector('.frame-expand').getBoundingClientRect().left -
                    f.querySelector('figcaption').getBoundingClientRect().left)<1)"""))
                if width >= 1200:
                    assert box(summary)['x'] > box(film)['x'] and abs(box(summary)['y']-box(film)['y'])<1
                else:
                    assert abs(box(summary)['x']-box(film)['x'])<1
                if style.startswith('explicador'):
                    if args.out and width in (390,1680):
                        overview.screenshot(path=args.out/f'{width}-summary.png')
                    story = detail.locator('[data-presenter-story]')
                    assert not story.evaluate('el=>el.open')
                    story.locator('summary').first.click()
                    story.locator('[data-presenter-step="1"]').click()
                    expect(story.locator('[data-beat=label]')).to_have_text('Separação por função')
                    image = box(story.locator('[data-presenter-image-host]'))
                    text = box(story.locator('[data-beat=label]'))
                    if mobile:
                        assert abs(image['x']-text['x'])<1
                    else:
                        assert abs(image['y']-text['y'])<1
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (style,width)
                detail.locator('[data-close]').click()
            assert not errors,errors
            print(f'{kind} {width}px: guide, drafts, shared summary, captions and presenter steps passed', flush=True)
            page.close()
        browser.close()
