"""Free local VFX tools. No provider API, cloud inference or shell-evaluated commands."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, platform, shutil, subprocess, sys, tempfile, time
MANIFEST=Path(__file__).with_name('manifest.json')
PROFILES=('base','automation','ai','all-free')
FILTERS={'grayscale':'hue=s=0','blur':'gblur=sigma=2','glow':'split[a][b];[b]gblur=sigma=4[c];[a][c]blend=all_mode=screen:all_opacity=0.35','lens':'lenscorrection=k1=-0.05:k2=0','chroma':'chromakey=0x00FF00:0.12:0.08'}
def run(args,**kw):
    p=subprocess.run([str(a) for a in args],capture_output=True,text=True,timeout=kw.pop('timeout',120),**kw)
    if p.returncode:raise RuntimeError(f'{Path(str(args[0])).name} exited {p.returncode}: '+(p.stderr or p.stdout)[-1600:])
    return p.stdout.strip() or p.stderr.strip()
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
        libs=[self.native/'usr/lib/x86_64-linux-gnu',self.native/'usr/lib',self.native/'lib/x86_64-linux-gnu']
        env['LD_LIBRARY_PATH']=os.pathsep.join(str(x) for x in libs)+os.pathsep+env.get('LD_LIBRARY_PATH','')
        if (self.native/'usr/lib/x86_64-linux-gnu/qt6/plugins').exists():env['QT_PLUGIN_PATH']=str(self.native/'usr/lib/x86_64-linux-gnu/qt6/plugins')
        env['FREI0R_PATH']=str(self.native/'usr/lib/frei0r-1')
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
        paths=[self.native/'usr/lib/frei0r-1',Path('/usr/lib/frei0r-1'),Path('/usr/lib/x86_64-linux-gnu/frei0r-1')] if id=='frei0r' else [self.home/'natron']
        for p in paths:
            if p.exists() and any(p.rglob('*.so')):return str(p)
        return None
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
                try:r['version']=run([location,'-version' if t['id']=='ffmpeg' else '--version'],env=self.environment(),timeout=15)[-600:]
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
        out.parent.mkdir(parents=True,exist_ok=True)
        try:
            run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-n','-i',src,'-vf',FILTERS[effect],'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',out],env=self.environment())
            run([ffmpeg,'-v','error','-i',out,'-f','null','-'],env=self.environment())
        except Exception:
            if out.exists():out.unlink()
            raise
        return {'status':'technical_passed','engine':'ffmpeg','effect':effect,'output':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'creativeApproval':False}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['plan','doctor','install','smoke','run'])
    parser.add_argument('--root',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--profile',choices=PROFILES,default='all-free');parser.add_argument('--tool');parser.add_argument('--platform',default=sys.platform);parser.add_argument('--operation',choices=['filter','matte','segment','interpolate','upscale']);parser.add_argument('--effect',choices=FILTERS,default='grayscale');parser.add_argument('--input');parser.add_argument('--output');parser.add_argument('--apply',action='store_true');parser.add_argument('--report')
    args=parser.parse_args();tc=Toolchain(args.root)
    try:
        tools=tc.select(args.profile,args.tool)
        if args.command=='plan':result=tc.plan(tools,args.platform)
        elif args.command=='doctor':result=tc.doctor(tools)
        elif args.command=='run':
            if args.operation!='filter':raise ValueError('Operation not installed or not supported yet')
            if not args.input or not args.output:raise ValueError('Input/output required')
            result=tc.execute_filter(args.input,args.output,args.effect)
        else:raise ValueError('Installer/smoke not available yet')
        if args.report:
            p=Path(args.report);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except Exception as e:print(json.dumps({'status':'error','error':str(e),'creativeApproval':False},ensure_ascii=False));return 1
    return 0
if __name__=='__main__':sys.exit(main())
