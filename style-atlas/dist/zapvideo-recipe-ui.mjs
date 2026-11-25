import {findRecipe, recipeGoals, recipeGroups, recipePreviews, recipes} from './zapvideo-recipes.mjs';

const publicRecipes = recipes.filter(recipe => recipe.group !== 'gda');
const publicGroups = recipeGroups.filter(group => publicRecipes.some(recipe => recipe.group === group.id));

export function recipeGoalOptions(select, current) {
  select.replaceChildren(...Object.entries(recipeGoals).map(([value,label])=>new Option(label,value)));
  select.value=current;
}

export function setupRecipes(startRecipe, download) {
  const $ = id => document.getElementById(id);
  const filters=$('recipe-filters'), grid=$('recipe-grid'), search=$('recipe-search'), dialog=$('recipe-dialog');
  const video=$('recipe-video'), image=$('recipe-frame'), motion=$('recipe-play');
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let group='', activeRecipe, frameIndex=0, timer;
  const normalize=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
  function render() {
    const query=normalize(search.value);
    const matches=publicRecipes.filter(recipe=>(!group || recipe.group===group) &&
      normalize([recipe.name,...recipe.beats].join(' ')).includes(query));
    $('recipe-count').textContent=matches.length===0?'Nenhuma receita encontrada.':
      matches.length===1?'1 receita':`${matches.length} receitas`;
    grid.replaceChildren(...matches.map(recipe=>{
      const preview=recipePreviews[recipe.preview];
      const button=document.createElement('button'), still=document.createElement('img');
      const picture=document.createElement('picture'), mark=document.createElement('span'), title=document.createElement('strong');
      button.className='recipe-card';
      button.type='button';
      button.dataset.recipe=recipe.id;
      button.dataset.preview=recipe.preview;
      button.onclick=()=>open(recipe);
      still.src=preview.frames[0];
      still.width=320;still.height=180;still.alt='';still.loading='lazy';still.decoding='async';
      mark.className='recipe-preview-mark';mark.setAttribute('aria-hidden','true');
      mark.textContent=preview.video?'▶':'▧';
      title.textContent=recipe.name;
      if (preview.panels) picture.dataset.panel=String(preview.panels[1]);
      picture.append(still,mark);button.append(picture,title);
      return button;
    }));
  }
  for (const {id,name} of [{id:'',name:'Todas'},...publicGroups]) {
    const button=document.createElement('button');
    button.type='button';button.className='secondary';button.textContent=name;
    button.dataset.group=id;
    button.setAttribute('aria-pressed',String(id===group));
    button.onclick=()=>{
      group=id;
      for (const filter of filters.children) filter.setAttribute('aria-pressed',String(filter===button));
      render();
    };
    filters.append(button);
  }
  function stop() {
    clearInterval(timer);timer=undefined;
    motion.textContent='Animar quadros';
  }
  function showFrame() {
    const preview=recipePreviews[activeRecipe.preview], frames=preview.frames;
    image.src=frames[frameIndex];
    if (preview.panels) $('recipe-frame-view').dataset.panel=String(preview.panels[frameIndex]);
    else delete $('recipe-frame-view').dataset.panel;
    $('recipe-frame-count').textContent=`Quadro ${frameIndex+1} de ${frames.length}`;
    $('recipe-frame-prev').disabled=frameIndex===0;
    $('recipe-frame-next').disabled=frameIndex===frames.length-1;
  }
  function open(recipe) {
    activeRecipe=recipe;
    frameIndex=0;
    const preview=recipePreviews[recipe.preview];
    $('recipe-dialog-title').textContent=recipe.name;
    $('recipe-reference').textContent=preview.reference?'Referência do catálogo · '+preview.reference:'';
    $('recipe-reference').hidden=!preview.reference;
    $('recipe-beats').replaceChildren(...recipe.beats.map(beat=>{
      const item=document.createElement('li');item.textContent=beat;return item;
    }));
    const companionNotes={
      'reels-carrossel':'Crie o Reels no wizard. A adaptação para cartões fica no plano.',
      'educativo-multi':'Crie o vídeo no wizard. As outras versões ficam no plano.',
    };
    $('recipe-dialog-scope').textContent=companionNotes[recipe.id] ?? {
      edit:'Prévia de edição. Use sua gravação original.',
      review:'Prepare o storyboard e baixe o plano. A produção deste formato acontece fora do ZapVideo.',
      video:'Veja um exemplo de direção. Você revisa os quadros do seu projeto antes de gerar.',
      plan:'Organize a ideia e baixe o plano de produção.',
    }[recipe.route];
    $('recipe-plan').hidden=recipe.route!=='plan';
    $('recipe-use').hidden=recipe.route==='plan';
    $('recipe-plan-topic').value='';
    recipeGoalOptions($('recipe-plan-goal'),recipe.goal);
    video.hidden=!preview.video;
    $('recipe-frame-view').hidden=$('recipe-frame-controls').hidden=Boolean(preview.video);
    motion.hidden=reduceMotion.matches;
    if (preview.video) video.src=preview.video;
    else showFrame();
    dialog.showModal();
  }
  $('recipe-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    stop();
    if (!video.hasAttribute('src')) return;
    video.pause();video.removeAttribute('src');video.load();
  });
  search.oninput=render;
  $('featured-recipe').onclick=()=>open(findRecipe('avatar'));
  $('recipe-frame-prev').onclick=()=>{stop();frameIndex--;showFrame();};
  $('recipe-frame-next').onclick=()=>{stop();frameIndex++;showFrame();};
  motion.onclick=()=>{
    if (timer) return stop();
    motion.textContent='Pausar';
    timer=setInterval(()=>{
      frameIndex=(frameIndex+1)%recipePreviews[activeRecipe.preview].frames.length;
      showFrame();
    },1500);
  };
  reduceMotion.addEventListener('change',event=>{stop();motion.hidden=event.matches;});
  $('recipe-use').onclick=()=>{dialog.close();startRecipe(activeRecipe);};
  $('recipe-plan').onsubmit=event=>{
    event.preventDefault();
    const topic=$('recipe-plan-topic').value.trim();
    if (!topic) { $('recipe-plan-topic').focus();return; }
    const lines=[activeRecipe.name,'',`Assunto — ${topic}`,`Objetivo — ${recipeGoals[$('recipe-plan-goal').value]}`,
      '',...activeRecipe.beats.map((beat,index)=>`${index+1}. ${beat}`)];
    download(`plano-${activeRecipe.id}.txt`,lines.join('\n')+'\n');
  };
  render();
}

