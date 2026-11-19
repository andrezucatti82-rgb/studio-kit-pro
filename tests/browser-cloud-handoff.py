"""Real browser and relay. Provider navigation is intercepted before any session starts."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import parse_qs, urlsplit, urlunsplit
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8877/')
parser.add_argument('--out', required=True)
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)

with tempfile.TemporaryDirectory() as directory, sync_playwright() as p:
    fixture = Path(directory)
    video = fixture / 'original.mp4'
    image = fixture / 'foto.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=black:s=64x64:r=24:d=0.25', '-pix_fmt', 'yuv420p', str(video)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=blue:s=64x64', '-frames:v', '1', '-threads', '1', str(image)], check=True)
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for platform, width in [('claude', 375), ('chatgpt', 1440)]:
        ctx = browser.new_context(viewport={'width': width, 'height': 990}, reduced_motion='reduce', permissions=['clipboard-read', 'clipboard-write'])
        for pattern in ['https://claude.ai/**', 'https://chatgpt.com/**']:
            ctx.route(pattern, lambda route: route.fulfill(content_type='text/html', body='<h1>Provider navigation captured</h1>'))
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert page.goto(args.base).ok
        expect(page.locator('body')).to_have_attribute('data-disteven', 'true', timeout=30000)
        page.evaluate("AtlasApp.chooseStyle('publicidade-cinematografica'); AtlasShell.openBrief()")
        page.locator('#topic').fill('Filme de demonstração para teste')
        page.locator('#format').select_option('4:5')
        page.locator('#duration').select_option('source')
        panel = page.locator('#briefMaterialAssignments')
        if platform == 'claude':
            panel.locator('input[type=file]').set_input_files([str(video), str(image)])
            records = panel.locator('[data-material-id]')
            expect(records).to_have_count(2)
            records.nth(0).locator('[data-material-role=reference]').check()
            records.nth(0).locator('[data-material-role=incorporate]').check()
            records.nth(0).locator('.material-rights summary').click()
            records.nth(0).locator('[data-material-right=image]').select_option('authorized')
            records.nth(1).locator('[data-material-role=adapt]').check()
            page.screenshot(path=str(out / f'brief-{width}.png'))
            page.evaluate("AtlasApp.detail('tipografia-cinetica')")
            page.locator('[data-style-complement]').click()
            expect(page.locator('#stylePicker')).to_be_visible()
            page.locator('#pickerSearch').fill('Animação da tipografia')
            page.locator('[data-picker-aspect=kinetic_type]').check()
            page.locator('[data-picker-scope=kinetic_type]').select_option('closing')
            page.locator('#pickerApply').click()
        page.locator('#distevenContinue').click()
        expect(page.locator('#handoff')).to_be_visible()
        page.locator('#handoffPlatform').select_option(platform)
        with page.expect_popup() as opened:
            page.locator('#chatLink').click()
        popup = opened.value
        popup.wait_for_url('https://claude.ai/code?*' if platform == 'claude' else 'https://chatgpt.com/codex', timeout=45000)
        expect(page.locator('#copyCloudPrompt')).to_be_visible()
        if platform == 'claude':
            params = parse_qs(urlsplit(popup.url).query)
            assert params['repositories'] == ['andrezucatti82-rgb/studio-kit-pro']
            prompt = params['prompt'][0]
        else:
            page.locator('#copyCloudPrompt').click()
            prompt = page.evaluate('navigator.clipboard.readText()')
        assert 'moodboard' in prompt and 'storyboard' in prompt
        published = re.search(r"retrieve-disteven-handoff.mjs '([^']+)'", prompt).group(1)
        parts = urlsplit(published)
        with urlopen(urlunsplit(parts._replace(fragment='')), timeout=30) as response:
            assert response.headers['Content-Type'] == 'application/octet-stream'
            assert 'no-store' in response.headers['Cache-Control']
            encrypted = response.read()
        assert b'projeto-video.json' not in encrypted and b'Filme de demonstra' not in encrypted
        blob = fixture / 'sealed.bin'
        blob.write_bytes(encrypted)
        os.environ['DISTEVEN_TEST_FIXTURE_DATA'] = str(blob)
        os.environ['DISTEVEN_TEST_FIXTURE_KEY'] = parts.fragment
        decoded = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
            import {readFile} from 'node:fs/promises';
            import {unpackHandoff} from './scripts/retrieve-disteven-handoff.mjs';
            const files=await unpackHandoff(await readFile(process.env.DISTEVEN_TEST_FIXTURE_DATA),Buffer.from(process.env.DISTEVEN_TEST_FIXTURE_KEY,'hex'));
            console.log(JSON.stringify({project:JSON.parse(files[0].data),media:files.slice(1).map(f=>({name:f.name,hex:f.data.toString('hex')}))}));
        """]))
        project = decoded['project']
        assert project['project']['productionIntent']['deliverable'] == 'final_ai_video'
        assert project['project']['format'] == '4:5'
        assert project['project']['durationMode'] == 'source'
        assert project['request'].startswith('Produza o vídeo final com IA')
        if platform == 'claude':
            assert [file['hex'] for file in decoded['media']] == [video.read_bytes().hex(), image.read_bytes().hex()]
            assert [row['roles'] for row in project['project']['materialAssignments']] == [['reference', 'incorporate'], ['adapt']]
            assert project['project']['materialAssignments'][0]['rights']['image'] == 'authorized'
            assert project['project']['styleContributions']['tipografia-cinetica'] == [{'aspect': 'kinetic_type', 'scope': 'closing'}]
            page.reload()
            expect(page.locator('body')).to_have_attribute('data-disteven', 'true')
            assert page.evaluate('AtlasCurrentChoice().selectedStyles.length') == 2
            assert page.evaluate('AtlasCurrentChoice().materialAssignments[0].roles.length') == 2
            assert page.evaluate('AtlasMaterialFiles.current().length') == 0
        else:
            assert decoded['media'] == []
            assert project['project']['materialAssignments'] == []
            assert len(project['project']['styles']) == 1
        page.screenshot(path=str(out / f'handoff-{width}.png'))
        assert not errors, errors
        print(f'{platform} {width}px: navigation, encrypted packet, intent, project, original duration, files and scopes verified', flush=True)
        ctx.close()
    browser.close()
