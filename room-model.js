import {HEROES,MISSIONS} from './content.js';
import {createGame,act,validateSave} from './engine.js';

export const NET_VERSION=5;
export const validCode=code=>typeof code==='string'&&/^[A-HJ-NP-Z2-9]{8}$/.test(code);
export const cleanName=name=>String(name||'Veilleur').trim().slice(0,20)||'Veilleur';
const heroExists=id=>HEROES.some(h=>h.id===id);
const fail=text=>{throw Error(text);};
const actions=new Set(['talent','power','push','move','door','attack','search','interact','heal','equip','use','trade','exchange','drop','escort','extract']);
const resetLobbyReady=room=>room.players.forEach(p=>p.ready=false);

export function createRoom(code,identity,nick){
 if(!validCode(code))fail('Code de salon invalide.');
 return {protocol:NET_VERSION,code,revision:0,host:identity.id,mission:0,difficulty:'normal',game:null,players:[{id:identity.id,token:identity.token,nick:cleanName(nick),hero:'lina',ready:false,online:true,seen:[]}]};
}
export function joinRoom(original,identity,nick){
 if(!identity||typeof identity.id!=='string'||!/^[a-f0-9]{32}$/.test(identity.id)||typeof identity.token!=='string'||!/^[a-f0-9]{48}$/.test(identity.token))fail('Identité de connexion invalide.');
 const room=structuredClone(original),old=room.players.find(p=>p.id===identity.id);
 if(old){if(old.token!==identity.token)fail('Cette place appartient à une autre connexion.');old.online=true;}
 else{
  if(room.game)fail('Cette expédition a déjà commencé.');
  if(room.players.length>=4)fail('Le salon est complet (4 joueurs).');
  room.players.push({id:identity.id,token:identity.token,nick:cleanName(nick),hero:HEROES.find(h=>!room.players.some(p=>p.hero===h.id)).id,ready:false,online:true,seen:[]});
  resetLobbyReady(room);
 }
 room.revision++;return room;
}
export function setPresence(original,id,online){
 const room=structuredClone(original),p=room.players.find(p=>p.id===id);if(p&&p.online!==online){p.online=online;room.revision++;}return room;
}
export function publicRoom(room){
 return {...room,players:room.players.map(({token,seen,...p})=>p)};
}
export function validSnapshot(r){
 try{return [1,2,3,4,NET_VERSION].includes(r?.protocol)&&validCode(r.code)&&Number.isSafeInteger(r.revision)&&r.revision>=0&&Number.isInteger(r.mission)&&!!MISSIONS[r.mission]&&['story','normal','nightmare'].includes(r.difficulty)&&Array.isArray(r.players)&&r.players.length>=1&&r.players.length<=4&&new Set(r.players.map(p=>p.id)).size===r.players.length&&new Set(r.players.map(p=>p.hero)).size===r.players.length&&r.players.some(p=>p.id===r.host)&&r.players.every(p=>typeof p.id==='string'&&/^[a-f0-9]{32}$/.test(p.id)&&typeof p.nick==='string'&&p.nick.length<=20&&heroExists(p.hero)&&typeof p.ready==='boolean'&&typeof p.online==='boolean')&&(!r.game||validateSave(r.game)&&r.game.heroes.length===r.players.length&&r.players.every(p=>r.game.heroes.some(h=>h.id===p.hero)));}catch{return false;}
}
// Only the server runs this transition; the sender is bound to an authenticated session.
export function roomCommand(original,sender,request,seed=Date.now()){
 try{
  const room=structuredClone(original),player=room.players.find(p=>p.id===sender);
  if(!player||!player.online)fail('Reconnectez-vous au salon.');
  if(!request||typeof request.id!=='string'||!/^[a-f0-9]{32}$/.test(request.id))fail('Commande invalide.');
  if(player.seen.includes(request.id))return {room:original,duplicate:true};
  if(request.revision!==room.revision)fail('La partie a évolué. Vérifiez le plateau puis réessayez.');
  const owner=sender===room.host;
  if(request.kind==='hero'){
   if(room.game)fail('L’escouade est déjà en mission.');
   if(room.protocol===1&&HEROES.find(h=>h.id===request.hero)?.portrait>=8)fail('Créez un nouveau salon V1.5 pour recruter les Éveillés.');
   if(room.protocol<5&&HEROES.find(h=>h.id===request.hero)?.portrait>=12)fail('Créez un nouveau salon V1.7 pour ces survivants.');
   if(!heroExists(request.hero)||room.players.some(p=>p.id!==sender&&p.hero===request.hero))fail('Ce survivant est déjà choisi.');
   if(player.hero!==request.hero){player.hero=request.hero;resetLobbyReady(room);}
  }else if(request.kind==='settings'){
   if(!owner||room.game)fail('Seul l’hôte choisit la mission avant le départ.');
   if(!Number.isInteger(request.mission)||!MISSIONS[request.mission]||!['story','normal','nightmare'].includes(request.difficulty))fail('Mission invalide.');
   if(room.mission!==request.mission||room.difficulty!==request.difficulty){if(room.protocol<5&&request.mission>=6)fail('Créez un nouveau salon V1.7 pour ces missions.');room.mission=request.mission;room.difficulty=request.difficulty;resetLobbyReady(room);}
  }else if(request.kind==='remove'){
   if(!owner||room.game||request.player===room.host)fail('Retrait impossible.');
   const count=room.players.length;room.players=room.players.filter(p=>p.id!==request.player);
   if(room.players.length!==count)resetLobbyReady(room);
  }else if(request.kind==='lobbyReady'){
   if(room.game)fail('L’escouade est déjà en mission.');
   if(typeof request.ready!=='boolean')fail('Commande invalide.');
   player.ready=request.ready;
  }else if(request.kind==='start'){
   if(!owner||room.game)fail('Seul l’hôte peut lancer la mission.');
   if(room.players.length<2||room.players.some(p=>!p.online))fail('Attendez de 2 à 4 joueurs connectés.');
   if(room.players.some(p=>!p.ready))fail('Chaque joueur doit confirmer « Je suis prêt » avant le départ.');
   room.game=createGame(room.mission,room.players.map(p=>p.hero),room.difficulty,seed,2,room.protocol>=3?1:0,room.protocol>=5?1:0);
   resetLobbyReady(room);
   if(room.protocol===1){delete room.game.expansion;delete room.game.relicClaimed;for(const h of room.game.heroes)for(const key of ['evolution','talents','ether','ward','swiftUsed','guardUsed'])delete h[key];}
  }else if(request.kind==='ready'){
   if(!room.game||room.game.status!=='playing')fail('Aucune manche à terminer.');
   if(typeof request.ready!=='boolean')fail('Commande invalide.');
   player.ready=request.ready;
   const alive=room.players.filter(p=>room.game.heroes.find(h=>h.id===p.hero).hp>0);
   if(alive.length&&alive.every(p=>p.ready)){
    const result=act(room.game,{type:'endRound'});if(result.error)fail(result.error);room.game=result.state;
    room.players.forEach(p=>p.ready=false);
   }
  }else if(request.kind==='action'){
   if(!room.game||room.game.status!=='playing')fail('Aucune expédition en cours.');
   if(player.ready)fail('Reprenez votre tour avant de jouer.');
   const action=request.action;
   if(!action||!actions.has(action.type)||JSON.stringify(action).length>1000)fail('Action multijoueur invalide.');
   const game={...room.game,active:player.hero},result=act(game,action);
   if(result.error)fail(result.error);
   room.game=result.state;if(!['attack','power'].includes(action.type))room.game.lastRoll=null;
   if(!validateSave(room.game))fail('État de partie invalide.');
  }else fail('Commande inconnue.');
  player.seen.push(request.id);player.seen=player.seen.slice(-64);room.revision++;
  return {room};
 }catch(error){return {room:original,error:error.message};}
}
