'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8').replace(/\r\n/g,'\n');
const committed=read('audio-to-midi.html');
const template=read('src/index.template.html');

test('the committed downloadable HTML includes current screen styles and all runtime source modules',()=>{
 const css=template.match(/<style>[\s\S]*?<\/style>/)?.[0];
 assert.ok(css,'template must define an inline style section');
 assert.ok(committed.includes(css),'audio-to-midi.html has stale screen CSS');
 const uiComponents=read('src/ui-components.js');
 for(const name of [
  'audio-core','detection-settings','editing-core','timeline-core','playback-engine',
  'mobile-nav','recording-ui','recording-engine','review-ui','app-ui'
 ]){
  const relative='src/'+name+'.js';
  const text=read(relative).replace('__UI_COMPONENTS__',uiComponents);
  assert.ok(committed.includes(text),relative+' is not synchronized with audio-to-midi.html');
 }
});

test('downloadable HTML embeds the configured patch version without runtime network connections',()=>{
 const config=JSON.parse(read('app.config.json'));
 assert.ok(committed.includes('"version":"'+config.version+'"'),'committed HTML has an outdated app or manifest version');
 assert.ok(committed.includes("connect-src 'none'"));
 assert.ok(!committed.includes('__APP_CONFIG_JSON__'));
 assert.ok(!committed.includes('__APP_UI_JS__'));
});
