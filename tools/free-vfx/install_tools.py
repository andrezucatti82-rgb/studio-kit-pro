"""Installation adapters; only called for validated free registry entries."""
from pathlib import Path
import hashlib,json,os,platform,shutil,subprocess,sys,tarfile,urllib.request,zipfile
from toolchain import run,registry
NATRON='https://github.com/NatronGitHub/Natron/releases/download/v2.5.0/Natron-2.5.0-Linux-x86_64-no-installer.tar.xz'
VIDEO2X='https://github.com/k4yt3x/video2x/releases/download/6.4.0/Video2X-x86_64.AppImage'
MODELS={
 'sam2':('https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt','sam2.1_hiera_tiny.pt'),
 'rvm':('https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth','rvm_mobilenetv3.pth')}
def download(tc,url,name):
    # All URLs originate in this module or in the validated registry, never web page commands.
    target=tc.home/'downloads'/name;target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists():
        temp=target.with_suffix(target.suffix+'.part')
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Studio-Kit-Pro-free-vfx/1.0'})
            with urllib.request.urlopen(req,timeout=120) as response,open(temp,'wb') as out:shutil.copyfileobj(response,out)
            temp.replace(target)
        finally:
            if temp.exists():temp.unlink()
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    expected=registry().get('artifacts',{}).get(name,{}).get('sha256')
    if expected and expected!=digest:raise ValueError('SHA256 integrity mismatch: '+name)
    tc.write('download-'+name.replace('/','_')+'.json',{'source':url,'file':name,'sha256':digest,'verification':'HTTPS official source; local SHA256 retained; not a publisher signature'})
    return target

def python_env(tc):
    if not tc.python().exists():run([sys.executable,'-m','venv',tc.env],timeout=120)
    return tc.python()
def python_base(tc):
    py=python_env(tc)
    run([py,'-m','pip','install','--disable-pip-version-check','-r',Path(__file__).with_name('requirements.txt')],timeout=1200)
    return py
def torch_base(tc):
    py=python_env(tc)
    try:run([py,'-c','import torch,torchvision,torchaudio;print(torch.__version__)'],timeout=30)
    except Exception:
        # CPU by default: avoids fetching many gigabytes of unusable CUDA wheels.
        args=['--index-url','https://download.pytorch.org/whl/cpu'] if sys.platform=='linux' else []
        run([py,'-m','pip','install','--disable-pip-version-check','torch==2.6.0','torchvision==0.21.0','torchaudio==2.6.0',*args],timeout=1800)
    return py

