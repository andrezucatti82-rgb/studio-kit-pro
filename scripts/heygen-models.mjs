/** Read-only discovery. Its report is evidence for planning, never a generation request. */
import http from 'node:http';
import '../style-atlas/dist/workflow.js';

if(process.env.HTTPS_PROXY||process.env.https_proxy)http.setGlobalProxyFromEnv?.();

const policy=AtlasWorkflow.heygenModelPolicy;
const docs=[
 ['index',policy.discovery[0]],
 ['changelog','https://developers.heygen.com/changelog.md'],
 ['presenter','https://developers.heygen.com/docs/models/avatar-6.md'],
 ['identityImage','https://developers.heygen.com/docs/models/heygen-image.md'],
 ['scene','https://developers.heygen.com/docs/models/heygen-video.md'],
 ['existingFootageLipsync','https://developers.heygen.com/reference/create-lipsync.md']
];

async function readDocumentation([id,url]){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!response.ok)return {id,url,status:'unverified',http:response.status};
  const source=await response.text();
  const modelIds=[...new Set(source.match(/\bheygen-(?:avatar|image|video)-\d+(?:-turbo)?\b/g)||[])].sort();
  return {id,url,status:'read',modelIds};
 }catch{
  return {id,url,status:'unverified'};
 }
}

async function accountStatus(){
 const secret=process.env.HEYGEN_API_KEY;
 if(!secret)return {status:'key_not_configured'};
 try{
  const response=await fetch('https://api.heygen.com/v3/users/me',{
   headers:{'X-Api-Key':secret,Accept:'application/json'},
   signal:AbortSignal.timeout(12000),redirect:'error'
  });
  if(!response.ok)return {status:'unverified',http:response.status};
  const result=await response.json(),account=result.data||result;
  return {status:'authenticated',billingType:account.billing_type??null,walletCurrency:account.wallet?.currency??null};
 }catch{
  return {status:'unverified'};
 }
}

const [documentation,account]=await Promise.all([Promise.all(docs.map(readDocumentation)),accountStatus()]);
console.log(JSON.stringify({
 checkedAt:new Date().toISOString(),policy,documentation,account,
 limitations:'Documentation and account verification do not confirm entitlement to each model, current price, suitability to a shot, or creative approval.'
},null,2));
