import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createRoom,joinRoom,roomCommand,publicRoom,validCode,NET_VERSION} from '../room-model.js';

const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code=()=>Array.from(randomBytes(8),b=>alphabet[b%32]).join('');
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,48);
const error=(message,status=400)=>Object.assign(Error(message),{status});
const identity=body=>{
 if(!/^[a-f0-9]{32}$/.test(body?.id||'')||!/^[a-f0-9]{48}$/.test(body?.token||''))throw error('Identité de connexion invalide.',401);
 return {id:body.id,token:hash(body.token)};
};
export function makeService(store){
 async function state(room,id){const seen=await store.presence(room.code,id),view=publicRoom(room);for(const p of view.players)p.online=Date.now()-(seen[p.id]||0)<25000;return view;}
 return async({method,body={},query={},ip='local',auth})=>{
  if(query.health!==undefined)return {available:!!store,protocol:NET_VERSION};
  if(!store)throw error('Les salons sont en cours d’activation. Le solo reste disponible.',503);
  const who=identity(auth||body.identity);
  if(method==='POST'&&['create','join'].includes(body.type)){
   if(!await store.limit(hash(ip)+':'+body.type,body.type==='create'?12:60,3600))throw error('Trop de demandes de salon. Réessayez plus tard.',429);
   if(body.protocol!==NET_VERSION)throw error('Rechargez le jeu pour utiliser la dernière version.',409);
   if(body.type==='create'){
    for(let i=0;i<4;i++){const room=createRoom(code(),who,body.nick);room.expiresAt=Date.now()+86400000;if(await store.create(room))return {snapshot:await state(room,who.id)};}
    throw error('Impossible de créer ce salon. Réessayez.',503);
   }
  }
  const roomCode=method==='GET'?query.code:body.code;if(!validCode(roomCode))throw error('Code de salon invalide.');
  for(let attempt=0;attempt<4;attempt++){
   const room=await store.get(roomCode);if(!room||room.expiresAt<Date.now())throw error('Salon introuvable ou expiré. Vérifiez le code.',404);
   if(method==='POST'&&body.type==='join'){
    let next;try{next=joinRoom(room,who,body.nick);}catch(e){throw error(e.message);}
    next.expiresAt=Date.now()+86400000;
    if(await store.cas(roomCode,room.revision,next))return {snapshot:await state(next,who.id)};
    continue;
   }
   const player=room.players.find(p=>p.id===who.id);
   if(!player||!timingSafeEqual(Buffer.from(player.token),Buffer.from(who.token)))throw error('Cette place n’est plus disponible. Rejoignez le salon.',401);
   if(method==='GET')return {snapshot:await state(room,who.id)};
   if(body.type!=='command')throw error('Commande inconnue.');
   if(!await store.limit(roomCode+':'+who.id,20,10))throw error('Patientez un instant avant la prochaine action.',429);
   const seen=await store.presence(roomCode,who.id);
   for(const p of room.players)p.online=Date.now()-(seen[p.id]||0)<25000;
   const result=roomCommand(room,who.id,body.request,randomBytes(4).readUInt32LE());
   if(result.error)return {error:result.error,snapshot:await state(room,who.id)};
   if(result.duplicate)return {snapshot:await state(room,who.id)};
   result.room.expiresAt=Date.now()+86400000;
   result.room.event={actor:who.id,kind:body.request.kind,action:body.request.action?.type,revision:result.room.revision};
   if(await store.cas(roomCode,room.revision,result.room))return {snapshot:await state(result.room,who.id)};
   // A concurrent command must be reviewed against the new board, never silently replayed.
  }
  throw error('Le salon est occupé. Réessayez votre action.',409);
 };
}
