(() => {
"use strict";
const API="https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/callback-order";
const prices={25:99,50:149,100:229,200:399};
let selected=50;
const $=id=>document.getElementById(id);
const checkout=$("checkout"), formStep=$("formStep"), reviewStep=$("reviewStep"), doneStep=$("doneStep"), error=$("error");
const fields=["business","website","landline","emergency","whatsapp","email","email2","address1","address2","town","postcode"];
document.querySelectorAll(".pack").forEach(b=>b.addEventListener("click",()=>{
 selected=Number(b.dataset.pack);document.querySelectorAll(".pack").forEach(x=>x.classList.toggle("selected",x===b));checkout.classList.remove("hidden");checkout.scrollIntoView({behavior:"smooth",block:"start"});
}));
document.querySelector('.pack[data-pack="50"]').classList.add("selected");
function val(id){return $(id).value.trim()}
function normaliseWebsite(v){
 const s=String(v||"").trim();
 if(!s)return "";
 if(/^https?:\/\//i.test(s))return s;
 return "https://"+s.replace(/^\/+/, "");
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function validate(){
 error.classList.add("hidden");
 if(!val("business")||!val("email")||!val("email2")||!val("address1")||!val("town")||!val("postcode"))return "Please complete all required fields.";
 if(val("email").toLowerCase()!==val("email2").toLowerCase())return "The two email addresses do not match.";
 if(!val("landline")&&!val("emergency")&&!val("whatsapp")&&!val("website"))return "Please provide at least one contact route for your customers.";
 return "";
}
function showError(m){error.textContent=m;error.classList.remove("hidden")}
$("reviewBtn").addEventListener("click",()=>{
 const e=validate();if(e){showError(e);return}
 const lines=[
  ["Bundle",selected+" stickers — £"+prices[selected]+" + VAT"],
  ["Business Name",val("business")],["Website",normaliseWebsite(val("website"))||"—"],["Landline",val("landline")||"—"],["Emergency Contact",val("emergency")||"—"],["WhatsApp",val("whatsapp")||"—"],["Email",val("email")],
  ["Delivery",[val("address1"),val("address2"),val("town"),val("postcode")].filter(Boolean).join(", ")]
 ];
 $("reviewBox").innerHTML=lines.map(x=>'<div class="reviewLine"><span>'+escapeHtml(x[0])+'</span><span>'+escapeHtml(x[1])+'</span></div>').join("");
 formStep.classList.add("hidden");reviewStep.classList.remove("hidden");error.classList.add("hidden");checkout.scrollIntoView({behavior:"smooth"});
});
$("editBtn").addEventListener("click",()=>{reviewStep.classList.add("hidden");formStep.classList.remove("hidden")});
$("placeBtn").addEventListener("click",async()=>{
 const btn=$("placeBtn");btn.disabled=true;btn.textContent="Creating order…";error.classList.add("hidden");
 const body={pack_size:selected,business_name:val("business"),website:normaliseWebsite(val("website")),landline:val("landline"),emergency_phone:val("emergency"),whatsapp:val("whatsapp"),email:val("email"),email_confirm:val("email2"),address1:val("address1"),address2:val("address2"),town:val("town"),postcode:val("postcode")};
 try{
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not place order");
  reviewStep.classList.add("hidden");doneStep.classList.remove("hidden");$("orderRef").textContent=d.order_code;
 }catch(e){showError(e.message);btn.disabled=false;btn.textContent="Place order"}
});
})();