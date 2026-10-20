// DRAFT. Not deployed. Requires STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Uses raw request body for Stripe signature and records processed event IDs for idempotency.
// Before deployment configure lyndquote as exposed API schema for service-role, or change DB access layer.
// Complete refund and fulfilment emails before taking payment.
import { createClient } from 'npm:@supabase/supabase-js@2';
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function verifySignature(raw:string,header:string,secret:string){
 const timestamp=header.match(/(?:^|,)t=(\d+)/)?.[1];const signatures=[...header.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map(m=>m[1]);
 if(!timestamp||!signatures.length||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)));
 return signatures.some(s=>safeEqual(s,sig));
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET');const url=Deno.env.get('SUPABASE_URL');const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!service)return new Response('Unconfigured',{status:503});
 const raw=await req.text();
 if(!await verifySignature(raw,req.headers.get('stripe-signature')||'',secret))return new Response('Invalid signature',{status:400});
 let event:any;try{event=JSON.parse(raw)}catch{return new Response('Invalid payload',{status:400}}
 const db=createClient(url,service,{auth:{persistSession:false}});
 const schema=db.schema('lyndquote');
 // Idempotence must be enforced transactionally in production; this preliminary code only checks.
 const found=await schema.from('events').select('stripe_event_id').eq('stripe_event_id',event.id).maybeSingle();
 if(found.error)return new Response('Database not ready',{status:503});
 if(found.data)return new Response('Already processed',{status:200});
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   const session=event.data.object;if(session.payment_status!=='paid')return new Response('Awaiting settlement',{status:200});
   const m=session.metadata||{};const edition=m.edition;const seats=Number(m.seats);
   const expected=(edition==='standard'?3900:edition==='custom'?5900:NaN)+seats*1500;
   if(!Number.isInteger(seats)||seats<0||seats>20||session.amount_total!==expected||session.currency!=='gbp')return new Response('Invalid product amount',{status:422});
   const email=session.customer_details?.email||session.customer_email;
   if(!email)return new Response('No customer email',{status:422});
   const order={
     stripe_session_id:session.id,stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null,
     email,edition,additional_seats:seats,amount_pence:expected,currency:'gbp',status:'paid',
     immediate_supply_consent:m.immediate_supply_consent==='true',cancellation_acknowledgement:m.cancellation_acknowledgement==='true',
     terms_version:m.terms_version||'unknown',marketing_opt_in:m.marketing_opt_in==='true',
     marketing_consent_at:m.marketing_opt_in==='true'?new Date(event.created*1000).toISOString():null,
     survey_choices:(m.interests||'').split(',').filter(Boolean),
     paid_at:new Date(event.created*1000).toISOString(),updated_at:new Date().toISOString()
   };
   if(!order.immediate_supply_consent||!order.cancellation_acknowledgement)return new Response('Missing legal consent',{status:422});
   const saved=await schema.from('orders').upsert(order,{onConflict:'stripe_session_id'}).select('id').single();
   if(saved.error)return new Response('Order insert failed',{status:503});
   // Licence creation must be completed in one database transaction alongside event capture.
   // No fulfilment performed until that part is implemented and tested.
 } else if(['charge.refunded','charge.dispute.created'].includes(event.type)){
   // TODO link payment intent, mark order, revoke licences; must be implemented before go-live.
   return new Response('Refund/dispute flow not configured',{status:503});
 }
 const inserted=await schema.from('events').insert({stripe_event_id:event.id,event_type:event.type});
 if(inserted.error&&inserted.error.code!=='23505')return new Response('Event recording failed',{status:503});
 return new Response('OK',{status:200});
});
