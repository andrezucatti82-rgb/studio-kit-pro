"""Touch the separate themed picker trigger with an iPhone 13 WebKit profile."""
import argparse
import os
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None
fallback = """
const supports = CSS.supports.bind(CSS);
CSS.supports = (...args) => args[0] === '(appearance:base-select) and selector(::picker(select))'
  ? false : supports(...args);
"""

with sync_playwright() as playwright:
    browser = playwright.webkit.launch(proxy=proxy)
    page = browser.new_page(**playwright.devices['iPhone 13'], ignore_https_errors=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script(fallback)
    assert page.goto(args.base, timeout=45000).ok
    page.wait_for_function('window.ATLAS_READY')
    page.locator('#distevenContinue').tap()
    popup = page.get_by_role('listbox', name='Opções')

    def choose(selector, option, value):
        select = page.locator(selector)
        trigger = select.locator('..').get_by_role('combobox')
        expect(select).to_have_attribute('aria-hidden', 'true')
        expect(select).to_have_css('pointer-events', 'none')
        expect(popup).to_have_count(0)
        trigger.tap()
        expect(trigger).to_have_attribute('aria-expanded', 'true')
        expect(popup).to_have_count(1)
        expect(popup).to_be_visible()
        popup.get_by_role('option', name=option, exact=True).tap()
        expect(select).to_have_value(value)
        expect(popup).to_have_count(0)
        expect(trigger).to_have_attribute('aria-expanded', 'false')

    choose('#guidedObjective', 'Apresentar um serviço', 'service')
    choose('#guidedComplexity', 'Direto e ágil', 'simple')
    page.evaluate("AtlasInlinePanels.reset(); AtlasApp.chooseStyle('publicidade-cinematografica');AtlasShell.openBrief({stage:'briefing'})")
    choose('#format', 'Horizontal · 16:9', '16:9')
    choose('#duration', '45 s', '45')
    page.locator('#briefDialog .material-manual summary').tap()
    choose('#briefDialog select[data-material-kind]', 'Marca', 'brand')
    assert not errors, errors
    browser.close()
    print('Single themed picker, touch selection and submitted values verified in WebKit.')
