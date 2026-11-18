"""Compact bootstrap; obtains the pinned full public GitHub tree at installation time."""
from pathlib import Path
import subprocess,json,hashlib,zipfile,shutil
root=Path(__file__).resolve().parent.parent
shutil.copy2(root/'docs/COMECE-AQUI.html',root/'style-atlas/dist/como-instalar.html')
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
version=json.loads((root/'package.json').read_text())['version']
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
def protected(name):
 return bool(name) and not (name.startswith('dist/') or name.startswith('style-atlas/dist/downloads/') or name=='style-atlas/dist/installation.json')
files={}
for name in sorted(set(paths)):
 if not protected(name):continue
 p=root/name
 if not p.exists():continue
 if p.is_symlink():raise ValueError('No source symlinks allowed: '+name)
 files[name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
# Never advertise an installer pinned to a different source tree. Generated ZIPs and
# download metadata may change after the source commit without changing that source.
changes=subprocess.check_output(['git','diff','HEAD','--name-only','-z'],cwd=root).decode().split('\0')
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
ready=not any(protected(name) for name in changes+untracked)
manifest={'version':1,'kitVersion':version,'repository':'andrezucatti82-rgb/studio-kit-pro','sourceRevision':revision,'files':files,'externalDownloads':['full pinned public repository including visual references','npm lockfile dependencies','official portable Node.js 24 when Node.js 22+ is absent','Git and FFmpeg through the OS package manager when requested and missing','Remotion browser when missing'],'accountsIncluded':False,'paidApisUsed':False}
folder=root/'style-atlas/dist/downloads';folder.mkdir(exist_ok=True)
output=folder/'studio-kit-pro-installer.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 for source in sorted((root/'packaging/installer').glob('*')):
  if source.is_file():z.write(source,'Studio-Kit-Pro/'+source.name)
 z.writestr('Studio-Kit-Pro/install-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 z.write(root/'docs/COMECE-AQUI.html','Studio-Kit-Pro/LEIA-PRIMEIRO.html')
 z.write(root/'LICENSE','Studio-Kit-Pro/LICENSE')
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert not any(any(part in ['projects','node_modules','.git','.env'] for part in Path(name).parts) for name in z.namelist())
shutil.copy2(output,root/'dist/studio-kit-pro-installer.zip')
record={'version':1,'kitVersion':version,'sourceRevision':revision,'sourceReady':ready,'download':'downloads/studio-kit-pro-installer.zip','bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'tutorial':'como-instalar.html','scope':'local project for Codex and Claude Code; no automatic web-account installation','internetRequired':True,'fullProjectDownloadMiB':round(sum(f['bytes'] for f in files.values())/1024/1024),'skills':len(json.loads((root/'.agents/skills/video-multimarcas/references/skill-system.json').read_text())['skills']),'internalModules':len(json.loads((root/'.agents/skills/video-multimarcas/references/skill-system.json').read_text())['modules']),'presenterStyles':sum(bool(s.get('presenterEditing')) for s in json.loads((root/'style-atlas/dist/catalog.json').read_text())['styles'])}
(root/'style-atlas/dist/installation.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
release_file=root/'dist/release-manifest.json'
if release_file.exists():
 release=json.loads(release_file.read_text());release['installer']={**record,'localFile':'studio-kit-pro-installer.zip'};release_file.write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({key:record[key] for key in ['download','bytes','sourceRevision','sourceReady','fullProjectDownloadMiB']}))
