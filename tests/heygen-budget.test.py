import importlib.util, unittest, tempfile, json
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('heygen_clips',Path(__file__).parents[1]/'scripts/heygen-clips.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class BudgetTests(unittest.TestCase):
 def test_no_visual_approval_prevents_all_api_calls(self):
  with tempfile.TemporaryDirectory() as directory:
   job=Path(directory)/'job.json';job.write_text(json.dumps({'reserveUSD':1}))
   with patch.object(m,'api') as api:
    with self.assertRaisesRegex(ValueError,'Visual approval required'):m.submit(job,Path(directory)/'ledger.json',True)
    api.assert_not_called()
 def ledger(self):return {'planningBRLPerUSD':7,'limitBRL':100,'pricingBasis':'Explicit estimate fixture','jobs':[]}
 def test_unknown_and_failed_charges_keep_reservation(self):
  d=self.ledger();d['jobs']=[{'reservedUSD':14,'chargedUSD':None,'status':'submission_unknown'}]
  with self.assertRaises(ValueError):m.check_budget(d,1)
  d['jobs'][0]['status']='failed'
  with self.assertRaises(ValueError):m.check_budget(d,1)
 def test_verified_charge_releases_estimate(self):
  d=self.ledger();d['jobs']=[{'reservedUSD':14,'chargedUSD':.4}];self.assertEqual(m.check_budget(d,2),m.Decimal('.4'))
 def test_missing_pricing_and_negative_budget_rejected(self):
  for field,value in [('pricingBasis',''),('limitBRL',0),('planningBRLPerUSD',-1)]:
   d=self.ledger();d[field]=value
   with self.assertRaises(ValueError):m.check_budget(d,1)
 def test_unsupported_media_mode_does_not_submit(self):
  with self.assertRaises(ValueError):m.payload_for({'model':'heygen-video-1','duration':10,'mode':'reference_to_video'},Path('.'))
 def test_paid_generation_requires_direction_evidence(self):
  with self.assertRaises(ValueError):m.verify_direction({},Path('/tmp/job.json'))
 def test_reference_payload_keeps_order_and_disables_rewrite(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);(p/'one.png').write_bytes(b'fixture one');(p/'two.png').write_bytes(b'fixture two')
   q=m.payload_for({'model':'heygen-video-1','duration':10,'mode':'reference_to_video','referenceImages':['two.png','one.png']},p)
   self.assertEqual(q['prompt_enhancement'],'disabled');self.assertEqual(q['reference_images'][0]['data'],m.base64.b64encode(b'fixture two').decode())
 def test_avatar_uses_original_audio_and_selects_dedicated_endpoint(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);(root/'portrait.png').write_bytes(b'approved picture');(root/'speech.wav').write_bytes(b'original speech')
   job={'model':'heygen-avatar-6','mode':'avatar_from_audio','duration':4.25,'resolution':'1080p','motion_expressiveness':'less','prompt':'Use a calm expression.','speechAudio':'speech.wav','firstFrame':'portrait.png','reserveUSD':1}
   job_path=root/'job.json';ledger=root/'ledger.json'
   job_path.write_text(json.dumps(job));ledger.write_text(json.dumps(self.ledger()))
   timing=json.dumps({'format':{'duration':'4.25'},'streams':[{'codec_type':'audio'}]})
   with patch.object(m.subprocess,'check_output',return_value=timing),patch.object(m,'check_visual_approval'),patch.object(m,'verify_direction'),patch.object(m,'api',side_effect=[({'data':{'wallet':{'currency':'usd','remaining_balance':10}}},None),({'data':{'status':'pending','video_id':'example'}},'request')]) as api:
    result=m.submit(job_path,ledger,True)
    self.assertEqual(result['status'],'pending')
    route,payload,_=api.call_args.args
    self.assertEqual(route,'/v3/models/avatars')
    self.assertEqual(m.base64.b64decode(payload['audio']['data']),b'original speech')
    self.assertEqual(payload['motion_prompt'],job['prompt'])
    self.assertNotIn('duration',payload)
   timing=json.dumps({'format':{'duration':'12.25'},'streams':[{'codec_type':'audio'}]})
   with patch.object(m.subprocess,'check_output',return_value=timing):
    with self.assertRaisesRegex(ValueError,'duration must match'):m.payload_for(job,root)
 def test_missing_checkpoint_never_calls_paid_api(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);job=p/'job.json';ledger=p/'ledger.json';job.write_text(json.dumps({'model':'heygen-video-1','duration':10,'mode':'text_to_video','reserveUSD':1}));ledger.write_text(json.dumps(self.ledger()))
   with patch.object(m,'api') as api:
    with self.assertRaises(ValueError):m.submit(job,ledger,True)
    api.assert_not_called()
 def test_subscription_account_without_wallet_has_clear_block(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);job=p/'job.json';ledger=p/'ledger.json';job.write_text(json.dumps({'model':'heygen-video-1','duration':10,'mode':'text_to_video','reserveUSD':1}));ledger.write_text(json.dumps(self.ledger()))
   with patch.object(m,'check_visual_approval'),patch.object(m,'verify_direction'),patch.object(m,'api',return_value=({'data':{'wallet':None}},None)) as api:
    with self.assertRaisesRegex(ValueError,'not interchangeable'):m.submit(job,ledger,True)
    api.assert_called_once_with('/v3/users/me')
if __name__=='__main__'  :unittest.main()
