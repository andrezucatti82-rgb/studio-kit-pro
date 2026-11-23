import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {referenceImageInfo} from './reference-image-info.mjs';

const atlas = new URL('../style-atlas/', import.meta.url);
const records = new URL('records/broll-apresentacoes/', atlas);
const reels = JSON.parse(await readFile(new URL('reels.json', records), 'utf8'));
const [width, height] = reels.layout.frame;
const cut = reels.layout.media[3];
const [captionLeft, captionTop, captionRight, captionBottom] = reels.layout.captions;
const techniques = [
  {
    id: 'recorte', label: 'Recorte que revela',
    layout: 'Enquadre o apresentador nos dois terços inferiores. Revele o material de apoio com um recorte dentro do terço superior.',
    movement: 'Use o gesto como ponto de partida da máscara. Revele apenas a faixa de apoio e mantenha o rosto e a legenda livres durante a passagem.',
    cam: 'Plano médio à altura dos olhos. Trave o eixo do rosto. Ajuste manualmente a máscara em cabelo, mãos e objetos.'
  },
  {
    id: 'match-cut', label: 'Corte entre formas',
    layout: 'Mantenha o apresentador de frente na faixa inferior. Alinhe uma forma, um eixo ou um gesto entre a captura de tela e a ação mostrada na faixa superior.',
    movement: 'Faça match cut no momento em que posição, direção e escala aproximam os dois planos. Use continuidade de som para unir o antes e o depois.',
    cam: 'Plano médio olhando para a lente. No B-roll, use o mesmo eixo do detalhe nos dois lados do corte.'
  },
  {
    id: 'janela', label: 'Janela em movimento',
    layout: 'Mantenha o apresentador nos dois terços inferiores. Traga o vídeo e depois a captura com uma transição diagonal contida no terço superior.',
    movement: 'Anime a entrada dentro do terço superior no verbo da locução. Mantenha estáveis a divisão do quadro e a legenda.',
    cam: 'Plano médio estável. No B-roll, use progressão de plano de contexto para close natural com foco legível.'
  }
];

const referenceResearch = 'Use a skill $curadoria-de-conteudos ou o módulo references/curadoria/CURADORIA.md do kit para buscar na internet, por frase do roteiro, clipes relevantes em bancos gratuitos. Priorize CC0, domínio público verificado e arquivos do usuário quando for preciso comprovar um produto, espaço ou pessoa reais. Consulte Pexels, Pixabay, Mixkit e acervos oficiais como fontes possíveis. Para licenças fora da rota padrão, confira uso comercial, edição, atribuição e restrições de pessoas, marcas e propriedades, e solicite aprovação quando mudar os limites do projeto. Registre por plano a fala, o termo buscado, a URL do item, a licença, a data e o trecho útil. Use Instagram como pesquisa de linguagem visual. Incorpore somente mídia autorizada. Se faltar mídia adequada, peça uma decisão antes de trocar a abordagem.';
const safeZone = `Em 9:16, divida o quadro em duas faixas contíguas com largura total. No quadro de referência de ${width}×${height}, posicione o B-roll no terço superior de y=0 a ${cut} e o apresentador nos dois terços inferiores de y=${cut} a ${height}. Ambas as faixas preenchem x=0–${width}. Centralize o elemento principal do vídeo, a composição da captura e o rosto do apresentador no eixo vertical em x=${width/2}. Deixe margem para a interface de Reels ou Stories. A legenda é uma camada fixa sobre a linha de divisão, centralizada em x=${width/2} e y=${cut}, dentro da área x=${captionLeft}–${captionRight} e y=${captionTop}–${captionBottom}. Mantenha a legenda acima das duas mídias na ordem de composição, com até duas linhas e alto contraste. Preserve o rosto e a informação essencial e confira o resultado em celular. Para outros formatos, reenquadre conforme o briefing aprovado.`;
const supportRule = 'Alterne uma captura de tela e um trecho de vídeo no terço superior, uma mídia por vez. Mantenha o apresentador na faixa inferior durante os efeitos de transição. Use o print para o que precisa ser lido ou localizado, com recorte de até dois pontos de interesse e destaque para a área citada na fala. Use vídeo para demonstrar ação ou movimento. Substitua a interface ilustrativa por captura autorizada e fiel quando a pauta identificar uma plataforma, produto ou serviço real.';
const approvalGate = 'Apresente roteiro, moodboard e storyboard referenciados. Depois das duas aprovações explícitas de moodboard e storyboard, mostre a amostra de até 10 s. Produza o final após a aprovação da amostra e conforme as escolhas registradas.';
const source = 'Fotografia sintética original, composta como estudo visual. Sem pessoas, empresas ou produtos identificados. Movimento a validar na amostra.';

