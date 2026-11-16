"""Original test media, no remote assets, generated with stdlib and FFmpeg.
The rotating optical pattern is an authored 2D test subject, not real footage or 3D.
"""
import math, struct, zlib, subprocess, sys
from pathlib import Path
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
size = 480
raw = bytearray()
for y in range(size):
    raw.append(0)
    for x in range(size):
        dx, dy = x-size/2, y-size/2
        r = math.hypot(dx, dy); angle = math.atan2(dy, dx)
        # Precision cut radial petals, thin concentric rim, central stable aperture.
        petal = 92 < r < 195 and math.sin(angle*12+r*.016) > -.15
        rim = 211 < r < 213 or 68 < r < 70
        color = (236, 232, 217, 255) if petal else (89, 139, 158, 255) if rim else (0,0,0,0)
        raw.extend(color)
def chunk(kind, data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw)))+chunk(b'IEND',b'')
(out/'orbit.png').write_bytes(png)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x152d37:s=960x540:r=30:d=32','-loop','1','-i',str(out/'orbit.png'),'-filter_complex',"[0:v]drawgrid=w=60:h=60:t=1:c=0xffffff0c[bg];[1:v]format=rgba,rotate=a='t*0.20':c=none:ow=680:oh=680[ring];[bg][ring]overlay=x='140+25*sin(t*.3)':y=-70:shortest=1,format=yuv420p",'-t','32','-c:v','libx264','-crf','18','-preset','fast','-an',str(out/'source-original.mp4')],check=True)
print(out/'source-original.mp4')
