"""CPU video mask export with official local model weights. Output is a grayscale mask."""
from pathlib import Path
import sys,tempfile
import cv2,numpy as np,torch
engine,home,source,output=sys.argv[1:5];home=Path(home);torch.set_num_threads(2)
cap=cv2.VideoCapture(source)
if not cap.isOpened():raise RuntimeError('Cannot decode input')
fps=cap.get(cv2.CAP_PROP_FPS) or 24;width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH));height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT));writer=cv2.VideoWriter(output,cv2.VideoWriter_fourcc(*'mp4v'),fps,(width,height));count=0
try:
 if not writer.isOpened():raise RuntimeError('Cannot create mask writer')
 if engine=='rvm':
  sys.path.insert(0,str(home/'repos/rvm'));from model import MattingNetwork
  model=MattingNetwork('mobilenetv3').eval();model.load_state_dict(torch.load(home/'models/rvm_mobilenetv3.pth',map_location='cpu',weights_only=True));states=[None]*4
  while True:
   ok,frame=cap.read()
   if not ok:break
   tensor=torch.from_numpy(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).permute(2,0,1).unsqueeze(0).float()/255
   with torch.inference_mode():fg,alpha,*states=model(tensor,*states,downsample_ratio=min(1.,512/max(width,height)))
   mask=(alpha[0,0].numpy().clip(0,1)*255).astype('uint8');writer.write(cv2.cvtColor(mask,cv2.COLOR_GRAY2BGR));count+=1
 elif engine=='sam2':
  from sam2.build_sam import build_sam2_video_predictor
  x,y=int(sys.argv[5]),int(sys.argv[6])
  if not 0<=x<width or not 0<=y<height:raise ValueError('Point outside original image')
  with tempfile.TemporaryDirectory(prefix='studio-sam2-') as folder:
   while True:
    ok,frame=cap.read()
    if not ok:break
    cv2.imwrite(str(Path(folder)/f'{count:06d}.jpg'),frame);count+=1
   predictor=build_sam2_video_predictor('configs/sam2.1/sam2.1_hiera_t.yaml',str(home/'models/sam2.1_hiera_tiny.pt'),device='cpu')
   with torch.inference_mode():
    state=predictor.init_state(video_path=folder,offload_video_to_cpu=True,offload_state_to_cpu=True)
    predictor.add_new_points_or_box(inference_state=state,frame_idx=0,obj_id=1,points=np.array([[x,y]],dtype=np.float32),labels=np.array([1],dtype=np.int32))
    for _,_,logits in predictor.propagate_in_video(state):
     mask=(logits[0,0].cpu().numpy()>0).astype('uint8')*255;writer.write(cv2.cvtColor(mask,cv2.COLOR_GRAY2BGR))
 else:raise ValueError('Unknown engine')
 if count==0:raise ValueError('Input has no frames')
finally:cap.release();writer.release()
print('Processed',count,'frames; grayscale mask only, no creative approval')
