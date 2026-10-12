import {langButton} from './i18n.js';
import {shouldShowDiscovery} from './ui-state.js';
import {TALENTS,POWERS,hasTalent,talentPool,talentSlots,maxEther,balanced,availableTalents,talentDescription,weaponLock,weaponRequiredXP,WEAPON_XP,powerLock,powerInfo,heroSkill,BASE_SKILLS,CHOICE_XP,TREES,talentBranch} from './progression.js';
import {Party,savedParty} from './multiplayer.js';
import {validCode} from './room-model.js';
import {LEVELS,BALANCED_LEVELS,survivorLevel} from './presentation.js';
import {exchangeReason} from './exchange.js';
import {itemArt,terrainArt} from './art.js';
import {animateDice,animatePhase,animateSurvivors,showWounds,diceFace} from './animation.js';
import {HEROES,WEAPONS,ITEMS,ENEMIES,MISSIONS} from './content.js';
import {createGame,act,active,maxAP,tier,levelName,neighbors,moveCost,attackable,canExtract,objectivesReady,edgeKey,distance,visible,validateSave,weaponRange,weaponNoise,weaponDamage,powerTargets,searchesLeft,tactical,previewEnemyPhase,zoneNoise,weaponDice,weaponThreshold,equipCost} from './engine.js';
import {SPAWN_CARDS} from './spawn-deck.js';
import {actionInfo,closedDoors,targetReason,phaseSummary,savedPhaseSummary,attackOdds,autoEndPlan} from './ui-state.js';
const $=s=>document.querySelector(s),app=$('#app');
let game=null,screen='home',chosenMission=0,chosenHeroes=HEROES.slice(0,4).map(h=>h.id),difficulty='normal',mode='move',selectedZone=null,tab='mission',muted=true,busy=false,modalOpener=null,boardZoom=false,roundReport=null;
let showForecast=false,forecast=null,resultShownFor=null;
let party=null,partyRoom=null,netPending=false,netApplying=false,netQueue=null;
const SAVE='veille-noire.save.v1',PROGRESS='veille-noire.campaign.v1';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
muted=!read('veille-noire.sound',false);
let autoEnd=read('veille-noire.autoend',true),autoTimer=null,autoLeft=0,autoKey='',autoHold='';
let animations=read('veille-noire.animations',true),phaseController=null,cardCategory='weapons',exchangeSelection={target:'',give:'',receive:''};
const motionAllowed=()=>animations&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let progress=read(PROGRESS,{});if(!progress||typeof progress!=='object'||Array.isArray(progress))progress={};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={arrow:'M5 12h14m-5-5 5 5-5 5',move:'M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',crosshair:'M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',search:'m21 21-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',door:'M4 21h16M6 21V3h12v18M14 12h1',hand:'M6 13V8a2 2 0 0 1 4 0v4-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v9c0 6-10 6-12 1l-3-5a2 2 0 0 1 3-2',noise:'M4 10h4l5-5v14l-5-5H4Zm12-3c3 3 3 7 0 10m3-13c5 5 5 11 0 16',mute:'M4 10h4l5-5v14l-5-5H4Zm12-1 6 6m0-6-6 6',book:'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1m0-15c3-2 7-2 10-1v15c-3-1-7-1-10 1Zm0 0v15',close:'m6 6 12 12M6 18 18 6',heart:'M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 9 8 15 8-6 12-11 8-15Z',shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z',medical:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',ammo:'M5 21V7l3-4 3 4v14Zm9 0V7l3-4 3 4v14Z',fire:'M12 2c1 6 8 7 8 13a8 8 0 0 1-16 0c0-4 3-7 5-9 0 4 2 5 3 5 2-2 1-6 0-9Z',tool:'m14 6 4-4c4 7-1 10-5 9L5 21l-3-3 9-8c-2-5 1-8 5-8Z',axe:'m5 21 9-15m-4-3 9 5 3-5-8-2Z',flag:'M5 22V3m0 0c5-5 9 5 14 0v10c-5 5-9-5-14 0',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',skull:'M5 15v-1C-2 0 26 0 19 14v1l-3 2v5H8v-5Zm3-5h1m6 0h1m-4 5v3',exit:'M10 3H3v18h7m4-14 5 5-5 5m-6-5h11',settings:'M3 7h18M3 17h18M8 3v8m8 2v8',check:'m4 12 5 5L20 6',pause:'M8 4v16M16 4v16',play:'m7 3 14 9-14 9Z',save:'M4 3h13l4 4v14H3V3Zm3 0v7h10V3M7 21v-7h10v7',bag:'M4 7h16v14H4Zm4 0V5a4 4 0 0 1 8 0v2',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'};
const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.target}"/></svg>`;
const portrait=(h,cls='')=>`<span class="portrait p${h.portrait} ${cls}" role="img" aria-label="${h.name}"></span>`;
const enemyPortrait=(id,cls='')=>`<span class="portrait enemy p${ENEMIES[id].portrait} ${cls}" role="img" aria-label="${ENEMIES[id].name}"></span>`;
const btn=(label,action,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function logo(){return `<button class="brand" data-action="home" aria-label="Veille Noire, accueil"><span class="brandmark">V<span>•</span></span><span>VEILLE NOIRE<small>LES DERNIERS DE NACRE</small></span></button>`;}
function renderHome(){
 const save=read(SAVE,null),resume=validateSave(save)&&save.status==='playing';
 app.innerHTML=`<main class="home"><div class="home-art"></div>
 <header class="topbar">${logo()}<div class="header-actions"><span class="edition">SURVIE TACTIQUE · V1.8</span>${btn(icon('bag')+' Cartes','cards','quiet')}${btn(icon('book')+' Codex','codex','quiet')}${btn(icon('help')+' Règles','rules','quiet')}${langButton('quiet lang-desktop')}</div></header>
 <div class="home-layout"><section class="intro"><div class="eyebrow"><span class="line"></span>NACRE, 2091 · NEUVIÈME NUIT</div><h1>LA VILLE SOMBRE.<br><em>VOUS VEILLEZ.</em></h1><p class="intro-copy">Quatre voix contre le Chœur.<br>Composez votre escouade et ramenez les vôtres.</p><div class="home-features"><span>${icon('shield',17)} Solo · Coop locale · En ligne</span><span>${icon('clock',17)} ${MISSIONS.length} expéditions</span>${langButton('quiet lang-mobile')}</div><div class="intro-bottom"><span class="tiny-label">VOS ARCHIVES</span><strong>${Object.keys(progress).length}<span> / ${String(MISSIONS.length).padStart(2,'0')}</span></strong><span class="subtle">expéditions accomplies</span></div></section>
 <section class="mission-select">${resume?`<button class="resume-card" data-action="resume"><span class="resume-icon">${icon('play',24)}</span><span><small>VOTRE EXPÉDITION EN COURS</small><strong>${MISSIONS[save.mission].title}</strong><em>Manche ${save.round} · ${save.heroes.length} survivants</em></span>${icon('arrow')}</button>`:''}
 <div class="section-head"><div><span class="eyebrow">01 / CHOISIR VOTRE DESTINATION</span><h2>Les expéditions</h2></div><span class="catalog-number">NACRE</span></div>
 <div class="mission-list">${MISSIONS.map(m=>`<button class="mission-card ${m.id===chosenMission?'selected':''}" data-action="mission" data-id="${m.id}" aria-pressed="${m.id===chosenMission}"><span class="chapter">${progress[m.id]?icon('check'):m.chapter}</span><span class="mission-info"><strong>${m.title}</strong><small>${m.subtitle}</small></span><span class="mission-meta">${m.difficulty}<small>${m.time}</small></span>${icon('arrow',16)}</button>`).join('')}</div>
 <div class="home-party"><div class="mini-squad">${chosenHeroes.map(id=>portrait(HEROES.find(h=>h.id===id))).join('')}</div><span><strong>${chosenHeroes.length} survivants</strong><small>${HEROES.length} personnages disponibles</small></span></div>
 ${btn('Jouer en solo / sur un écran '+icon('arrow'),'setup','primary launch')}<div class="online-entry">${btn(icon('shield')+' Jouer ensemble · chacun son téléphone','online','secondary full')}${savedParty()?btn('Reprendre mon salon '+savedParty().code,'netResume','quiet full'):''}</div><p class="save-note">Solo, coop locale ou salons en ligne · sans compte</p></section></div>
 <footer class="home-footer"><span>UN UNIVERS ORIGINAL · VEILLE NOIRE</span><span>Gardez le silence. Restez ensemble.</span><span>V1.8</span></footer></main>`;
}
function renderSetup(){
 const m=MISSIONS[chosenMission];
 app.innerHTML=`<main class="setup-page"><header class="topbar">${logo()}${btn(icon('close')+' Retour aux missions','home','quiet')}</header><div class="setup-content"><div class="setup-heading"><div><span class="eyebrow">02 / COMPOSER VOTRE ESCOUADE</span><h1>Choisissez vos veilleurs.</h1><p>2 à 4 survivants. Chaque talent change votre manière de traverser Nacre.</p></div><div class="setup-mission"><span>EXPÉDITION ${m.chapter}</span><strong>${m.title}</strong><small>${m.time} · ${m.difficulty}</small></div></div>
 <div class="setup-options"><fieldset class="difficulty-options"><legend>Intensité de la nuit</legend>${[['story','Exploration','Des vagues allégées'],['normal','Survie','Le défi original'],['nightmare','Cauchemar','Des renforts plus nombreux']].map(([id,label,help])=>btn(`<strong>${label}</strong><small>${help}</small>`,'difficulty',difficulty===id?'selected':'',`data-id="${id}" aria-pressed="${difficulty===id}"`)).join('')}</fieldset><button class="quiet clear-party" data-action="clearParty">${icon('close',16)} Vider l’escouade</button></div>
 <div class="roster-grid">${HEROES.map(h=>`<button class="roster-card ${chosenHeroes.includes(h.id)?'chosen':''}" data-action="toggleHero" data-id="${h.id}" aria-pressed="${chosenHeroes.includes(h.id)}" aria-label="${chosenHeroes.includes(h.id)?'Retirer':'Recruter'} ${h.name}" style="--hero:${h.color}">${portrait(h)}<span class="roster-body"><span class="roster-role">${h.role}${h.portrait>=12?'<em>NOUVEAU</em>':''}</span><strong>${h.name}</strong><span class="roster-skill">${BASE_SKILLS[h.id]||h.skill}</span><span class="roster-stats">${icon('heart',15)} ${h.hp} PV <i></i>${icon(WEAPONS[h.weapon].icon,15)} ${WEAPONS[h.weapon].name}</span></span><span class="roster-pick">${chosenHeroes.includes(h.id)?icon('check',17):'<b>+</b>'}<span>${chosenHeroes.includes(h.id)?'Dans l’escouade':'Recruter'}</span></span></button>`).join('')}</div>
 <div class="setup-footer"><div><strong>${chosenHeroes.length} <span>/ 4 sélectionnés</span></strong><div class="selected-names">${chosenHeroes.length?chosenHeroes.map(id=>HEROES.find(h=>h.id===id).name.split(' ')[0]).join(' · '):'Choisissez vos premiers survivants'}</div></div>${btn('Voir le briefing '+icon('arrow'),'brief','primary',chosenHeroes.length<2?'disabled':'')}</div></div></main>`;
}

function modal(title,html,wide=false){modalOpener=document.activeElement;app.inert=true;document.body.classList.add('modal-open');$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><span class="eyebrow">VEILLE NOIRE / ARCHIVES</span><h2 id="modal-title">${title}</h2></div>${btn(icon('close'),'close','icon-button','aria-label="Fermer"')}</header>${html}</section></div>`;$('#modal-root button')?.focus();}
function closeModal(){$('#modal-root').innerHTML='';app.inert=false;document.body.classList.remove('modal-open');if(modalOpener?.isConnected)modalOpener.focus();}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);}
function brief(){if(chosenHeroes.length<2||chosenHeroes.length>4)return toast('Choisissez de deux à quatre survivants.');const m=MISSIONS[chosenMission];modal('Expédition '+m.chapter+' · '+m.title,`<div class="brief-art"><span>${m.subtitle}</span></div><p class="brief-text">${m.intro}</p><div class="brief-objectives">${m.objectives.map(o=>`<p>${icon('flag',16)} ${o.label}</p>`).join('')}<p>${icon('exit',16)} Réunir toute l’escouade à la sortie avant la manche ${m.rounds+1}</p></div><div class="brief-team">${HEROES.filter(h=>chosenHeroes.includes(h.id)).map(h=>`<div>${portrait(h)}<strong>${h.name}</strong><small>${h.role}</small></div>`).join('')}</div><details class="quick-rules-fold"><summary>Première partie ? Lire les règles en 2 minutes</summary>${quickRules()}</details>${btn('ENTRER DANS NACRE '+icon('play'),'start','primary full')}`,true);}
function start(){if(chosenHeroes.length<2||chosenHeroes.length>4)return toast('Choisissez de deux à quatre survivants.');roundReport=null;boardZoom=false;game=createGame(chosenMission,chosenHeroes,difficulty);selectedZone=active(game).zone;mode='move';screen='game';closeModal();saveGame();render();window.scrollTo(0,0);showTutorial();}
function saveGame(){if(party)return;try{localStorage.setItem(SAVE,JSON.stringify(game));}catch{toast('La sauvegarde locale est indisponible dans ce navigateur.');}}
function render(){if(screen==='home')renderHome();else if(screen==='setup')renderSetup();else if(screen==='party')renderParty();else renderGame();syncAutoEnd();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;handle(b.dataset.action,b.dataset);});
function handle(a,d){
 if(a==='autoEndHold'){autoHold=autoKey;stopAutoEnd();return toast(party?'Fin de tour automatique annulée pour cette manche.':'Fin de manche automatique annulée. Cliquez sur « Fin de manche » quand vous êtes prêt.');}
 if(a==='toggleAutoEnd'){autoEnd=!autoEnd;try{localStorage.setItem('veille-noire.autoend',JSON.stringify(autoEnd));}catch{}closeModal();render();return toast(autoEnd?'Fin de tour automatique activée.':'Fin de tour automatique désactivée.');}
 if(busy)return;
 if(a==='online'||a.startsWith('net'))return handleOnline(a,d);
 if(party&&a==='home')return leaveParty();
 if(a==='cards')return cardsModal(d.id||cardCategory);
 if(a==='cardCategory')return cardsModal(d.id);
 if(a==='catalogItem')return catalogItem(d.id);
 if(a==='toggleAnimations'){animations=!animations;try{localStorage.setItem('veille-noire.animations',JSON.stringify(animations));}catch{}closeModal();render();return toast(animations?'Animations activées.':'Animations désactivées.');}
 if(a==='close')return closeModal();
 if(a==='home'){screen='home';closeModal();render();window.scrollTo(0,0);return;}
 if(a==='mission'){chosenMission=+d.id;return render();}
 if(a==='setup'){screen='setup';closeModal();render();window.scrollTo(0,0);return;}
 if(a==='difficulty'){difficulty=d.id;return render();}
 if(a==='clearParty'){chosenHeroes=[];return render();}
 if(a==='toggleHero'){
  if(chosenHeroes.includes(d.id))chosenHeroes=chosenHeroes.filter(x=>x!==d.id);
  else{if(chosenHeroes.length>=4)return toast('Votre escouade est complète. Retirez un survivant pour en recruter un autre.');chosenHeroes.push(d.id);}
  return render();
 }
 if(a==='brief')return brief();
 if(a==='start')return start();
 if(a==='resume'){const s=read(SAVE,null);if(!validateSave(s))return toast('Cette sauvegarde est illisible.');game=s;screen='game';mode='move';roundReport=savedPhaseSummary(s);selectedZone=active(game).zone;render();window.scrollTo(0,0);return;}
 if(a==='rules')return rules();
 if(a==='codex')return codex();
 return handleGame(a,d);
}
function renderGame(){
 const ended=game.status!=='playing';
 if(ended)mode='inspect';
 forecast=showForecast&&!ended?previewEnemyPhase(game):null;
 const m=MISSIONS[game.mission],h=active(game),d=HEROES.find(x=>x.id===h.id),w=WEAPONS[h.weapon],remaining=game.heroes.reduce((n,h)=>n+h.ap,0),done=game.objectives.filter(o=>o.done).length;
 const scroll=$('.intel-content')?.scrollTop||0;
 app.innerHTML=`<main class="game"><header class="game-header">${logo()}<div class="current-mission"><span>EXPÉDITION ${m.chapter}</span><strong>${m.title}</strong></div><div class="round-counter">${icon('clock',18)}<span>Manche <b>${game.round}</b><small> / ${m.rounds}</small></span></div><div class="game-tools">${btn(icon(muted?'mute':'noise'),'sound','icon-button',`aria-label="${muted?'Activer':'Couper'} le son" title="Son"`)}${btn(icon('help'),'rules','icon-button','aria-label="Règles" title="Règles"')}${btn(icon('pause'),'pause','icon-button','aria-label="Pause" title="Pause"')}</div></header>
 ${party?partyBanner():''}<div class="game-layout"><aside class="squad-panel"><div class="panel-heading"><span class="eyebrow">LES VEILLEURS</span><span>${game.heroes.filter(h=>h.hp>0).length}/${game.heroes.length}</span></div><div class="hero-list">${game.heroes.map(heroCard).join('')}</div><div class="threat-panel"><span class="eyebrow">LE CHŒUR</span><div class="threat-bars">${[0,1,2,3].map(i=>`<i class="${i<=tier(game)?'lit':''} t${i}"></i>`).join('')}</div><strong>${levelName(game)}</strong><p>${game.enemies.length} créatures sur le plateau</p><small>Le plus haut niveau de l’escouade détermine l’intensité des vagues.</small></div>${btn(icon('help',16)+' Premiers pas','tutorial','squad-help')}</aside>
 <section class="play-surface"><div class="board-top"><div><span class="eyebrow">${m.subtitle}</span><h2>${m.title}</h2></div><button class="objective-progress" data-action="openPanel" data-id="mission" aria-label="Afficher les objectifs">${icon('flag',16)}<span>${done}/${game.objectives.length}</span><small>Objectifs</small></button></div>
 <div class="board-tools"><span class="turn-badge">${ended?(game.status==='won'?'Expédition accomplie':'Expédition terminée'):'<i class="live-dot"></i>À vous de jouer'}</span><div>${btn(icon('move',15)+' Prévoir','forecast','quiet tiny '+(showForecast?'active':''),`aria-pressed="${showForecast}" title="Prévoir les mouvements et attaques des ennemis présents" ${ended?'disabled':''}`)}${btn(icon('search',15)+(boardZoom?' Réduire':' Agrandir'),'zoom','quiet tiny',`aria-pressed="${boardZoom}"`)}${btn(icon('target',15)+' Inspecter','inspect','quiet tiny '+(mode==='inspect'?'active':''),`aria-pressed="${mode==='inspect'}"`)}</div></div>
 <div class="board-scroll ${boardZoom?'zoomed':''}" aria-label="Carte tactique défilable"><div class="board-frame"><div class="board-coordinates">${'ABCDEFGH'.split('').map(c=>`<span>${c}</span>`).join('')}</div><div class="board" role="group" aria-label="Plateau tactique, 8 colonnes et 6 lignes">${game.map.zones.map(zoneHTML).join('')}${forecast?forecastOverlay():''}</div><div class="map-key"><span><i class="key hero-key"></i>Escouade</span><span><i class="key objective-key"></i>Objectif</span><span><i class="key spawn-key"></i>Faille</span><span><i class="door-key"></i>Porte</span><span>${icon('exit',12)}Sortie</span></div></div></div>
 ${forecast?forecastPanel():''}
 ${roundReport?`<button class="round-recap" data-action="phaseDetails"><span>${icon('noise',16)} <b>Le Chœur a agi</b></span><span>${roundReport.moved} déplacés · ${roundReport.spawned} apparus${roundReport.wounded.length?' · '+roundReport.wounded.reduce((n,h)=>n+h.lost,0)+' PV perdus':''}</span>${icon('arrow',15)}</button>`:''}
 ${!ended&&objectivesReady(game)?extractionBanner():''}<div class="context-line" role="status">${icon(mode==='move'?'move':mode==='attack'?'crosshair':mode==='door'?'door':'target',18)}<span>${modeHint()}</span></div>
 ${party&&canExtract(game)?btn(icon('exit')+' Évacuer l’escouade','extract','primary full',partyBlocked()?'disabled':''):''}${fieldEquipment(h,d,w)}
 ${game.lastRoll?`<div class="dice-result"><span>${game.lastRoll.weapon}</span><div>${game.lastRoll.rolls.map((n,i)=>`<b class="die ${n>=game.lastRoll.threshold?'hit':''} ${game.lastRoll.reroll?.index===i?'rerolled':''}" title="${game.lastRoll.reroll?.index===i?'Relance de Jonas : '+game.lastRoll.reroll.from+' vers '+n:n}">${n}</b>`).join('')}</div><strong>${game.lastRoll.blocked?'Armure résistante':game.lastRoll.hits+' succès · '+game.lastRoll.kills+' éliminé'+(game.lastRoll.kills>1?'s':'')}</strong></div>`:''}
 ${ended?`<div class="command-dock ended-dock"><span>${game.status==='won'?'Nacre se souviendra.':'La nuit vous a rattrapés.'}</span>${btn('Voir le bilan','result','primary')}${btn('Expéditions','home','secondary')}</div>`:`<div class="command-dock">${dockSummary(h,d,w)}<div class="action-bar">${actionButton('move','move','Déplacer','M')}${actionButton('attack',w.icon,'Attaquer','A')}${actionButton('search','search','Fouiller','F')}${actionButton('door','door','Ouvrir','P')}${actionButton('interact','hand','Objectif','O')}</div><div class="command-bottom"><div class="mobile-utility">${btn(icon('bag',17)+' Sac','openPanel','quiet',`data-id="equipment"`)}${btn(icon('flag',17)+' Mission','openPanel','quiet',`data-id="mission"`)}${btn(icon('book',17)+' Journal','openPanel','quiet',`data-id="journal"`)}</div><div class="turn-actions">${!party&&h.ap===0&&game.heroes.some(x=>x.hp>0&&x.ap>0)?btn('Survivant suivant '+icon('arrow',16),'nextHero','next-hero'):''}${party?btn(me()?.ready?'Reprendre mon tour':'Terminer mon tour','endRound','end-button '+(me()?.ready?'ready':''),netPending||!party.connected?'disabled':''):canExtract(game)?btn(icon('exit',17)+' Évacuer','extract','primary exit-button'):btn(`${icon('noise',17)}<span>Fin de manche</span><small>${remaining} PA</small>`,'endRound','end-button '+(!remaining?'ready':''))}</div></div></div>`}</section>
 <aside class="intel-panel"><nav class="intel-tabs" aria-label="Informations">${['mission','equipment','journal'].map(t=>btn({mission:'Mission',equipment:'Sac',journal:'Journal'}[t],'tab',tab===t?'active':'',`data-id="${t}" aria-pressed="${tab===t}"`)).join('')}</nav><div class="intel-content">${tab==='mission'?missionPanel():tab==='equipment'?equipmentPanel():journalPanel()}</div></aside></div><footer class="game-footer"><span>${icon('save',13)} ${party?'Partie synchronisée · salon '+partyRoom.code:'Partie enregistrée sur cet appareil'}</span><span>${game.difficulty==='story'?'Exploration':game.difficulty==='nightmare'?'Cauchemar':'Survie'} · ${game.heroes.length} survivants · ${tactical(game)?'Règles tactiques':'Règles d’origine'}</span><span>M Déplacer · A Attaquer · 1–4 Survivants · Échap Annuler</span></footer></main>`;
 if($('.intel-content'))$('.intel-content').scrollTop=scroll;
 if(ended&&resultShownFor!==game.startedAt){resultShownFor=game.startedAt;resultModal();}
}
function forecastOverlay(){
 const moves=new Map(),attacks=new Map();
 for(const step of forecast.steps){
  if(step.kind==='move'){const key=step.from+'-'+step.to;if(!moves.has(key))moves.set(key,{...step,count:0});moves.get(key).count++;}
  else attacks.set(step.zone,(attacks.get(step.zone)||0)+step.damage);
 }
 const center=z=>({x:(z%8)*100+50,y:Math.floor(z/8)*100+50});
 return `<svg class="forecast-overlay" viewBox="0 0 800 600" aria-hidden="true"><defs><marker id="forecast-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#f4c588"/></marker></defs>${[...moves.values()].map(m=>{const a=center(m.from),b=center(m.to),dx=b.x-a.x,dy=b.y-a.y;return `<g><line x1="${a.x+dx*.16}" y1="${a.y+dy*.16}" x2="${b.x-dx*.23}" y2="${b.y-dy*.23}" marker-end="url(#forecast-arrow)"/><circle cx="${(a.x+b.x)/2}" cy="${(a.y+b.y)/2}" r="11"/><text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2+4}">${m.count}</text></g>`;}).join('')}${[...attacks].map(([z,n])=>{const c=center(z);return `<g class="forecast-hit"><rect x="${c.x-46}" y="${c.y-46}" width="92" height="92" rx="5"/><text x="${c.x}" y="${c.y+34}">${n?'−'+n+' PV':'BLOQUÉ'}</text></g>`;}).join('')}</svg>`;
}
function extractionBanner(){
 const exit=MISSIONS[game.mission].exit,arrived=game.heroes.filter(h=>h.zone===exit&&h.hp>0).length,hostiles=game.enemies.filter(e=>e.zone===exit).length;
 let text=`Rejoignez la sortie, zone ${exit+1} · ${arrived}/${game.heroes.length} survivants à l’abri.`;
 if(game.heroes.some(h=>h.hp<=0))text='Un survivant est à terre : secourez-le avant l’évacuation.';
 else if(arrived===game.heroes.length&&hostiles)text=`Sortie bloquée : éliminez ${hostiles} ennemi${hostiles>1?'s':''} dans cette zone.`;
 else if(game.escort&&game.escort.zone!==exit)text='Ramenez aussi Edda à la sortie, zone '+(exit+1)+'.';
 else if(canExtract(game))text='Tout le monde est prêt. Vous pouvez évacuer !';
 return `<div class="extraction-note ${canExtract(game)?'ready':''}">${icon('exit',19)}<span><strong>Objectifs accomplis</strong><small>${text}</small></span></div>`;
}
function forecastPanel(){
 const hurt=forecast.heroes.map(h=>({...h,lost:game.heroes.find(x=>x.id===h.id).hp-h.hp})).filter(h=>h.lost>0);
 return `<div class="forecast-note"><div><strong>${icon('move',16)} Si vous terminez maintenant</strong><span>${hurt.length?hurt.map(h=>HEROES.find(x=>x.id===h.id).name.split(' ')[0]+' −'+h.lost+' PV'+(h.hp===0?' · à terre':'')).join(' · '):'Aucune blessure prévue par les ennemis présents.'}</span></div><details class="forecast-details"><summary>Comprendre la prévision</summary><small>Flèches : déplacements, y compris la seconde action des Écorchés. Les nouvelles apparitions, activations surprises et événements restent inconnus.</small>${tactical(game)?btn('Voir les vagues possibles '+icon('arrow',14),'spawnDeck','quiet'):''}</details></div>`;
}
function spawnDeckModal(){
 const t=tier(game),types=['drowned','runner','bell'];
 modal('Ce qui peut surgir',`<p class="muted">Le Chœur est au niveau <b>${levelName(game)}</b>. Une carte est tirée pour chaque faille active. Le paquet contient 12 cartes, puis se mélange à nouveau. Cette liste montre les compositions de base possibles ; l’Exploration et les équipes de deux les réduisent, le Cauchemar ajoute un Noyé.</p><div class="spawn-catalog">${SPAWN_CARDS.map(c=>`<article><strong>${c.name}</strong><span>${c.rows[t].map((n,i)=>n?n+' '+ENEMIES[types[i]].plural:'').filter(Boolean).join(' · ')||'Aucune apparition'}</span>${c.rush&&t>=2?'<small>Activation supplémentaire des Noyés en Survie et Cauchemar.</small>':''}</article>`).join('')}</div><p class="muted">Ouvrir un bâtiment révèle aussi des cartes : une pour deux zones intérieures, arrondie au supérieur. Les activations surprises ne se déclenchent pas à l’ouverture.</p>${btn('Compris','close','primary full')}`,true);
}

function heroCard(h){
 const level=survivorLevel(h),d=HEROES.find(x=>x.id===h.id),next=level.next;
 return `<button class="hero-card ${game.active===h.id?'active':''} ${h.hp<=0?'down':''} ${h.ap===0?'spent':''}" data-action="select" data-id="${h.id}" style="--hero:${d.color}" aria-label="Sélectionner ${d.name}, ${h.hp} points de vie, ${h.ap} actions" aria-pressed="${game.active===h.id}"><div class="hero-top">${portrait(d)}<div><strong>${d.name.split(' ')[0]}<span> ${d.name.split(' ').slice(1).join(' ')}</span></strong><small>${d.role}</small>${party?`<span class="hero-owner">${esc(partyRoom.players.find(p=>p.hero===h.id)?.nick||'')}${partyRoom.players.find(p=>p.hero===h.id)?.ready?' ✓':''}</span>`:''}<span class="hero-level" style="--level:${level.color}">NIV. ${level.number}</span><div class="hp-line">${icon('heart',12)}<span>${h.hp}/${d.hp}${h.ward?" · 🛡 "+h.ward:""}</span><div class="hp-track"><i style="width:${h.hp/d.hp*100}%"></i></div></div></div></div><div class="hero-bottom"><span class="ap-pips" aria-label="${h.ap} actions">${Array.from({length:maxAP(h)},(_,i)=>`<i class="${i<h.ap?'available':''}"></i>`).join('')}</span><span>${h.hp<=0?(h.bleed>=3?'Perdu':'À terre · '+(3-h.bleed)+' tour'+(h.bleed<2?'s':'')):!level.next?h.xp+' XP · MAX':h.xp+'/'+next+' XP'}</span></div><span class="hero-xp-track" style="--level:${level.color}"><i style="width:${level.progress}%"></i></span></button>`;
}
function zoneHTML(z){
 const m=MISSIONS[game.mission],h=active(game),people=game.heroes.filter(x=>x.zone===z.id),enemies=game.enemies.filter(e=>e.zone===z.id),obj=game.objectives.find(o=>o.zone===z.id),spawn=m.spawns.includes(z.id)&&!game.sealed.includes(z.id),exit=m.exit===z.id;
 const reachable=mode==='move'&&moveCost(game,h,z.id)<=h.ap,targetable=mode==='attack'&&enemies.some(e=>!targetReason(game,h,e)),doorable=mode==='door'&&closedDoors(game).includes(z.id),aimZone=['flare','grenade'].includes(mode)&&visible(game,h.zone,z.id,mode==='flare'?3:2);
 const walls=['top','right','bottom','left'].map((side,i)=>{const to=z.id+[-8,1,8,-1][i],edge=distance(z.id,to)===1?game.map.edges[edgeKey(z.id,to)]:undefined;return edge==='wall'?`<i class="wall ${side}"></i>`:edge==='closed'?`<i class="wall ${side} doorway"><b></b></i>`:''}).join('');
 const leader=people.find(p=>p.id===game.active)||people[0],mainEnemy=[...enemies].sort((a,b)=>ENEMIES[b.type].armor-ENEMIES[a.type].armor||ENEMIES[b.type].speed-ENEMIES[a.type].speed)[0];
 const roomAnchor=game.map.zones.find(c=>c.room===z.room)?.id===z.id;
 return `<button class="zone ${z.room>=0?'room room-'+z.room:'street'} ${selectedZone===z.id?'selected':''} ${h.zone===z.id?'occupied':''} ${reachable?'reachable':''} ${targetable?'targetable':''} ${doorable?'door-target':''} ${aimZone?'aim-zone':''}" data-action="zone" data-id="${z.id}" aria-label="Zone ${z.id+1}, ${z.room>=0?z.name:'quai'}${people.length?', '+people.length+' survivants':''}${enemies.length?', '+enemies.length+' ennemis':''}${obj&&!obj.done?', objectif '+obj.label:''}${exit?', sortie':''}">${terrainArt(z,game.mission)}<span class="zone-number">${String(z.id+1).padStart(2,'0')}</span>${z.room>=0&&roomAnchor?`<span class="room-label">${z.name}</span>`:''}${spawn?`<span class="spawn-symbol">${icon('noise',21)}</span>`:''}${exit?`<span class="exit-symbol">${icon('exit',21)}</span>`:''}${obj&&!obj.done?`<span class="objective-token">${icon(obj.kind==='seal'?'tool':obj.kind==='escort'?'medical':'flag',14)}</span>`:obj?.done?`<span class="objective-done">${icon('check',12)}</span>`:''}<span class="pieces ${leader&&mainEnemy?'mixed-pieces':''}">${leader?`<span class="hero-piece ${leader.id===game.active?'active':''} ${leader.hp<=0?'down':''}" style="--hero:${HEROES.find(x=>x.id===leader.id).color}" title="${people.map(p=>HEROES.find(x=>x.id===p.id).name).join(', ')}">${portrait(HEROES.find(x=>x.id===leader.id))}${people.length>1?`<b>${people.length}</b>`:''}</span>`:''}${mainEnemy?`<span class="enemy-piece ${mainEnemy.type}" title="${enemies.length} ennemis">${enemyPortrait(mainEnemy.type)}<b>${enemies.length}</b>${enemies.some(e=>ENEMIES[e.type].speed===2)?'<em class="enemy-activation">2 ACT</em>':''}</span>`:''}${game.escort?.zone===z.id?'<span class="escort-piece" title="Edda">E</span>':''}</span>${game.noise[z.id]?`<span class="noise-count">${icon('noise',10)}${game.noise[z.id]}</span>`:''}${walls}</button>`;
}
function modeHint(){
 if(game.status!=='playing')return game.reason+' Vous pouvez inspecter le plateau.';
 if(partyBlocked())return me()?.ready?'Tour terminé. Attendez vos alliés ou reprenez votre tour.':'Synchronisation en cours : patientez avant votre prochaine action.';
 const h=active(game),info=actionInfo(game,mode);
 if(mode==='inspect')return 'Touchez une zone pour voir ses occupants, ses réserves et ses accès.';
 if(['flare','grenade'].includes(mode))return mode==='flare'?'Choisissez une zone visible à 3 cases. Échap pour annuler.':'Choisissez une zone visible à 2 cases. Échap pour annuler.';
 if(!info.enabled)return info.reason;
 return {move:`Touchez une zone éclairée pour avancer · ${info.cost===0?'gratuit':info.cost+' PA'}.`,attack:`Choisissez un ennemi en surbrillance · portée ${weaponRange(game,h)} · ${WEAPONS[h.weapon].damage} dégât${WEAPONS[h.weapon].damage>1?'s':''}.`,door:`Touchez la zone derrière une porte orange · ${info.cost===0?'ouverture gratuite':info.cost+' PA'}.`}[mode]||'Choisissez une action.';
}
function actionButton(id,ic,label,key){
 const info=actionInfo(game,id);if(partyBlocked()){info.enabled=false;info.reason=me()?.ready?'Reprenez votre tour pour agir.':'Attendez la synchronisation.';}
 return btn(`${icon(ic,21)}<strong>${label}</strong><small>${info.cost===0?'Gratuit':info.cost+' PA'}<kbd>${key}</kbd></small>`,id,'action-button '+(mode===id?'selected ':'')+(!info.enabled?'unavailable':''),`aria-pressed="${mode===id}" aria-disabled="${!info.enabled}" title="${esc(info.reason||label+' ('+key+')')}"`);
}

function missionPanel(){const m=MISSIONS[game.mission],h=active(game),z=game.map.zones[selectedZone??h.zone],enemies=game.enemies.filter(e=>e.zone===z.id);return `<div class="mission-intel"><span class="eyebrow">OBJECTIFS D’EXPÉDITION</span><p class="mission-summary">${{collect:'Récupérez les ressources et rejoignez la sortie.',defend:'Relancez les pompes, maintenez le périmètre, puis évacuez.',escort:'Retrouvez Edda et les cultures, puis escortez-la vers la sortie.',seal:'Scellez les trois failles et rejoignez la sortie.',boss:'Coupez les résonateurs, abattez le Cantor et évacuez.'}[m.type]}</p><ul class="objective-list">${game.objectives.map(o=>`<li class="${o.done?'done':''}"><span class="check-box">${o.done?icon('check',13):''}</span><div>${o.label}<small>ZONE ${String(o.zone+1).padStart(2,'0')} · ${o.done?'ACCOMPLI':o.kind==='seal'?'2 ACTIONS':'1 ACTION'}</small></div></li>`).join('')}${m.type==='defend'?`<li><span class="check-box">${game.hold>=m.hold?icon('check',13):''}</span><div>Protéger les pompes<small>${Math.min(game.hold,m.hold)} / ${m.hold} PHASES DU CHŒUR</small></div></li>`:''}${m.type==='boss'?`<li><span class="check-box">${game.bossKilled?icon('check',13):''}</span><div>Vaincre le Cantor<small>${game.bossKilled?'ACCOMPLI':'12 PV · ARMURE 2'}</small></div></li>`:''}<li><span class="check-box">${canExtract(game)?icon('check',13):''}</span><div>Évacuer toute l’escouade<small>ZONE ${String(m.exit+1).padStart(2,'0')} · TOUS DEBOUT</small></div></li></ul></div><div class="event-card"><span class="eyebrow">${icon('noise',14)} ÉCHO DE LA VILLE</span><strong>${game.event?.title||'Le calme avant la marée'}</strong><p>${game.event?.text||'La ville semble vide. Ne vous fiez pas au silence.'}</p></div><div class="zone-intel"><div class="panel-heading"><span class="eyebrow">ZONE ${String(z.id+1).padStart(2,'0')}</span><small>${z.room>=0?'BÂTIMENT':'EXTÉRIEUR'}</small></div><h3>${z.room>=0?z.name:'Quais de Nacre'}</h3>${enemies.length?enemies.map(e=>`<button class="enemy-row" data-action="target" data-id="${e.id}" ${!attackable(game,h,e)||h.ap<1?'disabled':''}>${enemyPortrait(e.type)}<span><strong>${ENEMIES[e.type].name}</strong><small>${e.hp} PV · ARMURE ${ENEMIES[e.type].armor} · ${ENEMIES[e.type].speed} ACT · ${ENEMIES[e.type].damage} DÉGÂT(S)</small></span>${icon('crosshair',17)}</button>`).join(''):`<p class="muted">Aucune présence hostile.${z.room>=0?' Réserves : '+z.loot+'/2.':''}</p>`}${game.escort?.zone===h.zone?btn('Demander à Edda de suivre '+HEROES.find(x=>x.id===h.id).name.split(' ')[0],'escort','small-button'):''}</div>`;}
function levelModal(){
 const h=active(game),d=HEROES.find(x=>x.id===h.id),level=survivorLevel(h);
 modal('Progression de '+d.name,`<div class="level-intro">${portrait(d)}<div><span class="level-badge" style="--level:${level.color}">NIVEAU ${level.number} · ${level.name}</span><h3>${h.xp} XP${level.next?' · prochain palier à '+level.next:' · niveau maximum'}</h3><p>${heroSkill(h,d)}</p></div></div>${talentChoices(h)}<details class="level-details"><summary>Voir tous les paliers de progression</summary><div class="level-roadmap">${(balanced(h)?BALANCED_LEVELS:h.evolution===1?LEVELS:LEVELS.slice(0,4)).map((l,i)=>`<article class="${i<=level.index?'unlocked':''}" style="--level:${l.color}"><b>${i+1}</b><div><strong>${l.name} · ${l.xp} XP</strong><p>${i===0?heroSkill(h,d):l.bonus}${!balanced(h)&&h.evolution===1&&i>0?' + un talent au choix':''}</p><small>${i<=level.index?'DÉBLOQUÉ':'À ATTEINDRE'}</small></div></article>`).join('')}</div></details><p class="muted">Le niveau le plus élevé de l’escouade détermine les vagues ennemies. Les bonus déjà gagnés se cumulent.</p>`);
}
function fieldEquipment(h,d,w){
 const level=survivorLevel(h),allies=game.heroes.filter(x=>x.id!==h.id&&x.hp>0&&x.zone===h.zone);
 return `<div class="active-loadout loadout-v13" style="--hero:${d.color}"><div class="loadout-identity">${portrait(d)}<span><strong>${d.name}</strong><small>${h.ap} action${h.ap>1?'s':''} restante${h.ap>1?'s':''}</small></span>${btn('Talents · Niv. '+level.number,'level','level-badge',`style="--level:${level.color}" aria-label="Niveau ${level.number} de ${d.name}, choisir les talents et voir la progression"`)}</div><button class="equipped-summary" data-action="openPanel" data-id="equipment">${itemArt(h.weapon)}<span><small class="equipped-label">EN MAIN · ARME ÉQUIPÉE</small><strong>${w.name}</strong><small>${weaponDice(game,h)} dés · ${weaponThreshold(h)}+ · ${weaponDamage(h)} dégât${weaponDamage(h)>1?'s':''} · portée ${weaponRange(game,h)}${w.ammo?' · '+h.ammo[h.weapon]+'/'+w.ammo+' mun.':''}</small></span>${icon('arrow',15)}</button><div class="loadout-links">${btn(icon('bag',15)+' Échanger'+(allies.length?' · '+allies.length+' allié'+(allies.length>1?'s':''):''),'exchangeMenu','quiet')}${btn(icon('book',15)+' Cartes','cards','quiet')}${btn(icon('play',15)+(animations?' Animations':' Sans animation'),'toggleAnimations','quiet',`aria-pressed="${animations}"`)}${btn(icon('check',15)+(autoEnd?' Fin auto':' Fin manuelle'),'toggleAutoEnd','quiet',`aria-pressed="${autoEnd}" title="Terminer le tour automatiquement quand toutes les actions sont jouées"`)}</div></div>`;
}
function equipmentPanel(){
 const h=active(game),d=HEROES.find(x=>x.id===h.id),w=WEAPONS[h.weapon],l=survivorLevel(h);
 return `<div class="equipment-header">${portrait(d)}<div><h3>${d.name}</h3><span>${h.inventory.length} / 8 emplacements</span></div>${btn('Talents · Niv. '+l.number,'level','level-badge',`style="--level:${l.color}"`)}</div><article class="held-card">${itemArt(h.weapon)}<span class="equipped-label">${icon('check',14)} EN MAIN · ARME ÉQUIPÉE</span><h3>${w.name}</h3>${weaponStats(h.weapon,h)}<p>${weaponNoise(h)?'Bruit +'+weaponNoise(h):'Silencieuse'}${w.ammo?' · '+h.ammo[h.weapon]+'/'+w.ammo+' munitions':' · Aucune munition requise'}</p></article><div class="equipment-shortcuts">${btn(icon('bag',16)+' Échanger','exchangeMenu','small-button')}${btn(icon('book',16)+' Toutes les cartes','cards','small-button')}</div><div class="skill-card"><span class="eyebrow">TALENT · ${d.role}</span><p>${heroSkill(h,d)}</p>${h.evolution===1?`<p class="talent-list">${h.talents.map(id=>TALENTS[id].name).join(" · ")||(balanced(h)?"Premier choix de talent à 19 XP":"Talents à choisir dès 6 XP")}</p>${POWERS[h.id]?`<p>Éther : ${h.ether}/${maxEther(h)} · +1 par manche</p>`:""}`:""}${h.id==='ada'?'<small>'+searchesLeft(h)+' fouille(s) restante(s)</small>':''}${h.id==='jonas'?'<small>'+(h.rerolled?'Relance utilisée':'Relance disponible')+'</small>':''}${h.id==='malik'?btn(icon('medical',15)+' Soin de terrain','healMenu','small-button',h.healed||h.ap<1?'disabled':''):''}</div><div class="panel-heading"><span class="eyebrow">RÉSERVE ET CONSOMMABLES</span><small>Touchez une carte</small></div><div class="inventory inventory-cards">${h.inventory.filter(item=>item!==h.weapon).map(item=>`<button class="inventory-item" data-action="item" data-id="${item}">${itemArt(item)}<span>${(WEAPONS[item]||ITEMS[item]).name}<small>${WEAPONS[item]?weaponLock(h,item)||'DANS LE SAC · NON ÉQUIPÉE':'CONSOMMABLE'}</small></span>${icon('arrow',14)}</button>`).join('')||'<p class="muted">Votre réserve est vide.</p>'}</div>`;
}
function weaponStats(id,h=null){
 const w=WEAPONS[id],baseModern=!game||tactical(game),candidate=h?{...h,weapon:id}:null;
 const values=[candidate?weaponDice(game,candidate):id==='bow'&&baseModern?1:w.dice,candidate?weaponThreshold(candidate):w.hit,candidate?weaponDamage(candidate):w.damage,candidate?weaponRange(game,candidate):w.range];
 return `${WEAPON_XP[id]&&(!game||game.balance===1)?'<p class="equipment-lock">Niveau requis · '+WEAPON_XP[id]+' XP</p>':''}`+`<div class="weapon-stats">${values.map((v,i)=>`<span><b>${v}${i===1?'+':''}</b>${['DÉS','TOUCHE','DÉGÂTS','PORTÉE'][i]}</span>`).join('')}</div>`;
}
function cardsModal(category='weapons'){
 cardCategory=category;
 const weapon=category==='weapons',items=category==='items';
 const cards=weapon?Object.entries(WEAPONS):items?Object.entries(ITEMS):SPAWN_CARDS.map(c=>[c.id,c]);
 const selectedTier=game?tier(game):0;
 modal('Les cartes de Nacre',`<nav class="card-tabs" aria-label="Types de cartes">${[['weapons','Armes · '+Object.keys(WEAPONS).length],['items','Objets · 4'],['spawns','Apparitions · 12']].map(([id,label])=>btn(label,'cardCategory',id===category?'active':'',`data-id="${id}" aria-pressed="${id===category}"`)).join('')}</nav><p class="muted">${weapon?'Caractéristiques de base, avant les talents, la visée et le niveau. Consulter une carte ne l’ajoute pas à votre sac.':items?'À trouver en fouillant les bâtiments. Chaque utilisation coûte 1 action.':'Compositions de base aux quatre niveaux. L’intensité et la taille de l’escouade peuvent les ajuster.'}</p><div class="card-catalog ${!weapon&&!items?'spawn-cards':''}">${cards.map(([id,c],i)=>weapon||items?`<button class="equipment-card" data-action="catalogItem" data-id="${id}"><span class="card-index">${String(i+1).padStart(2,'0')} / ${weapon?'ARSENAL':'RESSOURCES'}</span>${itemArt(id)}<span class="card-kind">${weapon?((c.rarity?'RELIQUE · ':'')+(c.magic?'MAGIE':c.kind==='melee'?'CORPS À CORPS':'À DISTANCE')):'CONSOMMABLE'}</span><h3>${c.name}</h3>${weapon?weaponStats(id):`<p>${c.desc}</p>`}<span class="card-foot">${weapon?(c.noise?'Bruit +'+c.noise:'Silencieuse')+(c.ammo?' · chargeur '+c.ammo:' · sans munitions'):'1 action · usage unique'}</span></button>`:`<article class="spawn-card"><span class="card-index">${String(i+1).padStart(2,'0')} / LE CHŒUR</span>${enemyPortrait(c.rows[3][2]?'bell':'drowned')}<h3>${c.name}</h3><div class="spawn-levels">${c.rows.map((row,n)=>`<div class="${n===selectedTier?'current':''}" style="--level:${LEVELS[n].color}"><b>N${n+1}</b><span>${row.map((num,j)=>num?num+' '+ENEMIES[['drowned','runner','bell'][j]][num===1?'name':'plural']:'').filter(Boolean).join(' · ')||'Aucune apparition'}</span></div>`).join('')}</div>${c.rush?'<p class="card-warning">N3–N4 : les Noyés agissent à nouveau en Survie et Cauchemar.</p>':'<p class="card-foot">Renforts depuis une faille active</p>'}</article>`).join('')}</div>`,true);
}
function catalogItem(id){
 const c=WEAPONS[id]||ITEMS[id],owned=screen==='game'&&active(game).inventory.includes(id);
 modal(c.name,`<div class="catalog-detail">${itemArt(id)}<span class="card-kind">${WEAPONS[id]?((c.rarity?'RELIQUE · ':'')+(c.magic?'MAGIE':c.kind==='melee'?'CORPS À CORPS':'À DISTANCE')):'CONSOMMABLE'}</span><p>${c.desc}</p>${WEAPONS[id]?weaponStats(id):''}<p class="muted">${WEAPONS[id]?'Valeurs de base. La fiche de votre sac inclut les talents et le niveau.':''}</p></div>${owned?btn('Voir dans mon sac','item','primary full',`data-id="${id}"`):''}${btn('Retour aux cartes','cards','secondary full',`data-id="${cardCategory}"`)}`);
}
function exchangeModal(reset=false){
 const h=active(game),allies=game.heroes.filter(x=>x.id!==h.id&&x.zone===h.zone&&x.hp>0);
 if(reset||!allies.some(a=>a.id===exchangeSelection.target))exchangeSelection={target:allies[0]?.id||'',give:'',receive:''};
 const other=allies.find(a=>a.id===exchangeSelection.target),reason=other?exchangeReason(game,exchangeSelection):'Rejoignez un allié debout sur la même case pour échanger.';
 const name=id=>HEROES.find(d=>d.id===id).name;
 const options=(hero,selected)=>`<option value="">Aucun objet</option>${[...new Set(hero.inventory)].map(id=>`<option value="${id}" ${selected===id?'selected':''}>${(WEAPONS[id]||ITEMS[id]).name}${id===hero.weapon?' · EN MAIN':''}${hero.inventory.filter(x=>x===id).length>1?' ×'+hero.inventory.filter(x=>x===id).length:''}</option>`).join('')}`;
 modal('Échanger du matériel',`<p class="exchange-intro">Zone ${h.zone+1} · <strong>${name(h.id)}</strong> · ${h.ap} PA disponibles</p><p class="muted">Un transfert ou un échange réciproque coûte <b>1 action au survivant actif</b>. La zone doit être sans ennemi.</p>${allies.length?`<div class="exchange-allies" role="group" aria-label="Choisir un allié">${allies.map(a=>btn(`${portrait(HEROES.find(d=>d.id===a.id))}<span>${name(a.id)}<small>${a.inventory.length}/8 objets</small></span>`,'exchangeAlly',a.id===other.id?'selected':'',`data-id="${a.id}" aria-pressed="${a.id===other.id}"`)).join('')}</div><div class="exchange-pair"><label>Vous donnez<select id="exchange-give" data-exchange="give">${options(h,exchangeSelection.give)}</select>${exchangeSelection.give?itemArt(exchangeSelection.give):'<span class="empty-item">Rien à donner</span>'}</label><span class="exchange-arrow" aria-hidden="true">⇄</span><label>Vous recevez<select id="exchange-receive" data-exchange="receive">${options(other,exchangeSelection.receive)}</select>${exchangeSelection.receive?itemArt(exchangeSelection.receive):'<span class="empty-item">Rien en retour</span>'}</label></div><p class="exchange-status ${reason?'':'ready'}" role="status">${reason||'Échange possible · 1 PA. Les armes reçues remplacent celles échangées en main ; les munitions sont conservées.'}</p>${btn('CONFIRMER · 1 ACTION','confirmExchange','primary full',reason?'disabled':'')}`:`<p class="tip">${reason}</p>`}`);
}
document.addEventListener('change',e=>{if(e.target.matches('[data-exchange]')){exchangeSelection[e.target.dataset.exchange]=e.target.value;const key=e.target.id;exchangeModal();document.getElementById(key)?.focus();}});


function journalPanel(){return `<span class="eyebrow">JOURNAL D’EXPÉDITION</span><div class="journal">${game.log.map(l=>`<article class="log-${l.type}"><small>MANCHE ${String(l.round).padStart(2,'0')}</small><p>${esc(l.text)}</p></article>`).join('')}</div>`;}
function dispatch(action){
 if(busy)return false;
 if(party){if(action.type==='select'){if(action.id!==me()?.hero)toast('Chaque joueur contrôle son personnage. Vous incarnez '+HEROES.find(h=>h.id===me()?.hero).name+'.');return false;}if(partyBlocked()){toast(me()?.ready?'Reprenez votre tour pour agir.':'Attendez la synchronisation.');return false;}void sendParty({kind:'action',action});return false;}
 const before=game,r=act(game,action);
 if(r.error){toast(r.error);tone('error');return false;}
 game=r.state;
 if(!['attack','power'].includes(action.type))game.lastRoll=null;
 if(['move','select'].includes(action.type))selectedZone=active(game).zone;
 if(action.type==='select'){mode='move';roundReport=null;}
 if(action.type==='move')roundReport=null;
 saveGame();render();
 if(motionAllowed()&&before.heroes.some(old=>game.heroes.find(h=>h.id===old.id)?.zone!==old.zone)){busy=true;animateSurvivors($('.board'),before,game,portrait).catch(()=>{}).finally(()=>{busy=false;});}showWounds(before,game,HEROES);
 tone(action.type==='attack'?'attack':action.type==='move'?'move':'click');
 if(shouldShowDiscovery(action,game))discoveryModal(game.lastDiscovery);
 if(active(game).id===active(before).id&&talentSlots(active(game))>talentSlots(active(before)))toast('Nouveau niveau ! Choisissez un talent dans Progression.');
 if(['attack','power'].includes(action.type)&&game.lastRoll&&motionAllowed()){busy=true;animateDice(game.lastRoll).catch(()=>{}).finally(()=>{busy=false;});}
 if(action.type==='power')toast(POWERS[active(game).id].name+' activé.');
 if(action.type==='talent')toast(TALENTS[action.talent].name+' appris.');
 if(action.type==='equip')toast(`${WEAPONS[active(game).weapon].name} équipée.`);
 if(action.type==='interact'&&!game.lastDiscovery)toast('Objectif accompli. Consultez la mission pour la suite.');
 if(action.type==='door'){mode='move';render();toast('Porte ouverte. Vous pouvez entrer.');}
 if(game.status==='won'){
  progress[game.mission]={rounds:game.round,kills:game.stats.kills,date:new Date().toISOString()};
  try{localStorage.setItem(PROGRESS,JSON.stringify(progress));}catch{}
 }
 return true;
}
function openPanel(id){
 tab=id;
 if(window.matchMedia('(max-width: 1000px)').matches){
  modal({mission:'Votre mission',equipment:'Équipement de '+HEROES.find(x=>x.id===active(game).id).name.split(' ')[0],journal:'Journal d’expédition'}[id],`<div class="panel-sheet">${id==='mission'?missionPanel():id==='equipment'?equipmentPanel():journalPanel()}</div>`);
  $('.modal').classList.add('drawer');
 }else render();
}
function handleGame(a,d){
 if(busy)return;
 if(party&&['import','restart','confirmRestart','nextMission'].includes(a))return toast('Revenez à l’accueil pour préparer une nouvelle partie. Votre salon reste enregistré.');
 if(party&&['endRound','confirmRound'].includes(a))return partyReady();
 if(a==='result')return resultModal();
 if(a==='level')return levelModal();
 if(a==='learnTalent'){closeModal();return dispatch({type:'talent',talent:d.id});}
 if(a==='powerMenu')return powerModal();
 if(a==='castPower'){closeModal();return dispatch({type:d.kind||'power',...(d.target?{target:d.target}:{zone:Number(d.id)})});}
 if(a==='discoveryEquip'){closeModal();return dispatch({type:'equip',item:d.id});}
 if(a==='exchangeMenu')return exchangeModal(true);
 if(a==='exchangeAlly'){exchangeSelection={target:d.id,give:'',receive:''};return exchangeModal();}
 if(a==='confirmExchange'){const a={type:'exchange',...exchangeSelection};closeModal();if(dispatch(a)){exchangeSelection.give='';exchangeSelection.receive='';exchangeModal();toast('Matériel échangé · 1 action utilisée.');}return;}
 if(game.status!=='playing'&&!['sound','tab','openPanel','zoom','inspect','zone','spawnDeck','phaseDetails','tutorial','pause','item','export','import','confirmRestart','restart','nextMission'].includes(a))return toast('Cette expédition est terminée. Consultez le bilan ou choisissez une nouvelle mission.');
 if(a==='sound'){muted=!muted;try{localStorage.setItem('veille-noire.sound',JSON.stringify(!muted));}catch{}tone('click');return render();}
 if(a==='select')return dispatch({type:'select',id:d.id});
 if(a==='nextHero'){
  const h=game.heroes.find(x=>x.id!==game.active&&x.hp>0&&(x.ap>0||(x.id==='iris'&&!x.freeMove)));
  return h?dispatch({type:'select',id:h.id}):toast('L’escouade a terminé ses actions.');
 }
 if(a==='tab'){tab=d.id;return render();}
 if(a==='openPanel')return openPanel(d.id);
 if(a==='zoom'){boardZoom=!boardZoom;return render();}
 if(a==='forecast'){showForecast=!showForecast;return render();}
 if(a==='spawnDeck')return spawnDeckModal();
 if(a==='inspect'){mode=mode==='inspect'?'move':'inspect';return render();}
 if(['move','attack','door','search','interact'].includes(a)){
  const info=actionInfo(game,a);if(!info.enabled)return toast(info.reason);
  if(['move','attack','door'].includes(a)){mode=a;return render();}
  return dispatch({type:a});
 }
 if(a==='extract'||a==='escort')return dispatch({type:a});
 if(a==='zone'){
  const z=+d.id,h=active(game);selectedZone=z;tab='mission';
  if(mode==='inspect')return zoneModal(z);
  if(mode==='move'){
   if(z===h.zone)return zoneModal(z);
   if(moveCost(game,h,z)<=h.ap)return dispatch({type:'move',zone:z});
   render();
   if(closedDoors(game).includes(z))return zoneModal(z);
   if(neighbors(game,h.zone).includes(z))return toast('Pas assez d’actions pour rejoindre cette zone.');
   return zoneModal(z);
  }
  if(mode==='door')return dispatch({type:'door',zone:z});
  if(['flare','grenade'].includes(mode)){
   if(dispatch({type:'use',item:mode,zone:z})){mode='move';render();}return;
  }
  if(mode==='attack'){
   const targets=game.enemies.filter(e=>e.zone===z);render();
   if(!targets.length)return toast('Aucun ennemi dans cette zone.');
   const valid=targets.filter(e=>!targetReason(game,h,e));
   if(!valid.length)return toast(targetReason(game,h,targets[0]));
   if(targets.length===1)return dispatch({type:'attack',enemy:valid[0].id});
   return targetModal(z);
  }
 }
 if(a==='doorHere'){closeModal();return dispatch({type:'door',zone:+d.id});}
 if(a==='moveHere'){closeModal();return dispatch({type:'move',zone:+d.id});}
 if(a==='selectHere'){closeModal();return dispatch({type:'select',id:d.id});}
 if(a==='searchHere'){closeModal();return handleGame('search',{});}
 if(a==='objectiveHere'){closeModal();return handleGame('interact',{});}
 if(a==='target'){
  const e=game.enemies.find(e=>e.id===d.id),reason=targetReason(game,active(game),e);
  if(reason)return toast(reason);
  closeModal();return dispatch({type:'attack',enemy:d.id});
 }
 if(a==='endRound'){
  const remaining=game.heroes.reduce((sum,h)=>sum+h.ap,0),free=game.heroes.some(h=>h.hp>0&&(h.id==='iris'&&!h.freeMove||h.id==='lina'&&!h.freeDoor&&closedDoors(game,h).length));
  if(remaining>0||free)return modal('Terminer cette manche ?',`<p>Votre escouade dispose encore de <strong>${remaining} action${remaining>1?'s':''}</strong>${free?' et de talents gratuits utilisables':''}. Les actions restantes seront perdues.</p><div class="phase-preview">${icon('noise',30)}<div><strong>Le Chœur va agir</strong><p>Les ennemis attaquent ou se déplacent, de nouvelles créatures apparaissent, puis la prochaine manche commence.</p></div></div><div class="modal-actions">${btn('Continuer mon tour','close','secondary')}${btn('Terminer la manche','confirmRound','primary')}</div>`);
  return runRound();
 }
 if(a==='confirmRound')return runRound();
 if(a==='phaseDetails')return phaseDetails();
 if(a==='tutorial')return showTutorial();
 if(a==='pause')return pause();
 if(a==='item')return itemModal(d.id);
 if(a==='equip'){closeModal();return dispatch({type:'equip',item:d.id});}
 if(a==='drop'){closeModal();return dispatch({type:'drop',item:d.id});}
 if(a==='use'){
  closeModal();if(['flare','grenade'].includes(d.id)){mode=d.id;return render();}
  return dispatch({type:'use',item:d.id,target:d.target});
 }
 if(a==='trade'){closeModal();return dispatch({type:'trade',item:d.id,target:d.target});}
 if(a==='healMenu')return healingModal();
 if(a==='heal'){closeModal();return dispatch({type:'heal',target:d.target});}
 if(a==='restart')return modal('Recommencer l’expédition ?',`<p>La partie actuelle sera remplacée. Vos victoires restent dans les archives.</p><div class="modal-actions">${btn('Annuler','close','secondary')}${btn('Recommencer','confirmRestart','primary')}</div>`);
 if(a==='confirmRestart'){chosenMission=game.mission;chosenHeroes=game.heroes.map(h=>h.id);difficulty=game.difficulty;return start();}
 if(a==='nextMission'){chosenMission=Math.min(5,game.mission+1);screen='setup';closeModal();render();window.scrollTo(0,0);return;}
 if(a==='export')return exportSave();
 if(a==='import')return importSave();
}
function zoneModal(z){
 const zone=game.map.zones[z],h=active(game),occupants=game.heroes.filter(p=>p.zone===z),enemies=game.enemies.filter(e=>e.zone===z),door=closedDoors(game).includes(z),cost=moveCost(game,h,z),obj=game.objectives.find(o=>o.zone===z&&!o.done);
 modal(`Zone ${String(z+1).padStart(2,'0')} · ${zone.room>=0?zone.name:'Quais de Nacre'}`,`<div class="zone-facts"><span>${zone.room>=0?'Bâtiment · '+zone.loot+' fouille'+(zone.loot>1?'s':'')+' disponible'+(zone.loot>1?'s':''):'Zone extérieure'}</span>${game.noise[z]?`<span>${icon('noise',15)} ${game.noise[z]} bruits</span>`:''}${MISSIONS[game.mission].exit===z?'<span>Zone d’évacuation</span>':''}</div>${obj?`<p class="tip">${icon('flag',16)} ${obj.label}</p>`:''}${occupants.length?`<div class="zone-occupants">${occupants.map(p=>{const d=HEROES.find(x=>x.id===p.id);return btn(`${portrait(d)}<span><strong>${d.name}</strong><small>${p.hp} PV · ${p.ap} actions${p.hp<=0?' · À terre':''}</small></span>${p.id===h.id?icon('check'):icon('arrow')}`,'selectHere','occupant-row',`data-id="${p.id}" ${p.hp<=0?'disabled':''}`)}).join('')}</div>`:''}${enemies.length?`<h3 class="section-label">Présences hostiles</h3>${enemyChoices(z)}`:'<p class="muted">Aucune présence hostile.</p>'}<div class="zone-actions">${door?btn(icon('door')+' Ouvrir la porte · '+(actionInfo(game,'door').cost||'0')+' PA','doorHere','primary',`data-id="${z}" ${!actionInfo(game,'door').enabled?'disabled':''}`):''}${Number.isFinite(cost)&&cost<=h.ap?btn(icon('move')+' Se déplacer ici · '+cost+' PA','moveHere','primary',`data-id="${z}"`):''}${z===h.zone&&obj?btn('Accomplir l’objectif','objectiveHere','primary',!actionInfo(game,'interact').enabled?'disabled':''):''}${z===h.zone&&zone.room>=0?btn(icon('search')+' Fouiller · '+actionInfo(game,'search').cost+' PA','searchHere','secondary',!actionInfo(game,'search').enabled?'disabled':''):''}</div>`);
}
function enemyChoices(z){
 const groups=new Map(),h=active(game);
 for(const e of game.enemies.filter(e=>e.zone===z)){const key=e.type+'-'+e.hp;if(!groups.has(key))groups.set(key,{enemy:e,count:0});groups.get(key).count++;}
 return [...groups.values()].map(({enemy:e,count})=>{const reason=targetReason(game,h,e);return `<button class="enemy-row large ${reason?'unavailable':''}" data-action="target" data-id="${e.id}" aria-disabled="${!!reason}">${enemyPortrait(e.type)}<span><strong>${ENEMIES[e.type].name}${count>1?' ×'+count:''}</strong><small>${e.hp} PV · armure ${ENEMIES[e.type].armor} · ${ENEMIES[e.type].speed} action(s) · ${ENEMIES[e.type].damage} dégât(s) par attaque${ENEMIES[e.type].speed===2?'<em>Agit deux fois : peut avancer puis attaquer, ou attaquer deux fois.</em>':''}${reason?'<em>'+reason+'</em>':''}</small></span>${icon('crosshair',20)}</button>`;}).join('');
}
async function runRound(){
 if(busy)return;
 closeModal();const before=game,result=act(before,{type:'endRound'});
 if(result.error)return toast(result.error);
 busy=true;game=result.state;saveGame();tone('round');
 phaseController=new AbortController();const skip=()=>phaseController?.abort();document.addEventListener('skip-phase',skip);
 try{if(motionAllowed()){
  const badge=$('.turn-badge');if(badge)badge.textContent='Le Chœur agit…';
  $('.play-surface')?.setAttribute('aria-busy','true');
  await animatePhase($('.board'),before,game,enemyPortrait,{signal:phaseController.signal});
 }}catch{toast('La phase est terminée. Consultez son bilan.');}
 finally{document.removeEventListener('skip-phase',skip);phaseController=null;busy=false;roundReport=phaseSummary(before,game);mode='move';selectedZone=active(game).zone;render();showWounds(before,game);if(!roundReport?.wounded.length)toast('Manche '+game.round+' · '+(game.event?.title||'À vous de jouer'));}
}
function phaseDetails(){if(!roundReport)return;
 modal('Le bilan de la nuit',`<div class="phase-metrics"><div><strong>${roundReport.moved}</strong><span>créatures déplacées</span></div><div><strong>${roundReport.spawned}</strong><span>nouvelles apparitions</span></div></div>${roundReport.wounded.length?roundReport.wounded.map(w=>`<p>${HEROES.find(h=>h.id===w.id).name} : ${w.lost} blessure${w.lost>1?'s':''} pendant l’activation ennemie.</p>`).join(''):'<p class="tip">Aucune blessure pendant l’activation ennemie.</p>'}${roundReport.draws?.length?`<h3 class="section-label">Cartes d’apparition</h3><div class="phase-draws">${roundReport.draws.map(d=>`<article><strong>Zone ${d.zone+1} · ${SPAWN_CARDS.find(c=>c.id===d.card).name}</strong><small>${d.row.map((n,i)=>n?n+' '+ENEMIES[['drowned','runner','bell'][i]][n===1?'name':'plural']:'').filter(Boolean).join(' · ')||'Aucune apparition'}</small>${d.rush?'<em>Les Noyés se sont activés une fois de plus.</em>':''}</article>`).join('')}</div>`:''}<div class="event-card"><span class="eyebrow">ÉVÉNEMENT · MANCHE ${roundReport.newRound}</span><strong>${roundReport.event?.title||'La ville se tait'}</strong><p>${roundReport.event?.text||''}</p></div>${btn('Reprendre l’expédition','close','primary full')}`);
}

function targetModal(z){modal('Choisir une cible',`<p>Zone ${z+1} · ${WEAPONS[active(game).weapon].name}. Les succès restants touchent les autres ennemis de cette zone.</p><p class="combat-odds"><strong>${attackOdds(game)} %</strong> de chance d’obtenir au moins un succès${active(game).id==='jonas'&&!active(game).rerolled?' avec la relance de Jonas':''}. L’armure reste prise en compte.</p>${enemyChoices(z)}`);}

function itemModal(item){
 const h=active(game),info=WEAPONS[item]||ITEMS[item],weapon=WEAPONS[item],candidate={...h,weapon:item},cost=equipCost(game),lock=weaponLock(h,item),allies=game.heroes.filter(x=>x.id!==h.id&&x.zone===h.zone&&x.hp>0),contested=game.enemies.some(e=>e.zone===h.zone);
 const fullAmmo=item==='ammo'&&(!WEAPONS[h.weapon].ammo||h.ammo[h.weapon]>=WEAPONS[h.weapon].ammo);
 modal(info.name,`<div class="item-detail">${itemArt(item)}<p>${item==='bow'&&tactical(game)?'Un seul dé, mais une arme silencieuse et des flèches récupérables. Les talents et votre niveau sont inclus ci-dessous.':info.desc}</p></div>${weapon?`<div class="weapon-stats"><span><b>${weaponDice(game,candidate)}</b>DÉS</span><span><b>${weaponThreshold(candidate)}+</b>TOUCHE</span><span><b>${weaponDamage(candidate)}</b>DÉGÂTS</span><span><b>${weaponRange(game,candidate)}</b>PORTÉE</span></div><p class="muted">${weaponNoise(candidate)?'Bruit +'+weaponNoise(candidate):'Silencieux'}${weapon.ammo?' · '+h.ammo[item]+'/'+weapon.ammo+' munitions':''} · Statistiques pour ${HEROES.find(x=>x.id===h.id).name.split(' ')[0]}.</p>${lock?'<p class="equipment-lock">'+lock+' Arme conservée dans le sac ; échange possible.</p>':''}${btn(lock?'VERROUILLÉE · '+weaponRequiredXP(h,item)+' XP':item===h.weapon?'DÉJÀ ÉQUIPÉE':'ÉQUIPER · '+(cost?cost+' ACTION':'GRATUIT'),'equip','primary full',`data-id="${item}" ${!!lock||item===h.weapon||h.ap<cost?'disabled':''}`)}${h.ap<cost?'<p class="muted">Il faut une action disponible pour changer d’arme.</p>':''}`:item==='medkit'?`<span class="eyebrow">SOIGNER / RELEVER · 1 ACTION</span>${game.heroes.filter(x=>x.zone===h.zone).map(x=>{const full=x.hp>=HEROES.find(d=>d.id===x.id).hp;return btn(`${HEROES.find(d=>d.id===x.id).name} · ${x.hp} PV${x.hp<=0?' · À TERRE':full?' · PLEINE SANTÉ':''}`,'use','small-button full',`data-id="medkit" data-target="${x.id}" ${h.ap<1||full?'disabled':''}`);}).join('')}`:btn(fullAmmo?(WEAPONS[h.weapon].ammo?'CHARGEUR DÉJÀ PLEIN':'ARME SANS MUNITIONS'):'UTILISER · 1 ACTION','use','primary full',`data-id="${item}" ${h.ap<1||fullAmmo?'disabled':''}`)}${allies.length&&item!==h.weapon?`<div class="trade-options"><span class="eyebrow">TRANSMETTRE · 1 ACTION</span>${contested?'<p class="muted">Éliminez les ennemis de cette zone avant de transmettre du matériel.</p>':''}${allies.map(x=>{const duplicate=tactical(game)&&weapon&&x.inventory.includes(item),full=x.inventory.length>=8;return btn(HEROES.find(d=>d.id===x.id).name+(duplicate?' · possède déjà cette arme':full?' · sac plein':''),'trade','small-button',`data-id="${item}" data-target="${x.id}" ${h.ap<1||duplicate||full||contested?'disabled':''}`);}).join('')}</div>`:''}${item!==h.weapon?btn('Abandonner cet objet','drop','quiet full',`data-id="${item}"`):''}`);
}
function healingModal(){const h=active(game);modal('Soin de terrain · 1 action',`<p>Malik rend ${hasTalent(h,'healer')?(balanced(h)?3:4):2} PV à un survivant debout dans sa zone. Une fois par manche.</p>${game.heroes.filter(x=>x.zone===h.zone&&x.hp>0).map(x=>{const full=x.hp>=HEROES.find(d=>d.id===x.id).hp;return btn(`${HEROES.find(d=>d.id===x.id).name} · ${x.hp} PV${full?' · PLEINE SANTÉ':''}`,'heal','small-button full',`data-target="${x.id}" ${full||h.ap<1||h.healed?'disabled':''}`);}).join('')}`);}
function quickRules(modern=true){return `<section class="quick-rules" aria-label="Résumé des règles"><h3>Les règles en 2 minutes</h3><p>Vous jouez ensemble contre le jeu. Réussissez la mission et ramenez toute l’escouade en vie.</p><ol>
<li><strong>Un but commun.</strong> Lisez l’onglet « Mission ». Rejoignez les marqueurs orange et utilisez « Objectif » dans une zone sans ennemi. Certaines missions demandent aussi de défendre, escorter ou vaincre un boss.</li>
<li><strong>3 actions par survivant et par manche.</strong> Déplacer d’une zone voisine (pas en diagonale), attaquer, ouvrir une porte ou fouiller coûte généralement 1 action. Sceller une faille en coûte 2. Les talents peuvent réduire certains coûts : le bouton indique le coût réel.</li>
<li><strong>Attaquer est simple.</strong> Choisissez « Attaquer », puis une cible accessible. Le jeu lance les dés. « 4+ » signifie qu’un 4, 5 ou 6 touche. Vérifiez la portée et la puissance : une arme trop faible ne perce pas l’armure. Les armes avec un chargeur dépensent une munition par attaque.</li>
<li><strong>Préparez votre équipe.</strong> Fouillez les bâtiments sans ennemi pour trouver du matériel (une fouille par personnage et par manche, deux pour Ada). Dans « Sac », équipez une arme, rechargez ou utilisez une trousse sur un allié de votre zone. Ces actions coûtent généralement 1 action. Une trousse peut aussi relever un allié à terre.</li>
<li><strong>Les ennemis jouent ensuite.</strong> En solo, alternez entre les portraits : dès que toute l’escouade a joué ses actions, la manche se termine seule après un court compte à rebours (bouton « Attendre » pour garder la main). En ligne, chacun contrôle son personnage et son tour se termine dès sa dernière action : le Chœur agit quand tous les survivants debout ont terminé. Les ennemis attaquent dans leur zone ou avancent, des renforts arrivent, puis vos actions reviennent.</li>
<li><strong>Repartez ensemble.</strong> Une fois toutes les conditions remplies, réunissez tous les survivants debout à la sortie, sans ennemi, puis cliquez sur « Évacuer ». Le compteur de manches est votre limite de temps. Tous à terre, un allié non relevé à temps ou le délai dépassé : la partie est perdue.</li>
</ol><p class="tip"><strong>Pour débuter :</strong> choisissez « Le dernier signal » en « Exploration ». Restez proches, avancez vers les objectifs et utilisez « Prévoir » avant de terminer la manche. ${modern?'Quitter des ennemis coûte +1 action par ennemi dans votre zone.':'Quitter des ennemis coûte +1 action.'} Le bruit attire les créatures.</p><p class="muted">PA = points d’action · PV = points de vie · XP = expérience. Les talents de chaque personnage sont indiqués dans son sac.</p></section>`;}
function showTutorial(){modal('Votre première nuit',`${quickRules(tactical(game))}<details class="quick-rules-fold"><summary>Comment utiliser le plateau</summary><div class="tutorial-steps"><article><b>01</b><div><h3>Choisissez un survivant</h3><p>Les portraits en haut ou à gauche permettent de changer de personnage. Chacun dispose de trois actions par manche ; son talent est indiqué dans le sac.</p></div></article><article><b>02</b><div><h3>Traversez le plateau</h3><p>Touchez une zone voisine éclairée pour avancer. Pour franchir une porte orange, choisissez « Ouvrir », puis la zone derrière la porte. ${tactical(game)?'Fuir coûte une action supplémentaire par ennemi présent.':'Fuir coûte une action supplémentaire.'}</p></div></article><article><b>03</b><div><h3>Préparez votre prochaine action</h3><p>« Attaquer » met les cibles possibles en surbrillance. Fouillez les bâtiments sûrs et ouvrez le sac pour changer d’arme ou soigner un allié. « Prévoir » montre les déplacements et blessures de la prochaine activation ennemie, avant les apparitions inconnues.</p></div></article><article><b>04</b><div><h3>Ramenez tout le monde</h3><p>Rejoignez les marqueurs orange et utilisez « Objectif ». Suivez les conditions propres à la mission, puis rassemblez toute l’escouade debout à la sortie, sans ennemi. Le bouton « Évacuer » termine la partie.</p></div></article></div><p class="tip">Un compteur sur un portrait représente un groupe. Touchez sa zone pour voir tous les occupants. Arbres et mobilier sont décoratifs ; seuls les murs et les portes bloquent le passage.</p></details>${btn('À NOUS LA NUIT','close','primary full')}`,true);}

function pause(){if(party)return partyInfo();modal('L’expédition est en pause',`<p>Votre progression est enregistrée automatiquement dans ce navigateur après chaque action.</p><div class="pause-grid">${btn(icon('play')+' Reprendre','close','primary')}${btn(icon('help')+' Règles','rules','small-button')}${btn(icon('book')+' Codex','codex','small-button')}${langButton('small-button')}${btn(icon('save')+' Exporter la sauvegarde','export','small-button')}${btn(icon('bag')+' Importer une sauvegarde','import','small-button')}${btn('Cartes d’équipement','cards','small-button')}${btn(animations?'Animations : activées':'Animations : désactivées','toggleAnimations','small-button')}${btn(autoEnd?'Fin de tour auto : activée':'Fin de tour auto : désactivée','toggleAutoEnd','small-button')}${btn('Recommencer cette mission','restart','small-button')}${btn('Retour aux expéditions','home','small-button')}</div>`);}
function rules(){const modern=!game||tactical(game);modal('Le guide de survie',`<div class="rules">${quickRules(modern)}<h3>Les règles en détail</h3><details><summary>Une manche, deux phases</summary><p>Activez vos survivants dans l’ordre de votre choix, en alternant librement entre eux. Chacun dispose de 3 actions. Quand vous avez terminé, lancez la phase du Chœur : les ennemis agissent, les failles produisent des renforts et un événement est révélé.</p></details><details><summary>Déplacements, portes et bruit</summary><p>Une case est une zone. Un déplacement orthogonal coûte 1 action ; ${modern?"quitter une zone coûte 1 action supplémentaire par ennemi présent.":"quitter des ennemis coûte 1 action supplémentaire."} Les murs sont infranchissables. Ouvrir une porte coûte 1 action et fait 2 bruits. Le premier accès à un bâtiment révèle des ennemis. ${modern?"Chaque survivant debout compte pour 1 bruit. Les bruits d’action disparaissent après la phase du Chœur.":"Le bruit diminue de 3 à chaque fin de manche."}</p><p>${modern?"Les créatures visent la zone visible contenant des survivants la plus bruyante. Sinon, elles visent le bruit le plus fort, survivants compris. Elles suivent les chemins les plus courts et se répartissent entre les directions équivalentes. Un chemin fermé les bloque.":"Les créatures privilégient un survivant visible en ligne droite à 5 zones, puis le bruit accessible le plus fort, puis le survivant accessible le plus proche. Elles ne franchissent pas les portes fermées. À égalité de distance, elles suivent un ordre de parcours fixe."}</p></details><details><summary>Combats et lignes de vue</summary><p>Une attaque coûte 1 action. Lancez les dés de l’arme : chaque résultat au moins égal au seuil est un succès. Chaque succès inflige la puissance de l’arme à une cible, puis à la suivante si la première est éliminée. Les armes de mêlée frappent votre zone. Le tir est autorisé dans votre zone et en ligne droite jusqu’à la portée indiquée, sans mur ni porte fermée. Pas de tir ami.</p><p>Une puissance inférieure à l’armure n’inflige aucun dégât. Les armes avec un chargeur consomment une munition par attaque. Une boîte de munitions et 1 action rechargent complètement l’arme équipée.</p></details><details><summary>Équipement et soins</summary><p>Fouillez un bâtiment sans ennemi pour 1 action, une fois par survivant et par manche (deux pour Ada), avec deux fouilles maximum par zone. Le sac contient 8 objets. ${modern?"Changer d’arme coûte 1 action ; abandonner un objet reste gratuit. L’arc lance 1 dé, contre 2 pour le pistolet, en échange de son silence et de ses flèches récupérables.":"Équiper une arme ou abandonner un objet est gratuit."} Le bouton « Échanger » permet de donner, recevoir ou échanger deux objets avec un allié debout dans la même zone, sans ennemi. Une transaction coûte 1 action au survivant actif. Deux armes équipées peuvent être échangées directement ; leurs munitions sont conservées. « Cartes » présente toutes les armes, les consommables et les apparitions.</p><p>Une trousse soigne 3 PV ou relève un survivant dans votre zone. Un survivant à terre ne peut plus agir. Il faut le relever avant trois phases du Chœur supplémentaires. Si tous sont à terre, l’expédition est perdue. Edda suit les déplacements du survivant désigné ; elle ne subit pas de blessures dans cette V1.</p></details><details><summary>Le Chœur</summary><p><b>Noyé :</b> 1 PV, armure 1, une action, 1 dégât.<br><b>Écorché :</b> 1 PV, armure 1, deux actions, 1 dégât.<br><b>Cloche :</b> 3 PV, armure 2, une action, 2 dégâts.<br><b>Cantor :</b> 12 PV, armure 2, une action, 3 dégâts. Invulnérable tant que les résonateurs fonctionnent.</p><p>À chaque action, une créature attaque si elle partage la zone d’un survivant ; sinon, elle avance d’une zone. Elle attaque le survivant qui a le plus de PV, avec un ordre fixe en cas d’égalité. ${modern?"Tous les ennemis agissent une fois, puis les Écorchés agissent une seconde fois. Chaque faille tire une carte parmi douze, au niveau de danger actuel. Aux deux derniers paliers, la carte Échos peut activer les Noyés une fois de plus. Les autres apparitions attendent la prochaine manche. Ouvrir un bâtiment tire une carte pour deux zones intérieures, sans activation supplémentaire.":"Les nouvelles apparitions attendent la prochaine manche pour agir."}</p></details><details><summary>Expérience et difficulté</summary><p>Un Noyé ou un Écorché vaut 1 XP, une Cloche 2 XP, le Cantor 5 XP et chaque objectif ${modern?5:2} XP. ${game?.balance===1||!game?"À 7 XP : quatrième action. À 19 XP : spécialisation parmi deux. À 43 XP : maîtrise parmi trois. À 70 et 100 XP : options restantes. Aucun bonus automatique de dés ou de précision.":"Règles de votre ancienne sauvegarde : +1 action à 6 XP, +1 dé à 16 XP et seuil réduit à 30 XP."} Le niveau le plus élevé de l’escouade détermine l’intensité des vagues.</p><p>Exploration réduit les vagues. Survie propose l’équilibre normal. Cauchemar ajoute une créature à chaque faille et par manche. Les escouades de deux disposent de vagues allégées. Le butin et les dés utilisent un hasard sauvegardé : recharger la page ne relance pas un résultat.</p></details><details><summary>Objectifs, victoire et campagne</summary><p>Sur une zone d’objectif sans ennemi, « Objectif » coûte 1 action, ou 2 pour sceller une faille. Les pompes nécessitent trois phases sécurisées après leur activation ; un ennemi sur une pompe suspend le décompte. Les failles scellées ne produisent plus d’ennemis.</p><p>Une fois tous les objectifs remplis, tous les survivants doivent être debout à la sortie, sans ennemi. Appuyez sur « Évacuer l’escouade ». Dépasser la limite de manches fait perdre la mission. Les ${MISSIONS.length} missions sont accessibles immédiatement. Les victoires sont conservées, mais chaque mission commence avec les équipements et niveaux initiaux.</p></details><details><summary>Éveillés, talents et reliques</summary><p>Les nouvelles expéditions V1.7.1 ont six paliers : 0, 7, 19, 43, 70 et 100 XP. Le bouton « Talents » est toujours présent dans les commandes. Les nouveaux personnages commencent avec un talent modeste. Leurs pouvoirs nécessitent le choix Éveil à 19 XP ; ils coûtent 2 éther et sont limités à une utilisation par manche. Maëlys lance des dés au lieu de toucher automatiquement toute une zone. Ysée ne relève un allié qu’avec Résonance vive.</p><p>Fusil et carabine : 7 XP requis. Harpon : 19 XP. Reliques : 43 XP. Une arme trouvée trop tôt reste dans le sac et peut être échangée ; elle ne peut pas être équipée avant le niveau requis. La première récompense d’objectif reste une relique, à préparer pour la fin de partie. Chance en fouille : 1 %, ou 3 % avec Main heureuse.</p><p>Les anciennes sauvegardes et anciens salons gardent leurs règles et leurs talents. Les nouveaux paliers ne s’appliquent qu’aux nouvelles expéditions.</p></details><details><summary>Raccourcis et sauvegarde</summary><p>M : déplacer · A : attaquer · F : fouiller · P : porte · O : objectif · 1 à 4 : choisir un survivant · Échap : annuler / fermer. Le son s’active avec l’icône de haut-parleur. La partie est sauvegardée sur cet appareil ; exportez-la depuis Pause pour la transférer. Aucun compte nécessaire.</p></details></div>${btn('RETOUR À LA NUIT','close','primary full')}`,true);}
function resultModal(){const won=game.status==='won',m=MISSIONS[game.mission];modal(won?'Nacre se souviendra.':'La nuit vous a rattrapés.',`<div class="result-banner ${won?'won':'lost'}">${icon(won?'flag':'skull',56)}<span>${won?'EXPÉDITION ACCOMPLIE':'EXPÉDITION PERDUE'}</span></div><p class="brief-text">${esc(game.reason)}</p><div class="result-stats"><div><strong>${game.round}</strong><span>MANCHES</span></div><div><strong>${game.stats.kills}</strong><span>ENNEMIS VAINCUS</span></div><div><strong>${game.stats.searches}</strong><span>FOUILLES</span></div></div>${won?`<p class="tip">Archive débloquée : ${m.reward}</p>`:''}${party?btn('RETOUR AUX EXPÉDITIONS','netLeave','primary full'):won&&game.mission<MISSIONS.length-1?btn('PRÉPARER LA PROCHAINE EXPÉDITION','nextMission','primary full'):btn(won?'RETOUR AUX EXPÉDITIONS':'RETENTER L’EXPÉDITION',won?'home':'confirmRestart','primary full')}${btn('Voir les expéditions','home','quiet full')}`,true);}
function exportSave(){const blob=new Blob([JSON.stringify({format:'veille-noire',game,progress},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='veille-noire-sauvegarde.json';a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);toast('Sauvegarde exportée.');}
function importSave(){$('#save-import')?.remove();const input=document.createElement('input');input.id='save-import';input.type='file';input.hidden=true;document.body.append(input);input.addEventListener('cancel',()=>input.remove(),{once:true});input.accept='.json,application/json';input.addEventListener('change',async()=>{try{const file=input.files[0];if(!file)return;if(file.size>2000000)throw Error();const data=JSON.parse(await file.text());if(data.format!=='veille-noire'||!validateSave(data.game))throw Error();game=data.game;resultShownFor=null;const p=data.progress&&typeof data.progress==='object'?data.progress:{};for(const key of Object.keys(p))if(/^\d$/.test(key)&&Number(key)<MISSIONS.length)progress[key]=p[key];localStorage.setItem(PROGRESS,JSON.stringify(progress));screen='game';mode='move';roundReport=null;boardZoom=false;selectedZone=active(game).zone;closeModal();saveGame();render();toast('Expédition restaurée.');}catch{toast('Fichier de sauvegarde invalide. La partie actuelle est conservée.');}finally{input.remove();}});input.click();}
let audioCtx;function tone(kind){if(muted)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const now=audioCtx.currentTime;o.type=kind==='attack'?'sawtooth':'sine';const freq={move:210,click:440,attack:100,round:65,error:130}[kind]||260;const len=kind==='round'?.8:kind==='attack'?.2:.07;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(freq*.45,now+len);g.gain.setValueAtTime(.055,now);g.gain.exponentialRampToValueAtTime(.001,now+len);o.start(now);o.stop(now+len);}catch{}}
function codex(){modal('Les derniers de Nacre',`<p class="brief-text">La Rupture a eu lieu neuf nuits plus tôt. Les digues ont cédé. Sous la ville, un réseau vivant a commencé à chanter. Les habitants touchés par la lumière le suivent désormais. On les appelle le Chœur.</p><div class="lore-timeline"><div><b>2074</b><p>Nacre construit les premières digues vivantes. Un organisme marin répare le béton et alimente les quartiers.</p></div><div><b>2088</b><p>La Compagnie des Marées découvre que le réseau réagit au son. Ses expériences disparaissent des archives.</p></div><div><b>2091</b><p>La Rupture. Le réseau s’éveille, les écluses cèdent et les premières voix s’élèvent sous les rues.</p></div></div><h3 class="codex-heading">Ceux qui veillent</h3><div class="codex-grid">${HEROES.map(h=>`<article>${portrait(h)}<h3>${h.name}</h3><span class="eyebrow">${h.role}</span><p>${h.lore}</p><strong>${BASE_SKILLS[h.id]||h.skill}</strong></article>`).join('')}</div><h3 class="codex-heading">Ceux qui chantent</h3><div class="codex-grid">${Object.entries(ENEMIES).map(([id,e])=>`<article>${enemyPortrait(id)}<h3>${e.name}</h3><span class="eyebrow">${e.hp} PV · ARMURE ${e.armor} · ${e.speed} ACTION${e.speed>1?'S':''}</span><p>${e.lore}</p><strong>${e.damage} dégât${e.damage>1?'s':''} par attaque · ${e.xp} XP</strong></article>`).join('')}</div><h3 class="codex-heading">Les archives de l’escouade</h3><div class="campaign-archives">${MISSIONS.map(m=>`<article><span>${m.chapter}</span><div><h4>${m.title}</h4><p>${progress[m.id]?m.debrief:'Accomplissez cette expédition pour en découvrir la conclusion.'}</p></div>${progress[m.id]?icon('check'):icon('book')}</article>`).join('')}</div><p class="muted">Univers, personnages, illustrations et scénarios originaux. Les images ont été créées pour Veille Noire avec une génération d’images assistée par IA.</p>`,true);}
document.addEventListener('keydown',e=>{if(busy){if(e.key==='Escape')phaseController?.abort();return;}if(e.key==='Escape'){closeModal();mode='move';if(screen==='game')render();}const dialog=$('[role="dialog"]');if(e.key==='Tab'&&dialog){const focusable=[...dialog.querySelectorAll('button:not(:disabled),select,a[href],input')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
document.addEventListener('keydown',e=>{if(screen!=='game'||$('[role="dialog"]')||busy||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();const actions={m:'move',a:'attack',f:'search',p:'door',o:'interact'};if(actions[k]){e.preventDefault();handleGame(actions[k],{});}if(/^[1-4]$/.test(k)){const h=game.heroes[+k-1];if(h)dispatch({type:'select',id:h.id});}});
function onlineModal(){
 const saved=savedParty(),link=new URLSearchParams(location.hash.slice(1)).get('salon')||'';
 modal('Jouer ensemble',`<p class="lead">Un téléphone, un survivant. Une même expédition.</p><p class="muted">2 à 4 joueurs · Wi-Fi ou données mobiles · sans compte. Le serveur conserve le salon 24 h après la dernière action.</p><label class="net-field">Votre pseudo<input id="net-name" maxlength="20" autocomplete="nickname" placeholder="Votre prénom ou pseudo" value="${esc(saved?.nick||'')}"></label><div class="net-create">${btn('Créer un salon','netCreate','primary full')}</div><div class="net-divider">OU REJOINDRE DES AMIS</div><label class="net-field">Code du salon<input id="net-code" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="8 lettres ou chiffres" value="${esc(link)}"></label>${btn('Rejoindre le salon','netJoin','secondary full')}${saved?btn('Reprendre mon salon '+saved.code,'netResume','quiet full'):''}<p class="net-note">Vous pouvez toujours jouer en solo depuis l’accueil.</p>`);
}
async function connectParty(host,resume=false){
 if(netPending)return;
 const nick=$('#net-name')?.value.trim()||'Veilleur',code=$('#net-code')?.value.trim().toUpperCase().replace(/\s/g,'');
 if(!host&&!resume&&!validCode(code))return toast('Saisissez les 8 caractères du code de salon.');
 netPending=true;
 modal('Connexion à l’escouade',`<p role="status">${resume?'Reprise du salon…':host?'Création du salon…':'Connexion au salon…'}</p><p class="muted">Votre partie solo reste enregistrée.</p>`);
 const current=new Party({onState:(r,e)=>{if(party===current)receiveParty(r,e);},onStatus:()=>{if(party===current)refreshPartyStatus();}});party=current;
 try{await current.open({host,code,nick,resume});if(party!==current)return;closeModal();if(!partyRoom?.game){screen='party';render();}history.replaceState(null,'',location.pathname+location.search);}
 catch(e){current.leave(false);if(party!==current)return;party=null;partyRoom=null;netPending=false;onlineModal();toast(e.message);}
 finally{if(party===current){netPending=false;render();}}
}
function me(){return partyRoom?.players.find(p=>p.id===party?.identity.id);}
function partyBlocked(){return !!party&&(!party.connected||netPending||me()?.ready);}
function partyBanner(){
 if(!partyRoom)return '';
 const mine=me(),alive=partyRoom.game?partyRoom.players.filter(p=>partyRoom.game.heroes.find(h=>h.id===p.hero)?.hp>0):partyRoom.players,ready=alive.filter(p=>p.ready).length;
 return `<div class="party-bar"><button data-action="netInfo" class="party-code">${icon('shield',15)} ${partyRoom.code}</button><span><b>${esc(mine?.nick||'')} · ${HEROES.find(h=>h.id===mine?.hero)?.name.split(' ')[0]||''}</b><small class="net-status">${party.connected?(netPending?'Validation de l’action…':!partyRoom.game?`${ready}/${alive.length} prêts pour le départ`:mine?.ready?'Tour terminé · en attente des alliés':`${ready}/${alive.length} tours terminés`):esc(party.message||'Reconnexion…')}</small></span><button class="quiet" data-action="netReconnect" aria-label="Resynchroniser le salon">${icon('save',16)}</button></div>`;
}
function refreshPartyStatus(){const node=$('.net-status');if(node)node.textContent=party?.connected?(netPending?'Validation de l’action…':!partyRoom?.game?`${partyRoom.players.filter(p=>p.ready).length}/${partyRoom.players.length} prêts pour le départ`:me()?.ready?'Tour terminé · en attente des alliés':'Partie synchronisée'):party?.message||'Connexion…';}
function renderParty(){
 if(!partyRoom)return renderHome();const mine=me(),owner=partyRoom.host===party.identity.id;
 app.innerHTML=`<main class="setup-page party-page"><header class="topbar">${logo()}${btn('Retour au solo','netLeave','quiet')}</header><div class="setup-content"><div class="setup-heading"><div><span class="eyebrow">COOPÉRATION EN LIGNE</span><h1>Rassemblez les veilleurs.</h1><p>Chacun choisit son personnage et confirme qu’il est prêt. L’hôte peut ensuite lancer l’expédition.</p></div><div class="room-invite"><span>CODE DU SALON</span><strong>${partyRoom.code}</strong>${btn('Copier le lien d’invitation','netCopy','small-button')}</div></div>${partyBanner()}<div class="party-members">${partyRoom.players.map(p=>`<article>${portrait(HEROES.find(h=>h.id===p.hero))}<div><strong>${esc(p.nick)}${p.id===mine.id?' · vous':''}</strong><small>${HEROES.find(h=>h.id===p.hero).name}${p.id===partyRoom.host?' · hôte':''}</small><span class="${p.online?'connected':'offline'}">${p.online?(p.ready?'✓ Prêt pour le départ':'À confirmer'):'Hors ligne · place réservée'}</span></div>${owner&&p.id!==mine.id?btn('Retirer','netRemove','quiet',`data-id="${p.id}"`):''}</article>`).join('')}</div><div class="room-settings"><label>Expédition<select id="net-mission" ${owner?'':'disabled'}>${MISSIONS.map(m=>`<option value="${m.id}" ${m.id===partyRoom.mission?'selected':''}>${m.chapter} · ${m.title}</option>`).join('')}</select></label><label>Intensité<select id="net-difficulty" ${owner?'':'disabled'}>${[['story','Exploration'],['normal','Survie'],['nightmare','Cauchemar']].map(([id,label])=>`<option value="${id}" ${id===partyRoom.difficulty?'selected':''}>${label}</option>`).join('')}</select></label></div><details class="quick-rules-fold"><summary>Première partie ? Lire les règles en 2 minutes</summary>${quickRules()}</details><h2 class="net-roster-title">Votre survivant</h2><div class="roster-grid">${HEROES.map(h=>{const other=partyRoom.players.find(p=>p.hero===h.id&&p.id!==mine.id),chosen=h.id===mine.hero;return `<button class="roster-card ${chosen?'chosen':''}" data-action="netHero" data-id="${h.id}" ${other||netPending?'disabled':''} aria-pressed="${chosen}" aria-label="Choisir ${h.name}" style="--hero:${h.color}">${portrait(h)}<span class="roster-body"><span class="roster-role">${h.role}</span><strong>${h.name}</strong><span class="roster-skill">${BASE_SKILLS[h.id]||h.skill}</span><span class="roster-stats">${h.hp} PV · ${other?'Choisi par '+esc(other.nick):chosen?'Votre personnage':WEAPONS[h.weapon].name}</span></span><span class="roster-pick">${chosen?icon('check',17):other?icon('shield',17):'+'}</span></button>`;}).join('')}</div><div class="setup-footer"><div><strong>${partyRoom.players.filter(p=>p.ready).length} / ${partyRoom.players.length} prêts</strong><p class="net-note">Tout le monde doit valider. Mission ou escouade modifiée : confirmez à nouveau.</p></div><div class="lobby-actions">${btn(mine.ready?'Annuler ma validation':'Je suis prêt','netLobbyReady',mine.ready?'secondary':'primary',`aria-pressed="${mine.ready}" ${netPending||!party.connected?'disabled':''}`)}${owner?btn('Lancer l’expédition '+icon('play'),'netStart','primary',partyRoom.players.length<2||partyRoom.players.some(p=>!p.online||!p.ready)||netPending||!party.connected?'disabled':''):'<span class="muted">L’hôte lancera le départ.</span>'}</div></div></div></main>`;
}
function partyInfo(){
 modal('Votre escouade en ligne',`<div class="room-invite"><span>CODE DU SALON</span><strong>${partyRoom.code}</strong>${btn('Copier le lien d’invitation','netCopy','small-button')}</div><div class="party-members">${partyRoom.players.map(p=>`<article>${portrait(HEROES.find(h=>h.id===p.hero))}<div><strong>${esc(p.nick)}</strong><small>${HEROES.find(h=>h.id===p.hero).name} · ${p.online?(p.ready?'Tour terminé':'En jeu'):'Déconnecté'}</small></div></article>`).join('')}</div><p class="muted">Chacun contrôle son survivant. Quand tous les personnages debout terminent leur tour, le Chœur agit automatiquement. Un allié déconnecté conserve sa place ; il peut revenir avec ce même navigateur.</p>${btn('Resynchroniser la partie','netReconnect','secondary full')}${btn('Retour au solo','netLeave','quiet full')}`);
}
async function copyParty(){
 const link=location.origin+location.pathname+'#salon='+partyRoom.code;
 try{await navigator.clipboard.writeText(link);toast('Lien copié. Partagez-le avec votre escouade.');}catch{modal('Inviter votre escouade',`<p>Code : <strong>${partyRoom.code}</strong></p><label class="net-field">Lien d’invitation<input readonly value="${esc(link)}"></label>`);}
}
function leaveParty(){
 phaseController?.abort();party?.leave(false);party=null;partyRoom=null;netQueue=null;game=null;screen='home';busy=false;netPending=false;closeModal();render();window.scrollTo(0,0);
}
function receiveParty(snapshot,event){netQueue={snapshot,event};if(!netApplying)void flushParty();}
async function flushParty(){
 if(netApplying)return;netApplying=true;const session=party;
 try{while(netQueue&&party===session){
  const {snapshot,event}=netQueue;netQueue=null;const previous=partyRoom,before=previous?.game?game:null;
  partyRoom=snapshot;
  if(!snapshot.game){screen='party';render();continue;}
  if(previous?.revision===snapshot.revision){render();continue;}
  const own=me();if(!own)continue;
  game=structuredClone(snapshot.game);game.active=own.hero;screen='game';selectedZone=active(game).zone;
  const advanced=before&&game.round>before.round;
  if(!before||advanced){closeModal();mode='move';roundReport=advanced?phaseSummary(before,game):savedPhaseSummary(game);}
  if(advanced&&game.round===before.round+1&&motionAllowed()){
   busy=true;phaseController=new AbortController();const skip=()=>phaseController?.abort();document.addEventListener('skip-phase',skip);
   try{await animatePhase($('.board'),before,game,enemyPortrait,{signal:phaseController.signal});}catch{}finally{document.removeEventListener('skip-phase',skip);phaseController=null;busy=false;}
  }
  if(party!==session)break;render();if(!before)window.scrollTo(0,0);
  if(before&&!advanced&&motionAllowed()){busy=true;try{await animateSurvivors($('.board'),before,game,portrait);}finally{busy=false;}}
  if(before)showWounds(before,game,HEROES);
  if(before&&game.lastDiscovery&&['search','interact'].includes(event?.action)&&event.revision===snapshot.revision){if(event.actor===party.identity.id)discoveryModal(game.lastDiscovery);else toast(HEROES.find(h=>h.id===game.lastDiscovery.hero).name+' trouve '+(WEAPONS[game.lastDiscovery.item]||ITEMS[game.lastDiscovery.item]).name+'.');}
  if(before&&!advanced&&['attack','power'].includes(event?.action)&&event.revision===snapshot.revision&&game.lastRoll&&motionAllowed()){
   busy=true;try{await animateDice(game.lastRoll);}catch{}finally{busy=false;}
  }
  if(!before)toast('L’escouade entre dans Nacre. Vous contrôlez '+HEROES.find(h=>h.id===own.hero).name+'.');
  if(game.status==='won'){progress[game.mission]={rounds:game.round,kills:game.stats.kills,date:new Date().toISOString()};try{localStorage.setItem(PROGRESS,JSON.stringify(progress));}catch{}}
 }}finally{netApplying=false;if(netQueue&&party)void flushParty();else if(party&&!netPending)render();}
}
async function sendParty(command){
 if(netPending||!party)return false;
 if(!party.connected)return toast('Connexion interrompue. Attendez la resynchronisation.');
 const current=party;netPending=true;refreshPartyStatus();
 try{await current.command(command);if(party!==current)return false;if(command.kind==='action'){if(['door','use','exchange'].includes(command.action.type))mode='move';if(command.action.type==='exchange')toast('Matériel échangé · 1 action utilisée.');}return true;}
 catch(e){if(party===current)toast(e.message);return false;}
 finally{if(party===current){netPending=false;if(!netApplying)render();else refreshPartyStatus();}}
}
function partyReady(){
 const own=me();if(own.ready){autoHold=autoKeyFor(own.hero);stopAutoEnd();return sendParty({kind:'ready',ready:false});}
 const h=active(game);
 if(h.ap>0&&h.hp>0)return modal('Terminer votre tour ?',`<p>${HEROES.find(d=>d.id===h.id).name} dispose encore de <strong>${h.ap} action${h.ap>1?'s':''}</strong>. Vous pourrez reprendre votre tour tant qu’un allié joue encore.</p><p class="muted">La phase ennemie commence automatiquement quand tous les survivants debout ont terminé.</p>${btn('Terminer mon tour','netReady','primary full')}${btn('Continuer à jouer','close','secondary full')}`);
 return sendParty({kind:'ready',ready:true});
}
function handleOnline(a,d){
 if(a==='online')return onlineModal();
 if(a==='netCreate')return connectParty(true);
 if(a==='netJoin')return connectParty(false);
 if(a==='netResume')return connectParty(false,true);
 if(a==='netLeave')return leaveParty();
 if(a==='netReconnect'){closeModal();return party?.reconnect();}
 if(a==='netCopy')return copyParty();
 if(a==='netInfo')return partyInfo();
 if(a==='netHero')return sendParty({kind:'hero',hero:d.id});
 if(a==='netStart')return sendParty({kind:'start'});
 if(a==='netLobbyReady')return sendParty({kind:'lobbyReady',ready:!me()?.ready});
 if(a==='netReady'){closeModal();return sendParty({kind:'ready',ready:true});}
 if(a==='netRemove')return modal('Retirer ce joueur ?',`<p>Sa place sera libérée avant le départ.</p>${btn('Retirer du salon','netRemoveConfirm','primary full',`data-id="${d.id}"`)}${btn('Annuler','close','secondary full')}`);
 if(a==='netRemoveConfirm'){closeModal();return sendParty({kind:'remove',player:d.id});}
}
document.addEventListener('change',e=>{if(e.target.id==='net-mission'||e.target.id==='net-difficulty')sendParty({kind:'settings',mission:Number($('#net-mission').value),difficulty:$('#net-difficulty').value});});

render();




if(new URLSearchParams(location.hash.slice(1)).has('salon'))onlineModal();

function dockSummary(h,d,w){return '<div class="dock-summary">'+portrait(d)+'<button data-action="openPanel" data-id="equipment" class="dock-person"><strong>'+d.name+'</strong><small>'+h.ap+' PA · '+w.name+'</small></button>'+((POWERS[h.id]&&h.evolution===1)||hasTalent(h,'push')?btn(icon('fire',16)+' Pouvoir'+(balanced(h)&&!hasTalent(h,'awakening')?' · 19 XP':POWERS[h.id]?' · '+h.ether+'/'+maxEther(h):''),'powerMenu','dock-power'):'')+btn(talentSlots(h)?'Choisir '+talentSlots(h)+' talent(s)':'Talents · Niv. '+survivorLevel(h).number,'level','dock-level '+(talentSlots(h)?'pending':''))+'</div>';}
function talentChoices(h){
 if(h.evolution!==1)return '';const count=talentSlots(h),choices=availableTalents(h);
 const next=balanced(h)?CHOICE_XP[(h.talents||[]).length]:survivorLevel(h).next;
 return '<h3>'+ (count?'Choisissez votre talent':'Vos talents')+'</h3><p class="tip">'+(count?'Un choix permanent. Les options dépendent du personnage et du palier.':next?'Prochain choix à '+next+' XP.':'Tous vos choix ont été effectués.')+'</p>'+(count?'<div class="talent-grid">'+choices.map(id=>btn('<strong>'+TALENTS[id].name+'</strong><span>'+(id==='awakening'?powerInfo(h).desc:talentDescription(h,id))+'</span>','learnTalent','talent-choice','data-id="'+id+'"')).join('')+'</div>':'')+'<div class="talent-grid">'+(h.talents||[]).map(id=>'<article class="learned"><strong>✓ '+TALENTS[id].name+'</strong><p>'+talentDescription(h,id)+'</p></article>').join('')+'</div>'+(balanced(h)?'<h3>Votre arbre de talents</h3>'+[talentBranch(h,0),talentBranch(h,1)].map((ids,i)=>'<p><b>'+ (i?'43 XP · maîtrise':'19 XP · spécialisation')+'</b><br>'+ids.map(id=>TALENTS[id].name).join(' / ')+'</p>').join('')+'<p class="muted">70 XP : seconde spécialisation. 100 XP : autre maîtrise. Aucun bonus automatique de dés, de précision ou de cinquième action.</p>':'');
}
function discoveryModal(found){const c=WEAPONS[found.item]||ITEMS[found.item],h=active(game),lock=weaponLock(h,found.item);modal(c.rarity?'Une relique de Nacre':'Votre découverte', '<div class="discovery-card '+(c.rarity?'legendary':'')+'"><span class="eyebrow">'+(found.source==='objective'?'RÉCOMPENSE D’OBJECTIF':c.rarity?'FOUILLE EXCEPTIONNELLE':'FOUILLE RÉUSSIE')+'</span>'+itemArt(found.item)+'<h3>'+c.name+'</h3><p>'+c.desc+'</p>'+(WEAPONS[found.item]?weaponStats(found.item):'')+'<p class="muted">Ajouté au sac de '+HEROES.find(d=>d.id===found.hero).name+'.'+(WEAPONS[found.item]?' Cette arme est dans la réserve ; elle n’est pas encore équipée.':'')+'</p>'+(lock?'<p class="equipment-lock">'+lock+' Vous pouvez la garder ou la transmettre.</p>':'')+'</div>'+(found.hero===h.id&&WEAPONS[found.item]&&!lock&&h.ap>=equipCost(game)?btn('Équiper · '+equipCost(game)+' PA','discoveryEquip','primary full','data-id="'+found.item+'"'):'')+btn('Continuer','close','secondary full'));}
function powerModal(){const h=active(game),p=powerInfo(h),options=p?powerTargets(game,h):[],locked=partyBlocked()||h.hp<=0||game.status!=='playing';let html=p?'<p class="lead">'+p.name+'</p><p>'+p.desc+'</p>'+(powerLock(h)?'<p class="equipment-lock">'+powerLock(h)+'</p>':'')+'<p class="muted">Éther '+h.ether+'/'+maxEther(h)+' · +1 à chaque nouvelle manche. '+(hasTalent(h,'overflow')?talentDescription(h,'overflow'):'')+'</p><div class="power-targets">'+options.map(target=>btn(p.kind==='hero'?HEROES.find(d=>d.id===target).name:'Zone '+(target+1),'castPower','small-button',(p.kind==='hero'?'data-target="'+target+'"':'data-id="'+target+'"')+(locked||h.ap<p.cost||h.ether<p.ether?' disabled':''))).join('')+'</div>'+(!options.length&&!powerLock(h)?'<p class="tip">Aucune cible disponible. Rapprochez-vous par un passage ouvert.</p>':''):'';if(hasTalent(h,'push'))html+='<h3>Onde de recul</h3><p>'+talentDescription(h,'push')+'</p><div class="power-targets">'+neighbors(game,h.zone).map(z=>btn('Repousser vers '+(z+1),'castPower','small-button','data-kind="push" data-id="'+z+'"'+(locked||h.ap<1||balanced(h)&&h.pushUsed?' disabled':''))).join('')+'</div>';modal('Pouvoirs de '+HEROES.find(d=>d.id===h.id).name,html);}



// V1.8 · Fin de tour automatique : un compte à rebours démarre quand la dernière action est jouée,
// se met en pause pendant les animations et les fenêtres, et peut être suspendu pour la manche.
const autoKeyFor=hero=>'r'+game.round+':'+hero;
function autoEndTarget(){
 if(!autoEnd||screen!=='game'||!game)return null;
 if(party){const own=me();if(!partyRoom?.game||!own||own.ready||!party.connected)return null;const plan=autoEndPlan(game,own.hero);return plan&&{...plan,key:autoKeyFor(own.hero)};}
 const plan=autoEndPlan(game);return plan&&{...plan,key:autoKeyFor('')};
}
function autoEndBanner(plan,seconds){
 let el=$('#auto-end');
 if(!el){el=document.createElement('div');el.id='auto-end';el.className='auto-end';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.append(el);}
 const free=plan.free.length?`<small>${plan.free.map(f=>HEROES.find(h=>h.id===f.hero).name.split(' ')[0]+' peut encore '+f.what+' gratuitement').join(' · ')}</small>`:'';
 const label=plan.scope==='round'?'Fin de manche':'Fin de votre tour';
 el.innerHTML=`<span><strong>${label} dans ${seconds} s</strong>${free}</span><button data-action="autoEndHold" class="small-button">Attendre</button>`;
 el.hidden=false;
}
function stopAutoEnd(){clearInterval(autoTimer);autoTimer=null;autoLeft=0;const el=$('#auto-end');if(el)el.hidden=true;}
function syncAutoEnd(){
 const plan=autoEndTarget();
 if(!plan||plan.key===autoHold){if(autoTimer||$('#auto-end:not([hidden])'))stopAutoEnd();if(!plan)autoKey='';return;}
 if(autoTimer&&autoKey===plan.key)return;
 stopAutoEnd();autoKey=plan.key;autoLeft=plan.free.length?6000:3000;
 const step=200;
 autoTimer=setInterval(()=>{
  const now=autoEndTarget();
  if(!now||now.key!==autoKey||now.key===autoHold)return stopAutoEnd();
  const paused=busy||netPending||document.hidden||document.body.classList.contains('modal-open');
  const el=$('#auto-end');
  if(paused){if(el)el.hidden=true;return;}
  autoLeft-=step;
  if(autoLeft>0)return autoEndBanner(now,Math.ceil(autoLeft/1000));
  stopAutoEnd();autoHold=autoKey;
  if(party){sendParty({kind:'ready',ready:true}).then(ok=>{if(ok)toast('Tour terminé automatiquement. « Reprendre mon tour » pour continuer.');});}
  else runRound();
 },step);
 if(!(busy||netPending||document.body.classList.contains('modal-open')))autoEndBanner(plan,Math.ceil(autoLeft/1000));
}
