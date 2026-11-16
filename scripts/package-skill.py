"""Package the generic skill without project media or local credentials."""
from pathlib import Path
import hashlib,json,shutil,zipfile
root=Path(__file__).resolve().parent.parent
skill=root/'.agents/skills/video-multimarcas'
(root/'dist').mkdir(exist_ok=True)
for ext in ['skill','zip']:
    output=root/f'dist/video-multimarcas.{ext}'
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(skill.rglob('*')):
            if source.is_file():
                archive.write(source,'video-multimarcas/'+source.relative_to(skill).as_posix())
        archive.write(root/'docs/INSTALL-SKILL.md','video-multimarcas/INSTALL.md')
        archive.writestr('video-multimarcas/LICENSE',(root/'LICENSE').read_text(encoding='utf-8').split('\nScope:')[0].rstrip()+'\n')
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        for source in skill.rglob('*'):
            if source.is_file():
                assert archive.read('video-multimarcas/'+source.relative_to(skill).as_posix())==source.read_bytes()
    print(output.name,output.stat().st_size)

# Build the distributable plugin from the same canonical skill, never a second copy.
name='video-multimarcas'
manifest=json.loads((root/'packaging/video-multimarcas.plugin.json').read_text(encoding='utf-8'))
plugin=root/'plugins'/name
plugin_skill=plugin/'skills'/name
if plugin_skill.exists():
    if root.resolve() not in plugin_skill.resolve().parents:
        raise ValueError('Plugin destination escapes repository')
    shutil.rmtree(plugin_skill)
shutil.copytree(skill,plugin_skill)
(plugin/'.codex-plugin').mkdir(parents=True,exist_ok=True)
(plugin/'.codex-plugin/plugin.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
shutil.copy2(root/'docs/INSTALL-SKILL.md',plugin/'INSTALL.md')
(plugin/'LICENSE').write_text((root/'LICENSE').read_text(encoding='utf-8').split('\nScope:')[0].rstrip()+'\n',encoding='utf-8')
output=root/'dist/video-multimarcas-plugin.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for source in sorted(plugin.rglob('*')):
        if source.is_file():archive.write(source,source.relative_to(plugin).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for source in skill.rglob('*'):
        if source.is_file():
            assert archive.read('skills/'+name+'/'+source.relative_to(skill).as_posix())==source.read_bytes()

# Claude Code has its own manifest/marketplace; both packages use the same canonical skill.
claude=root/'plugins/video-multimarcas-claude'
claude_skill=claude/'skills'/name
if claude_skill.exists():shutil.rmtree(claude_skill)
shutil.copytree(skill,claude_skill)
(claude/'.claude-plugin').mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'packaging/video-multimarcas.claude-plugin.json',claude/'.claude-plugin/plugin.json')
shutil.copy2(root/'docs/INSTALL-SKILL.md',claude/'INSTALL.md')
shutil.copy2(plugin/'LICENSE',claude/'LICENSE')
with zipfile.ZipFile(root/'dist/video-multimarcas-claude-plugin.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for source in sorted(claude.rglob('*')):
        if source.is_file():archive.write(source,source.relative_to(claude).as_posix())

# A small executable runtime, separate from instructions and from the full media catalogue.
# Only these public source trees are allowed; never archive projects, .env, caches or node_modules.
runtime_files=set()
for runtime_name in ['AGENTS.md','CLAUDE.md','README.md','THIRD_PARTY.md','LICENSE','package.json','package-lock.json','tsconfig.json']:
    runtime_files.add(root/runtime_name)
for folder in ['server','src','scripts','templates','docs','.agents/skills/video-multimarcas','.claude/skills/video-multimarcas','public/template','public/fonts','style-atlas/dist/assets/fonts','style-atlas/records/motion-campaign']:
    for source in (root/folder).rglob('*'):
        if source.is_file() and (source.suffix in ['.mjs','.js','.ts','.mts','.tsx','.json','.md','.txt','.py','.html','.svg','.ttf','.woff2','.woff'] or source.name.startswith('LICENSE')):
            runtime_files.add(source)
for runtime_name in ['catalog.json','fonts.json','workflow.js','guided.js']:
    runtime_files.add(root/'style-atlas/dist'/runtime_name)
runtime_files=sorted(runtime_files)
manifest_files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime_files}
runtime_manifest={'version':1,'runtimeVersion':json.loads((root/'package.json').read_text())['version'],'sourceRepository':'https://github.com/andrezucatti82-rgb/studio-kit-pro','clientMediaIncluded':False,'providerCredentialsIncluded':False,'catalogReferenceImagesIncluded':False,'fullRegressionFixturesIncluded':False,'files':manifest_files}
with zipfile.ZipFile(root/'dist/video-multimarcas-runtime.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for source in runtime_files:archive.write(source,'video-multimarcas-runtime/'+source.relative_to(root).as_posix())
    archive.writestr('video-multimarcas-runtime/runtime-manifest.json',json.dumps(runtime_manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(root/'dist/video-multimarcas-runtime.zip') as archive:
    assert archive.testzip() is None
    assert all(not any(part in ['projects','node_modules','.env','.git'] for part in Path(n).parts) for n in archive.namelist())
    for relative,sha in manifest_files.items():assert hashlib.sha256(archive.read('video-multimarcas-runtime/'+relative)).hexdigest()==sha
catalog=json.loads((root/'style-atlas/dist/catalog.json').read_text(encoding='utf-8'))
release={'plugin':name,'pluginVersion':manifest['version'],'kitVersion':json.loads((root/'package.json').read_text(encoding='utf-8'))['version'],'catalogVersion':catalog['version'],'styleCount':len(catalog['styles']),'categoryCount':len(catalog['families']),'installationScope':'Packages do not install or update a ChatGPT account automatically.','packages':{}}
for source in sorted((root/'dist').glob('video-multimarcas*')):
    if source.is_file():release['packages'][source.name]={'bytes':source.stat().st_size,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
(root/'dist/release-manifest.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(output.name,output.stat().st_size)
