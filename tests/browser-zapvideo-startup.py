"""Check the zapvideo logo, loading motion preferences and existing retry state."""
import argparse
import os
import re
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None
catalog_request = re.compile(r'/catalog(?:-[0-9a-f]+)?\.json(?:\?.*)?$')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'], proxy=proxy)
    for width, reduce_motion, reject in ((320, False, False), (390, True, False), (1440, False, False), (1440, False, True)):
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce' if reduce_motion else 'no-preference', ignore_https_errors=True)
        requests = []
        page.route(catalog_request, lambda route: requests.append(route))
        assert page.goto(args.base, wait_until='domcontentloaded', timeout=45000).ok
        startup = page.locator('#distevenStartup')
        mark = startup.locator('.zapvideo-startup-part-a')
        expect(startup).to_be_visible()
        expect(startup.get_by_role('img', name='zapvideo')).to_be_visible()
        expect(mark).to_have_css('fill', 'rgb(226, 255, 59)')
        expect(mark).to_have_css('animation-name', 'none' if reduce_motion else 'zapvideo-snap-left')
        if not reduce_motion:
            expect(mark).to_have_css('animation-iteration-count', '1')
        expect(startup.get_by_role('status')).to_have_text('Carregando a biblioteca…')
        page.wait_for_function('performance.getEntriesByType("resource").some(r=>r.name.endsWith("production-ui.js"))')
        assert len(requests) == 1
        if reject:
            requests[0].abort()
            expect(startup.get_by_role('status')).to_have_text('Não foi possível abrir a biblioteca.')
            expect(startup.get_by_role('button', name='Tentar novamente')).to_be_visible()
        else:
            requests[0].continue_()
            expect(startup).to_be_hidden(timeout=45000)
            logo = page.locator('#distevenHeader .zapvideo-logo')
            expect(logo).to_be_visible()
            expect(logo).to_have_attribute('alt', 'zapvideo')
            page.wait_for_function("document.querySelector('#distevenHeader .zapvideo-logo').naturalWidth > 0")
            page.evaluate('document.fonts.ready')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            boundary = logo.bounding_box()['x'] + logo.bounding_box()['width']
            assert boundary < page.locator('#distevenContinue').bounding_box()['x']
            assert page.title().startswith('zapvideo')
        print(f'{width}px: loading logo, motion setting and {"retry" if reject else "ready state"} verified.', flush=True)
        page.close()
    browser.close()
