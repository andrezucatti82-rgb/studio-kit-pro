const coffee = n => `/assets/segments-440/ads26-alimentacao-o-cafe-muda-o-ponto-de-vista-0${n}.webp`;

export const styles = {
  product: {
    name:'Produto em destaque', description:'Embalagem, uso e convite.', frames:[coffee(4),coffee(2),coffee(1)],
    palette:['#243541','#d9cbac','#6f4025'], mood:'Luz lateral e foco nos detalhes',
    scenes:[['Apresente o produto','Mostre {produto} em plano limpo. Preserve a aparência da referência.'],
      ['Mostre como usar','Demonstre um uso real de {produto} com uma ação simples.'],
      ['Feche com o produto','Volte para {produto} e deixe espaço para o convite final.']],
  },
  sensory: {
    name:'Sensorial', description:'Textura, movimento e detalhes.', frames:[coffee(2),coffee(3),coffee(4)],
    palette:['#d0a06a','#6f4025','#243541','#d9cbac'], mood:'Luz de manhã e textura natural',
    scenes:[['Prepare a cena','Abra com um detalhe de {produto} e mostre sua textura sob luz suave.'],
      ['Mostre o gesto','Mostre {produto} em uso de perto, com um gesto natural e movimento contido.'],
      ['Revele o produto','Mostre {produto} por inteiro. Preserve formato, cor e detalhes da referência.']],
  },
  routine: {
    name:'Rotina real', description:'O produto em uma situação cotidiana.', frames:[coffee(3),coffee(1),coffee(4)],
    palette:['#b68358','#7b5845','#344334'], mood:'Ambiente cotidiano e luz natural',
    scenes:[['Mostre a situação','Apresente o ambiente cotidiano em que {produto} faz sentido.'],
      ['Mostre na prática','Mostre uma pessoa usando {produto} de forma natural, com uma ação por plano.'],
      ['Volte ao produto','Encerre com {produto} no mesmo ambiente e espaço para o convite final.']],
  },
};

export const durations = [9,15,30];
export const objectives = {
  sell:'Vender produto', show:'Mostrar como funciona', brand:'Divulgar marca',
};

export function makeBoard(guided, id) {
  const style=styles[guided.style];
  const timing={9:[3,3,3],15:[4,6,5],30:[8,13,9]}[guided.duration];
  return style.scenes.map(([title,direction],i)=>({id:id(),title,narration:'',shots:[{
    id:id(),seconds:timing[i],direction:direction.replace('{produto}',()=>guided.name),
    example:style.frames[i],generateSupport:true,layers:[],
    overlay:i===2?{sell:'Conheça o produto',show:'Veja como funciona',brand:'Conheça a marca'}[guided.objective]:'',
  }]}));
}
