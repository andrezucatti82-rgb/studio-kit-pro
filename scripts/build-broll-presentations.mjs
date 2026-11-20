import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {referenceImageInfo} from './reference-image-info.mjs';

const atlas = new URL('../style-atlas/', import.meta.url);
const records = new URL('records/broll-apresentacoes/', atlas);
const techniques = [
  {
    id: 'recorte', label: 'Recorte que revela',
    layout: 'Sobreponha o apresentador recortado de uma tomada autorizada. Abra espaço visual ao lado do rosto e revele o B-roll por trás da silhueta.',
    movement: 'Use a saída lateral do gesto como ponto de partida da máscara. Revele a evidência em uma abertura curta e feche no fim da frase sem cortar a fala.',
    cam: 'Plano médio à altura dos olhos. Trave o eixo do rosto. Ajuste manualmente a máscara em cabelo, mãos e objetos.'
  },
  {
    id: 'match-cut', label: 'Corte entre formas',
    layout: 'Mantenha o apresentador de frente e encaixe o B-roll em uma janela integrada. Alinhe uma forma, um eixo ou um gesto entre os dois clipes.',
    movement: 'Faça match cut no momento em que posição, direção e escala aproximam os dois planos. Use continuidade de som para unir o antes e o depois.',
    cam: 'Plano médio olhando para a lente. No B-roll, use o mesmo eixo do detalhe nos dois lados do corte.'
  },
  {
    id: 'janela', label: 'Janela em movimento',
    layout: 'Mantenha o apresentador visível na zona central. Traga uma janela de B-roll a partir da esquerda com recorte levemente diagonal.',
    movement: 'Anime a entrada por máscara no verbo da locução; a imagem de apoio percorre um trecho curto e desacelera no detalhe. Feche a janela na conclusão.',
    cam: 'Plano médio estável. No B-roll, use progressão de plano de contexto para close natural com foco legível.'
  }
];

const referenceResearch = 'Use a skill $curadoria-de-conteudos ou o módulo references/curadoria/CURADORIA.md do kit para buscar na internet, por frase do roteiro, clipes relevantes em bancos gratuitos. Priorize CC0, domínio público verificado e arquivos do usuário quando for preciso comprovar um produto, espaço ou pessoa reais. Consulte Pexels, Pixabay, Mixkit e acervos oficiais como fontes possíveis. Para licenças fora da rota padrão, confira uso comercial, edição, atribuição e restrições de pessoas, marcas e propriedades, e solicite aprovação quando mudar os limites do projeto. Registre por plano a fala, o termo buscado, a URL do item, a licença, a data e o trecho útil. Use Instagram como pesquisa de linguagem visual. Incorpore somente mídia autorizada. Se faltar mídia adequada, peça uma decisão antes de trocar a abordagem.';
const safeZone = 'Em 9:16, posicione rosto, legendas e os detalhes essenciais dentro de x=8–78% e y=13–66% do quadro como margem inicial. Preserve as margens superior e inferior, evite a coluna de interação à direita e confira a interface atual do canal em celular. Deixe a mídia de apoio ocupar cerca de um terço ou metade da tela. Para outros formatos, reenquadre conforme o briefing aprovado.';
const approvalGate = 'Apresente roteiro, moodboard e storyboard referenciados. Depois das duas aprovações explícitas de moodboard e storyboard, mostre a amostra de até 10 s. Produza o final após a aprovação da amostra e conforme as escolhas registradas.';
const source = 'Fotografia sintética original, composta como estudo visual. Sem pessoas, empresas ou produtos identificados. Movimento a validar na amostra.';

