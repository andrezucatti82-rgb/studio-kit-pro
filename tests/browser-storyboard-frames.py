"""Check fixed storyboard sizing across the catalog and the reported pale borders."""
import argparse
import io
import os
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from PIL import Image
from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8891/')
parser.add_argument('--out', type=Path)
args = parser.parse_args()
network = urlsplit(os.environ.get('HTTPS_PROXY', ''))
proxy = {'server': f'{network.scheme}://{network.netloc}', 'bypass': '127.0.0.1,localhost'} if network.hostname else None
style_id = 'natural-moda-feminina-uma-peca-o-seu-dia'


def decoded(container):
    container.locator('img').evaluate("""async img => {
      img.loading = 'eager';
      await img.decode();
    }""")


def pale_fraction(container, edge):
    screenshot = container.screenshot(animations='disabled')
    with Image.open(io.BytesIO(screenshot)) as img:
        image = img.convert('RGB')
        if edge in ('left', 'right'):
            image = image.transpose(Image.Transpose.TRANSPOSE)
        if edge in ('bottom', 'right'):
            image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        width, _ = image.size
        start, end = width // 8, width * 7 // 8
        coverage = []
        for y in range(3):
            row = [image.getpixel((x, y)) for x in range(start, end)]
            coverage.append(sum(sum(rgb) >= 585 and max(rgb)-min(rgb) <= 45 for rgb in row) / len(row))
        return max(coverage)


def verify_catalog(page, viewport):
    checked = page.evaluate("""() => {
      const styles = AtlasApp.getCatalog().styles;
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;top:0;width:100%;pointer-events:none;visibility:hidden';
      document.body.append(host);
      try {
        let first;
        for (const style of styles) {
          const template = document.createElement('template');
          template.innerHTML = AtlasViews.sequence(style);
          for (const image of template.content.querySelectorAll('img')) image.removeAttribute('src');
          host.replaceChildren(template.content);
          const frames = [...host.querySelectorAll('.frame-expand')];
          if (frames.length !== 4) throw Error(style.id + ' has the wrong frame count');
          for (const frame of frames) {
            const box = frame.getBoundingClientRect(), media = frame.firstElementChild.getBoundingClientRect();
            first ??= box;
            if (Math.abs(box.width - first.width) > .1 || Math.abs(box.height - first.height) > .1 ||
                Math.abs(box.width / box.height - 2/3) > .01 || Math.abs(box.top - frames[0].getBoundingClientRect().top) > .1 ||
                media.width < box.width - .1 || media.height < box.height - .1) {
              throw Error(style.id + ' has a different, misaligned or underfilled frame');
            }
          }
        }
        return {styles: styles.length, size: [first.width, first.height]};
      } finally {
        host.remove();
      }
    }""")
    assert checked['styles'] == 1425
    print(f'{viewport}px: {checked["styles"]} styles, {checked["size"]} storyboard frames', flush=True)


with sync_playwright() as playwright:
    for kind, width, sizes in [('chromium', 1680, (768, 1024, 1680)), ('webkit', 390, (320, 390))]:
        options = {'proxy': proxy}
        if kind == 'chromium':
            options.update(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        browser = getattr(playwright, kind).launch(**options)
        mobile = width < 701
        page = browser.new_page(viewport={'width': width, 'height': 844}, is_mobile=mobile, has_touch=mobile,
                                device_scale_factor=3 if mobile else 1, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.goto(args.base, timeout=45000).ok
        page.wait_for_function('window.ATLAS_READY')
        for viewport in sizes:
            page.set_viewport_size({'width': viewport, 'height': 844})
            verify_catalog(page, viewport)
        page.locator('#search').fill('Uma peça, o seu dia')
        card = page.locator(f'#grid [data-style-id="{style_id}"] .disteven-cover')
        expect(card).to_be_visible()
        decoded(card)
        card.click()
        sheet = page.locator('.film-sheet')
        frames = sheet.locator('.frame-expand')
        expect(frames).to_have_count(4)
        sizes = frames.evaluate_all('es=>es.map(e=>[e.offsetWidth,e.offsetHeight,e.offsetTop])')
        assert len({tuple(size) for size in sizes}) == 1, sizes
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        for i, edge in [(0, 'bottom'), (3, 'top'), (3, 'bottom')]:
            frame = frames.nth(i)
            decoded(frame)
            assert pale_fraction(frame, edge) < .65, (kind, i, edge)
            frame.click()
            expect(page.locator('#sequencePosition')).to_have_text(f'{i+1} / 4')
            zoom = page.locator('#sequenceViewport')
            decoded(zoom)
            assert pale_fraction(zoom, edge) < .65, (kind, i, edge, 'zoom')
            page.keyboard.press('Escape')
            expect(sheet).to_be_visible()
        frames.first.scroll_into_view_if_needed()
        if args.out:
            args.out.mkdir(parents=True, exist_ok=True)
            sheet.screenshot(path=args.out / f'{kind}-storyboard.png', animations='disabled')
        download_url = page.evaluate('window.ATLAS_FRAME_DOWNLOAD_URL || "download.html"')
        assert page.goto(urljoin(args.base, download_url)+f'?style={style_id}&frame=3', timeout=45000).ok
        preview = page.locator('#preview')
        page.wait_for_function('document.getElementById("preview").naturalWidth > 0')
        assert preview.evaluate('img=>[img.naturalWidth,img.naturalHeight]') == [402, 924]
        with page.expect_download() as downloaded:
            page.locator('#save').click()
        with Image.open(downloaded.value.path()) as png:
            assert png.size == (418, 941)
        assert not errors, errors
        print(f'{kind}: reported borders, viewport alignment, enlarged shot and PNG verified', flush=True)
        browser.close()
