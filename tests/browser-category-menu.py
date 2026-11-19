"""Check the category disclosures, keyboard flow and stationary hover styles."""
import argparse
import os
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None


def vertical(buttons):
    boxes = [element.bounding_box() for element in buttons.all()]
    assert boxes and all(box['height'] >= 44 for box in boxes)
    assert all(a['x'] == b['x'] and a['y'] + a['height'] <= b['y'] + 0.5 for a, b in zip(boxes, boxes[1:]))


def check_hover(button):
    css = '''element => {
        const style = getComputedStyle(element);
        return [element.getBoundingClientRect().toJSON(), style.transform, style.boxShadow,
                getComputedStyle(element.firstElementChild || element).transform,
                style.color, style.backgroundColor, style.outlineColor];
    }'''
    before = button.evaluate(css)
    button.hover()
    button.page.wait_for_function('''([selector, color]) => {
        const style = getComputedStyle(document.querySelector(selector));
        return [style.color, style.backgroundColor, style.outlineColor].join() !== color;
    }''', arg=[button.evaluate('e=>{e.dataset.hoverCheck="";return "[data-hover-check]"}'), ','.join(before[4:])])
    after = button.evaluate(css)
    button.evaluate('e=>delete e.dataset.hoverCheck')
    assert before[:4] == after[:4], (before, after)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'], proxy=proxy)
    for width, height in [(320, 568), (390, 844), (768, 650), (1024, 768), (1440, 900)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, ignore_https_errors=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.goto(args.base, timeout=45000).ok
        page.wait_for_function('window.ATLAS_READY && history.state?.atlasNavigation')
        page.evaluate('document.fonts.ready')
        mobile = width <= 700
        if mobile:
            page.locator('#distevenCategoryToggle').click()
            expect(page.locator('#distevenMenuLabel')).to_have_text('Categorias')
            vertical(page.locator('[data-disteven-mobile-group]'))
        main = page.locator('[data-disteven-mobile-group=business]' if mobile else '[data-disteven-open-group=business]')
        menu = page.locator('#distevenMenu')
        if width > 700:
            check_hover(main)
        main_size = float(main.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)'))
        main.click()
        topics = menu.locator('.disteven-menu-list').first
        vertical(topics.locator(':scope > li > button'))
        if mobile:
            expect(main).to_have_count(0)
            expect(page.locator('#distevenMenuLabel')).to_have_text('Por negócio')
            expect(page.locator('[data-disteven-menu-all]')).to_be_visible()
        food = menu.locator('[data-disteven-topic=comida]')
        expect(food).to_have_attribute('aria-expanded', 'false')
        assert main_size > float(food.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)'))
        assert food.evaluate('''e=>{
            const [label,arrow]=e.children;
            return e.getBoundingClientRect().right>=arrow.getBoundingClientRect().right
                && arrow.getBoundingClientRect().left-label.getBoundingClientRect().right>=8;
        }''')
        expect(page.locator('#distevenHeader')).to_have_css('background-color', 'rgb(22, 22, 22)')
        food.click()
        expect(menu).to_be_visible()
        if mobile:
            expect(food).to_have_count(0)
            expect(page.locator('#distevenMenuLabel')).to_have_text('Alimentação e bebidas')
            expect(page.locator('[data-disteven-menu-back]')).to_be_visible()
        else:
            expect(food).to_have_attribute('aria-expanded', 'true')
        children = menu.locator('#distevenMenuDetail')
        vertical(children.locator('button'))
        if width > 700:
            outer, flyout = topics.bounding_box(), children.bounding_box()
            assert abs(outer['y'] - flyout['y']) < 1
            assert flyout['x'] >= outer['x'] + outer['width'] + 7 or outer['x'] >= flyout['x'] + flyout['width'] + 7
            assert min(outer['x'],flyout['x']) >= 15 and max(outer['x'] + outer['width'],flyout['x'] + flyout['width']) <= width - 15
            for panel in [topics, children]:
                expect(panel).to_have_css('background-color', 'rgb(36, 36, 36)')
                expect(panel).to_have_css('border-top-width', '1px')
                expect(panel).to_have_css('border-top-left-radius', '14px')
            page.mouse.move(0, height - 1)
            check_hover(food)
        else:
            expect(menu).to_have_css('background-color', 'rgb(36, 36, 36)')
            page.locator('[data-disteven-menu-back]').click()
            expect(page.locator('#distevenMenuLabel')).to_have_text('Por negócio')
        if not mobile:
            page.keyboard.press('Escape')
        expect(food).to_be_focused()
        expect(children).to_have_count(0)
        expect(menu).to_be_visible()
        page.keyboard.press('ArrowRight')
        expect(children.locator('button').first).to_be_focused()
        page.keyboard.press('ArrowLeft')
        expect(food).to_be_focused()
        food.press('Enter')
        leaf = children.locator('[data-disteven-detail=cafes]')
        leaf.click()
        expect(page.locator('#distevenCollectionTitle')).to_have_text('Cafeterias')
        expect(page.locator('#distevenCollectionTitle')).to_be_focused()
        expect(menu).to_be_hidden()
        page.go_back()
        expect(children).to_be_visible()
        page.go_back()
        expect(food).to_be_visible()
        page.go_forward()
        expect(children).to_be_visible()
        page.go_forward()
        expect(page.locator('#distevenCollectionTitle')).to_have_text('Cafeterias')
        expect(menu).to_be_hidden()
        if mobile:
            page.locator('#distevenCategoryToggle').click()
            main.click()
            page.locator('[data-disteven-menu-all]').click()
            expect(page.locator('#distevenCollectionTitle')).to_have_text('Por negócio')
            expect(menu).to_be_hidden()
        else:
            page.mouse.move(0, 0)
            check_hover(page.locator('#distevenContinue'))
            page.mouse.move(0, 0)
            check_hover(page.locator('#grid .disteven-cover').first)
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert not errors, errors
        print(f'{width}px: vertical lists, typography, spacing, keyboard and browser history', flush=True)
        page.close()
    browser.close()
