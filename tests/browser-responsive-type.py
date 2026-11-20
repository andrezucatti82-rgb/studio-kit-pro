"""Verify the shared visual scale in the library, workspaces and support pages."""
import argparse
import os
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
parser.add_argument('--out', type=Path)
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None


def font(element):
    expect(element).to_be_visible()
    return element.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')


def fits(page, view):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), view


with sync_playwright() as playwright:
    for kind, widths in [('chromium', (768, 1024, 1680)), ('webkit', (320, 390))]:
        overrides = {'executable_path': '/usr/bin/chromium', 'args': ['--no-sandbox']} if kind == 'chromium' else {}
        browser = getattr(playwright, kind).launch(proxy=proxy, **overrides)
        for width in widths:
            mobile = width < 701
            library, title, section, control = (20,22,16,16) if mobile else (24,26,18,15)
            page = browser.new_page(viewport={'width':width,'height':844}, is_mobile=mobile,
                                    has_touch=mobile, reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            assert page.goto(args.base, timeout=45000).ok
            page.wait_for_function('window.ATLAS_READY')
            website_assets = page.evaluate('window.ATLAS_PUBLIC_ATLAS_BASE || ""')
            support = urljoin(args.base, website_assets) if website_assets else args.base
            home_title = page.locator('#distevenDiscoveryTitle')
            shelf = page.locator('.disteven-shelf').first
            assert font(home_title) == library
            assert font(shelf.locator('h2')) == section
            if width >= 390:
                assert home_title.bounding_box()['height'] <= 1.3*library
            search = page.locator('#search')
            assert font(search) == control
            assert search.bounding_box()['height'] >= 44
            if mobile:
                assert page.locator('#distevenCategoryToggle').bounding_box()['height'] >= 44
            assert page.locator('#distevenContinue').bounding_box()['height'] >= 44
            fits(page,'home')
            if args.out and width in (390,1680):
                args.out.mkdir(exist_ok=True, parents=True)
                page.screenshot(path=args.out/f'home-{width}.png')
            page.locator('#distevenBrowseAll').click()
            assert font(page.locator('#distevenCollectionTitle')) == library
            assert font(search) == control
            fits(page,'catálogo')
            page.evaluate("AtlasApp.detail('design-suico')")
            assert font(page.locator('.direction-header h2')) == title
            assert font(page.locator('.film-heading h3')) == section
            assert font(page.locator('.direction-summary h3')) == section
            fits(page,'ficha')
            page.locator('.film-steps [data-frame-index]').first.click()
            assert font(page.locator('#sequenceTitle')) == section
            fits(page,'ampliação')
            page.evaluate("AtlasInlinePanels.reset(); document.getElementById('startGuided').click()")
            assert font(page.locator('#guidedTitle')) == title
            assert font(page.locator('#guidedSubject')) == (16 if mobile else 14)
            fits(page,'guia')
            page.evaluate("AtlasInlinePanels.reset(); AtlasApp.chooseStyle('design-suico'); AtlasShell.openBrief({stage:'briefing'})")
            assert font(page.locator('#briefTitle')) == title
            assert font(page.locator('#topic')) == control
            fits(page,'briefing')
            page.locator('#topic').fill('Apresentar minha loja de móveis')
            page.locator('#distevenContinue').click()
            assert font(page.locator('#handoffTitle')) == section
            fits(page,'revisão')
            page.evaluate("AtlasShell.view('project')")
            assert font(page.locator('#projectTitle')) == title
            fits(page,'projeto')
            page.evaluate("AtlasShell.view('help')")
            assert font(page.locator('#appHelp h1')) == title
            assert font(page.locator('#installTitle')) == section
            fits(page,'ajuda')
            assert not errors, errors
            page.close()

            if width in (390,1680):
                pages = ['como-instalar.html','research.html','sequencias.html','motion-campaign.html','automation-pilot.html']
                pages.append('download.html?style=design-suico&frame=1')
                public = browser.new_page(viewport={'width':width,'height':844}, is_mobile=mobile)
                for path in pages:
                    assert public.goto(urljoin(support,path),timeout=45000).ok, path
                    assert font(public.locator('h1').first) == title, path
                    fits(public,path)
                public.close()
            print(f'{kind} {width}px: título da home {library}px, páginas {title}px, seções {section}px, campos {control}px',flush=True)
        browser.close()