function createStyle(row, index) {
  const [slug, niche, name, sector, host, location, , , action, term1, term2, fidelity] = row;
  const id = 'broll-' + slug, technique = techniques[index % techniques.length];
  const sample = reels.styles[slug];
  if (!sample?.screenTitle || sample.exampleCaptions?.length !== 4) throw Error('Sequência 9:16 incompleta: ' + slug);
  const signature = technique.label + ' em ' + niche.toLowerCase() + '. ' + action;
  const direction = 'Apresentação com B-roll realista em ' + location + '. ' + technique.layout + ' ' + safeZone;
  const role = host === 'mulher' ? 'A apresentadora' : 'O apresentador';
  const phases = [
    ['Gancho com vídeo', role + ' olha para a lente na faixa inferior. A tomada de contexto preenche o terço superior.'],
    ['Captura de apoio', 'Troque a filmagem por um recorte de tela, como “' + sample.screenTitle + '”. Mostre o ponto citado e mantenha a legenda fixa.'],
    ['Detalhe em vídeo', action + ' ' + technique.movement],
    ['Resumo com captura', role + ' retoma a ideia na faixa inferior. Revele o último destaque no terço superior e sustente a leitura da legenda.']
  ];
  const frames = phases.map(([label, text], i) => {
    const path = 'assets/broll-reels/' + id + '-0' + (i + 1);
    return {src: path + '.webp', thumbnail: path + '-small.webp', width, height,
      label, action: text, alt: name + ' — ' + label + '. ' + text};
  });
  const audio = {
    voice: 'Português brasileiro, tom de conversa, com pausas no verbo e na conclusão. Voz do usuário se autorizada e se escolhida.',
    music: 'Base discreta licenciada se houver espaço entre as falas.',
    sfx: 'Som ambiental e do objeto pertinentes à ação, com transições guiadas pela fala.',
    mix: 'Fala clara acima de música e ambiente. Preserve a voz e o som original quando escolhidos. Confira sincronismo, cortes e escuta no celular.'
  };
  const resources = ['Filmagem de apresentador olhando para a câmera', 'B-roll de ' + niche,
    'Capturas de tela autorizadas', 'Legendas editáveis sincronizadas', 'Curadoria de Conteúdos', technique.label];
  const requirements = 'Ao aplicar a direção de B-roll ou seus planos de apoio, use-a somente nos trechos e aspectos selecionados. ' + referenceResearch + ' ' + fidelity;
  const textRule = 'Legendas sincronizadas em até duas linhas com texto editável. Fonte com licença e acentos. Priorize leitura no celular e a tipografia escolhida. ' + safeZone;
  const planningRule = requirements + ' ' + supportRule + ' ' + safeZone + ' Exemplos de busca para esta referência em português: ' + niche + ' — ' + action +
    ' Em inglês: “' + term1 + '” e “' + term2 + '”. Derive novas buscas do briefing real. Monte cada inserção em torno da frase, com entrada, ação e saída verificáveis, sem divisão uniforme de tempo.';
  const invariants = 'Preserve objetivo, formato, duração, identidade, voz, produto, marca e dados conforme o briefing. Referência, uso direto e adaptação dependem dos papéis já registrados. ' + fidelity;
  const proof = 'Na amostra, confira a ação do B-roll, o gesto e o contato visual, com apoio no ponto exato da fala. ' + technique.movement;
  return {
    id, name, family: 'apresentacoes', familyName: 'Apresentações e tipografia', edition: '4.9',
    kind: 'Apresentação com B-roll', signature, exampleTopic: niche + ' — ' + action,
    uses: 'Vídeos explicativos, apresentação profissional, Reels e Stories para ' + niche,
    resources, motion: technique.movement, complexity: technique.id === 'recorte' ? 'Alta' : 'Média',
    note: source, requirements, audio, proof,
    image: {atlas: frames[2].src, columns: 1, rows: 1, width, height, sourceKind: 'image_gen', source},
    sequence: {version: 1, heroIndex: 2, theme: niche, frames, audio: audio.voice + ' ' + audio.sfx,
      sourceKind: 'photorealistic_generated_reference', conceptOnly: true, motionValidated: false,
      conceptApproval: 'approved_by_user_2026-11-23'},
    executionPlan: {
      version: 1, appearance: signature, categoryDirection: 'Luz local plausível, ambiente comercial brasileiro e textura natural de câmera de celular.',
      visualLayout: direction, camera: technique.cam, movementLanguage: technique.movement, resources,
      referenceStates: frames.map((f, i) => ({frame: i + 1, state: f.action})),
      motionTargets: frames.slice(1).map((f, i) => ({fromFrame: i + 1, toFrame: i + 2,
        initialState: frames[i].action, actionAndResult: f.action})),
      shotPlanFields: ['initialState', 'action', 'result', 'camera', 'transition', 'narration', 'editableText', 'sound', 'durationFromVoice', 'sourceUrl', 'license', 'sourceTimecode'],
      planningRule, textRule, invariants,
      supportMedia: {
        recommendedFormat: '9:16', layout: reels.layout,
        sequence: ['video_context', 'screen_capture', 'video_detail', 'screen_capture'],
        exampleScreen: sample.screenTitle, exampleCaptions: sample.exampleCaptions,
        instruction: supportRule
      },
      validation: approvalGate + ' Verifique enquadramento, licença, leitura, recorte, fala contínua e fidelidade durante o playback.'
    },
    preset: {
      version: 2, skill: 'video-multimarcas', avatar: false, approvalGate, audio, productFidelity: invariants,
      firstDelivery: ['roteiro', 'moodboard visual para aprovação', 'storyboard visual para aprovação', 'amostra após aprovação da pré-produção'],
      requiredAssets: requirements, research: planningRule, quality: proof
    },
    readiness: {status: 'visual_reference', evidence: source},
    broll: {niche, sector, treatment: technique.id, treatmentName: technique.label, examplePresenter: host,
      recommendedFormat: '9:16', supportArea: 'um terço', safeZone, stockSearch: [term1, term2]}
  };
}

