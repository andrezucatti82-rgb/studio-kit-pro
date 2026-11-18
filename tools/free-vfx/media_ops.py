"""Validated free media operations; immutable inputs and fresh output paths."""
from pathlib import Path
import hashlib,json
from toolchain import run,fresh_output

def execute(tc,args):
    source=Path(args.input).resolve();output=Path(args.output).resolve()
    if not source.is_file():raise ValueError('Input missing')
    if source==output or output.exists():raise ValueError('Choose a new output; originals/existing files are preserved')
    if not args.operation:raise ValueError('Operation required')
    ff=tc.binary(tc.select(tool='ffmpeg')[0]);engine='ffmpeg'
    if not ff:raise ValueError('FFmpeg missing')
    requested=output
    with fresh_output(requested) as output:
        if args.operation=='interpolate' and args.engine=='rife':
            engine='rife'
            run([tc.python(),Path(__file__).with_name('rife_video.py'),tc.home,source,output,args.fps,ff],env=tc.environment(),timeout=1800)
        elif args.operation=='interpolate':
            if not 1<=args.fps<=120:raise ValueError('FPS must be between 1 and 120')
            run([ff,'-v','error','-nostdin','-n','-i',source,'-vf',f'minterpolate=fps={args.fps}:mi_mode=mci','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',output],env=tc.environment(),timeout=600)
        elif args.operation=='composite':
            if not args.foreground or not Path(args.foreground).is_file():raise ValueError('Foreground video/image required')
            cmd=[ff,'-v','error','-nostdin','-n','-i',source,'-i',str(Path(args.foreground).resolve())]
            graph='[0:v][1:v]overlay=shortest=1[v]'
            if args.mask:
                if not Path(args.mask).is_file():raise ValueError('Mask missing')
                cmd+=['-i',str(Path(args.mask).resolve())];graph='[1:v][2:v]alphamerge[fg];[0:v][fg]overlay=shortest=1[v]'
            run([*cmd,'-filter_complex',graph,'-map','[v]','-map','0:a?','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',output],env=tc.environment(),timeout=600)
        elif args.operation in ('matte','segment'):
            engine='rvm' if args.operation=='matte' else 'sam2'
            if not tc.installed(tc.select(tool=engine)[0]):raise ValueError(engine+' not installed')
            if args.operation=='segment' and (args.point_x is None or args.point_y is None):raise ValueError('Explicit point-x and point-y required for object segmentation')
            cmd=[tc.python(),Path(__file__).with_name('video_mask.py'),engine,tc.home,source,output]
            if engine=='sam2':cmd+=[args.point_x,args.point_y]
            run(cmd,env=tc.environment(),timeout=1800)
        elif args.operation=='upscale':
            engine='video2x';exe=tc.binary(tc.select(tool=engine)[0])
            if not exe:raise ValueError('Video2X not installed')
            resource=Path(exe).parent.parent/'share/video2x'
            run([exe,'-i',source,'-o',output,'-p','realesrgan','-s','2','--no-progress'],cwd=resource if resource.exists() else None,env=tc.environment(),timeout=1800)
        else:raise ValueError('Unsupported free operation')
        run([ff,'-v','error','-i',output,'-f','null','-'],env=tc.environment(),timeout=120)
    output=requested
    return {'status':'technical_passed','engine':engine,'operation':args.operation,'output':str(output),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'creativeApproval':False,'note':'Matte/segment MP4 is a grayscale mask, not a transparent MP4.' if args.operation in ('matte','segment') else ''}
