"""The standalone atlas records actual screens for Chromium back and forward."""
import argparse

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
args = parser.parse_args()


def screen(page, suffix, visible):
    expect(page).to_have_url(args.base + suffix)
    expect(page.locator(visible)).to_be_visible()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('about:blank')
    page.goto(args.base)
    page.wait_for_function('history.state?.atlasNavigation')
    screen(page, '', '#distevenDiscoveryTitle')

    page.locator('[data-disteven-open-group="tutorials"]').click()
    page.locator('[data-disteven-topic="tela"]').click()
    screen(page, '#colecao=tutorials/tela', '#grid')
    card = page.locator('#grid [data-detail]').first
    style = card.get_attribute('data-detail')
    card.click()
    screen(page, '#direcao=' + style, '#detailDialog')
    page.locator('#detailDialog [data-sequence]').first.click()
    frame = page.evaluate('location.hash')
    assert frame.startswith('#quadro=' + style + '/')
    screen(page, frame, '#sequenceDialog')
    page.go_back()
    screen(page, '#direcao=' + style, '#detailDialog')
    expect(page.locator('#sequenceDialog')).to_be_hidden()
    page.go_forward()
    screen(page, frame, '#sequenceDialog')
    page.reload()
    screen(page, frame, '#sequenceDialog')
    page.go_back()
    screen(page, '#direcao=' + style, '#detailDialog')
    page.go_back()
    screen(page, '#colecao=tutorials/tela', '#grid')
    expect(page.locator('#detailDialog')).to_be_hidden()
    page.go_back()
    screen(page, '#colecao=tutorials', '#grid')
    page.go_back()
    screen(page, '', '#distevenDiscoveryTitle')
    page.go_forward()
    screen(page, '#colecao=tutorials', '#grid')
    page.go_forward()
    screen(page, '#colecao=tutorials/tela', '#grid')

    page.locator('#grid [data-detail]').first.click()
    page.locator('#detailDialog [data-choose]').first.click()
    screen(page, '#briefSection', '#briefForm')
    subject = 'Explicar como organizar o estoque da loja'
    page.locator('#topic').fill(subject)
    page.locator('#distevenContinue').click()
    screen(page, '#revisao', '#handoff')
    page.go_back()
    screen(page, '#briefSection', '#briefForm')
    expect(page.locator('#topic')).to_have_value(subject)
    page.go_back()
    screen(page, '#direcao=' + style, '#detailDialog')
    page.go_back()
    screen(page, '#colecao=tutorials/tela', '#grid')
    page.go_forward()
    screen(page, '#direcao=' + style, '#detailDialog')
    page.go_forward()
    screen(page, '#briefSection', '#briefForm')
    page.go_forward()
    screen(page, '#revisao', '#handoff')
    assert page.evaluate('AtlasCurrentChoice().selectedStyles[0].id') == style
    assert style in page.locator('#promptOutput').input_value()

    page.locator('#distevenHeader .disteven-brand').click()
    screen(page, '', '#distevenDiscoveryTitle')
    page.locator('#search').fill('casa')
    screen(page, '#busca', '#grid')
    page.locator('#search').fill('cachorro')
    page.go_back()
    screen(page, '', '#distevenDiscoveryTitle')
    page.go_forward()
    screen(page, '#busca', '#grid')
    expect(page.locator('#search')).to_have_value('cachorro')
    assert not errors, errors
    browser.close()
    print('Browser history, deep links, reload, search and project state verified.')
