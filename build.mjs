import {mkdir,cp,rm} from 'node:fs/promises';
await rm(new URL('./dist/',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
for(const file of ['index.html','styles.css','ui-v11.css','app.js','engine.js','content.js','ui-state.js','spawn-deck.js','presentation.js','exchange.js','art.js','animation.js','ui-v13.css','ui-v14.css','ui-v15.css','progression.js','room-model.js','multiplayer.js','i18n.js','i18n-en.js','assets']) await cp(new URL(file,import.meta.url),new URL('dist/'+file,import.meta.url),{recursive:true});
console.log('Veille Noire : site prêt dans dist/');


