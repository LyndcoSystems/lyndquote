// DRAFT for deployment after Stripe setup. Stripe Checkout Session server-side only.
// Requires STRIPE_SECRET_KEY, SITE_ORIGIN and Supabase function secrets.
// Explicit customer acknowledgement is enforced before creating a payment session.
Deno.serve(async (req:Request)=>{
 const headers={'content-type':'application/json','access-control-allow-origin':Deno.env.get('SITE_ORIGIN')||'','vary':'Origin'};
 const fail=(status:number,message:string)=>new Response(JSON.stringify({error:message}),{status,headers});
 if(req.method!=='POST')return fail(405,'POST only');
 const origin=req.headers.get('origin');
 if(!origin||origin!==Deno.env.get('SITE_ORIGIN'))return fail(403,'Origin not allowed');
 let body:any;try{body=await req.json()}catch{return fail(400,'Invalid JSON')}
 const edition=body.edition;
 const seats=body.additionalSeats;
 if(!['standard','custom'].includes(edition)||!Number.isInteger(seats)||seats<0||seats>20)return fail(400,'Invalid product selection');
 if(body.immediateSupplyConsent!==true||body.cancellationAcknowledgement!==true||body.acceptedTerms!==true)return fail(400,'Please accept required digital delivery and terms statements');
 if(typeof body.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||body.email.length>254)return fail(400,'Valid email required');
 const allowed=['time','assets','reviews','bookings','profit','expenses','scheduling'];
 const choices=Array.isArray(body.interests)?body.interests.filter((x:unknown)=>typeof x==='string'&&allowed.includes(x)).slice(0,7):[];
 const amount=(edition==='standard'?3900:5900)+seats*1500;
 const params=new URLSearchParams();
 params.set('mode','payment');params.set('success_url',Deno.env.get('SITE_ORIGIN')+'/order/success?session_id={CHECKOUT_SESSION_ID}');
 params.set('cancel_url',Deno.env.get('SITE_ORIGIN')+'/order/cancel');
 params.set('customer_email',body.email.trim());
 params.set('line_items[0][price_data][currency]','gbp');
 params.set('line_items[0][price_data][product_data][name]',edition==='standard'?'Lyndco estimating tool — Standard':'Lyndco estimating tool — Custom');
 params.set('line_items[0][price_data][unit_amount]',String(edition==='standard'?3900:5900));params.set('line_items[0][quantity]','1');
 if(seats){params.set('line_items[1][price_data][currency]','gbp');params.set('line_items[1][price_data][product_data][name]','Additional user licence');params.set('line_items[1][price_data][unit_amount]','1500');params.set('line_items[1][quantity]',String(seats))}
 params.set('metadata[edition]',edition);params.set('metadata[seats]',String(seats));
 params.set('metadata[immediate_supply_consent]','true');params.set('metadata[cancellation_acknowledgement]','true');
 params.set('metadata[terms_version]','DRAFT-1');params.set('metadata[marketing_opt_in]',body.marketingOptIn===true?'true':'false');
 params.set('metadata[interests]',choices.join(','));params.set('metadata[expected_amount]',String(amount));
 const stripe=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:'Bearer '+Deno.env.get('STRIPE_SECRET_KEY'),'content-type':'application/x-www-form-urlencoded'},body:params});
 const data=await stripe.json();
 if(!stripe.ok||!data.url)return fail(502,'Payment provider could not start checkout');
 return new Response(JSON.stringify({url:data.url}),{headers});
});
