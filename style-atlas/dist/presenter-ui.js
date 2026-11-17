/* Interactive storyboard direction, not generated video or verified speech timing. */
(()=>{
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-presenter-step]');if(!button)return;
  const host=button.closest('[data-presenter-story]'),style=window.AtlasApp?.getStyle(host.dataset.presenterStory),index=Number(button.dataset.presenterStep),beat=style?.presenterEditing?.interactionPlan?.beats[index],frame=style?.sequence?.frames[index];if(!beat||!frame)return;
  host.querySelectorAll('[data-presenter-step]').forEach((item,i)=>item.setAttribute('aria-pressed',String(i===index)));
  host.querySelector('[data-presenter-image-host]').innerHTML=AtlasViews.picture(style,index,window.ATLAS_ASSET_BASE||'');
  for(const key of ['label','shotLanguage','speechIntent','presenterAction','graphicAction','soundIntent','purpose'])host.querySelector('[data-beat="'+key+'"]').textContent=beat[key];
 });
})();
