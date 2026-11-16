import fs from 'node:fs';
import path from 'node:path';
import {checkWorkflow,sha256} from '../scripts/workflow-gate.mjs';
export function checkSampleApprovals(workflow,root){
 const errors=[...checkWorkflow(workflow,'ai-video',root).errors],hashes={};
 for(const scope of ['script','moodboard','storyboard']){
  const artifact=workflow.artifacts?.[scope],approval=workflow.approvals?.[scope];let hash;
  try{hash=sha256(path.resolve(root,artifact.file));}catch{errors.push(`${scope}: file unreadable`);}
  if(!hash||artifact?.sha256!==hash||approval?.sha256!==hash||approval?.status!=='approved'||approval?.by!=='user'||!approval?.quote?.trim()||!approval?.messageRef?.trim())errors.push(`${scope}: matching explicit user approval required`);
  hashes[scope]=hash;
 }
 if(!hashes.moodboard||workflow.approvals?.storyboard?.basis?.moodboard!==hashes.moodboard)errors.push('storyboard: stale moodboard basis');
 return {ready:errors.length===0,errors};
}
