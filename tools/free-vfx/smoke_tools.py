"""Technical proofs; none constitute audiovisual/creative approval."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,time,tempfile
from toolchain import run

def smoke_one(tc,t):
    id=t['id'];location=tc.installed(t)
    if not location:return {'id':id,'status':'missing','reason':'Not installed'}
    base=tc.home/'smoke'/id;base.mkdir(parents=True,exist_ok=True);work=Path(tempfile.mkdtemp(prefix='proof-',dir=base));env=tc.environment();artifact=None
    if id=='ffmpeg':
        src=work/'source.mp4';out=work/'grayscale.mp4'
        if not src.exists():run([location,'-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=4:duration=1','-c:v','libx264',src],env=env)
        if out.exists():out.unlink()
        result=tc.execute_filter(src,out,'grayscale');artifact=out;evidence='Real filter, encode and full decode of four-frame technical clip'
    elif id=='blender':
        artifact=work/'cpu.png';expr="import bpy;s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=1;s.cycles.use_denoising=False;s.render.resolution_x=64;s.render.resolution_y=64;s.render.resolution_percentage=100;s.render.filepath="+repr(str(artifact))+";bpy.ops.render.render(write_still=True)"
        evidence=run([location,'-b','-t','2','--factory-startup','--python-expr',expr],env=env,timeout=120)[-500:]
    elif id=='gmic':
        artifact=work/'gmic.png';evidence=run([location,'-input','64,64,1,3','-fill','255','-blur','1','-output',artifact],env=env,timeout=30)[-500:]
    elif id=='rife':
        source=work/'source.mp4';artifact=work/'rife.mp4';ff=tc.binary(tc.select(tool='ffmpeg')[0])
        run([ff,'-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=4:duration=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-c:a','aac','-shortest',source],env=env)
        evidence=run([tc.python(),Path(__file__).with_name('rife_video.py'),tc.home,source,artifact,8,ff],env=env,timeout=240)
        run([ff,'-v','error','-i',artifact,'-f','null','-'],env=env)
    elif id in ('opencv','moviepy','sam2','rvm','comfyui'):
        evidence=run([tc.python(),Path(__file__).with_name('python_smoke.py'),id,str(tc.home),str(work)],env=env,timeout=240)
        data=json.loads(evidence.splitlines()[-1]);
        if data.get('status')!='smoke_passed':return {'id':id,**data}
        if data.get('artifact'):artifact=Path(data['artifact'])
    elif id=='frei0r':
        candidates=[p for base in tc.plugin_paths() if base.exists() for p in base.iterdir() if p.suffix in ('.so','.dylib','.dll')]
        if not candidates:raise RuntimeError('No installed frei0r plugins found')
        # Exercise the actual plugin through FFmpeg, with plugin directory explicitly scoped.
        plugin=next((p for p in candidates if p.stem=='invert0r'),None)
        if not plugin:return {'id':id,'status':'installed_not_tested','reason':'No invert0r plugin available for this test'}
        env['FREI0R_PATH']=str(plugin.parent);ff=tc.binary(tc.select(tool='ffmpeg')[0]);artifact=work/'plugin.png'
        evidence=run([ff,'-v','error','-y','-f','lavfi','-i','color=red:size=64x64:duration=1','-vf','format=bgra,frei0r=filter_name=invert0r','-frames:v','1',artifact],env=env,timeout=30)
    elif id=='video2x':
        ff=tc.binary(tc.select(tool='ffmpeg')[0]);source=work/'source.mp4';artifact=work/'upscale.mp4'
        if not source.exists():run([ff,'-v','error','-f','lavfi','-i','testsrc2=size=64x64:rate=4:duration=1','-c:v','libx264',source],env=env)
        if artifact.exists():artifact.unlink()
        resource=Path(location).parent.parent/'share/video2x'
        evidence=run([location,'-i',source,'-o',artifact,'-p','realesrgan','-s','2','--no-progress'],cwd=resource if resource.exists() else None,env=env,timeout=180)[-700:]
        run([ff,'-v','error','-i',artifact,'-f','null','-'],env=env)
    elif id in ('natron','openfx-misc'):
        natron=Path(tc.binary(tc.select(tool='natron')[0]) or '')
        renderer=natron.with_name('NatronRenderer')
        if not renderer.exists():return {'id':id,'status':'installed_not_tested','reason':'NatronRenderer not found'}
        artifact=work/'natron.png';py=work/'comp.py';py.write_text("def createInstance(app,group):\n c=app.createNode('net.sf.openfx.ConstantPlugin')\n if c is None: raise RuntimeError('ConstantPlugin unavailable')\n c.getParam('color').set(0.8,0.2,0.1,1.0)\n w=app.createNode('fr.inria.openfx.WriteOIIO')\n w.getParam('filename').setValue("+repr(str(artifact))+" )\n w.connectInput(0,c)\n w.setScriptName('ProofWrite')\n")
        evidence=run([renderer,'-w','ProofWrite',py,'1-1'],env=env,timeout=120)[-700:]
    elif id in ('kdenlive','shotcut'):
        evidence=run([location,'--version'],env=env,timeout=20)
        return {'id':id,'status':'startup_passed','reason':'GUI version/startup verified; editor project/render not certified','version':evidence[-500:]}
    else:return {'id':id,'status':'installed_not_tested','reason':'No technical proof implemented'}
    if artifact and (not artifact.is_file() or artifact.stat().st_size==0):raise RuntimeError('Expected proof artifact missing')
    return {'id':id,'status':'smoke_passed','evidence':evidence[-1000:],'artifact':str(artifact) if artifact else None,'sha256':hashlib.sha256(artifact.read_bytes()).hexdigest() if artifact else None}

def smoke(tc,tools):
    results=[]
    for t in tools:
        print('Testing '+t['id'],file=sys.stderr,flush=True)
        try:r=smoke_one(tc,t)
        except Exception as e:r={'id':t['id'],'status':'failed','reason':str(e)}
        results.append(r)
    return tc.write('smoke.json',{'schemaVersion':1,'freeOnly':True,'creativeApproval':False,'results':results,'scope':'Technical proofs only. Playback/listening and creative approval are separate.'})