const rows = (await readFile(new URL('briefs.tsv', records), 'utf8')).trim().split(/\r?\n/).map(line => line.split('\t'));
if (rows.length !== 30 || rows.some(row => row.length !== 12 || row.some(value => !value.trim())) ||
    new Set(rows.map(row => row[0])).size !== 30) {
  throw Error('Esperados 30 estilos distintos com ficha completa');
}
const styles = rows.map(createStyle);
const catalogFile = new URL('dist/catalog.json', atlas);
const colorsFile = new URL('records/search/colors.json', atlas);
const [catalog, colors, measured] = await Promise.all([catalogFile, colorsFile, new URL('cores-reels.json', records)]
  .map(async file => JSON.parse(await readFile(file, 'utf8'))));
const collectionIds = new Set(styles.map(style => style.id));
const previous = catalog.styles.filter(style => !collectionIds.has(style.id));
if (catalog.styles.some(style => collectionIds.has(style.id) && !style.broll)) {
  throw Error('Um ID da coleção pertence a outro estilo');
}
const provenance = await Promise.all(styles.map(async style => {
  const frames = await Promise.all(style.sequence.frames.map(async frame => {
    const data = await readFile(new URL('dist/' + frame.src, atlas));
    const thumbnail = await readFile(new URL('dist/' + frame.thumbnail, atlas));
    const info = referenceImageInfo(data);
    const small = referenceImageInfo(thumbnail);
    if (info.width !== width || info.height !== height || small.width !== 270 || small.height !== 480) {
      throw Error('Dimensões incorretas nos quadros de ' + style.id);
    }
    return {src: frame.src, sha256: createHash('sha256').update(data).digest('hex')};
  }));
  const color = measured[style.id];
  if (color?.sourceSha256 !== frames[style.sequence.heroIndex].sha256) {
    throw Error('Cores medidas em uma versão diferente de ' + style.id);
  }
  colors.styles[style.id] = color;
  return {id: style.id, source, motionValidated: false, frames};
}));
catalog.styles = previous.concat(styles);
catalog.version = '4.9';
catalog.scope = catalog.scope.replace('1.425', new Intl.NumberFormat('pt-BR').format(catalog.styles.length));
const family = catalog.families.find(entry => entry.id === 'apresentacoes');
family.count = catalog.styles.filter(style => style.family === family.id).length;

await Promise.all([
  [catalogFile, catalog],
  [colorsFile, colors],
  [new URL('assets.json', records), provenance]
].map(([file, value]) => writeFile(file, JSON.stringify(value, null, 2) + '\n')));
console.log('30 estilos de B-roll incorporados ao catálogo. Atualize o índice com npm run search:index.');
