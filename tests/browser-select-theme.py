"""Inspect the real select menus and exercise the fallback used by other engines."""
import argparse
import os
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

p = argparse.ArgumentParser()
p.add_argument('--base', default='http://127.0.0.1:8876/')
p.add_argument('--sequences', default='http://127.0.0.1:8876/sequencias.html')
args = p.parse_args()
env = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{env.scheme}://{env.hostname}:{env.port}',
         'bypass': 'localhost,127.0.0.1'} if env.hostname else None
force_fallback = """
const supports=CSS.supports.bind(CSS);
CSS.supports=(...args)=>args[0]==='(appearance:base-select) and selector(::picker(select))'?false:supports(...args);
"""


def theme(control):
    style = control.evaluate('''el=>{
        const picker=getComputedStyle(el,'::picker(select)');
        const active=getComputedStyle(el.selectedOptions[0]);
        const theme=getComputedStyle(document.body).getPropertyValue('--folio-accent').trim();
        return {app:getComputedStyle(el).appearance,picker:picker.appearance,background:picker.backgroundColor,color:active.color,theme};
    }''')
    assert style['app'] == style['picker'] == 'base-select', style
    assert style['background'] == 'rgb(36, 36, 36)', style
    assert style['color'] == 'rgb(226, 255, 59)', style


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'], proxy=proxy)
    for width, fallback in ((375, True), (1440, True), (375, False), (1440, False)):
        page = browser.new_page(viewport={'width': width, 'height': 860}, reduced_motion='reduce', has_touch=width==375)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        if fallback:
            page.add_init_script(force_fallback)
        assert page.goto(args.base, timeout=45000).ok
        page.wait_for_function('window.ATLAS_READY')
        page.evaluate('AtlasApp.chooseStyle("food-asmr-com-narracao");AtlasShell.openBrief();')
        page.locator('#briefDialog .material-manual summary').click()
        control = page.locator('#briefDialog select[data-material-kind]')
        if fallback:
            control.tap() if width==375 else control.click()
            menu = page.get_by_role('listbox', name='Opções')
            expect(menu).to_be_visible()
            expect(menu).to_have_css('background-color', 'rgb(36, 36, 36)')
            expect(menu.get_by_role('option', selected=True)).to_have_css('color', 'rgb(226, 255, 59)')
            mark = menu.get_by_role('option', name='Marca', exact=True)
            mark.tap() if width==375 else mark.click()
            expect(control).to_have_value('brand')
            expect(menu).to_have_count(0)
            control.focus()
            page.keyboard.press('Space')
            page.keyboard.press('Home')
            expect(menu.locator('[data-active]')).to_have_text('Imagem')
            page.keyboard.press('Enter')
            expect(control).to_have_value('image')
            page.keyboard.press('Space')
            page.keyboard.press('Escape')
            expect(menu).to_have_count(0)
            expect(control).to_be_focused()
            page.locator('#format').click()
            expect(menu).to_be_visible()
            page.keyboard.press('Tab')
            expect(menu).to_have_count(0)
        else:
            theme(control)
            theme(page.locator('#format'))
            theme(page.locator('#duration'))
            control.click()
            expect(control).to_have_css('appearance', 'base-select')
            page.get_by_role('option', name='Marca', exact=True).click()
            expect(control).to_have_value('brand')
        return_location = page.url
        assert page.goto(args.sequences, timeout=45000).ok, return_location
        page.wait_for_function('window.SEQUENCE_PILOT_READY')
        category = page.locator('#category')
        if fallback:
            category.tap() if width==375 else category.click()
            expect(page.get_by_role('listbox', name='Opções')).to_be_visible()
            page.keyboard.press('Home')
            page.keyboard.press('Enter')
            expect(category).to_have_value('')
        else:
            theme(category)
        assert not errors, errors
        print(f'{width}px {"alternativo" if fallback else "nativo estilizado"}: briefing e galeria', flush=True)
        page.close()
    browser.close()