function createStyle(row, index) {
  const [slug, niche, name, sector, host, location, , , action, term1, term2, fidelity] = row;
  const id = 'broll-' + slug, technique = techniques[index % techniques.length];
  const window = index % 2 === 0 ? 'metade' : 'um terço';
  const signature = technique.label + ' em ' + niche.toLowerCase() + '. ' + action;
  const direction = 'Apresentação com B-roll realista em ' + location + '. ' + technique.layout + ' Na composição vertical, use ' + window + ' da tela para a prova visual.';
  const role = host === 'mulher' ? 'A apresentadora' : 'O apresentador';
  const phases = [
    ['Gancho', role + ' olha para a lente e apresenta a dúvida que o plano vai responder.'],
    ['Contexto', 'Mostre o ambiente e o primeiro recorte ligado à frase. ' + action],
    ['Detalhe em ação', action + ' ' + technique.movement],
    ['Síntese', role + ' retoma a ideia de frente. Sustente o detalhe e dê tempo para entender a conclusão.']
  ];
  const frames = phases.map(([label, text], i) => {
    const path = 'assets/broll-apresentacoes/' + id + '-0' + (i + 1);
    return {src: path + '.webp', thumbnail: path + '-small.webp', width: 540, height: 720,
      label, action: text, alt: name + ' — ' + label + '. ' + text};
  });
  const audio = {
    voice: 'Português brasileiro, tom de conversa, com pausas no verbo e na conclusão. Voz do usuário se autorizada e se escolhida.',
    music: 'Base discreta licenciada se houver espaço entre as falas.',
    sfx: 'Som ambiental e do objeto pertinentes à ação, com transições guiadas pela fala.',
    mix: 'Fala clara acima de música e ambiente. Preserve a voz e o som original quando escolhidos. Confira sincronismo, cortes e escuta no celular.'
  };
  const resources = ['Filmagem de apresentador olhando para a câmera', 'B-roll de ' + niche,
    'Legendas editáveis sincronizadas', 'Curadoria de Conteúdos', technique.label];
  const requirements = 'Ao aplicar a direção de B-roll ou seus planos de apoio, use-a somente nos trechos e aspectos selecionados. ' + referenceResearch + ' ' + fidelity;
  const textRule = 'Legendas sincronizadas em até duas linhas com texto editável. Fonte com licença e acentos. Priorize leitura no celular e a tipografia escolhida. ' + safeZone;
  const planningRule = requirements + ' Exemplos de busca para esta referência em português: ' + niche + ' — ' + action +
    ' Em inglês: “' + term1 + '” e “' + term2 + '”. Derive novas buscas do briefing real. Monte cada inserção em torno da frase, com entrada, ação e saída verificáveis, sem divisão uniforme de tempo.';
  const invariants = 'Preserve objetivo, formato, duração, identidade, voz, produto, marca e dados conforme o briefing. Referência, uso direto e adaptação dependem dos papéis já registrados. ' + fidelity;
  const proof = 'Na amostra, confira a ação do B-roll, o gesto e o contato visual, com apoio no ponto exato da fala. ' + technique.movement;
  return {
    id, name, family: 'apresentacoes', familyName: 'Apresentações e tipografia', edition: '4.9',
    kind: 'Apresentação com B-roll', signature, exampleTopic: niche + ' — ' + action,
    uses: 'Vídeos explicativos, apresentação profissional, Reels e Stories para ' + niche,
    resources, motion: technique.movement, complexity: technique.id === 'recorte' ? 'Alta' : 'Média',
    note: source, requirements, audio, proof,
    image: {atlas: frames[2].src, columns: 1, rows: 1, width: 540, height: 720, sourceKind: 'image_gen', source},
    sequence: {version: 1, heroIndex: 2, theme: niche, frames, audio: audio.voice + ' ' + audio.sfx,
      sourceKind: 'photorealistic_generated_reference', conceptOnly: true, motionValidated: false,
      conceptApproval: 'pending_user_review'},
    executionPlan: {
      version: 1, appearance: signature, categoryDirection: 'Luz local plausível, ambiente comercial brasileiro e textura natural de câmera de celular.',
      visualLayout: direction, camera: technique.cam, movementLanguage: technique.movement, resources,
      referenceStates: frames.map((f, i) => ({frame: i + 1, state: f.action})),
      motionTargets: frames.slice(1).map((f, i) => ({fromFrame: i + 1, toFrame: i + 2,
        initialState: frames[i].action, actionAndResult: f.action})),
      shotPlanFields: ['initialState', 'action', 'result', 'camera', 'transition', 'narration', 'editableText', 'sound', 'durationFromVoice', 'sourceUrl', 'license', 'sourceTimecode'],
      planningRule, textRule, invariants,
      validation: approvalGate + ' Verifique enquadramento, licença, leitura, recorte, fala contínua e fidelidade durante o playback.'
    },
    preset: {
      version: 2, skill: 'video-multimarcas', avatar: false, approvalGate, audio, productFidelity: invariants,
      firstDelivery: ['roteiro', 'moodboard visual para aprovação', 'storyboard visual para aprovação', 'amostra após aprovação da pré-produção'],
      requiredAssets: requirements, research: planningRule, quality: proof
    },
    readiness: {status: 'visual_reference', evidence: source},
    broll: {niche, sector, treatment: technique.id, treatmentName: technique.label, examplePresenter: host,
      recommendedFormat: '9:16', supportArea: window, safeZone, stockSearch: [term1, term2]}
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
const [catalog, colors, measured] = await Promise.all([catalogFile, colorsFile, new URL('cores.json', records)]
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
    if (info.width !== 540 || info.height !== 720 || small.width !== 240 || small.height !== 320) {
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
