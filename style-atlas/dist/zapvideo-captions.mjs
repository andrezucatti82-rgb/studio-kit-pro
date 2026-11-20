const timestamp = /^(\d{2}):([0-5]\d):([0-5]\d)[,.](\d{3})$/;
function ms(value) {
  const m = timestamp.exec(value);
  if (!m) throw new Error('Tempo inválido no SRT.');
  return (Number(m[1])*3600+Number(m[2])*60+Number(m[3]))*1000+Number(m[4]);
}

export function readSrt(text, duration) {
  const blocks = text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n[ \t]*\n+/);
  if (!blocks.length || blocks.length>5000) throw new Error('Quantidade de legendas inválida.');
  let last = 0;
  return blocks.map(block => {
    const lines = block.split('\n');
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const timing = (lines.shift() || '').trim().split(/\s+-->\s+/);
    if (timing.length!==2 || !lines.length || !lines.join('').trim() || lines.join('\n').length>2000) {
      throw new Error('O SRT precisa ter tempos e texto em cada legenda.');
    }
    const start=ms(timing[0]), end=ms(timing[1]);
    if (start<last || end<=start || end>Math.ceil(duration*1000)+25 || lines.some(line=>line.includes('\0'))) {
      throw new Error('Confira a ordem e os tempos do SRT em relação ao vídeo.');
    }
    last=start;
    return {start,end,text:lines.join('\n').replace(/\{[^{}]*\}/g,'')};
  });
}

export function suggestCuts(cues) {
  const groups=[];
  let group=null;
  for (const cue of cues) {
    const line=cue.text.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
    if (!line || /^\[[^\]]+\]$/.test(line) || /^[♪♫]/.test(line)) continue;
    if (!group || (cue.start >= group.end && (cue.start-group.end>=850 || cue.end-group.start>28_000))) {
      group={start:cue.start,end:cue.end,lines:[]};
      groups.push(group);
    }
    group.end=Math.max(cue.end,group.end);
    group.lines.push(line);
  }
  return groups.filter(section=>section.end-section.start>=250)
    .sort((a,b)=>b.lines.join(' ').length-a.lines.join(' ').length)
    .slice(0,3).sort((a,b)=>a.start-b.start).map(({start,end,lines})=>({
      start:start/1000,end:end/1000,
      text:lines.join(' ').slice(0,170),
      reason:lines.length>1 ? `${lines.length} legendas consecutivas, agrupadas pelas pausas e pelos tempos do original.` :
        'Uma legenda com início e fim marcados no original.',
    }));
}
