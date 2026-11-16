import fs from 'node:fs/promises';
import path from 'node:path';
import {repoRoot} from './skills.mjs';
export async function pendingReview(report,authorization){
 const review=JSON.parse(await fs.readFile(path.join(repoRoot,'.agents/skills/video-multimarcas/templates/review.json'),'utf8'));
 review.videoSha256=report.sha256;review.technical={status:'passed',evidence:'technical-report.json: metadata, exact plan conformity, full FFmpeg decode and loudness measurement'};
 for(const key of ['playback','listening'])review[key].notes='Not performed. Extracted frames, decode, loudness and headless player smoke tests do not substitute continuous audiovisual review.';
 if(authorization.mode==='engineering'){
  review.preProduction.evidence='Engineering fixture expressly requested by the master mission; no creative approvals are inferred or recorded.';
  review.identityPreservation={realPeoplePresent:false,status:'not_applicable',notes:'Original code-authored optical fixture, no people',people:[]};
  for(const key of ['imageGeneration','videoGeneration'])review.qualityGates[key]={status:'not_applicable',notes:'Original procedural fixture; no AI image or video generation',assets:[]};
 }
 review.qualityGates.finishing.notes='Pending continuous visual and audio evaluation of this exact SHA256.';
 return review;
}
