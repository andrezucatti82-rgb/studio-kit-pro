"""Free local VFX tools. No provider API, cloud inference or shell-evaluated commands."""
from pathlib import Path
from contextlib import contextmanager
import re, argparse, hashlib, importlib.util, json, os, platform, shutil, subprocess, sys, tempfile, time
MANIFEST=Path(__file__).with_name('manifest.json')
PROFILES=('base','automation','ai','all-free')
FILTERS={'grayscale':'hue=s=0','blur':'gblur=sigma=2','glow':'split[a][b];[b]gblur=sigma=4[c];[a][c]blend=all_mode=screen:all_opacity=0.35','lens':'lenscorrection=k1=-0.05:k2=0','chroma':'chromakey=0x00FF00:0.12:0.08'}
def run(args,**kw):
    p=subprocess.run([str(a) for a in args],capture_output=True,text=True,timeout=kw.pop('timeout',120),**kw)
    if p.returncode:raise RuntimeError(f'{Path(str(args[0])).name} exited {p.returncode}: '+(p.stderr or p.stdout)[-1600:])
    return p.stdout.strip() or p.stderr.strip()
@contextmanager
def fresh_output(output):
    """Render privately, then publish using an atomic no-replace hard link."""
    output=Path(output).resolve()
    if output.exists():raise FileExistsError('Output already exists; choose a new path')
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.vfx-render-',dir=output.parent) as directory:
        temp=Path(directory)/output.name
        yield temp
        if not temp.is_file() or temp.stat().st_size==0:raise RuntimeError('Fresh render missing')
        os.link(temp,output) # Never replaces an output published by another process.

def registry():
    m=json.loads(MANIFEST.read_text())
    if m.get('freeOnly') is not True:raise ValueError('Only the free registry is allowed')
    for t in m['tools']:
        if not t.get('free') or t['kind'] not in ('native','release','plugins','natron-plugins','python','repo'):raise ValueError('Invalid free tool registry')
    return m
