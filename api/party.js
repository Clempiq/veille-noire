import {RedisStore,MemoryStore} from '../server/party-store.js';
import {makeService} from '../server/party-service.js';
const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
const store=url&&token?new RedisStore(url,token):process.env.VN_LOCAL_MULTIPLAYER==='1'&&!process.env.VERCEL?new MemoryStore():null;
const service=makeService(store);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');res.statusCode=405;return res.end(JSON.stringify({error:'Méthode non autorisée.'}));}
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.statusCode=403;return res.end(JSON.stringify({error:'Origine non autorisée.'}));}
  const query=Object.fromEntries(new URL(req.url,'https://local').searchParams);
  let body=req.body;
  if(req.method==='POST'){
   if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(Error('Format JSON requis.'),{status:415});
   if(!body){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8000)throw Object.assign(Error('Requête trop volumineuse.'),{status:413});}body=JSON.parse(raw);}
   if(typeof body==='string')body=JSON.parse(body);
   if(JSON.stringify(body).length>8000)throw Object.assign(Error('Requête trop volumineuse.'),{status:413});
  }
  const auth=req.headers.authorization?{id:req.headers['x-player-id'],token:String(req.headers.authorization).replace(/^Bearer /,'')}:undefined;
  const result=await service({method:req.method,body:body||{},query,auth,ip:String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0]});
  res.statusCode=200;res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e.status||(e instanceof SyntaxError?400:503);res.end(JSON.stringify({error:e.status?e.message:e instanceof SyntaxError?'Requête JSON invalide.':'Le serveur de salons ne répond pas. Votre partie reste enregistrée ; réessayez.'}));}
}