def user_deb(tc,package):
    if platform.machine()!='x86_64' or not Path('/usr/share/keyrings/debian-archive-keyring.gpg').exists():raise RuntimeError('User-space Debian install requires x86_64 Debian and its archive keyring')
    apt=tc.home/'apt';lists=apt/'lists';archives=apt/'archives'
    for p in [lists/'partial',archives/'partial']:p.mkdir(parents=True,exist_ok=True)
    source=apt/'sources.list';source.write_text('deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main\n')
    opts=['-o','Dir::Etc::main=-','-o','Dir::Etc::parts=-','-o','Dir::Etc::sourcelist='+str(source),'-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+str(lists),'-o','Dir::Cache::archives='+str(archives),'-o','Dir::Cache::pkgcache='+str(apt/'pkgcache.bin'),'-o','Dir::Cache::srcpkgcache='+str(apt/'srcpkgcache.bin'),'-o','Dir::State::extended_states='+str(apt/'extended_states'),'-o','Debug::NoLocking=true','-o','APT::Sandbox::User='+str(os.getuid())]
    if not (apt/'updated').exists():run(['/usr/bin/apt-get',*opts,'update'],timeout=300);(apt/'updated').touch()
    run(['/usr/bin/apt-get',*opts,'--download-only','install','--no-install-recommends','-y',package],timeout=600)
    tc.native.mkdir(parents=True,exist_ok=True)
    extracted=apt/'extracted.json';known=json.loads(extracted.read_text()) if extracted.exists() else {}
    for deb in archives.glob('*.deb'):
        if known.get(deb.name)==deb.stat().st_size:continue
        run(['dpkg-deb','--extract',deb,tc.native],timeout=120);known[deb.name]=deb.stat().st_size
    extracted.write_text(json.dumps(known,indent=2)+'\n')
    return {'manager':'Debian signed repository, user-space extraction','package':package,'systemModified':False}


def configure_lavapipe(tc):
    library=tc.native/'usr/lib/x86_64-linux-gnu/libvulkan_lvp.so'
    configs=list(tc.native.glob('usr/share/vulkan/icd.d/*lvp*.json'))
    if library.exists() and configs:
        data=json.loads(configs[0].read_text());data['ICD']['library_path']=str(library)
        (tc.home/'lavapipe.json').write_text(json.dumps(data,indent=2)+'\n')

def safe_extract(archive,destination):
    destination.mkdir(parents=True,exist_ok=True)
    with tarfile.open(archive) as tar:
        # Python 3.10/3.11 users need a patched runtime exposing the data filter.
        if not hasattr(tarfile,'data_filter'):raise RuntimeError('Update Python to a security-patched version with tarfile.data_filter')
        tar.extractall(destination,filter='data')

def install_one(tc,t,target):
    id=t['id']
    if target not in ('linux','darwin','win32') or target!=sys.platform:return {'id':id,'status':'blocked_platform','reason':'Installer must run on the actual supported target OS'}
    existing=tc.installed(t)
    if existing and not (id=='rife' and not list((tc.repos/'rife/train_log').glob('*.pkl'))):return {'id':id,'status':'installed','location':existing,'action':'existing_preserved'}
    kind=t['kind'];extra={}
    if kind in ('native','plugins'):
        package=t['install'].get(target)
        if not package:return {'id':id,'status':'manual_install_required','reason':'No verified package-manager route for this OS','source':t['source']}
        if target=='linux':
            if os.getuid()==0 or shutil.which('sudo'):
                prefix=[] if os.getuid()==0 else ['sudo']
                run([*prefix,'apt-get','update'],timeout=300);run([*prefix,'apt-get','install','--no-install-recommends','-y',package],timeout=900)
                extra={'manager':'system apt','package':package}
            else:extra=user_deb(tc,package)
        elif target=='darwin':
            if not shutil.which('brew'):return {'id':id,'status':'blocked_manager','reason':'Homebrew not installed; install from brew.sh or use official app download'}
            run(['brew','install',*(['--cask'] if id in ('blender','kdenlive','shotcut') else []),package],timeout=1200)
        else:
            if not shutil.which('winget'):return {'id':id,'status':'blocked_manager','reason':'WinGet unavailable; use official download'}
            run(['winget','install','--id',package,'--exact','--accept-source-agreements','--accept-package-agreements'],timeout=1200)
    elif kind=='natron-plugins':
        install_one(tc,tc.select(tool='natron')[0],target)
    elif kind=='release':
        if target!='linux' or platform.machine()!='x86_64':
            pkg=t['install'].get(target)
            if target=='win32' and pkg and shutil.which('winget'):run(['winget','install','--id',pkg,'--exact','--accept-source-agreements','--accept-package-agreements'],timeout=1200)
            else:return {'id':id,'status':'manual_install_required','reason':'Use official release for OS/architecture','source':t['source']}
        elif id=='natron':safe_extract(download(tc,NATRON,'Natron-2.5.0-Linux-x86_64.tar.xz'),tc.home/'natron')
        else:
            image=download(tc,VIDEO2X,'Video2X-6.4.0.AppImage');image.chmod(0o755)
            dest=tc.home/'video2x';dest.mkdir(parents=True,exist_ok=True);run([image,'--appimage-extract'],cwd=dest,timeout=180)
            if not Path('/dev/dri').exists():
                try:user_deb(tc,'mesa-vulkan-drivers');configure_lavapipe(tc)
                except Exception as e:extra={'softwareVulkan':'unavailable: '+str(e)}
    elif kind=='python':python_base(tc)
    elif kind=='repo':
        py=python_base(tc);torch_base(tc)
        repo=tc.repos/id;repo.parent.mkdir(parents=True,exist_ok=True)
        if not (repo/'.git').exists():run(['git','clone','--no-checkout','https://github.com/'+t['repository']+'.git',repo],timeout=300)
        run(['git','-C',repo,'checkout','--detach',t['revision']],timeout=120)
        commit=run(['git','-C',repo,'rev-parse','HEAD'])
        if id=='sam2':run([py,'-m','pip','install','--disable-pip-version-check','--no-build-isolation','-e',repo],timeout=600)
        elif id=='comfyui':run([py,'-m','pip','install','--disable-pip-version-check','-r',repo/'requirements.txt'],timeout=1200)
        else:run([py,'-m','pip','install','--disable-pip-version-check','tqdm','scipy','imageio','sk-video'],timeout=300)
        if id in MODELS:
            url,name=MODELS[id];file=download(tc,url,name);tc.models.mkdir(parents=True,exist_ok=True);shutil.copy2(file,tc.models/name)
        if id=='rife':
            modelzip=tc.home/'downloads/rife-official-HD.zip';modelzip.parent.mkdir(parents=True,exist_ok=True)
            if not modelzip.exists():run([py,'-m','gdown','https://drive.google.com/uc?id=1APIzVeI-4ZZCEuIRE1m6WYfSCaOsi_7_','-O',modelzip],timeout=300)
            expected=registry().get('artifacts',{}).get(modelzip.name,{}).get('sha256')
            if expected and hashlib.sha256(modelzip.read_bytes()).hexdigest()!=expected:raise ValueError('RIFE SHA256 integrity mismatch')
            with zipfile.ZipFile(modelzip) as z:
                for entry in z.infolist():
                    parts=Path(entry.filename).parts
                    if not parts or parts[0]!='train_log' or '..' in parts or entry.is_dir() or Path(entry.filename).suffix not in ('.pkl','.py'):continue
                    dest=repo.joinpath(*parts)
                    if not dest.resolve().is_relative_to(repo.resolve()):raise ValueError('Unsafe model archive')
                    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(entry))
            extra={'modelStatus':'official_model_downloaded','modelSource':'Official RIFE README HD model Google Drive link'}
            tc.write('rife-model.json',{'source':'https://drive.google.com/file/d/1APIzVeI-4ZZCEuIRE1m6WYfSCaOsi_7_/view','sha256':hashlib.sha256(modelzip.read_bytes()).hexdigest()})
        (repo/'SOURCE.json').write_text(json.dumps({'repository':t['source'],'commit':commit,'modelStatus':extra.get('modelStatus','official_model_downloaded' if id in MODELS else 'none_bundled')},indent=2)+'\n')
    location=tc.installed(t)
    return {'id':id,'status':'installed' if location else 'installed_not_on_path','location':location,**extra}

def install(tc,tools,target,apply=False):
    if not apply:return {'status':'plan_only',**tc.plan(tools,target)}
    results=[]
    for t in tools:
        print('Installing/checking '+t['id'],file=sys.stderr,flush=True)
        try:result=install_one(tc,t,target)
        except Exception as e:result={'id':t['id'],'status':'failed','reason':str(e)}
        results.append(result)
    report={'schemaVersion':1,'freeOnly':True,'results':results,'creativeApproval':False,'scope':'Installation only; run smoke for functioning/inference.'}
    if any(t['status']!='blocked_platform' for t in results):tc.write('installation.json',report)
    return report