class Toolchain:
    def __init__(self,root):
        self.root=Path(root).resolve();self.home=self.root/'.studio-tools'/'free-vfx';self.native=self.home/'native';self.env=self.home/'python';self.repos=self.home/'repos';self.models=self.home/'models';self.records=self.home/'records'
    def python(self):return self.env/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    def environment(self):
        env=os.environ.copy();env['QT_QPA_PLATFORM']=env.get('QT_QPA_PLATFORM','offscreen');env['OMP_NUM_THREADS']='2'
        bins=[self.native/'usr/bin',self.native/'bin']
        env['PATH']=os.pathsep.join(str(x) for x in bins)+os.pathsep+env.get('PATH','')
        libs=[self.native/'usr/lib/shotcut',self.native/'usr/lib/x86_64-linux-gnu',self.native/'usr/lib',self.native/'lib/x86_64-linux-gnu']
        env['LD_LIBRARY_PATH']=os.pathsep.join([*(str(x) for x in libs),*([env['LD_LIBRARY_PATH']] if env.get('LD_LIBRARY_PATH') else [])])
        if (self.native/'usr/lib/x86_64-linux-gnu/qt6/plugins').exists():env['QT_PLUGIN_PATH']=str(self.native/'usr/lib/x86_64-linux-gnu/qt6/plugins')
        if (self.native/'usr/lib/frei0r-1').exists():env['FREI0R_PATH']=str(self.native/'usr/lib/frei0r-1')
        if (self.home/'lavapipe.json').exists():
            env['VK_ICD_FILENAMES']=str(self.home/'lavapipe.json');env['VK_DRIVER_FILES']=str(self.home/'lavapipe.json')
        return env
    def select(self,profile='all-free',tool=None):
        alltools=registry()['tools']
        if tool:
            chosen=[t for t in alltools if t['id']==tool]
            if not chosen:raise ValueError('Unknown or not allowed free tool: '+tool)
            return chosen
        return [t for t in alltools if profile=='all-free' or t['profile']==profile]
    def binary(self,t):
        candidates=[]
        if t['id']=='natron':candidates=list((self.home/'natron').glob('**/Natron'))
        if t['id']=='video2x':candidates=list((self.home/'video2x').glob('**/video2x'))
        for p in candidates:
            if p.is_file():return str(p)
        for cmd in t['commands']:
            found=shutil.which(cmd,path=self.environment()['PATH'])
            if found:return found
        return None
    def installed(self,t):
        kind=t['kind'];id=t['id']
        if kind in ('native','release'):return self.binary(t)
        if kind=='python':
            module={'opencv':'cv2','moviepy':'moviepy'}[id];py=self.python()
            if not py.exists():return None
            try:run([py,'-c',f'import {module};print({module}.__version__)'],timeout=30);return str(py)
            except Exception:return None
        if kind=='repo':return str(self.repos/id) if (self.repos/id/'SOURCE.json').exists() else None
        if id=='frei0r':
            for p in self.plugin_paths():
                if any(p.glob('*.so')) or any(p.glob('*.dylib')) or any(p.glob('*.dll')):return str(p)
        else:
            roots=[self.home/'natron',Path('/Library/OFX/Plugins'),Path(os.environ.get('CommonProgramFiles','C:/Program Files/Common Files'))/'OFX/Plugins',Path('/usr/OFX/Plugins')]
            natron=self.binary(self.select(tool='natron')[0])
            if natron:roots.extend([Path(natron).parent,Path(natron).parent.parent])
            for p in roots:
                if p.exists() and (any(p.rglob('Misc.ofx')) or any(p.rglob('Misc.ofx.bundle'))):return str(p)
        return None
    def plugin_paths(self):
        return [self.native/'usr/lib/frei0r-1',Path('/usr/lib/frei0r-1'),Path('/usr/lib/x86_64-linux-gnu/frei0r-1'),Path('/usr/local/lib/frei0r-1'),Path('/opt/homebrew/lib/frei0r-1'),Path.home()/'.frei0r-1']
    def plan(self,tools,target):
        out=[]
        for t in tools:
            state='planned' if target in ('linux','darwin','win32') else 'blocked_platform'
            if target in ('darwin','win32') and not t['install'].get(target) and t['kind'] in ('native','release','plugins'):state='manual_install_required'
            out.append({**t,'install':{'status':state,'platform':target,'managerPackage':t['install'].get(target),'existing':self.installed(t)}})
        return {'freeOnly':True,'downloadsMayBeLarge':True,'tools':out,'creativeApproval':False}
    def doctor(self,tools):
        results=[]
        for t in tools:
            location=self.installed(t);r={'id':t['id'],'status':'installed' if location else 'missing','location':location,'license':t['license']}
            if location and t['kind'] in ('native','release'):
                try:
                    probe=subprocess.run([location,{'ffmpeg':'-version','gmic':'version','natron':'--help'}.get(t['id'],'--version')],capture_output=True,text=True,env=self.environment(),timeout=15)
                    text=(probe.stdout or '')+'\n'+(probe.stderr or '')
                    if probe.returncode==0:r['version']=text[-600:]
                    elif t['id']=='natron' and probe.returncode==1 and re.search(r'Natron (?:Version|version)\s+\d',text):r.update(version=text[:300],versionInformationExit=1)
                    else:r.update(status='unverified',reason=f'Exit {probe.returncode}: '+text[-600:])
                except Exception as e:r.update(status='unverified',reason=str(e))
            results.append(r)
        return {'schemaVersion':1,'freeOnly':True,'platform':sys.platform,'results':results,'creativeApproval':False,'scope':'Presence and startup only; not inference, playback or audiovisual review.'}
    def write(self,name,value):
        self.records.mkdir(parents=True,exist_ok=True);(self.records/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');return value
    def execute_filter(self,input,output,effect):
        src=Path(input).resolve();out=Path(output).resolve()
        if not src.is_file():raise ValueError('Input does not exist')
        if out==src or out.exists():raise ValueError('Output already exists or is the original; choose a new path')
        if effect not in FILTERS:raise ValueError('Unknown filter')
        ffmpeg=self.binary(self.select(tool='ffmpeg')[0])
        if not ffmpeg:raise RuntimeError('FFmpeg is missing')
        with fresh_output(out) as temp:
            run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-n','-i',src,'-vf',FILTERS[effect],'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',temp],env=self.environment())
            run([ffmpeg,'-v','error','-i',temp,'-f','null','-'],env=self.environment())
        return {'status':'technical_passed','engine':'ffmpeg','effect':effect,'output':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'creativeApproval':False}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['plan','doctor','install','smoke','run','serve'])
    parser.add_argument('--root',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--profile',choices=PROFILES,default='all-free');parser.add_argument('--tool');parser.add_argument('--platform',default=sys.platform);parser.add_argument('--operation',choices=['filter','matte','segment','interpolate','upscale','composite']);parser.add_argument('--engine',choices=['ffmpeg','rife'],default='ffmpeg');parser.add_argument('--effect',choices=FILTERS,default='grayscale');parser.add_argument('--input');parser.add_argument('--output');parser.add_argument('--fps',type=int,default=30);parser.add_argument('--foreground');parser.add_argument('--mask');parser.add_argument('--point-x',type=int);parser.add_argument('--point-y',type=int);parser.add_argument('--apply',action='store_true');parser.add_argument('--report')
    args=parser.parse_args();tc=Toolchain(args.root)
    try:
        if args.report:
            report=Path(args.report).resolve()
            protected=[Path(p).resolve() for p in [args.input,args.output,args.foreground,args.mask] if p]
            if report in protected or report.exists():raise ValueError('Report must use a new path distinct from all media')
        tools=tc.select(args.profile,args.tool)
        if args.command=='plan':result=tc.plan(tools,args.platform)
        elif args.command=='doctor':result=tc.doctor(tools)
        elif args.command=='serve':
            if args.tool!='comfyui':raise ValueError('Only the free ComfyUI launcher is supported')
            repo=tc.repos/'comfyui'
            if not tc.installed(tools[0]):raise ValueError('ComfyUI not installed')
            subprocess.run([str(tc.python()),str(repo/'main.py'),'--cpu','--disable-api-nodes','--disable-all-custom-nodes','--listen','127.0.0.1'],cwd=repo,env=tc.environment(),check=True)
            result={'status':'stopped','freeOnly':True,'paidApiNodesEnabled':False}
        elif args.command=='run':
            if not args.input or not args.output:raise ValueError('Input/output required')
            if args.operation=='filter':result=tc.execute_filter(args.input,args.output,args.effect)
            else:
                from media_ops import execute
                result=execute(tc,args)
        elif args.command=='install':
            from install_tools import install
            result=install(tc,tools,args.platform,args.apply)
        elif args.command=='smoke':
            from smoke_tools import smoke
            result=smoke(tc,tools)
        if args.report:
            p=Path(args.report);p.parent.mkdir(parents=True,exist_ok=True);
            with p.open('x') as stream:stream.write(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except Exception as e:print(json.dumps({'status':'error','error':str(e),'creativeApproval':False},ensure_ascii=False));return 1
    return 0
if __name__=='__main__':sys.exit(main())
