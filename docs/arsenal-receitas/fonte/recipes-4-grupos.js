
/* ---------- grupos por intenção (o que a pessoa quer fazer) ---------- */
const GROUPS={
 editar:["Editar vídeo que já tenho",["reels","cortes","podcast","tutorial","apresentador","depoimento","bastidores","vfx"]],
 ia:["Vídeo com IA",["ia","iamotion","iaugc","lojaia","influencer"]],
 apres:["Apresentador e avatar",["avatar","avatarmotion","presdiagrama","presorbita","presdegraus","presdados","prescamadas","presmitos","noticiareact","respondecoment"]],
 motion:["Motion design e explicativos",["motion","vinheta","explicativo","educa","noticia","apresentacao","institucional"]],
 anuncio:["Anúncios e vendas",["anuncio","ugc","depoanuncio","criativos","lancamento","saas","comparativo"]],
 ecom:["Loja online",["produto","catalogo","colecao","unboxing","datas","blackugc"]],
 posts:["Posts, carrossel e Stories",["carrossel","salvavel","storiesvenda","multiformato","thumb"]],
 engaja:["Engajamento e crescimento",["antesdepois","comousar","erros","pov","trend","crescer","pauta"]],
 gda:["Linha GDA (uso interno)",["gda"]]
};
for(const k in RG)delete RG[k];
Object.entries(GROUPS).forEach(([k,[nome,ids]])=>{RG[k]=nome;ids.forEach(id=>{const r=R.find(x=>x[0]===id);if(r)r[6]=k})});
