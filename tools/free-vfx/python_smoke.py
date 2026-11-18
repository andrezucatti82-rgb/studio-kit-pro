"""Small deterministic CPU proofs for the local free Python tools."""
from pathlib import Path
import json,sys,os
id,home,work=sys.argv[1],Path(sys.argv[2]),Path(sys.argv[3]);work.mkdir(parents=True,exist_ok=True)
try:
    import numpy as np
    if id=='opencv':
        import cv2
        image=np.zeros((64,64,3),dtype=np.uint8);image[16:48,16:48]=(0,255,0);gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        assert cv2.countNonZero(gray)==1024
        artifact=work/'mask.png';assert cv2.imwrite(str(artifact),gray)
    elif id=='moviepy':
        from moviepy import ColorClip,CompositeVideoClip
        artifact=work/'moviepy.mp4';bg=ColorClip((64,64),color=(0,0,0),duration=0.5);fg=ColorClip((24,24),color=(255,0,0),duration=0.5).with_position(('center','center'))
        comp=CompositeVideoClip([bg,fg]);comp.write_videofile(str(artifact),fps=4,codec='libx264',audio=False,logger=None);comp.close();bg.close();fg.close()
    elif id in ('rvm','sam2'):
        import torch
        torch.set_num_threads(2)
        if id=='rvm':
            sys.path.insert(0,str(home/'repos/rvm'))
            from model import MattingNetwork
            model=MattingNetwork('mobilenetv3').eval();model.load_state_dict(torch.load(home/'models/rvm_mobilenetv3.pth',map_location='cpu',weights_only=True))
            source=torch.zeros(1,3,64,64);source[:,:,16:48,16:48]=0.5
            with torch.inference_mode():fg,alpha,*states=model(source,downsample_ratio=1)
            assert alpha.shape==(1,1,64,64) and torch.isfinite(alpha).all()
            from PIL import Image
            artifact=work/'alpha.png';Image.fromarray((alpha[0,0].numpy().clip(0,1)*255).astype('uint8')).save(artifact)
        else:
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            model=build_sam2('configs/sam2.1/sam2.1_hiera_t.yaml',str(home/'models/sam2.1_hiera_tiny.pt'),device='cpu');predictor=SAM2ImagePredictor(model)
            image=np.zeros((64,64,3),dtype='uint8');image[16:48,16:48]=200
            with torch.inference_mode():
                predictor.set_image(image);masks,scores,logits=predictor.predict(point_coords=np.array([[32,32]]),point_labels=np.array([1]),multimask_output=False)
            assert masks.shape[-2:]==(64,64) and np.isfinite(scores).all()
            from PIL import Image
            artifact=work/'segmentation.png';Image.fromarray(masks[0].astype('uint8')*255).save(artifact)
    elif id=='comfyui':
        sys.path.insert(0,str(home/'repos/comfyui'))
        # Core model-management import on CPU, then a deterministic built-in image node.
        sys.argv=['comfyui','--cpu']
        import comfy.options
        comfy.options.enable_args_parsing()
        import comfy.model_management
        from nodes import EmptyImage
        import torch
        torch.set_num_threads(2)
        (image,)=EmptyImage().generate(64,64,1,0xFF0000)
        assert tuple(image.shape)==(1,64,64,3)
        from PIL import Image
        artifact=work/'comfyui-node.png';Image.fromarray((image[0].cpu().numpy()*255).astype('uint8')).save(artifact)
    elif id=='rife':
        models=home/'repos/rife/train_log'
        if not models.exists() or not list(models.glob('*.pkl')):
            print(json.dumps({'status':'installed_model_missing','reason':'Official trained_model checkpoint required; no third-party model silently substituted'}));sys.exit(0)
        sys.path.insert(0,str(home/'repos/rife'))
        import torch
        from train_log.RIFE_HDv3 import Model
        torch.set_num_threads(2);model=Model();model.load_model(str(models),-1);model.eval();model.device()
        a=torch.zeros(1,3,64,64);b=torch.ones(1,3,64,64)
        with torch.inference_mode():mid=model.inference(a,b)
        assert torch.isfinite(mid).all()
        from PIL import Image
        artifact=work/'interpolated.png';Image.fromarray((mid[0].permute(1,2,0).cpu().numpy().clip(0,1)*255).astype('uint8')).save(artifact)
    else:raise ValueError('Unknown Python proof')
    print(json.dumps({'status':'smoke_passed','artifact':str(artifact),'scope':'Synthetic technical inference/processing; not a quality benchmark or creative approval'}))
except Exception as e:
    print(json.dumps({'status':'failed','reason':str(e)}));sys.exit(1)
