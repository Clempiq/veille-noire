import {NET_VERSION,validCode,validSnapshot} from './room-model.js';
const STORE='veille-noire.party.v2';
const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
export const savedParty=()=>{try{const s=JSON.parse(sessionStorage.getItem(STORE)||localStorage.getItem(STORE));return s&&validCode(s.code)&&s.identity?.id&&s.identity?.token?s:null;}catch{return null;}};
export class Party{
 constructor({onState,onStatus}){this.onState=onState;this.onStatus=onStatus;this.connected=false;this.closed=false;this.sending=false;this.polling=false;}
 async open({host=false,code,nick='Veilleur',resume=false}){
  const saved=resume?savedParty():null;
  this.identity=saved?.identity??{id:random(16),token:random(24)};this.nick=saved?.nick??nick;this.code=saved?.code??code;this.host=saved?.host??host;
  this.status('Connexion au salon…',false);
  const result=await this.request({type:saved?'join':host?'create':'join',code:this.code,nick:this.nick,protocol:NET_VERSION});
  if(this.closed)return;
  this.code=result.snapshot.code;this.host=result.snapshot.host===this.identity.id;this.persist();this.accept(result.snapshot);this.schedule();
  this.wake=()=>{if(document.visibilityState==='visible')this.poll();};document.addEventListener('visibilitychange',this.wake);
 }
 persist(){try{const data=JSON.stringify({identity:this.identity,code:this.code,nick:this.nick,host:this.host});sessionStorage.setItem(STORE,data);localStorage.setItem(STORE,data);}catch{}}
 status(text,connected){if(this.closed)return;const changed=this.message!==text||this.connected!==connected;this.message=text;this.connected=connected;if(changed)this.onStatus?.(text,connected);}
 async request(body=null){
  const response=await fetch('/api/party'+(body?'':'?code='+encodeURIComponent(this.code)),{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':'Bearer '+this.identity.token,'X-Player-Id':this.identity.id},body:body?JSON.stringify({...body,identity:this.identity}):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});
  let data;try{data=await response.json();}catch{throw Error('Le service multijoueur ne répond pas.');}
  if(!response.ok)throw Error(data.error||'Connexion au salon indisponible.');return data;
 }
 accept(snapshot){
  if(this.closed)return;
  if(!validSnapshot(snapshot)||this.code&&snapshot.code!==this.code||!snapshot.players.some(p=>p.id===this.identity.id))throw Error('Votre place dans ce salon n’est plus disponible.');
  const reconnected=!this.connected;
  this.status('Partie synchronisée',true);
  if(this.snapshot&&snapshot.revision<this.snapshot.revision)return;
  const changed=!this.snapshot||snapshot.revision!==this.snapshot.revision||snapshot.players.some((p,i)=>p.online!==this.snapshot.players[i]?.online);
  this.snapshot=snapshot;if(changed||reconnected)this.onState?.(snapshot,snapshot.event);
 }
 schedule(){clearTimeout(this.timer);if(!this.closed)this.timer=setTimeout(()=>this.poll(),document.visibilityState==='hidden'?10000:this.connected?1500:4000);}
 async poll(){
  if(this.closed||this.polling||this.sending)return this.schedule();
  this.polling=true;try{const data=await this.request();this.accept(data.snapshot);}catch(e){this.status(e.message||'Connexion interrompue. Reconnexion…',false);}finally{this.polling=false;this.schedule();}
 }
 async reconnect(){await this.poll();}
 async command(command){
  if(this.closed||!this.snapshot||!this.connected)throw Error('Attendez la reconnexion au salon.');
  if(this.sending)throw Error('L’action précédente est encore en cours.');
  this.sending=true;clearTimeout(this.timer);
  const request={...command,id:random(16),revision:this.snapshot.revision};
  let received=false;
  try{
   let result;
   // The same command ID is safe to retry if the reply was lost after the server committed it.
   for(let attempt=0;attempt<2;attempt++){try{result=await this.request({type:'command',code:this.code,request});break;}catch(e){if(attempt)throw e;}}
   this.accept(result.snapshot);received=true;if(result.error)throw Error(result.error);return this.snapshot;
  }catch(e){if(!received)this.status('Vérification de la connexion…',false);throw e;}finally{this.sending=false;this.schedule();}
 }
 leave(forget=true){this.closed=true;clearTimeout(this.timer);document.removeEventListener('visibilitychange',this.wake);if(forget)try{sessionStorage.removeItem(STORE);const old=JSON.parse(localStorage.getItem(STORE));if(old?.identity?.id===this.identity.id)localStorage.removeItem(STORE);}catch{}}
}
