"""Bounded frame-by-frame RIFE adapter; avoids upstream legacy NumPy/MoviePy APIs."""
from pathlib import Path
import sys,json,tempfile,subprocess
home,source,output=map(Path,sys.argv[1:4]);target_fps=int(sys.argv[4]);ff=sys.argv[5]
sys.path.insert(0,str(home/'repos/rife'))
import cv2,torch
import torch.nn.functional as F
from train_log.RIFE_HDv3 import Model
torch.set_num_threads(2)
cap=cv2.VideoCapture(str(source));fps=cap.get(cv2.CAP_PROP_FPS);width=int(cap.get(3));height=int(cap.get(4))
factor=round(target_fps/fps) if fps else 0
if factor not in (2,4,8) or abs(fps*factor-target_fps)>0.01:raise ValueError('RIFE requires target fps = source fps × 2, 4 or 8; FFmpeg supports arbitrary target fps')
model=Model();model.load_model(str(home/'repos/rife/train_log'),-1);model.eval();model.device()
device=torch.device('cuda' if torch.cuda.is_available() else 'cpu')
def tensor(frame):
    t=torch.from_numpy(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).permute(2,0,1).unsqueeze(0).to(device).float()/255
    return F.pad(t,(0,(-width)%32,0,(-height)%32))
def between(a,b,n):
    if n==1:return []
    middle=model.inference(a,b)
    return between(a,middle,n//2)+[middle]+between(middle,b,n//2)
def frame(t):return cv2.cvtColor((t[0,:,:height,:width].permute(1,2,0).cpu().numpy().clip(0,1)*255).astype('uint8'),cv2.COLOR_RGB2BGR)
try:
    with tempfile.TemporaryDirectory(prefix='.rife-',dir=output.parent) as directory:
        silent=Path(directory)/'video.mp4';writer=cv2.VideoWriter(str(silent),cv2.VideoWriter_fourcc(*'mp4v'),target_fps,(width,height))
        if not writer.isOpened():raise RuntimeError('Video writer unavailable')
        ok,previous=cap.read();count=0
        if not ok:raise ValueError('No input frames')
        with torch.inference_mode():
            a=tensor(previous)
            while True:
                ok,current=cap.read()
                if not ok:break
                b=tensor(current);writer.write(previous);count+=1
                for t in between(a,b,factor):writer.write(frame(t));count+=1
                previous=current;a=b
            for _ in range(factor):writer.write(previous);count+=1
        writer.release()
        subprocess.run([ff,'-v','error','-nostdin','-n','-i',str(silent),'-i',str(source),'-map','0:v:0','-map','1:a?','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(output)],check=True)
        print(json.dumps({'engine':'rife','frames':count,'fps':target_fps,'audio':'original audio remuxed if present','creativeApproval':False}))
finally:
    cap.release()
