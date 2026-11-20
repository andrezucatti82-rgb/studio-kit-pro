"""Smoke the locally hosted ZapVideo in desktop and mobile Chromium."""
import argparse
import json
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

args_parser = argparse.ArgumentParser()
args_parser.add_argument("--base", default="http://127.0.0.1:8792/")
args_parser.add_argument("--chrome")
args = args_parser.parse_args()
fixtures = Path("projects/zapvideo-prova")
artifacts = fixtures / "browser"
artifacts.mkdir(exist_ok=True)
source = fixtures / "câmera sintética.mp4"
srt = fixtures / "legendas.srt"
token = json.loads(Path(".cache/zapvideo/fixture-access.json").read_text())[0]["token"]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chrome, args=["--autoplay-policy=no-user-gesture-required"])
    for width in (390, 1280):
        mobile = width == 390
        ctx = browser.new_context(viewport={"width": width, "height": 890}, is_mobile=mobile, has_touch=mobile)
        ctx.add_init_script("window.showSaveFilePicker = undefined")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(args.base)
        editing = page.get_by_role("button", name="Editar um vídeo que já tenho")
        expect(editing).to_be_visible()
        page.screenshot(path=artifacts / f"{width}-inicio.png")
        if mobile:
            editing.tap()
        else:
            editing.focus()
            page.keyboard.press("Enter")
        expect(page.locator("#workspace-title")).to_be_focused()
        expect(page.locator("#captions-fields")).to_be_hidden()
        page.locator("#captions").check()
        page.locator("#sheet").click()
        expect(page.locator("#status")).to_have_text("Envie um vídeo original.")
        page.locator("#source").set_input_files(source)
        page.locator("#srt").set_input_files(srt)
        page.wait_for_function("document.querySelector('#preview').duration >= 5")
        page.get_by_text("Sugerir trechos pela fala", exact=True).click()
        page.locator("#transcript").set_input_files(srt)
        page.locator("#suggest-cuts").click()
        expect(page.locator("#cut-suggestions li")).to_have_count(1)
        page.locator("#cut-suggestions button").first.click()
        expect(page.locator("#cuts")).to_be_checked()
        for index, (start, end) in enumerate(((0.1, 2), (2, 4), (4, 5.9))):
            form = page.locator("#cut-fields fieldset").nth(index)
            form.locator("[data-cut=start]").fill(str(start))
            form.locator("[data-cut=end]").fill(str(end))
        page.locator("#treatment").check()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=artifacts / f"{width}-edicao.png")
        with page.expect_download() as downloaded:
            page.locator("#zip").click()
        zip_path = artifacts / f"{width}-zapvideo.zip"
        downloaded.value.save_as(zip_path)
        with zipfile.ZipFile(zip_path) as archive:
            assert archive.testzip() is None
            state = json.loads(archive.read("projeto-video.json"))
            manifest = json.loads(archive.read("arquivos-recebidos.json"))
            assert len(state["actions"]["cuts"]) == 3
            assert archive.read(manifest[0]["filename"]) == source.read_bytes()
            assert archive.read(manifest[1]["filename"]) == srt.read_bytes()
            assert "Corte 3" in archive.read("pedido.txt").decode()

        if not mobile:
            page.locator("#pilot summary").click()
            page.locator("#token").fill(token)
            page.locator("#connect").click()
            expect(page.locator("#status")).to_have_text("Acesso confirmado.")
            page.locator("#permit").check()
            page.locator("#produce").click()
            expect(page.locator("#files video")).to_have_count(4, timeout=60000)
            expect(page.get_by_role("link", name="Baixar legendas.srt")).to_be_visible()
            preview = page.locator("#files video").first
            page.wait_for_function("document.querySelector('#files video').duration >= 5")
            preview.evaluate("(video) => video.play()")
            page.wait_for_function("document.querySelector('#files video').ended", timeout=16000)
            page.locator("[data-back]").click()
            page.get_by_role("button", name="Criar um vídeo com IA").click()
            page.locator("#subject").fill("Apresentar a loja")
            page.locator("#suggest").click()
            page.locator("#subject").fill("Mostrar os bastidores e preservar a nova edição")
            expect(page.locator("#proposal")).to_be_visible(timeout=15000)
            expect(page.locator("#apply-proposal")).to_be_disabled()
            expect(page.locator("#subject")).to_have_value("Mostrar os bastidores e preservar a nova edição")
            page.locator("#suggest").click()
            expect(page.locator("#apply-proposal")).to_be_enabled(timeout=15000)
            page.locator("#apply-proposal").click()
            expect(page.get_by_label("Título da cena")).to_have_value("Abertura")
            page.locator("#reference-files").set_input_files({
                "name": "Referência.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n% fixture\n%%EOF"})
            page.locator("#analysis-tools summary").click()
            page.locator("#analysis-files").get_by_label("Referência.pdf", exact=False).check()
            page.locator("#analysis-url").fill("https://zapvideo.com.br/")
            page.locator("#analysis-permit").check()
            page.locator("#analyze").click()
            expect(page.locator("#analysis-result li")).to_have_count(2, timeout=20000)
            expect(page.locator("#analysis-result li").first).to_contain_text("Conteúdo simulado.")
            page.screenshot(path=artifacts / "1280-criacao.png")
            page.get_by_role("button",name="Preparar quadro conceitual").click()
            page.get_by_role("button",name="Consultar valor").click()
            expect(page.locator("#asset-value")).to_contain_text("Simulação sem cobrança")
            page.get_by_role("button",name="Confirmar criação do material").click()
            expect(page.get_by_role("link",name="Baixar quadro-previa.jpg")).to_be_visible(timeout=60000)
            page.get_by_role("button",name="Adicionar aos materiais").click()
            expect(page.locator("#reference-list")).to_contain_text("quadro-simulado-")
            frame_name=page.evaluate("""() => JSON.parse(localStorage.getItem('zapvideo-workspace-v1'))
                .draft.materials.find(item => item.kind === 'frame').name""")
            page.get_by_label("Planejar mídia de apoio com IA para este plano").check()
            page.get_by_role("button",name="Revisar clipe deste plano").click()
            expect(page.get_by_role("dialog",name="Aprovar quadro do clipe")).to_be_visible()
            page.get_by_label("Quadro de referência").select_option(label=frame_name)
            expect(page.get_by_alt_text("Quadro apresentado para aprovação do clipe")).to_be_visible()
            page.get_by_label("Revisei este quadro e autorizo seu uso para este plano.").check()
            page.get_by_label("Sua aprovação por escrito").fill("Aceite sintético para teste do enquadramento.")
            page.get_by_role("button",name="Registrar aprovação e consultar valor").click()
            expect(page.locator("#clip-quote")).to_contain_text("Simulação, sem cobrança",timeout=20000)
            page.screenshot(path=artifacts / "1280-aprovacao-clipe.png")
            page.get_by_role("button",name="Confirmar geração do clipe").click()
            expect(page.get_by_role("link",name="Baixar clipe-previa.mp4")).to_be_visible(timeout=60000)
            expect(page.locator("#status")).to_contain_text("Clipe simulado verificado.")
            page.get_by_role("button",name="Vincular clipe simulado ao plano").click()
            expect(page.locator("#scenes")).to_contain_text("Clipe simulado vinculado.")
            page.locator("#takes").set_input_files(source)
            page.get_by_label("Título sobre a imagem").fill("Cena de teste")
            page.locator("#assembly-permit").check()
            page.get_by_role("button",name="Montar amostra").click()
            expect(page.locator("#status")).to_contain_text("Amostra integrada verificada.", timeout=75000)
            page.get_by_role("button",name="Revisar e montar vídeo completo").click()
            page.locator("#assembly-storyboard").select_option(label=frame_name)
            page.locator("#assembly-animatic").select_option(label="câmera sintética.mp4")
            page.wait_for_function("""() => ['assembly-animatic-preview','assembly-sample-preview']
                .every(id => document.getElementById(id).readyState >= 1)""")
            page.locator("#assembly-review-checkbox").check()
            page.locator("#assembly-review-message").fill("Aceite sintético da montagem de prova.")
            page.get_by_role("button",name="Montar vídeo completo",exact=True).click()
            expect(page.locator("#status")).to_contain_text("Montagem completa verificada.",timeout=75000)
            page.screenshot(path=artifacts / "1280-montagem.png")
            page.get_by_role("link", name="Estilos", exact=True).click()
            page.wait_for_function("window.ATLAS_READY === true || (window.ATLAS_READY && document.body.dataset.disteven)")
            expect(page.locator(".zapvideo-logo").last).to_have_attribute("alt", "zapvideo")
        assert not errors, errors
        ctx.close()
    browser.close()
print("ZapVideo: desktop/mobile, teclado, ficha, ZIP, FFmpeg, reprodução, catálogo e IA simulada com aceite visual.")
