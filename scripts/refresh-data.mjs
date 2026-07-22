import {readFile,writeFile} from 'node:fs/promises';

const outputUrl=new URL('../data/live.json',import.meta.url);
const internalUrl=new URL('../config/internal-projects.json',import.meta.url);
const previous=JSON.parse(await readFile(outputUrl,'utf8'));
const internal=new Set(JSON.parse(await readFile(internalUrl,'utf8')).jiraKeys);
const now=new Date().toISOString();
const result={...previous,meta:{...previous.meta},sources:{...previous.sources}};

const compactUser=u=>u?{id:u.accountId,name:u.displayName}:null;
const compactIssue=i=>({
  key:i.key,summary:i.fields.summary,status:i.fields.status?.name||'Sin estado',
  statusCategory:i.fields.status?.statusCategory?.key||null,assignee:compactUser(i.fields.assignee),
  priority:i.fields.priority?.name||null,created:i.fields.created,updated:i.fields.updated,
  timeSpentSeconds:i.fields.timespent||0,originalEstimateSeconds:i.fields.timeoriginalestimate||0
});

function jiraAuth(){
 const base=process.env.JIRA_BASE_URL?.replace(/\/$/,'');
 const email=process.env.JIRA_EMAIL;
 const token=process.env.JIRA_API_TOKEN;
 if(!base||!email||!token)return null;
 return {base,headers:{Authorization:`Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,'Content-Type':'application/json','Accept':'application/json'}};
}

async function jiraSearch(auth,jql,fields){
 const issues=[];let nextPageToken;
 do{
  const response=await fetch(`${auth.base}/rest/api/3/search/jql`,{method:'POST',headers:auth.headers,body:JSON.stringify({jql,fields,maxResults:100,nextPageToken})});
  if(!response.ok)throw new Error(`Jira ${response.status}: ${await response.text()}`);
  const page=await response.json();issues.push(...(page.issues||[]));nextPageToken=page.nextPageToken;
 }while(nextPageToken);
 return issues;
}

function slaOf(issue){
 const value=issue.fields.customfield_10142;
 if(!value||value.errorMessage)return null;
 const cycle=value.ongoingCycle||value.completedCycles?.at(-1);
 if(!cycle)return null;
 return {breached:Boolean(cycle.breached),paused:Boolean(cycle.paused),goalMillis:cycle.goalDuration?.millis??null,elapsedMillis:cycle.elapsedTime?.millis??null,remainingMillis:cycle.remainingTime?.millis??null,breachTime:cycle.breachTime?.iso8601??null};
}

async function refreshJira(){
 const auth=jiraAuth();
 if(!auth){result.sources.jira={status:'pending',message:'Configura JIRA_BASE_URL, JIRA_EMAIL y JIRA_API_TOKEN.'};return false}
 const common=['summary','status','assignee','priority','created','updated','timespent','timeoriginalestimate'];
 const [lispro,listickets,qalt]=await Promise.all([
  jiraSearch(auth,'project = LISPRO ORDER BY updated DESC',common),
  jiraSearch(auth,'project = LISTICKETS ORDER BY updated DESC',[...common,'customfield_10142','customfield_10175','customfield_10211','customfield_10212']),
  jiraSearch(auth,'project = QALT ORDER BY updated DESC',common)
 ]);
 const requirementCandidates=lispro.filter(i=>/^\s*requerimiento\b/i.test(i.fields.summary||''));
 const projects=lispro.filter(i=>!/^\s*requerimiento\b/i.test(i.fields.summary||'')).map(i=>({...compactIssue(i),classification:internal.has(i.key)||/\binterno\b/i.test(i.fields.summary||'')?'Interno':'Pendiente'}));
 const tickets=listickets.map(i=>({...compactIssue(i),customer:i.fields.customfield_10175||null,customerCategory:i.fields.customfield_10211?.value||null,tenant:i.fields.customfield_10212||null,sla:slaOf(i)}));
 const qa=qalt.map(compactIssue);
 const people=new Map();
 for(const issue of [...lispro,...listickets,...qalt]){const u=issue.fields.assignee;if(!u)continue;const row=people.get(u.accountId)||{id:u.accountId,name:u.displayName,openItems:0,spentSeconds:0,estimatedSeconds:0};if(issue.fields.status?.statusCategory?.key!=='done')row.openItems++;row.spentSeconds+=issue.fields.timespent||0;row.estimatedSeconds+=issue.fields.timeoriginalestimate||0;people.set(u.accountId,row)}
 result.jira={projects,tickets,qa,workload:[...people.values()],requirementCandidates:requirementCandidates.map(compactIssue)};
 result.summary={...result.summary,projects:projects.length,openTickets:tickets.filter(x=>x.statusCategory!=='done').length,qaPending:qa.filter(x=>x.statusCategory!=='done').length,slaBreached:tickets.filter(x=>x.sla?.breached).length};
 result.sources.jira={status:'ok',message:`${lispro.length} LISPRO · ${tickets.length} LISTICKETS · ${qa.length} QALT`};
 return true;
}

async function gmailToken(){
 const {GMAIL_CLIENT_ID:client_id,GMAIL_CLIENT_SECRET:client_secret,GMAIL_REFRESH_TOKEN:refresh_token}=process.env;
 if(!client_id||!client_secret||!refresh_token)return null;
 const body=new URLSearchParams({client_id,client_secret,refresh_token,grant_type:'refresh_token'});
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!r.ok)throw new Error(`Gmail token ${r.status}`);return (await r.json()).access_token;
}

async function refreshGmail(){
 const token=await gmailToken();
 if(!token){result.sources.gmail={status:'pending',message:'Configura la autorización OAuth de Gmail.'};return false}
 const headers={Authorization:`Bearer ${token}`};let pageToken;const ids=[];
 do{const url=new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');url.searchParams.set('q','subject:Requerimiento');url.searchParams.set('maxResults','500');if(pageToken)url.searchParams.set('pageToken',pageToken);const r=await fetch(url,{headers});if(!r.ok)throw new Error(`Gmail ${r.status}`);const page=await r.json();ids.push(...(page.threads||[]).map(x=>x.id));pageToken=page.nextPageToken}while(pageToken);
 // Por privacidad, el repositorio público recibe conteos y no asuntos ni cuerpos de correo.
 result.requirements={count:ids.length,linkedToJira:null,withoutJira:null};
 result.summary={...result.summary,requirements:ids.length};
 result.sources.gmail={status:'ok',message:`${ids.length} conversaciones con Requerimiento en el asunto. Detalle protegido.`};
 return true;
}

let jiraOk=false,gmailOk=false;
try{jiraOk=await refreshJira()}catch(error){result.sources.jira={status:'error',message:error.message.slice(0,180)}}
try{gmailOk=await refreshGmail()}catch(error){result.sources.gmail={status:'error',message:error.message.slice(0,180)}}
result.sources.zoho=process.env.ZOHO_ACCESS_TOKEN?{status:'pending',message:'Token recibido; falta definir módulo y campos de clientes/pagos.'}:{status:'pending',message:'Pendiente acceso a clasificación y condiciones de pago.'};
if(jiraOk||gmailOk){result.meta.lastAttempt=now;result.meta.lastSuccessfulSync=now;result.meta.mode='live'}
await writeFile(outputUrl,JSON.stringify(result,null,2)+'\n','utf8');
console.log(`Actualización terminada. Jira=${jiraOk} Gmail=${gmailOk}`);
