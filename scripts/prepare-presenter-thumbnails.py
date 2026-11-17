"""Re-encode legacy PNG reference boards for small UI previews; never crop/resize artwork."""
from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(__file__).resolve().parent.parent
catalog=json.loads((root/'style-atlas/dist/catalog.json').read_text())
count=before=after=0
for style in catalog['styles']:
 if not style.get('presenterEditing'):continue
 record_file=root/'style-atlas/records/presenter-realistic'/(style['id']+'.json')
 record=json.loads(record_file.read_text());source=root/'style-atlas/dist'/record['path']
 if source.suffix.lower()!='.png':continue
 data=source.read_bytes();assert hashlib.sha256(data).hexdigest()==record['sha256']
 image=Image.open(source);relative='assets/presenter-realistic/previews/'+style['id']+'.webp';target=root/'style-atlas/dist'/relative;target.parent.mkdir(parents=True,exist_ok=True)
 image.save(target,'WEBP',quality=90,method=6)
 record['thumbnail']={'path':relative,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':image.width,'height':image.height,'derivation':'webp_quality_90_format_transcode_only_no_resize_crop_or_artwork_edit','originalReferencePreserved':True}
 record_file.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');count+=1;before+=len(data);after+=target.stat().st_size
print(json.dumps({'originalBoardsPreserved':count,'smallPreviewBytesBefore':before,'smallPreviewBytesAfter':after,'sameDimensionsAndFraming':True}))
