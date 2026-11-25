/* স্থানীয় (ঢাকা) তারিখ YYYY-MM-DD — toISOString() UTC দেয়, তাই রাত ১২টা–৬টায় আগের দিন দেখাত */
function todayISO(){const d=new Date(),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())}
/* ডেটা সুরক্ষা: নিরাপদ লোড/সেভ, দৈনিক অটো-কপি, কোটা/ত্রুটির সতর্কতা */
const LS_KEY="poultryBatchesV2",LS_BAK="poultryBatchesV2_bak",LS_BAKDAY="poultryBatchesV2_bakDay";
function _validStore(o){return o&&Array.isArray(o.batches)&&o.batches.length>0&&o.batches.every(b=>b&&typeof b==="object")}
function loadStoreSafe(){
 let raw=null;try{raw=localStorage.getItem(LS_KEY)}catch(e){}
 if(raw){try{let o=JSON.parse(raw);if(_validStore(o))return o}catch(e){}
  /* মূল ডেটা নষ্ট — নষ্ট কপি আলাদা রেখে ব্যাকআপ থেকে ফেরত */
  try{localStorage.setItem("poultryBatchesV2_corrupt_"+Date.now(),raw)}catch(e){}
  try{let b=JSON.parse(localStorage.getItem(LS_BAK)||"null");if(_validStore(b)){window.__restoredFromBak=true;return b}}catch(e){}
 }
 return null;
}

const SEED={"sheetNames": ["Summary ", "ঔষধ শিডিউল ", "বিভিন্ন খরচ ", "কর্মচারী ", "কাঠের গুড়া", "ভাড়া", "Medicine", "ফিড ", "ফিড খাওয়ানো", "বাচ্চা", "বিক্রি"], "sheetMeta": [{"name": "Summary ", "rows": 106, "cols": 11}, {"name": "ঔষধ শিডিউল ", "rows": 41, "cols": 8}, {"name": "বিভিন্ন খরচ ", "rows": 100, "cols": 6}, {"name": "কর্মচারী ", "rows": 116, "cols": 6}, {"name": "কাঠের গুড়া", "rows": 100, "cols": 6}, {"name": "ভাড়া", "rows": 100, "cols": 11}, {"name": "Medicine", "rows": 100, "cols": 26}, {"name": "ফিড ", "rows": 98, "cols": 26}, {"name": "ফিড খাওয়ানো", "rows": 100, "cols": 11}, {"name": "বাচ্চা", "rows": 100, "cols": 6}, {"name": "বিক্রি", "rows": 100, "cols": 31}], "sheets": {"Summary ": [], "ঔষধ শিডিউল ": [], "বিভিন্ন খরচ ": [], "কর্মচারী ": [], "কাঠের গুড়া": [], "ভাড়া": [], "Medicine": [], "ফিড ": [], "ফিড খাওয়ানো": [], "বাচ্চা": [], "বিক্রি": []}, "startDate": "", "chicks": 0};
function freshBatch(name){
 return {id:"b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name,status:"active",createdAt:todayISO(),closedAt:null,
 startDate:SEED.startDate||"",chicks:Number(SEED.chicks||0),dead:0,chickPrice:0,deaths:[],
 feed:[],medicine:[],workers:[],workerSalary:0,other:[],litter:[],power:[],rent:[],sales:[],litterSales:[],otherSales:{litter:[],chicken:[],bag:[],feed:[]},medSchedule:[],notes:[],gifts:[],dailyFeed:[]};
}
/* পুরনো ব্যাচে নতুন তালিকা (যেমন power) না থাকলে এন্ট্রি চুপচাপ ব্যর্থ হতো — এখানে সব তালিকা নিশ্চিত করা হয় */
function ensureShape(b){
 if(!b||typeof b!=="object")return b;
 let t=freshBatch("x");
 for(const k in t){
  const v=t[k];
  if(Array.isArray(v)){if(!Array.isArray(b[k]))b[k]=[]}
  else if(v&&typeof v==="object"){
   if(!b[k]||typeof b[k]!=="object"||Array.isArray(b[k]))b[k]=JSON.parse(JSON.stringify(v));
   else for(const kk in v){if(Array.isArray(v[kk])&&!Array.isArray(b[k][kk]))b[k][kk]=[]}
  }
 }
 return b;
}
function migrateWorkers(b){
 ensureShape(b);
 if(Array.isArray(b.workers)){
  b.workers=b.workers.map(r=>{
   if(r&&typeof r.amount==="undefined"&&(("qty" in r)||("rate" in r))){
    return{date:r.date,amount:(+r.qty||0)*(+r.rate||0),note:r.name||""};
   }
   return r;
  });
 }
 if(typeof b.workerSalary==="undefined")b.workerSalary=0;
 return b;
}
let store=loadStoreSafe();
if(!store){
 let old=null;try{old=JSON.parse(localStorage.getItem("poultryCompleteV7_x")||localStorage.getItem("poultryCompleteV6_x")||localStorage.getItem("poultryCompleteV5_x")||"null")}catch(e){}
 let first=old?Object.assign(freshBatch("ব্যাচ ১"),old,{id:freshBatch("x").id,name:"ব্যাচ ১",status:"active"}):freshBatch("ব্যাচ ১");
 migrateWorkers(first);
 store={batches:[first],activeId:first.id};
}else{
 store.batches.forEach(migrateWorkers);
}
let state=store.batches.find(b=>b.id===store.activeId)||store.batches[0];
const money=n=>"৳"+Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:2});
let _saveWarned=false;
function save(){
 let json;
 try{json=JSON.stringify(store)}catch(e){console.error(e);return false}
 try{
  /* দিনে একবার আগের ভালো কপি ব্যাকআপ কীতে রাখা */
  let day=todayISO();
  if(localStorage.getItem(LS_BAKDAY)!==day){
   let prev=localStorage.getItem(LS_KEY);
   if(prev){try{localStorage.setItem(LS_BAK,prev);localStorage.setItem(LS_BAKDAY,day)}catch(e){}}
  }
  localStorage.setItem(LS_KEY,json);
  _saveWarned=false;return true;
 }catch(e){
  console.error("save failed",e);
  if(!_saveWarned){_saveWarned=true;
   try{showToast("⚠️ তথ্য সেভ হয়নি! ফোনের জায়গা শেষ। এখনই ব্যাকআপ ডাউনলোড করুন।")}catch(_){alert("⚠️ তথ্য সেভ হয়নি! এখনই ব্যাকআপ ডাউনলোড করুন।")}
  }
  return false;
 }
}
/* ব্রাউজারকে বলা: এই সাইটের ডেটা নিজে থেকে মুছো না */
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
/* অন্য ট্যাবে ডেটা বদলালে এই ট্যাব পুরনো ডেটা দিয়ে ওভাররাইট করবে না */
window.addEventListener("storage",ev=>{
 if(ev.key!==LS_KEY||!ev.newValue)return;
 try{let o=JSON.parse(ev.newValue);if(!_validStore(o))return;
  store=o;store.batches.forEach(migrateWorkers);
  state=store.batches.find(b=>b.id===store.activeId)||store.batches[0];render();
 }catch(e){}
});
function switchBatch(id){let b=store.batches.find(x=>x.id===id);if(!b)return;store.activeId=id;state=b;save();render()}
function newBatch(){openNameModal("newBatch",null,"➕ নতুন ব্যাচ শুরু করুন","ব্যাচ "+(store.batches.length+1))}
async function toggleBatchStatus(){
 if(state.status==="closed"){state.status="active";state.closedAt=null;showToast("🔓 ব্যাচ চালু হয়েছে — দিন আর গোনা হবে না");}
 else{if(closeStats().live>0){showToast("❌ এখনও "+livePcs()+" টি মুরগি অবশিষ্ট — ক্লোজ করা যাবে না");return;}if(!await askConfirm("এই ব্যাচটি সম্পন্ন হিসেবে চিহ্নিত করবেন? পরে চাইলে আবার চালু করা যাবে।"))return;state.status="closed";if(!state.lockedEnd)state.lockedEnd=todayISO();state.closedAt=state.lockedEnd;showToast("✅ ব্যাচ সম্পন্ন হিসেবে চিহ্নিত হয়েছে");}
 save();render();
}
async function deleteBatch(id){
 if(store.batches.length<=1){alert("শেষ ব্যাচটি মুছে ফেলা যাবে না।");return;}
 if(!await askConfirm("⚠️ এই ব্যাচের সব তথ্য স্থায়ীভাবে মুছে যাবে। আপনি কি নিশ্চিত?"))return;
 store.batches=store.batches.filter(b=>b.id!==id);
 if(store.activeId===id){store.activeId=store.batches[0].id;state=store.batches[0];}
 save();render();showToast("🗑️ ব্যাচ মুছে ফেলা হয়েছে");
}
function batchSummary(b){
 let feed=(b.feed||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
 let medicine=(b.medicine||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
 let other=(b.other||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
 let litter=(b.litter||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0)+(b.power||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
 let workers=wageCost(b);
 let rent=(b.rent||[]).reduce((s,r)=>s+(+r.amt||0),0);
 let chicksCost=(+b.chicks||0)*(+b.chickPrice||0);
 let sales=(b.sales||[]).reduce((s,r)=>s+(+r.weight||0)*(+r.rate||0),0);
 sales+=(b.litterSales||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
 if(b.otherSales)Object.keys(b.otherSales).forEach(k=>{sales+=(b.otherSales[k]||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0)});
 let cost=feed+medicine+other+litter+workers+rent+chicksCost;
 let dead=(b.deaths||[]).reduce((s,r)=>s+(+r.qty||0),0)||(+b.dead||0);
 return {cost,sales,profit:sales-cost,dead,chicks:+b.chicks||0};
}
function showToast(msg){let t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>t.classList.remove("show"),2200)}

// ── নিজস্ব নিশ্চিতকরণ বক্স (ফোনে confirm()/alert() ব্লক হলেও কাজ করবে) ──
function askConfirm(msg){
 return new Promise(res=>{
  let ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px";
  ov.innerHTML='<div style="background:#162430;border:1px solid #1aad6e50;border-radius:20px;padding:24px 20px;max-width:400px;width:100%;color:#e8edf2;font-family:inherit;text-align:center"><div style="font-size:19px;font-weight:700;line-height:1.6;margin-bottom:20px;white-space:pre-line"></div><div style="display:flex;gap:10px"><button type="button" data-v="0" style="flex:1;padding:14px;border-radius:12px;border:1px solid #ffffff25;background:#0d1923;color:#e8edf2;font:inherit;font-size:17px;font-weight:700;cursor:pointer">❌ না</button><button type="button" data-v="1" style="flex:1;padding:14px;border-radius:12px;border:0;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;font:inherit;font-size:17px;font-weight:700;cursor:pointer">✅ হ্যাঁ</button></div></div>';
  ov.firstChild.firstChild.textContent=msg;
  ov.addEventListener("click",e=>{let b=e.target.closest("button");if(b){ov.remove();res(b.dataset.v==="1")}else if(e.target===ov){ov.remove();res(false)}});
  document.body.appendChild(ov);
 });
}
window.alert=function(m){showToast("⚠️ "+m)};
function backupData(){
 let blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"});
 let a=document.createElement("a");a.href=URL.createObjectURL(blob);
 let d=todayISO();
 a.download=`poultry-backup-${d}.json`;document.body.appendChild(a);a.click();a.remove();
 showToast("✅ ব্যাকআপ ডাউনলোড হয়েছে");
}
function restoreData(file){
 if(!file)return;
 let reader=new FileReader();
 reader.onload=async e=>{
  try{
   let data=JSON.parse(e.target.result);
   if(!await askConfirm("⚠️ বর্তমান সব তথ্য মুছে ব্যাকআপ ফাইলের তথ্য বসানো হবে। আপনি কি নিশ্চিত?"))return;
   try{let cur=localStorage.getItem(LS_KEY);if(cur)localStorage.setItem(LS_BAK,cur)}catch(_){}
   if(data&&Array.isArray(data.batches)&&data.batches.length&&data.activeId){
    store=data;store.batches.forEach(migrateWorkers);
    state=store.batches.find(b=>b.id===store.activeId)||store.batches[0];
   }else{
    let b=Object.assign(freshBatch("ব্যাচ ১"),data,{id:freshBatch("x").id,name:(data&&data.name)||"ব্যাচ ১",status:"active"});
    migrateWorkers(b);
    store={batches:[b],activeId:b.id};state=b;
   }
   save();render();showToast("✅ ব্যাকআপ থেকে তথ্য ফেরত আনা হয়েছে");
  }catch(err){alert("❌ ফাইলটি সঠিক ব্যাকআপ ফাইল নয়।");}
 };
 reader.readAsText(file);
 document.getElementById("restoreFile").value="";
}
function deathTotal(){return (state.deaths||[]).reduce((s,r)=>s+(+r.qty||0),0)}
function days(){if(!state.startDate)return 0;let a=new Date(state.startDate+"T00:00:00"),b=state.lockedEnd?new Date(state.lockedEnd+"T00:00:00"):new Date();a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.max(0,Math.floor((b-a)/86400000))}
function total(k){return (state[k]||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0)}
function rentTotal(){return (state.rent||[]).reduce((s,r)=>s+(+r.amt||0),0)}
function salesTotal(){let ch=state.sales.reduce((s,r)=>s+(+r.weight||0)*(+r.rate||0),0);let lt=(state.litterSales||[]).reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);return ch+lt;}
function retailPcs(){return sumOf(state.otherSales&&state.otherSales.chicken,r=>r.pcs)}
function giftPcs(){return sumOf(state.gifts,r=>r.qty)}
function soldPcs(){return sumOf(state.sales,r=>r.qty)+retailPcs()}
function livePcs(){let d=deathTotal()||(+state.dead||0);return Math.max(0,(+state.chicks||0)-d-soldPcs()-giftPcs())}
function allWeightStats(){let q=0,w=0;(state.sales||[]).forEach(r=>{q+=+r.qty||0;w+=+r.weight||0});((state.otherSales&&state.otherSales.chicken)||[]).forEach(r=>{if(+r.pcs>0){q+=+r.pcs;w+=+r.qty||0}});(state.gifts||[]).forEach(r=>{if(+r.qty>0){q+=+r.qty;w+=+r.weight||0}});return{q:q,w:w,avg:q?w/q:0}}
function renderDashboard(){
let c={feed:total("feed"),medicine:total("medicine"),workers:workersTotal(),other:total("other"),litter:total("litter"),power:total("power"),rent:rentTotal(),sales:salesTotal(),chicks:(+state.chicks||0)*(+state.chickPrice||0)};
c.cost=c.feed+c.medicine+c.workers+c.other+c.litter+c.power+c.rent+c.chicks;c.otherSalesTotal=otherSalesGrand();c.totalIncome=c.sales+c.otherSalesTotal;c.profit=c.totalIncome-c.cost;
state.dead=deathTotal()||(+state.dead||0); let soldQ=soldPcs();let live=livePcs();
document.getElementById("today").textContent=new Date().toLocaleDateString("bn-BD");document.getElementById("batchNameText").textContent=state.name+(state.status==="closed"?" (সম্পন্ন)":"");
document.getElementById("age").textContent=days()+" দিন";document.getElementById("startText").textContent=state.startDate?new Date(state.startDate+"T00:00:00").toLocaleDateString("bn-BD"):"নেই";
kAge.textContent=days()+" দিন";kChicks.textContent=state.chicks;kDead.textContent=state.dead;kLive.textContent=live;kSold.textContent=soldQ;{let oh=document.getElementById("outHint"),gp=giftPcs();if(oh){oh.style.display=gp?"block":"none";oh.innerHTML="🎁 গিফট / নিজের জন্য: <b>"+gp+" টি</b> (খামারের মুরগি থেকে বাদ গেছে)"}}
kFeed.textContent=money(c.feed);kMed.textContent=money(c.medicine);kWorker.textContent=money(c.workers);kOther.textContent=money(c.other);kLitter.textContent=money(c.litter);kRent.textContent=money(c.rent);{let kp=document.getElementById("kPower");if(kp)kp.textContent=money(c.power)}kSales.textContent=money(c.totalIncome);kProfit.textContent=money(c.profit);
let pc=document.getElementById("kProfitCard");
if(pc){pc.className="card metric "+(c.profit>=0?"m-profit":"m-loss");}
kProfit.style.color=c.profit>=0?"#3ddc84":"#ff7070";
let pi=document.getElementById("kProfitIco");
if(pi){pi.style.background=c.profit>=0?"linear-gradient(135deg,#059669,#047857)":"linear-gradient(135deg,#dc2626,#991b1b)";}
let bsb=document.getElementById("batchStatusBadge");
if(bsb){bsb.textContent=state.status==="closed"?"✅ সম্পন্ন":"🟢 চলমান ব্যাচ";}
kDeathRate.textContent=(state.chicks?(state.dead/state.chicks*100).toFixed(2):0)+"%";
renderFcrCards();
let liveChicks=Math.max(0,(+state.chicks||0)-(+state.dead||0));
kCostPerKg.textContent=liveChicks?money(c.cost/liveChicks):"৳০";
document.getElementById("finCost").textContent=money(c.cost);
document.getElementById("finInc").textContent=money(c.totalIncome);
{let nb=document.getElementById("finNetBox");nb.className="fin-box fin-net "+(c.profit>=0?"profit":"loss");
document.getElementById("finNetL").textContent=c.profit>=0?"📈 নিট লাভ (সর্বমোট)":"📉 নিট ক্ষতি (সর্বমোট)";
document.getElementById("finNet").textContent=money(Math.abs(c.profit));}
}
function fTotalShow(){let t=document.getElementById("fTotal");if(t)t.value=money((+fChicks.value||0)*(+fPrice.value||0))}
function saveFarm(){if(!fDate.value){showToast("❌ ব্যাচ শুরুর তারিখ দিন");return}state.startDate=fDate.value;state.chicks=+fChicks.value||0;state.chickPrice=+fPrice.value||0;save();render();showToast("✅ বাচ্চার তথ্য সংরক্ষণ হয়েছে")}
function deathReasonCh(){var l=document.getElementById("deathReasonOtherL"),s=document.getElementById("deathReason");if(l&&s)l.style.display=s.value==="__other"?"":"none"}
function addDeath(){
 let q=+deathQty.value||0;if(q<=0){showToast("❌ মৃত মুরগির সংখ্যা লিখুন");return}
 state.deaths=state.deaths||[];
 let drec={date:deathDate.value||todayISO(),qty:q,reason:(deathReason.value==='__other'?(document.getElementById('deathReasonOther').value||'').trim():deathReason.value.trim()),action:deathAction.value.trim(),note:""};
 let dex=state.deaths.find(r=>r.date===drec.date);
 if(dex)deathMergeInto(dex,drec);else state.deaths.push(drec);
 state.dead=deathTotal();deathQty.value="";deathReason.value="";deathReasonCh();var _o=document.getElementById("deathReasonOther");if(_o)_o.value="";deathAction.value="";save();render();showToast("✅ মৃত্যু যোগ হয়েছে: "+q+" টি");
}
function renderDeaths(){
 deathDedupe();
 let a=state.deaths||[];
 deathTable.innerHTML=a.length?dsort(a).map(([r,i])=>`<tr><td>${r.date||""}</td><td>${r.qty}</td><td>${r.reason||""}</td><td>${r.action||""}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('deaths',${i})">✏️</button><button class="del" onclick="del('deaths',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">এখনও মৃত বাচ্চার কোনো তথ্য যোগ করা হয়নি</td></tr>`;
}
function renderFarm(){fDate.value=state.startDate;fChicks.value=state.chicks;fPrice.value=state.chickPrice;fTotalShow()}
const configs={
feed:["🌾 ফিড","ফিড","বস্তা"],medicine:["💊 মেডিসিন","মেডিসিনের নাম","পরিমাণ"],other:["🧾 বিভিন্ন খরচ","বিবরণ","পরিমাণ"],litter:["🪵 কাঠের গুড়া","বিবরণ","পরিমাণ"],power:["⚡ বিদ্যুৎ ও জ্বালানি","বিবরণ (বিদ্যুৎ বিল / গ্যাস / ডিজেল)","পরিমাণ"]
};
function makePages(){
let host=document.getElementById("generatedPages");
for(const [key,v] of Object.entries(configs)){
host.insertAdjacentHTML("beforeend",`<section id="${key}" class="page"><div class="section">${v[0]} হিসাব</div>
<div class="form"><div class="fields"><label>তারিখ<input id="${key}Date" type="date"></label><label>${v[1]}${key==="feed"?`<select id="feedName" class="fsel"><option value="">— ফিড বেছে নিন —</option><option>প্রি-স্টাটার</option><option>স্টাটার</option><option>গ্রোয়ার</option><option>ফিনিশার</option></select>`:`<input id="${key}Name">`}</label><label>${v[2]}<input id="${key}Qty" type="number" min="0" step=".01"></label><label>দর<input id="${key}Rate" type="number" min="0" step=".01"></label></div>${key==="feed"?feedChips("feedName"):""}<button class="add" onclick="addRow('${key}')">➕ যোগ করুন</button></div>
<div class="section">${v[0]} টেবিল</div><div class="wrap"><table><thead><tr><th>তারিখ</th><th>${v[1]}</th><th>${v[2]}</th><th>দর</th><th>মোট</th><th>অ্যাকশন</th></tr></thead><tbody id="${key}Table"></tbody></table></div></section>`);
}
host.insertAdjacentHTML("beforeend",`<section id="sales" class="page"><div class="section">💰 বিক্রি হিসাব</div>
<div class="form">
<div class="fields"><label>তারিখ<input id="salesDate" type="date"></label><label>ক্রেতার নাম<input id="salesCustomer" list="customerList" placeholder="যেমন: করিম মিয়া"></label></div>
<datalist id="customerList"></datalist>
<div id="pallaTotals" class="pl-sum"></div>
<div class="section" style="margin:8px 0 4px;font-size:13px">⚖️ পাল্লা যোগ করুন</div>
<div class="pl-row"><label>ওজন (কেজি)<input id="pallaWeight" type="number" min="0" step=".01" inputmode="decimal"></label><label>মুরগি সংখ্যা<input id="pallaQty" type="number" min="0" inputmode="numeric"></label><button class="add pl-btn" id="pallaBtn" onclick="addPalla()">➕ যোগ</button></div>
<div class="wrap pl-wrap" style="margin-top:6px"><table><thead><tr><th>পাল্লা</th><th>ওজন</th><th>মুরগি</th><th>গড়/মুরগি</th><th></th></tr></thead><tbody id="pallaTempTable"></tbody></table></div>
<div class="section" style="margin:8px 0 4px;font-size:13px">💵 দাম ও পরিশোধ</div>
<div class="fields"><label>দর/কেজি<input id="salesRate" type="number" step=".01" oninput="renderTempPallas()"></label><label>পরিশোধ কত<input id="salesPaid" type="number" min="0" step=".01" placeholder="যত টাকা পেয়েছেন" oninput="renderTempPallas()"></label></div><button class="tbtn-light pl-full" onclick="payFull()">✔️ সম্পূর্ণ পরিশোধ</button>
<button class="add" onclick="addSale()" style="margin-top:10px">✅ সম্পূর্ণ বিক্রি সংরক্ষণ করুন</button>
</div>
<div class="hint" id="avgAllHint" style="margin-top:10px"></div><div class="section">বিক্রির টেবিল</div><div class="wrap"><table><thead><tr><th>তারিখ</th><th>ক্রেতা</th><th>মুরগি</th><th>ওজন</th><th>দর</th><th>মোট</th><th>পরিশোধ</th><th>বাকি</th><th>গড় ওজন</th><th>অ্যাকশন</th></tr></thead><tbody id="salesTable"></tbody></table></div>
<!-- লিটার বিক্রি hidden elements for backward compat -->
<div style="display:none"><input id="lsaleDate"><input id="lsaleQty"><input id="lsaleRate"><input id="lsaleBuyer"><span id="lsaleTotal"></span><tbody id="lsaleTable"></tbody></div>
</section>
<section id="customers" class="page"><div class="section">👥 ক্রেতাভিত্তিক হিসাব</div><div id="customersList"></div></section>`);
host.insertAdjacentHTML("beforeend",`<section id="rent" class="page"><div class="section">🚚 পরিবহন ভাড়া হিসাব</div><div class="form"><div class="fields"><label>তারিখ<input id="rentDate" type="date"></label><label>বিবরণ<input id="rentDesc" placeholder="বাচ্চা আনা"></label><label>ভাড়া কত<input id="rentAmt" type="number" min="0" step=".01"></label><label>দিলাম কত<input id="rentPaid" type="number" min="0" step=".01"></label></div><button class="add" onclick="addRent()">➕ যোগ করুন</button></div><div class="section">পরিবহন ভাড়ার টেবিল</div><div class="wrap"><table><thead><tr><th>তারিখ</th><th>বিবরণ</th><th>ভাড়া</th><th>দিলাম</th><th>অবশিষ্ট</th><th>অ্যাকশন</th></tr></thead><tbody id="rentTable"></tbody></table></div></section>`);
}
function addRow(k){
 if(!Array.isArray(state[k]))state[k]=[];
 let g=id=>document.getElementById(k+id);
 let n=g("Name").value.trim(),qs=g("Qty").value,rs=g("Rate").value;
 if(!n&&!qs&&!rs){showToast("⚠️ বিবরণ, পরিমাণ বা দর লিখুন");return}
 /* বিবরণ ফাঁকা থাকলে আগে এন্ট্রি বাদ যেত — এখন বিভাগের নামই বিবরণ হবে */
 if(!n)n=(configs[k]&&configs[k][0]?configs[k][0].replace(/^\S+\s*/,""):"এন্ট্রি");
 let q=+qs||0,r=+rs||0;
 /* বিদ্যুৎ/বিভিন্ন খরচে শুধু একটা সংখ্যা (বিলের টাকা) দিলে সেটাই মোট ধরা হবে */
 if((k==="power"||k==="other")&&((qs&&!rs)||(!qs&&rs))){let amt=q||r;q=1;r=amt}
 state[k].push({date:g("Date").value||todayISO(),name:n,qty:q,rate:r});
 ["Name","Qty","Rate"].forEach(x=>{let e=g(x);if(e)e.value=""});syncChips(k+"Name");save();render();
 showToast("✅ যোগ হয়েছে: "+n+" — "+money(q*r));
}
let tempPallas=[];
function dsort(a){return (a||[]).map((r,i)=>[r,i]).sort((x,y)=>String(y[0].date||"").localeCompare(String(x[0].date||""))||y[1]-x[1])}
function addPalla(){
 let q=+pallaQty.value||0,w=+pallaWeight.value||0;
 if(q<=0||w<=0){showToast("❌ মুরগির সংখ্যা ও ওজন (কেজি) দুটোই লিখুন");return}
 if(editPallaIdx>=0&&tempPallas[editPallaIdx]){tempPallas[editPallaIdx]={qty:q,weight:w};showToast("✅ পাল্লা "+(editPallaIdx+1)+" ঠিক হয়েছে")}
 else tempPallas.push({qty:q,weight:w});
 editPallaIdx=-1;pallaBtn.textContent="➕ যোগ";
 pallaQty.value="";pallaWeight.value="";pallaWeight.focus();
 renderTempPallas();
}
let editPallaIdx=-1;
function editPalla(i){let p=tempPallas[i];if(!p)return;editPallaIdx=i;pallaQty.value=p.qty;pallaWeight.value=p.weight;pallaBtn.textContent="✔️ ঠিক করুন";renderTempPallas();pallaWeight.focus();pallaWeight.scrollIntoView({block:"center",behavior:"smooth"})}
function payFull(){let w=tempPallas.reduce((x,p)=>x+p.weight,0),r=+salesRate.value||0;if(!(w*r>0)){showToast('❌ আগে পাল্লা ও দর দিন');return}salesPaid.value=Math.round(w*r*100)/100;renderTempPallas()}
function removePalla(i){tempPallas.splice(i,1);if(editPallaIdx===i){editPallaIdx=-1;pallaBtn.textContent="➕ যোগ";pallaQty.value="";pallaWeight.value=""}else if(editPallaIdx>i)editPallaIdx--;renderTempPallas()}
function renderTempPallas(){
 pallaTempTable.innerHTML=tempPallas.length?tempPallas.map((p,i)=>[p,i]).reverse().map(([p,i])=>`<tr${i===editPallaIdx?' style="background:#fbbf2426"':''}><td>${i+1}</td><td>${p.weight} কেজি</td><td>${p.qty} টি</td><td>${(p.weight/p.qty||0).toFixed(2)} কেজি</td><td style="white-space:nowrap"><button class="edt" onclick="editPalla(${i})">✏️</button> <button class="del" onclick="removePalla(${i})">✕</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty" style="padding:8px">এখনও কোনো পাল্লা নেই</td></tr>`;
 let totQty=tempPallas.reduce((s,p)=>s+p.qty,0),totWeight=tempPallas.reduce((s,p)=>s+p.weight,0);
 let rate=+salesRate.value||0,totMoney=totWeight*rate;
 {let nv=document.querySelector("nav");pallaTotals.style.top=(nv?nv.getBoundingClientRect().height:0)+"px";let paid=+salesPaid.value||0,due=totMoney-paid,np=tempPallas.length,avg=totQty?totWeight/totQty:0;
  let bx=(l,v,c)=>`<div class="pl-b${c?" "+c:""}"><span>${l}</span><b>${v}</b></div>`;
  pallaTotals.innerHTML=bx("পাল্লা",np)+bx("মুরগি",totQty+" টি")+bx("মোট কেজি",totWeight.toFixed(2))+bx("গড়/মুরগি",avg.toFixed(2)+" কেজি")+bx("মোট টাকা",rate&&np?money(totMoney):"—","pl-g")+bx(due<0?"অতিরিক্ত":"বাকি",rate&&np?money(Math.abs(due)):"—",due>0&&paid>=0&&rate&&np?"pl-r":"pl-g")}
}
function toggleDetails(i){let el=document.getElementById("pallaDetail"+i);if(el)el.style.display=el.style.display==="none"?"table-row":"none"}
async function addSale(){
 if(!tempPallas.length){alert("অন্তত একটি পাল্লা যোগ করুন");return;}
 if(!(+salesRate.value>0)){alert("দর/কেজি লিখুন");return;}
 let qty=tempPallas.reduce((s,p)=>s+p.qty,0),weight=tempPallas.reduce((s,p)=>s+p.weight,0);
 state.sales=state.sales||[];
 {let avail=livePcs();if(qty>avail&&!await askConfirm("⚠️ বিক্রির মুরগি ("+qty+" টি) বর্তমান মুরগির ("+avail+" টি) চেয়ে বেশি। তবুও সংরক্ষণ করবেন?"))return;}
 state.sales.push({date:salesDate.value||todayISO(),customer:salesCustomer.value.trim(),qty,weight,rate:+salesRate.value||0,paid:+salesPaid.value||0,pallas:tempPallas.slice()});
 tempPallas=[];editPallaIdx=-1;pallaBtn.textContent="➕ যোগ";salesCustomer.value="";salesPaid.value="";salesRate.value="";
 save();render();renderTempPallas();showToast("✅ বিক্রি সংরক্ষণ হয়েছে");
}

/* ── বিক্রির খসড়া: সম্পূর্ণ না হলেও সেভ থাকে (ব্যাচ অনুযায়ী) ── */
(function(){
 const ids=["pallaQty","pallaWeight","salesDate","salesCustomer","salesRate","salesPaid"];
 const key=()=>"salesDraft_"+((typeof store!=="undefined"&&store.activeId)||"x");
 const g=id=>document.getElementById(id);
 function save1(){
  try{
   let d={p:tempPallas.slice(),q:g("pallaQty").value,w:g("pallaWeight").value,d:g("salesDate").value,c:g("salesCustomer").value,r:g("salesRate").value,m:g("salesPaid").value};
   let empty=!d.p.length&&!d.q&&!d.w&&!d.c&&!d.m;
   if(empty)localStorage.removeItem(key());else localStorage.setItem(key(),JSON.stringify(d));
  }catch(e){console.error("draft",e)}
 }
 function restore(){
  try{
   let raw=localStorage.getItem(key()),d=raw?JSON.parse(raw):null;
   tempPallas=d&&Array.isArray(d.p)?d.p.filter(x=>x&&x.qty>0&&x.weight>0):[];
   g("pallaQty").value=d?d.q||"":"";g("pallaWeight").value=d?d.w||"":"";
   g("salesCustomer").value=d?d.c||"":"";g("salesRate").value=d?d.r||"":"";g("salesPaid").value=d?d.m||"":"";
   if(d&&d.d)g("salesDate").value=d.d;
   renderTempPallas();
  }catch(e){}
 }
 const h=ev=>{let t=ev.target;if(t&&t.id&&ids.indexOf(t.id)>=0)save1()};document.addEventListener("input",h,true);document.addEventListener("change",h,true);
 const _ap=addPalla;addPalla=function(){_ap.apply(this,arguments);save1()};
 const _rp=removePalla;removePalla=function(){_rp.apply(this,arguments);save1()};
 const _as=addSale;addSale=async function(){let r=await _as.apply(this,arguments);save1();return r};
 const _sb=switchBatch;switchBatch=function(){_sb.apply(this,arguments);restore()};
 if(g("pallaQty"))restore();else window.addEventListener("load",restore);
 window.restoreSalesDraft=restore;
})();

/* ── ফিড হিসাব পেজের সামারি ── */
(function(){
 const bn=n=>Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
 function feedSum(){
  try{
   let sec=document.getElementById("feed");if(!sec)return;
   let box=document.getElementById("feedSumBox");
   if(!box){let t=sec.querySelector(".section");if(!t)return;t.insertAdjacentHTML("afterend",'<div id="feedSumBox" class="fd-sum"></div>');box=document.getElementById("feedSumBox")}
   let rows=state.feed||[],bags=0,cost=0,by={};
   rows.forEach(r=>{let q=+r.qty||0,c=q*(+r.rate||0);bags+=q;cost+=c;let n=(r.name||"").trim()||"নাম নেই";by[n]=by[n]||{q:0,c:0};by[n].q+=q;by[n].c+=c});
   if(!rows.length){box.innerHTML="";box.style.display="none";return}
   box.style.display="";
   let bk=(+state.feedBagKg>0?+state.feedBagKg:50),kg=bags*bk;
   let tile=(l,v,c)=>'<div class="fd-t'+(c?" "+c:"")+'"><span>'+l+'</span><b>'+v+'</b></div>';
   let names=Object.keys(by);
   box.innerHTML='<div class="fd-h">📊 ফিডের সামারি</div><div class="fd-grid">'+
    tile("মোট বস্তা",bn(bags)+" বস্তা","fd-g")+tile("মোট দাম",money(cost),"fd-y")+
    tile("গড় দাম/বস্তা",bags?money(Math.round(cost/bags)):"—")+tile("মোট ওজন",bn(kg)+" কেজি")+'</div>'+
    (names.length>1?'<div class="fd-by">'+names.map(n=>'<div><span>'+esc(n)+'</span><span>'+bn(by[n].q)+' বস্তা • '+money(by[n].c)+'</span></div>').join("")+'</div>':"")+
    '<div class="fd-n">ধরা হয়েছে প্রতি বস্তা '+bn(bk)+' কেজি</div>';
  }catch(e){console.error(e)}
 }
 const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);feedSum();return r};
 window.feedSum=feedSum;feedSum();
})();
function addLitterSale(){
  if(!lsaleQty.value||!lsaleRate.value){alert('পরিমাণ ও দর দিন');return;}
  state.litterSales=state.litterSales||[];
  state.litterSales.push({date:lsaleDate.value||todayISO(),qty:+lsaleQty.value||0,rate:+lsaleRate.value||0,buyer:lsaleBuyer.value||''});
  save();render();showToast('✅ লিটার বিক্রি যোগ হয়েছে');
  lsaleQty.value='';lsaleRate.value='';lsaleBuyer.value='';
}
async function delLitter(i){if(!await askConfirm('মুছে ফেলতে চান?'))return;state.litterSales.splice(i,1);save();render();
 save();render();
}
function addRent(){let amt=+rentAmt.value||0;if(amt<=0){showToast("❌ ভাড়ার টাকার পরিমাণ লিখুন");return}state.rent=state.rent||[];state.rent.push({date:rentDate.value||todayISO(),desc:rentDesc.value,amt:amt,paid:+rentPaid.value||0});rentDesc.value="";rentAmt.value="";rentPaid.value="";save();render();showToast("✅ পরিবহন ভাড়া যোগ হয়েছে: "+money(amt))}
async function del(k,i){if(!await askConfirm("এই তথ্যটি মুছে ফেলতে চান?"))return;state[k].splice(i,1);if(k==="deaths")state.dead=deathTotal();save();render();showToast("🗑️ মুছে ফেলা হয়েছে")}
function renderTable(k){
let a=state[k]||[];let el=document.getElementById(k+"Table");
el.innerHTML=a.length?dsort(a).map(([r,i])=>`<tr><td>${r.date||""}</td><td>${r.name||""}</td><td>${r.qty||0}</td><td>${money(r.rate)}</td><td>${money((r.qty||0)*(r.rate||0))}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('${k}',${i})">✏️</button><button class="del" onclick="del('${k}',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো হিসাব যোগ করা হয়নি</td></tr>`;
}
function renderSales(){if(!salesDate.value)salesDate.value=todayISO();salesTable.innerHTML=state.sales.length?dsort(state.sales).map(([r,i])=>{let tot=r.weight*r.rate;let paid=+r.paid||0;let due=tot-paid;let pallas=r.pallas||[];let pc=pallas.length;let detail=pallas.map((p,pi)=>[p,pi]).reverse().map(([p,pi])=>`<tr><td style="padding:4px 8px">পাল্লা ${pi+1}</td><td style="padding:4px 8px">${p.qty} টি</td><td style="padding:4px 8px">${p.weight} কেজি</td><td style="padding:4px 8px">গড়: ${(p.weight/p.qty||0).toFixed(2)} কেজি/মুরগি</td></tr>`).join("");let mainRow=`<tr><td>${r.date||""}</td><td>${r.customer||"—"}</td><td>${r.qty}${pc?` <span style="opacity:.6;font-size:11px">(${pc} পাল্লা)</span>`:""}</td><td>${r.weight}</td><td>${money(r.rate)}</td><td>${money(tot)}</td><td>${money(paid)}</td><td>${due>0?money(due):"—"}</td><td>${(r.weight/r.qty||0).toFixed(2)} কেজি</td><td>${pc?`<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="toggleDetails(${i})">বিস্তারিত</button>`:""}<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="memoOpen(${i})">🧾 মেমো</button><button class="edt" onclick="openEdit('sales',${i})">✏️</button><button class="del" onclick="del('sales',${i})">মুছুন</button></td></tr>`;let detailRow=pc?`<tr id="pallaDetail${i}" style="display:none"><td colspan="10" style="padding:0;background:#f7f9fa"><table style="width:100%;font-size:12px">${detail}</table></td></tr>`:"";return mainRow+detailRow}).join(""):`<tr><td colspan="10" class="empty">এখনও কোনো বিক্রি যোগ করা হয়নি</td></tr>`;
let names=[...new Set(state.sales.map(r=>r.customer).filter(Boolean))];
customerList.innerHTML=names.map(n=>`<option value="${n}">`).join("");
{let a=allWeightStats(),h=document.getElementById("avgAllHint");if(h)h.innerHTML=a.q?`⚖️ <b>মোট গড় ওজন (পাইকারি + খুচরা + গিফট/নিজের): ${a.avg.toFixed(2)} কেজি/মুরগি</b><br>মোট ${fmt(a.q,0)} টি • মোট ওজন ${fmt(a.w)} কেজি`:""}
}
function renderRent(){let a=state.rent||[];rentTable.innerHTML=a.length?dsort(a).map(([r,i])=>`<tr><td>${r.date||""}</td><td>${r.desc||""}</td><td>${money(r.amt)}</td><td>${money(r.paid)}</td><td>${money((r.amt||0)-(r.paid||0))}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('rent',${i})">✏️</button><button class="del" onclick="del('rent',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো ভাড়ার হিসাব যোগ করা হয়নি</td></tr>`}

function renderLitterSales(){
  let ls=state.litterSales||[];
  let lt=ls.reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
  let ltEl=document.getElementById("lsaleTotal");
  if(ltEl)ltEl.textContent=money(lt);
  let ltTbl=document.getElementById("lsaleTable");
  if(ltTbl)ltTbl.innerHTML=ls.length?dsort(ls).map(([r,i])=>`<tr><td>${r.date||""}</td><td>${r.qty} কেজি</td><td>${money(r.rate)}</td><td>${money((+r.qty||0)*(+r.rate||0))}</td><td>${r.buyer||"—"}</td><td><button class="del" onclick="delLitter(${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো লিটার বিক্রি যোগ করা হয়নি</td></tr>`;
}
// ══════ রিপোর্ট (মাস ফিল্টার, PDF, Excel) ══════
const bnMonth=ym=>{let a=String(ym).split("-");return new Date(+a[0],+a[1]-1,1).toLocaleDateString("bn-BD",{month:"long",year:"numeric"})};
function reportMonths(){
 let set=new Set(),add=a=>(a||[]).forEach(r=>{let d=String(r&&r.date||"").slice(0,7);if(/^\d{4}-\d{2}$/.test(d))set.add(d)});
 ["feed","medicine","workers","other","litter","power","rent","sales","litterSales","deaths","gifts","dailyFeed"].forEach(k=>add(state[k]));
 let os=state.otherSales||{};Object.keys(os).forEach(k=>add(os[k]));
 let sd=String(state.startDate||"").slice(0,7);if(/^\d{4}-\d{2}$/.test(sd))set.add(sd);
 return [...set].sort();
}
function fcrRows(){
 let f=fcrStats();
 if(!(f.feed>0))return [{l:"দৈনিক ফিডের হিসাব নেই",v:"—"}];
 let pn=f.birds?f.need/f.birds:0,pw=f.birds&&f.tw?f.tw/f.birds:0;
 return [
  {l:"মোট খাওয়ানো ফিড",v:fmt(f.feed)+" কেজি"},
  {l:"মোট ওজন (বিক্রি + খামারে আনুমানিক)",v:fmt(f.tw)+" কেজি"},
  {l:"টার্গেট FCR",v:f.tg.toFixed(2)},
  {l:"মোট জীবিত মুরগি",v:fmt(f.birds,0)+" টি"},
  {l:"প্রতি মুরগি দরকারি গড় ওজন (ফিড ÷ মুরগি ÷ "+f.tg.toFixed(2)+")",v:f.birds?pn.toFixed(2)+" কেজি":"—"},
  {l:"বর্তমান প্রতি মুরগি গড় ওজন",v:pw?pw.toFixed(2)+" কেজি":"—"},
  {t:f.fcr?(f.fcr<=f.tg?"profit":"loss"):"tot",l:"বাস্তব FCR (ফিড ÷ মোট ওজন)",v:f.fcr?f.fcr.toFixed(2):"—"}
 ];
}
function reportData(){
 let sel=document.getElementById("reportMonth"),m=sel?sel.value:"";
 let inM=d=>!m||String(d||"").slice(0,7)===m,F=a=>(a||[]).filter(r=>inM(r.date));
 let qr=a=>sumOf(F(a),r=>(+r.qty||0)*(+r.rate||0));
 let os=state.otherSales||{},months=reportMonths();
 let chicksN=(!m||String(state.startDate||"").slice(0,7)===m)?(+state.chicks||0):0;
 let c={chicks:chicksN*(+state.chickPrice||0),feed:qr(state.feed),medicine:qr(state.medicine),workers:wageOn(state)?wageStats(state,m?m+'-01':null,m?m+'-31':null).earned:sumOf(F(state.workers),r=>r.amount),other:qr(state.other),litter:qr(state.litter),power:qr(state.power),rent:sumOf(F(state.rent),r=>r.amt)};
 let cost=c.chicks+c.feed+c.medicine+c.workers+c.other+c.litter+c.power+c.rent;
 let wh=F(state.sales),whQ=sumOf(wh,r=>r.qty),whW=sumOf(wh,r=>r.weight),whA=sumOf(wh,r=>(+r.weight||0)*(+r.rate||0));
 let rt=F(os.chicken),rtQ=sumOf(rt,r=>r.pcs),rtA=qr(os.chicken);
 let lit=qr(os.litter)+qr(state.litterSales),bag=qr(os.bag),fsl=qr(os.feed);
 let income=whA+rtA+lit+bag+fsl,net=income-cost;
 let gf=F(state.gifts),gQ=sumOf(gf,r=>r.qty),gW=sumOf(gf,r=>r.weight);
 let dead=m?sumOf(F(state.deaths),r=>r.qty):(deathTotal()||(+state.dead||0));
 let monthLabel=m?bnMonth(m):(months.length>1?"পুরো ব্যাচ ("+bnMonth(months[0])+" – "+bnMonth(months[months.length-1])+")":(months.length?"পুরো ব্যাচ ("+bnMonth(months[0])+")":"পুরো ব্যাচ"));
 let info=[["ব্যাচ",state.name+(state.status==="closed"?" (সম্পন্ন)":" (চলমান)")],["রিপোর্টের সময়",monthLabel],["বাচ্চা আসার তারিখ",state.startDate||"—"],["ব্যাচের বয়স",days()+" দিন"],["মোট বাচ্চা",fmt(+state.chicks||0,0)+" টি"],["মৃত"+(m?" (এ মাসে)":""),fmt(dead,0)+" টি"],["বর্তমান মুরগি (খামারে)",fmt(livePcs(),0)+" টি"]];
 let rows=[
  {t:"sec",l:"💸 খরচ"},
  {l:"বাচ্চা ক্রয়",q:chicksN?fmt(chicksN,0)+" টি":"",a:c.chicks},
  {l:"ফিড",a:c.feed},{l:"মেডিসিন",a:c.medicine},{l:"কর্মচারী",a:c.workers},{l:"বিভিন্ন খরচ",a:c.other},{l:"কাঠের গুড়া",a:c.litter},{l:"বিদ্যুৎ ও জ্বালানি",a:c.power},{l:"পরিবহন ভাড়া",a:c.rent},
  {t:"tot",l:"মোট খরচ",a:cost},
  {t:"sec",l:"💰 আয়"},
  {l:"মুরগি বিক্রি (পাইকারি)",q:whQ?fmt(whQ,0)+" টি • "+fmt(whW)+" কেজি":"",a:whA},
  {l:"খুচরা মুরগি বিক্রি",q:rtQ?fmt(rtQ,0)+" টি":"",a:rtA},
  {l:"লিটার বিক্রি",a:lit},{l:"বস্তা বিক্রি",a:bag},{l:"ফিড বিক্রি",a:fsl},
  {t:"tot",l:"মোট আয়",a:income},
  {t:"sec",l:"🎯 FCR (ব্যাচ শুরু থেকে এখন পর্যন্ত)"},
  ...fcrRows(),
  {t:"sec",l:"📊 ফলাফল"},
  {l:"গিফট / নিজের খাওয়া",q:gQ?fmt(gQ,0)+" টি • "+fmt(gW)+" কেজি":"",a:null},
  {t:net>=0?"profit":"loss",l:net>=0?"নিট লাভ":"নিট ক্ষতি",a:Math.abs(net)}
 ];
 let note=m?"ℹ️ মাসিক রিপোর্টে শুধু "+bnMonth(m)+" মাসের তারিখের এন্ট্রি ধরা হয়েছে। বাচ্চা ক্রয়ের খরচ বাচ্চা আসার মাসে ধরা হয়।":"";
 let sub="ব্যাচ: "+state.name+"  •  রিপোর্টের সময়: "+monthLabel;
 return{m:m,months:months,info:info,rows:rows,note:note,sub:sub,monthLabel:monthLabel,net:net};
}
function renderReport(){
 let sel=document.getElementById("reportMonth");if(!sel)return;
 let months=reportMonths(),cur=sel.value;
 sel.innerHTML='<option value="">পুরো ব্যাচ (সব মাস)</option>'+months.map(x=>`<option value="${x}">${bnMonth(x)}</option>`).join("");
 sel.value=months.includes(cur)?cur:"";
 let d=reportData();
 document.getElementById("rpSub").textContent=d.sub;
 document.getElementById("rpInfo").innerHTML=d.info.map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
 reportTable.innerHTML=d.rows.map(r=>{
  if(r.t==="sec")return `<tr class="rp-sec"><td colspan="3">${r.l}</td></tr>`;
  let cls=r.t==="tot"?"rp-tot":r.t==="profit"?"rp-profit":r.t==="loss"?"rp-loss":"";
  return `<tr class="${cls}"><td>${r.l}</td><td>${r.q||""}</td><td style="text-align:right">${r.v!==undefined?esc(r.v):(r.a==null?"—":money(r.a))}</td></tr>`;
 }).join("");
 document.getElementById("rpNote").textContent=d.note;
 document.getElementById("rpFoot").textContent="রিপোর্ট তৈরির তারিখ: "+new Date().toLocaleDateString("bn-BD",{day:"numeric",month:"long",year:"numeric"})+"  •  ব্রাদার্স পোল্ট্রি ফার্ম";
}
function reportFileBase(){
 let d=reportData();
 return ("ব্রাদার্স পোল্ট্রি ফার্ম - রিপোর্ট - "+state.name+" - "+(d.m?bnMonth(d.m):"পুরো ব্যাচ")).replace(/[\\/:*?"<>|]/g,"_");
}
let _oldTitle=null;
function printReport(){
 _oldTitle=document.title;document.title=reportFileBase();
 window.print();
 setTimeout(()=>{if(_oldTitle!==null){document.title=_oldTitle;_oldTitle=null}},800);
}
window.addEventListener("afterprint",()=>{if(_oldTitle!==null){document.title=_oldTitle;_oldTitle=null}});
/* ── সত্যিকারের .xlsx ফাইল (ZIP ছাড়া লাইব্রেরি লাগে না) ── */
const _crcT=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function _crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=_crcT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function _zip(files){
 const enc=new TextEncoder(),parts=[],cen=[];let off=0;
 files.forEach(f=>{
  const nm=enc.encode(f.name),d=enc.encode(f.data),crc=_crc32(d);
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,0,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
  parts.push(new Uint8Array(lh.buffer),nm,d);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,0,true);ch.setUint16(14,0x21,true);ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
  cen.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+d.length;
 });
 let cs=0;cen.forEach(x=>cs+=x.length);
 const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cs,true);end.setUint32(16,off,true);
 return new Blob(parts.concat(cen,[new Uint8Array(end.buffer)]),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function _xe(t){return String(t==null?"":t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function _col(i){let s="";i++;while(i>0){let m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
/* সেল: সংখ্যা | লেখা | {v:মান,s:স্টাইল} — স্টাইল: 1=হেডার 2=শিরোনাম 3=বোল্ড 4=সংখ্যা(দশমিক) 5=বোল্ড সংখ্যা */
function _sheetXml(rows,widths){
 let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/>';
 if(widths)x+='<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>';
 x+='<sheetData>';
 rows.forEach((r,ri)=>{
  x+='<row r="'+(ri+1)+'">';
  r.forEach((c,ci)=>{
   if(c===null||c===undefined||c==="")return;
   let v=c,s=0;if(typeof c==="object"){v=c.v;s=c.s||0}
   let ref=_col(ci)+(ri+1);
   if(typeof v==="number"&&isFinite(v))x+='<c r="'+ref+'"'+(s?' s="'+s+'"':(Math.floor(v)!==v?' s="4"':""))+'><v>'+v+'</v></c>';
   else x+='<c r="'+ref+'" t="inlineStr"'+(s?' s="'+s+'"':"")+'><is><t xml:space="preserve">'+_xe(v)+'</t></is></c>';
  });
  x+='</row>';
 });
 return x+'</sheetData></worksheet>';
}
function buildXlsx(sheets){
 const used={};sheets=sheets.map((sh,i)=>{let n=String(sh.name||"Sheet"+(i+1)).replace(/[\\\/\?\*\[\]:]/g,"").slice(0,28)||"Sheet"+(i+1);let b=n,k=2;while(used[n])n=b.slice(0,25)+" "+(k++);used[n]=1;return{name:n,rows:sh.rows,widths:sh.widths}});
 const files=[];
 files.push({name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>'});
 files.push({name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
 files.push({name:"xl/workbook.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+_xe(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>'});
 files.push({name:"xl/_rels/workbook.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'});
 files.push({name:"xl/styles.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF0A4A2F"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A4A2F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'});
 sheets.forEach((s,i)=>files.push({name:"xl/worksheets/sheet"+(i+1)+".xml",data:_sheetXml(s.rows,s.widths)}));
 return _zip(files);
}
function xlsxSheets(){
 let d=reportData(),H=a=>a.map(x=>({v:x,s:1}));
 let rep=[[{v:"ব্রাদার্স পোল্ট্রি ফার্ম",s:2}],[{v:d.sub,s:3}],[]];
 d.info.forEach(x=>rep.push([{v:x[0],s:3},x[1]]));
 rep.push([]);rep.push(H(["খাত","পরিমাণ","টাকা (৳)"]));
 d.rows.forEach(r=>{
  if(r.t==="sec"){rep.push([{v:r.l.replace(/^[^\wঀ-৿]+\s*/,""),s:3}]);return}
  let bold=(r.t==="tot"||r.t==="profit"||r.t==="loss"),val=(r.v!==undefined?r.v:(r.a==null?"":+r.a));
  let num=(typeof val==="string"&&val!==""&&isFinite(+val.replace(/,/g,"")))?+val.replace(/,/g,""):val;
  rep.push([bold?{v:r.l,s:3}:r.l,r.q||"",typeof num==="number"?{v:num,s:bold?5:4}:num]);
 });
 if(d.note)rep.push([],[d.note]);
 rep.push([],["রিপোর্ট তৈরির তারিখ: "+new Date().toLocaleDateString("bn-BD",{day:"numeric",month:"long",year:"numeric"})]);
 let sh=[{name:"রিপোর্ট",rows:rep,widths:[38,22,18]}];
 const tr=(name,list,hd,fn,w)=>{if(list&&list.length)sh.push({name:name,rows:[H(hd)].concat(list.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).map(fn)),widths:w})};
 const N=v=>(+v||0);
 [["ফিড","feed"],["মেডিসিন","medicine"],["বিভিন্ন খরচ","other"],["কাঠের গুড়া","litter"],["বিদ্যুৎ ও জ্বালানি","power"]].forEach(p=>tr(p[0],state[p[1]],["তারিখ","নাম/বিবরণ","পরিমাণ","দর","মোট টাকা"],r=>[r.date||"",r.name||r.note||"",N(r.qty),N(r.rate),{v:N(r.qty)*N(r.rate),s:4}],[13,26,12,12,16]));
 tr("মুরগি বিক্রি",state.sales,["তারিখ","ক্রেতা","মুরগি (টি)","ওজন (কেজি)","দর","মোট টাকা","পরিশোধ","বাকি"],r=>[r.date||"",r.customer||"",N(r.qty),N(r.weight),N(r.rate),{v:N(r.weight)*N(r.rate),s:4},N(r.paid),{v:N(r.weight)*N(r.rate)-N(r.paid),s:4}],[13,20,12,14,10,16,14,14]);
 tr("মৃত্যু",state.deaths,["তারিখ","সংখ্যা","কারণ","ব্যবস্থা"],r=>[r.date||"",N(r.qty),r.reason||"",r.action||r.treat||""],[13,10,26,26]);
 tr("দৈনিক খাবার",state.dailyFeed,["তারিখ","বস্তা","বস্তায় কেজি","খুচরা কেজি","মোট কেজি"],r=>[r.date||"",N(r.bags),N(r.bagKg),N(r.loose),dfKg(r)],[13,10,14,14,14]);
 tr("কর্মচারী",state.workers,["তারিখ","নাম","টাকা"],r=>[r.date||"",r.name||"",N(r.amount)],[13,22,14]);
 tr("পরিবহন ভাড়া",state.rent,["তারিখ","বিবরণ","মোট","দেওয়া"],r=>[r.date||"",r.name||r.note||"",N(r.amt),N(r.paid)],[13,24,14,14]);
 return sh;
}
function _xlsxBlob(){return buildXlsx(xlsxSheets())}
function exportReportExcel(){
 try{
  let blob=_xlsxBlob(),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=reportFileBase()+".xlsx";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  showToast("✅ Excel (.xlsx) ডাউনলোড হয়েছে — ডাউনলোড ফোল্ডারে দেখুন");
 }catch(e){console.error(e);showToast("⚠️ Excel বানানো যায়নি")}
}
async function shareReportExcel(){
 try{
  let blob=_xlsxBlob(),f=new File([blob],reportFileBase()+".xlsx",{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:reportFileBase()});return}
  exportReportExcel();
 }catch(e){if(e&&e.name==="AbortError")return;console.error(e);exportReportExcel()}
}
window.shareReportExcel=shareReportExcel;
function workersPaid(b){b=b||state;return (b.workers||[]).reduce((s,r)=>s+(+r.amount||0),0)}
const _wIso=()=>new Date().toLocaleDateString("en-CA");
function wageOn(b){return !!(b&&b.workStart&&(+b.dailyWage>0))}
function wageEnd(b){return (b.status==="closed"&&b.closedAt)?b.closedAt:(b.lockedEnd||_wIso())}
function _wDays(a,z){return Math.round((new Date(z+"T00:00:00Z")-new Date(a+"T00:00:00Z"))/86400000)+1}
function wageStats(b,from,to){
 b=b||state;
 if(!wageOn(b))return{on:false,total:0,absent:0,present:0,earned:0};
 let st=b.workStart,en=wageEnd(b);
 if(from&&from>st)st=from;if(to&&to<en)en=to;
 if(st>en)return{on:true,total:0,absent:0,present:0,earned:0};
 let total=_wDays(st,en),seen={},absent=0;
 (b.absences||[]).forEach(r=>{if(r.date&&r.date>=st&&r.date<=en&&!seen[r.date]){seen[r.date]=1;absent++}});
 let present=Math.max(0,total-absent);
 return{on:true,total:total,absent:absent,present:present,earned:present*(+b.dailyWage||0)};
}
function wageCost(b){b=b||state;return wageOn(b)?wageStats(b).earned:workersPaid(b)}
function workersTotal(){return wageCost(state)}
function wageOnDay(b,d){ // কোনো এক দিনের মজুরি (চার্টের জন্য)
 if(!wageOn(b)||d<b.workStart||d>wageEnd(b))return 0;
 return (b.absences||[]).some(r=>r.date===d)?0:(+b.dailyWage||0);
}
function saveWage(){
 let st=wkStart.value,w=+wkWage.value||0;
 if(!st){showToast("❌ কাজ শুরুর তারিখ দিন");return}
 if(!(w>0)){showToast("❌ দৈনিক হাজিরা কত টাকা তা দিন");return}
 state.workStart=st;state.dailyWage=w;save();render();showToast("✅ সংরক্ষণ করা হয়েছে");
}
function addAbsence(){
 let d=wAbsDate.value,to=wAbsTo.value||d,note=wAbsNote.value.trim();
 if(!d){showToast("❌ কোন তারিখে কাজ করেনি তা দিন");return}
 if(to<d){showToast("❌ শেষ তারিখ শুরুর আগে হতে পারে না");return}
 state.absences=state.absences||[];
 let have={};state.absences.forEach(r=>have[r.date]=1);
 let cur=new Date(d+"T00:00:00Z"),end=new Date(to+"T00:00:00Z"),n=0,guard=0;
 while(cur<=end&&guard++<400){let iso=cur.toISOString().slice(0,10);if(!have[iso]){state.absences.push({date:iso,note:note});have[iso]=1;n++}cur.setUTCDate(cur.getUTCDate()+1)}
 state.absences.sort((x,y)=>x.date<y.date?-1:1);
 if(!n){showToast("ℹ️ এই তারিখ আগেই কাটা আছে");return}
 save();render();wAbsDate.value="";wAbsTo.value="";wAbsNote.value="";
 showToast("✂️ "+n+" দিনের হাজিরা কাটা হয়েছে");
}
function addWorkerPayment(){
 let amt=+workerAmount.value||0;if(amt<=0){showToast("❌ টাকার পরিমাণ লিখুন");return}
 state.workers=state.workers||[];
 state.workers.push({date:workerDate.value||todayISO(),amount:amt,note:workerNote.value});
 save();render();workerAmount.value="";workerNote.value="";showToast("✅ কর্মচারীর টাকা যোগ হয়েছে: "+money(amt));
}
const _wbn=n=>Number(n).toLocaleString("bn-BD");
function renderWorkers(){
 if(!document.getElementById("wkStart"))return;
 wkStart.value=state.workStart||"";wkWage.value=state.dailyWage||"";
 let paid=workersPaid(),ws=wageStats(state),on=ws.on;
 let h="";
 const card=(i,l,v,c)=>`<div class="sc"><div class="sci">${i}</div><div><div class="scl">${l}</div><div class="scv"${c?` style="color:${c}"`:""}>${v}</div></div></div>`;
 if(on){
  let bal=ws.earned-paid;
  h=card("📅","কাজ শুরু",state.workStart)+card("🗓️","মোট দিন",_wbn(ws.total)+" দিন")+card("✂️","কাটা (অনুপস্থিত)",_wbn(ws.absent)+" দিন",ws.absent?"#ff9b70":"")+card("✅","হাজিরা",_wbn(ws.present)+" দিন","#3ddc84")
   +card("💰","দৈনিক মজুরি",money(state.dailyWage))+card("🧮","মোট প্রাপ্য",money(ws.earned),"#fbbf24")+card("🧾","এ পর্যন্ত নিয়েছে",money(paid),"#fbbf24")
   +(bal>=0?card("⏳","বাকি পাবে",money(bal),bal>0?"#3ddc84":""):card("⚠️","বেশি নিয়েছে",money(-bal),"#ff7070"));
 }else{
  h=`<div class="hint" style="grid-column:1/-1;margin:0">ℹ️ কাজ শুরুর তারিখ আর দৈনিক হাজিরা সংরক্ষণ করলে হিসাব শুরু হবে।${paid?" এখন পর্যন্ত নেওয়া টাকা: <b>"+money(paid)+"</b> (এটাই খরচে ধরা হচ্ছে)।":""}</div>`;
 }
 wSummary.innerHTML=h;
 let ab=state.absences||[];
 absTable.innerHTML=ab.length?dsort(ab).map(([r,i])=>`<tr><td>${r.date}</td><td>${esc(r.note||"")}</td><td><button class="del" onclick="del('absences',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="3" class="empty">এখনও কোনো দিনের হাজিরা কাটা হয়নি</td></tr>`;
 let a=state.workers||[];
 workersTable.innerHTML=a.length?dsort(a).map(([r,i])=>`<tr><td>${r.date||""}</td><td>${money(r.amount)}</td><td>${esc(r.note||"")}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('workers',${i})">✏️</button><button class="del" onclick="del('workers',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="4" class="empty">এখনও কোনো টাকা নেওয়ার হিসাব নেই</td></tr>`;
}
function renderBatchBar(){
 batchSelect.innerHTML=store.batches.map(b=>`<option value="${b.id}" ${b.id===store.activeId?"selected":""}>${b.status==="closed"?"✅ ":"🟢 "}${b.name}</option>`).join("");
}
function renderBatchesPage(){
 let host=document.getElementById("batchesList");
 let list=store.batches.slice().reverse();
 host.innerHTML=list.length?list.map(b=>{
  let s=batchSummary(b);
  let period=(b.startDate||"শুরুর তারিখ নেই")+" → "+(b.status==="closed"?(b.closedAt||"সমাপ্ত"):"চলমান");
  return `<div class="batch-card">
   <div class="bhead"><b>${b.name}</b><span class="${b.id===store.activeId?"badge-active":"badge-closed"}">${b.status==="closed"?"✅ সম্পন্ন":(b.id===store.activeId?"🟢 সক্রিয়":"⏸️ নিষ্ক্রিয়")}</span></div>
   <div class="bstat">📅 ${period}</div>
   ${b.closeNote?`<div class="bstat">📝 ${esc(b.closeNote)}</div>`:""}
   <div class="bstat">🐣 বাচ্চা: ${s.chicks} • ☠️ মৃত: ${s.dead} • 💰 বিক্রি: ${money(s.sales)} • 📈 লাভ/ক্ষতি: ${money(s.profit)}</div>
   <div class="toolbar" style="margin-top:9px">
   ${b.id!==store.activeId?`<button class="tbtn-light" onclick="switchBatch('${b.id}')">👁️ দেখুন</button>`:`<button class="tbtn-light" onclick="${b.status==="closed"?"toggleBatchStatus()":"openClose()"}">${b.status==="closed"?"🔓 পুনরায় চালু":"🔒 ব্যাচ ক্লোজ"}</button>`}
   <button class="tbtn-light" onclick="renameBatch('${b.id}')">✏️ নাম বদলান</button>
   ${store.batches.length>1?`<button class="tbtn-danger" onclick="deleteBatch('${b.id}')">🗑️ মুছুন</button>`:""}
   </div>
  </div>`;
 }).join(""):`<div class="hint">এখনও কোনো ব্যাচ নেই</div>`;
}
function renderCustomers(){
 let host=document.getElementById("customersList");
 let rows=(state.sales||[]).map((r,i)=>[r,i]).sort((x,y)=>String(x[0].date||"").localeCompare(String(y[0].date||""))||x[1]-y[1]);
 let nth={},dueAll={};
 (state.sales||[]).forEach(r=>{let n=(r.customer||"").trim()||"নাম উল্লেখ নেই";dueAll[n]=(dueAll[n]||0)+(+r.weight||0)*(+r.rate||0)-(+r.paid||0)});
 host.innerHTML=rows.length?rows.map(([r])=>{
  let n=(r.customer||"").trim()||"নাম উল্লেখ নেই";nth[n]=(nth[n]||0)+1;
  let tot=(+r.weight||0)*(+r.rate||0),paid=+r.paid||0,due=tot-paid,q=+r.qty||0,w=+r.weight||0;
  let avg=q?(w/q).toFixed(2):"0",pc=(r.pallas&&r.pallas.length)?r.pallas.length:1;
  let times=rows.filter(x=>((x[0].customer||"").trim()||"নাম উল্লেখ নেই")===n).length;
  return `<div class="batch-card">
   <div class="bhead"><b>${esc(n)}${times>1?` <small style="opacity:.75">• ${["","১ম","২য়","৩য়","৪র্থ"][nth[n]]||Number(nth[n]).toLocaleString("bn-BD")+"তম"} বার</small>`:""}</b><span class="${due>0?"badge-closed":"badge-active"}">${due>0?"বাকি আছে":"পরিশোধিত"}</span></div>
   <div class="bstat">📅 ${esc(String(r.date||"").split("-").reverse().join("/").replace(/[0-9]/g,d=>"০১২৩৪৫৬৭৮৯"[d]))} • ⚖️ পাল্লা: ${pc} • 🐔 মুরগি: ${q} টি</div>
   <div class="bstat">📦 মোট ওজন: ${w.toFixed(2)} কেজি • 📏 গড় ওজন/মুরগি: ${avg} কেজি • দর: ${money(+r.rate||0)}/কেজি</div>
   <div class="bstat">💰 মোট: ${money(tot)} • ✅ পরিশোধ: ${money(paid)} • ⏳ বাকি: ${money(Math.max(0,due))}</div>${window.custTools?custTools(n,Math.max(0,dueAll[n])):""}
  </div>`;
 }).join(""):`<div class="hint">এখনও কোনো বিক্রি যোগ করা হয়নি</div>`;
 let gm={};(state.gifts||[]).forEach(r=>{let n=(r.name||"").trim()||"নাম নেই";if(!gm[n])gm[n]={q:0,w:0,k:{}};gm[n].q+=+r.qty||0;gm[n].w+=+r.weight||0;gm[n].k[r.kind||"গিফট"]=1});
 let gn=Object.keys(gm);
 if(gn.length)host.innerHTML+=`<div class="section" style="margin-top:16px">🎁 গিফট / নিজের জন্য</div>`+gn.map(n=>{let c=gm[n];return `<div class="batch-card"><div class="bhead"><b>${esc(n)}</b><span class="badge-active">${esc(Object.keys(c.k).join(", "))}</span></div><div class="bstat">🐔 ${c.q} টি • ⚖️ ${c.w.toFixed(2)} কেজি • 📏 গড় ${c.q?(c.w/c.q).toFixed(2):"0"} কেজি/মুরগি</div></div>`}).join("");
}
function addLitterSale2(){
  let qty=+document.getElementById("lsaleQty").value||0;
  let rate=+document.getElementById("lsaleRate").value||0;
  if(qty<=0||rate<=0){showToast("❌ পরিমাণ ও দাম দিন");return;}
  state.litterSales=state.litterSales||[];
  state.litterSales.push({date:document.getElementById("lsaleDate").value,qty,rate,buyer:document.getElementById("lsaleBuyer").value});
  save();render();
  document.getElementById("lsaleQty").value="";document.getElementById("lsaleRate").value="";document.getElementById("lsaleBuyer").value="";
  showToast("✅ লিটার বিক্রি যোগ হয়েছে");
}
function renderLitterSalesPage(){/* litter now handled in othersales page */}
function addMedSchedule(){
  let date=document.getElementById("msDate").value;
  if(!date){showToast("❌ তারিখ দিন");return;}
  let morningName=document.getElementById("msMorningName").value.trim();
  let noonName=document.getElementById("msNoonName").value.trim();
  let nightName=document.getElementById("msNightName").value.trim();
  if(!morningName&&!noonName&&!nightName){showToast("❌ অন্তত একটি বেলার মেডিসিন দিন");return;}
  state.medSchedule=state.medSchedule||[];
  let ageDay=days();
  let rec={
    date,age:ageDay,
    morning:{name:morningName,dose:document.getElementById("msMorningDose").value,note:document.getElementById("msMorningNote").value},
    noon:{name:noonName,dose:document.getElementById("msNoonDose").value,note:document.getElementById("msNoonNote").value},
    night:{name:nightName,dose:document.getElementById("msNightDose").value,note:document.getElementById("msNightNote").value}
  };
  let ex=state.medSchedule.find(r=>r.date===date);
  let merged=!!ex;
  if(ex)msMergeInto(ex,rec);else state.medSchedule.push(rec);
  save();renderMedSchedule();
  ["msMorningName","msMorningDose","msMorningNote","msNoonName","msNoonDose","msNoonNote","msNightName","msNightDose","msNightNote"].forEach(id=>document.getElementById(id).value="");
  showToast(merged?"✅ এই তারিখের সারিতে মিলিয়ে সংরক্ষণ হয়েছে":"✅ মেডিসিন শিডিউল সংরক্ষণ হয়েছে");
}
function msMergeInto(t,n){
  ["morning","noon","night"].forEach(k=>{let x=n[k];if(x&&x.name){t[k]={name:x.name,dose:x.dose||"",note:x.note||""}}});
  if(n.age!==undefined)t.age=n.age;
}
function msDedupe(){
  let a=state.medSchedule||[],out=[],by={},ch=false;
  a.forEach(r=>{
    if(r.date&&by[r.date]){msMergeInto(by[r.date],r);ch=true}
    else{out.push(r);if(r.date)by[r.date]=r}
  });
  if(ch){state.medSchedule=out;save()}
}
async function delMedSchedule(i){
  if(!await askConfirm("এই রেকর্ড মুছবেন?"))return;
  state.medSchedule=state.medSchedule||[];
  state.medSchedule.splice(i,1);
  save();renderMedSchedule();
}
function updateMsAge(){
  let msDateEl=document.getElementById("msDate");
  let msAgeEl=document.getElementById("msAge");
  if(!msDateEl||!msAgeEl)return;
  let d=msDateEl.value;
  if(!d){msAgeEl.textContent="— দিন";return;}
  if(!state.startDate){msAgeEl.textContent="শুরুর তারিখ নেই";return;}
  let start=new Date(state.startDate+"T00:00:00");
  let sel=new Date(d+"T00:00:00");
  start.setHours(0,0,0,0);sel.setHours(0,0,0,0);
  let diff=Math.max(0,Math.floor((sel-start)/86400000));
  msAgeEl.textContent=diff+" দিন";
}
let _msAll=false;
const MS_SL=[["morning","🌅","সকাল","#fbbf24"],["noon","☀️","দুপুর","#34d399"],["night","🌙","রাত","#818cf8"]];
window.msToggleDone=function(i,k){let r=state.medSchedule[i];if(!r)return;r.done=r.done||{};if(r.done[k])delete r.done[k];else r.done[k]=1;save();renderMedSchedule()};
window.msShowAll=function(){_msAll=!_msAll;renderMedSchedule()};
window.msCopyLast=function(){
  let a=(state.medSchedule||[]).slice().sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];
  if(!a){showToast("❌ আগের কোনো রেকর্ড নেই");return}
  [["morning","Morning"],["noon","Noon"],["night","Night"]].forEach(x=>{let o=a[x[0]]||{};["Name","Dose","Note"].forEach(f=>{document.getElementById("ms"+x[1]+f).value=o[f.toLowerCase()]||""})});
  showToast("✅ "+a.date+" এর মেডিসিন বসানো হয়েছে");
};
function renderMedSchedule(){
  msDedupe();
  let msDateEl=document.getElementById("msDate");
  if(msDateEl&&!msDateEl.value)msDateEl.value=todayISO();
  updateMsAge();
  let a=state.medSchedule||[],host=document.getElementById("msDays");
  if(!host)return;
  let today=todayISO(),tr=a.find(r=>r.date===today);
  let pg=document.getElementById("msProg");
  if(pg){
    let planned=tr?MS_SL.filter(x=>(tr[x[0]]||{}).name):[],done=planned.filter(x=>tr.done&&tr.done[x[0]]).length;
    pg.innerHTML=planned.length?'<span>আজ '+done+'/'+planned.length+' দেওয়া হয়েছে</span><div class="ms-pb"><i style="width:'+(done/planned.length*100)+'%"></i></div>':'<span>আজকের শিডিউল নেই</span>';
  }
  if(!a.length){host.innerHTML='<div class="ms-empty">💊<br>এখনও কোনো মেডিসিন শিডিউল যোগ করা হয়নি</div>';return}
  let idx=a.map((r,i)=>i).sort((x,y)=>String(a[y].date).localeCompare(String(a[x].date)));
  let shown=_msAll?idx:idx.slice(0,10);
  host.innerHTML=shown.map(i=>{
    let r=a[i],isT=r.date===today;
    let pills=MS_SL.map(x=>{
      let m=r[x[0]]||{};if(!m.name)return '';
      let dn=r.done&&r.done[x[0]];
      return '<div class="ms-pl'+(dn?' done':'')+'" style="--c:'+x[3]+'" onclick="msToggleDone('+i+',\''+x[0]+'\')"><span class="ms-pi">'+(dn?'✅':x[1])+'</span><div class="ms-pt"><b>'+esc(m.name)+'</b><small>'+(m.dose?esc(m.dose):'ডোজ নেই')+(m.note?' • '+esc(m.note):'')+'</small></div></div>';
    }).join('');
    return '<div class="ms-day'+(isT?' today':'')+'"><div class="ms-dh"><span class="ms-dd">'+(isT?'📍 আজ • ':'')+esc(r.date||"")+'</span>'+(r.age!==undefined?'<span class="ms-da">'+r.age+' দিন</span>':'')+'<span class="ms-ac"><button class="edt" onclick="openEdit(\'medSchedule\','+i+')">✏️</button><button class="del" onclick="delMedSchedule('+i+')">🗑️</button></span></div><div class="ms-pls">'+(pills||'<div class="ms-none">কোনো মেডিসিন নেই</div>')+'</div></div>';
  }).join('')+(idx.length>10?'<button class="an-btn" type="button" style="margin:6px 0 12px" onclick="msShowAll()">'+(_msAll?'কম দেখান':'সব '+idx.length+' দিন দেখান')+'</button>':'');
}


/* ── মেডিসিন সামারি ── */
function msSummary(){
 let a=state.medSchedule||[],host=document.getElementById("msDays");if(!host)return;
 let box=document.getElementById("msSum");
 if(!box){box=document.createElement("div");box.id="msSum";let f=document.querySelector("#medschedule .ms-form");if(f)f.parentNode.insertBefore(box,f);else host.parentNode.insertBefore(box,host)}
 if(!a.length){box.innerHTML="";return}
 let by={},today=todayISO(),dd=0,tot=0,dn=0;
 a.forEach(r=>{dd++;MS_SL.forEach(x=>{let m=r[x[0]];if(!m||!m.name)return;let k=m.name.trim();let o=by[k]=by[k]||{n:k,days:new Set(),t:0,d:0,first:r.date,last:r.date,dose:""};o.days.add(r.date);o.t++;tot++;let done=r.done&&r.done[x[0]];if(done){o.d++;dn++}if(r.date<o.first)o.first=r.date;if(r.date>=o.last){o.last=r.date;if(m.dose)o.dose=m.dose}})});
 let list=Object.values(by).sort((x,y)=>y.days.size-x.days.size);
 box.innerHTML='<div class="ms-sum"><div class="ms-sh2"><b>📋 মেডিসিন সামারি</b><span>'+dd+' দিনের শিডিউল</span></div>'+
  '<div class="ms-sg"><div><b>'+list.length+'</b><small>আলাদা ওষুধ</small></div><div><b>'+tot+'</b><small>মোট ডোজ</small></div><div><b>'+dn+'</b><small>দেওয়া হয়েছে</small></div><div><b>'+(tot-dn)+'</b><small>বাকি</small></div></div>'+
  list.map(o=>'<div class="ms-sr"><span class="ms-sn">💊 '+esc(o.n)+(o.dose?' <i>'+esc(o.dose)+'</i>':'')+'</span><span class="ms-sv"><b>'+o.days.size+'</b> দিন • '+o.d+'/'+o.t+' দেওয়া</span></div>').join("")+'</div>';
}

/* ── নোটে অংক: যোগ, বিয়োগ, গুণ, ভাগ ── */
function ncParse(s){
 let p=0;const t=s;
 const ws=()=>{while(p<t.length&&t[p]===" ")p++};
 function num(){ws();let st=p;while(p<t.length&&/[0-9.]/.test(t[p]))p++;if(st===p)throw 0;let v=parseFloat(t.slice(st,p));if(!isFinite(v))throw 0;return v}
 function atom(){ws();if(t[p]==="("){p++;let v=expr();ws();if(t[p]!==")")throw 0;p++;return v}if(t[p]==="-"){p++;return -atom()}if(t[p]==="+"){p++;return atom()}return num()}
 function term(){let v=atom();for(;;){ws();let c=t[p];if(c==="*"){p++;v*=atom()}else if(c==="/"){p++;let d=atom();if(d===0)throw 0;v/=d}else return v}}
 function expr(){let v=term();for(;;){ws();let c=t[p];if(c==="+"){p++;v+=term()}else if(c==="-"){p++;v-=term()}else return v}}
 let v=expr();ws();if(p<t.length)throw 0;return v;
}
function ncLine(line){
 line=String(line).split("=")[0].replace(/\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b|\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b|[০-৯]{1,2}[-\/][০-৯]{1,2}[-\/][০-৯]{2,4}/g," ");
 let m=line.match(/[0-9০-৯(][0-9০-৯.,\s+\-*\/×÷()xX]*[0-9০-৯)]/g);
 if(m)for(let k=m.length-1;k>=0;k--){
  let raw=m[k].trim();
  if(!/[+\-*\/×÷xX]/.test(raw.replace(/^[-+]/,"")))continue;
  let s=raw.replace(/[০-৯]/g,d=>"০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/,/g,"").replace(/[×xX]/g,"*").replace(/÷/g,"/");
  try{let v=ncParse(s);if(isFinite(v))return{expr:raw,val:Math.round(v*1e6)/1e6}}catch(e){}
 }
 return null;
}
function ncAll(text){let o=[];String(text||"").split("\n").forEach(l=>{let r=ncLine(l);if(r)o.push(r)});return o}
const ncFmt=v=>fmt(Math.round(v*100)/100);
function ncTotHtml(text){let r=ncAll(text);if(r.length<1)return"";let t=r.reduce((s,x)=>s+x.val,0);return `<div class="nc-box"><div class="nc-tot" style="margin:0;padding:0;border:0"><span>🧮 সব উত্তরের মোট (${r.length}টি)</span><b onclick="ncCopy('${Math.round(t*1e6)/1e6}')" style="cursor:pointer">${ncFmt(t)}</b></div></div>`}
function ncHtml(text){return String(text).split("\n").map(l=>{let r=ncLine(l);return esc(l)+(r&&!r.plain?`<span class="nc-eq">= ${ncFmt(r.val)}</span>`:"")}).join("\n")}
window.noteCalcLive=function(){
 let box=document.getElementById("noteCalc"),ta=document.getElementById("noteText");if(!box||!ta)return;
 let r=ncAll(ta.value);
 if(!r.length){box.style.display="none";box.innerHTML="";return}
 let tot=r.reduce((s,x)=>s+x.val,0);
 box.style.display="block";
 box.innerHTML=r.map(x=>`<div class="nc-r"><span class="nc-e">${esc(x.expr)}</span><span class="nc-v" onclick="ncCopy('${x.val}')" title="চাপলে কপি হবে">= ${ncFmt(x.val)}</span></div>`).join("")+(r.length>0?`<div class="nc-tot"><span>সব উত্তরের যোগফল</span><b onclick="ncCopy('${Math.round(tot*1e6)/1e6}')" style="cursor:pointer">${ncFmt(tot)}</b></div>`:"");
};
window.ncCopy=function(v){try{navigator.clipboard.writeText(String(v)).then(()=>showToast("📋 কপি হয়েছে: "+v),()=>showToast("= "+v))}catch(e){showToast("= "+v)}};
function addNote(){
  let title=document.getElementById("noteTitle").value.trim();
  let text=document.getElementById("noteText").value.trim();
  if(!title&&!text){showToast("❌ শিরোনাম বা নোট লিখুন");return;}
  state.notes=state.notes||[];
  state.notes.push({date:document.getElementById("noteDate").value||todayISO(),title:title,text:text,createdAt:new Date().toISOString()});
  save();renderNotes();
  document.getElementById("noteTitle").value="";document.getElementById("noteText").value="";noteCalcLive();
  showToast("✅ নোট সংরক্ষণ হয়েছে");
}
async function delNote(i){if(!await askConfirm("এই নোট মুছে ফেলবেন?"))return;state.notes=state.notes||[];state.notes.splice(i,1);save();renderNotes();showToast("🗑️ নোট মুছে ফেলা হয়েছে")}
function renderNotes(){
  let el=document.getElementById("noteDate");
  if(el&&!el.value)el.value=todayISO();
  let host=document.getElementById("notesList");
  if(!host)return;
  let all=state.notes||[];
  let q=((document.getElementById("noteSearch")||{}).value||"").trim().toLowerCase();
  let rows=all.map((r,i)=>({r:r,i:i})).reverse().filter(x=>!q||((x.r.title||"")+" "+(x.r.text||"")).toLowerCase().includes(q));
  if(!all.length){host.innerHTML=`<div class="hint">এখনও কোনো নোট যোগ করা হয়নি</div>`;return;}
  if(!rows.length){host.innerHTML=`<div class="hint">কিছু পাওয়া যায়নি</div>`;return;}
  host.innerHTML=rows.map(x=>{
    let r=x.r,t=(r.title||"").trim()||String(r.text||"").trim().split("\n")[0].slice(0,40)||"(শিরোনাম নেই)";
    let pv=String(r.text||"").replace(/\s+/g," ").trim().slice(0,70);
    return `<div class="note-row" onclick="openNote(${x.i})" role="button" tabindex="0"><div class="note-ic">📌</div><div class="note-mid"><div class="note-t">${esc(t)}</div>${ncAll(r.text).length>1?`<div class="note-pv" style="color:#ffd166;font-weight:700">🧮 মোট ${ncFmt(ncAll(r.text).reduce((s,x)=>s+x.val,0))}</div>`:""}${pv?`<div class="note-pv">${esc(pv)}${String(r.text||"").length>70?"…":""}</div>`:""}</div><div class="note-d">${esc(r.date||"")}<span>👉</span></div></div>`;
  }).join("");
}
function openNote(i){
  let r=(state.notes||[])[i];if(!r)return;
  let t=(r.title||"").trim()||"📝 নোট";
  document.getElementById("infoTitle").textContent="📌 "+t;
  document.getElementById("infoBody").innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:10px">📅 ${esc(r.date||"তারিখ নেই")}</div><div style="font-size:15px;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:#e8edf2;background:#0d1923;border:1px solid #ffffff14;border-radius:12px;padding:12px;max-height:55vh;overflow:auto">${r.text?ncHtml(r.text):"<span style='color:#7a9aaa'>কোনো বিস্তারিত লেখা নেই</span>"}</div>${ncTotHtml(r.text)}<div style="display:flex;gap:8px;margin-top:12px"><button class="edt" style="flex:1;padding:10px" onclick="closeInfo();openEdit('notes',${i})">✏️ এডিট</button><button class="del" style="flex:1;padding:10px" onclick="closeInfo();delNote(${i})">🗑️ মুছুন</button></div>`;
  document.getElementById("infoModal").classList.add("full");
  document.getElementById("infoModal").classList.add("show");
}

// ── অন্যান্য বিক্রি ──
const osCfg={
  litter:{date:"os_lDate",qty:"os_lQty",rate:"os_lRate",buyer:"os_lBuyer",total:"os_lTotal",table:"os_lTable",sum:"os_lSum",live:"os_lLive",label:"লিটার বিক্রি"},
  chicken:{date:"os_cDate",qty:"os_cQty",rate:"os_cRate",buyer:"os_cBuyer",total:"os_cTotal",table:"os_cTable",sum:"os_cSum",live:"os_cLive",label:"খুচরা মুরগি বিক্রি"},
  bag:{date:"os_bDate",qty:"os_bQty",rate:"os_bRate",buyer:"os_bBuyer",total:"os_bTotal",table:"os_bTable",sum:"os_bSum",live:"os_bLive",label:"বস্তা বিক্রি"},
  feed:{date:"os_fDate",qty:"os_fQty",rate:"os_fRate",buyer:"os_fBuyer",total:"os_fTotal",table:"os_fTable",sum:"os_fSum",live:"os_fLive",label:"ফিড বিক্রি"}
};
function osInit(){Object.keys(osCfg).forEach(k=>{let el=document.getElementById(osCfg[k].date);if(el&&!el.value)el.value=todayISO();})}
function osLive(type){
  let c=osCfg[type],g=id=>+document.getElementById(id).value||0,el=document.getElementById(c.live);if(!el)return;
  let rate=g(c.rate),t=0,extra="";
  if(type==="feed"){let kg=g("os_fBags")*g("os_fBagKg")+g("os_fLoose");t=kg*rate;extra=kg?" ("+fmt(kg)+" কেজি)":""}
  else{let q=g(c.qty);t=q*rate;if(type==="chicken"){let p=g("os_cPcs");if(p&&q)extra=" (গড় "+(q/p).toFixed(2)+" কেজি/পিস)"}}
  el.innerHTML=money(t)+extra;
}
function osLiveAll(){Object.keys(osCfg).forEach(osLive)}
async function addOtherSale(type){
  let c=osCfg[type],v=id=>document.getElementById(id);
  let rate=+v(c.rate).value||0;
  let rec={date:v(c.date).value||todayISO(),rate:rate,buyer:v(c.buyer).value||""};
  if(type==="feed"){
    let bags=+v("os_fBags").value||0,loose=+v("os_fLoose").value||0,bagKg=+v("os_fBagKg").value||0;
    if(bags>0&&!(bagKg>0)){showToast("❌ প্রতি বস্তায় কত কেজি তা দিন");return;}
    let kg=bags*bagKg+loose;
    if(!kg||!rate){showToast("❌ বস্তা/কেজি ও দর দিন");return;}
    Object.assign(rec,{bags:bags,loose:loose,bagKg:bagKg,qty:kg});
  }else{
    let qty=+v(c.qty).value||0;
    if(!qty||!rate){showToast(type==="bag"?"❌ পিস ও প্রতি পিসের দাম দিন":"❌ পরিমাণ ও দর দিন");return;}
    rec.qty=qty;
    if(type==="chicken"){
      let pcs=Math.round(+v("os_cPcs").value||0);
      if(pcs<=0){showToast("❌ মুরগির পিস দিন");return;}
      let avail=livePcs();
      if(pcs>avail&&!await askConfirm("⚠️ খুচরা বিক্রির মুরগি ("+pcs+" টি) খামারের বর্তমান মুরগির ("+avail+" টি) চেয়ে বেশি। তবুও সংরক্ষণ করবেন?"))return;
      rec.pcs=pcs;
    }
  }
  if(!state.otherSales)state.otherSales={litter:[],chicken:[],bag:[],feed:[]};
  if(!state.otherSales[type])state.otherSales[type]=[];
  state.otherSales[type].push(rec);
  if(type==="feed"){v("os_fBags").value="";v("os_fLoose").value="";v("os_fKg").value="";v("os_fKgH").textContent="";}
  else{v(c.qty).value="";if(type==="chicken")v("os_cPcs").value="";}
  v(c.rate).value="";v(c.buyer).value="";
  save();render();
  showToast("✅ "+c.label+" যোগ হয়েছে");
}
async function delOtherSale(type,i){
  if(!await askConfirm("মুছে ফেলবেন?"))return;
  state.otherSales[type].splice(i,1);
  save();render();
  showToast("🗑️ মুছে ফেলা হয়েছে");
}
// ── গিফট / নিজের খাওয়া ──
function giftLive(){
  let q=+document.getElementById("os_gPcs").value||0,w=+document.getElementById("os_gWeight").value||0;
  document.getElementById("os_gLive").innerHTML="⚖️ গড় ওজন: <b>"+(q&&w?(w/q).toFixed(2)+" কেজি/মুরগি":"—")+"</b>";
}
async function addGift(){
  let v=id=>document.getElementById(id);
  let name=v("os_gName").value.trim(),pcs=Math.round(+v("os_gPcs").value||0),w=+v("os_gWeight").value||0;
  if(!name){showToast("❌ নাম দিন");return;}
  if(pcs<=0){showToast("❌ মুরগির পিস দিন");return;}
  if(w<=0){showToast("❌ মোট ওজন দিন");return;}
  let avail=livePcs();
  if(pcs>avail&&!await askConfirm("⚠️ মুরগি ("+pcs+" টি) খামারের বর্তমান মুরগির ("+avail+" টি) চেয়ে বেশি। তবুও সংরক্ষণ করবেন?"))return;
  state.gifts=state.gifts||[];
  state.gifts.push({date:v("os_gDate").value||todayISO(),kind:v("os_gKind").value,name:name,qty:pcs,weight:w});
  v("os_gName").value="";v("os_gPcs").value="";v("os_gWeight").value="";giftLive();
  save();render();showToast("✅ যোগ হয়েছে — অবশিষ্ট মুরগি থেকে বাদ গেছে");
}
async function delGift(i){
  if(!await askConfirm("মুছে ফেলবেন?"))return;
  state.gifts.splice(i,1);save();render();showToast("🗑️ মুছে ফেলা হয়েছে");
}
function renderGifts(){
  let a=state.gifts||[],tb=document.getElementById("giftTable");if(!tb)return;
  let q=giftPcs(),w=sumOf(a,r=>r.weight);
  tb.innerHTML=a.length?dsort(a).map(([r,i])=>`<tr><td>${r.date||"—"}</td><td>${esc(r.kind||"গিফট")}</td><td>${esc(r.name)||"—"}</td><td>${fmt(r.qty,0)} টি</td><td>${fmt(r.weight)} কেজি</td><td>${(+r.qty)?(r.weight/r.qty).toFixed(2):"—"} কেজি</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('gift',${i})">✏️</button><button class="del" onclick="delGift(${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">এখনও কোনো গিফট / নিজের খাওয়ার হিসাব নেই</td></tr>`;
  let set=(id,t)=>{let el=document.getElementById(id);if(el)el.textContent=t};
  set("os_gTot","🎁 মোট: "+fmt(q,0)+" টি • "+fmt(w)+" কেজি");
  set("os_gSum",fmt(q,0)+" টি");
  set("os_liveSum",fmt(livePcs(),0)+" টি");
  set("os_gAvail",fmt(livePcs(),0));
  let d=document.getElementById("os_gDate");if(d&&!d.value)d.value=todayISO();
  giftLive();
}
function otherSalesTotal(type){
  if(!state.otherSales||!state.otherSales[type])return 0;
  return state.otherSales[type].reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
}
function otherSalesGrand(){return Object.keys(osCfg).reduce((s,k)=>s+otherSalesTotal(k),0);}
function renderOtherSales(){
  osInit();osLiveAll();
  if(!state.otherSales)state.otherSales={litter:[],chicken:[],bag:[],feed:[]};
  let grand=0;
  Object.keys(osCfg).forEach(type=>{
    let c=osCfg[type];
    let rows=state.otherSales[type]||[];
    let typeTotal=rows.reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
    grand+=typeTotal;
    let totalEl=document.getElementById(c.total);
    if(totalEl)totalEl.textContent=money(typeTotal);
    let sumEl=document.getElementById(c.sum);
    if(sumEl)sumEl.textContent=money(typeTotal);
    let tbl=document.getElementById(c.table);
    if(!tbl)return;
    let acts=i=>`<td style="white-space:nowrap"><button class="edt" onclick="openEdit('os',${i},'${type}')">✏️</button><button class="del" onclick="delOtherSale('${type}',${i})">মুছুন</button></td>`;
    let tot=r=>`<td style="color:#3ddc84;font-weight:700">${money((+r.qty||0)*(+r.rate||0))}</td>`;
    let buyer=r=>`<td>${esc(r.buyer)||"—"}</td>`;
    let ncol=type==="feed"?8:type==="chicken"?7:6;
    tbl.innerHTML=rows.length?dsort(rows).map(([r,i])=>{
      if(type==="feed"){let hb=r.bags!==undefined;return `<tr><td>${r.date||"—"}</td><td>${hb?fmt(r.bags,0)+" বস্তা":"—"}</td><td>${(hb?fmt(r.loose):fmt(r.qty))+" কেজি"}</td><td>${fmt(r.qty)} কেজি</td><td>${money(r.rate)}</td>${tot(r)}${buyer(r)}${acts(i)}</tr>`}
      if(type==="chicken")return `<tr><td>${r.date||"—"}</td><td>${r.pcs?fmt(r.pcs,0)+" টি":"—"}</td><td>${fmt(r.qty)} কেজি</td><td>${money(r.rate)}</td>${tot(r)}${buyer(r)}${acts(i)}</tr>`;
      if(type==="bag")return `<tr><td>${r.date||"—"}</td><td>${fmt(r.qty,0)} পিস</td><td>${money(r.rate)}</td>${tot(r)}${buyer(r)}${acts(i)}</tr>`;
      return `<tr><td>${r.date||"—"}</td><td>${fmt(r.qty)} কেজি</td><td>${money(r.rate)}</td>${tot(r)}${buyer(r)}${acts(i)}</tr>`;
    }).join(""):`<tr><td colspan="${ncol}" class="empty">এখনও কোনো ${c.label} যোগ করা হয়নি</td></tr>`;
  });
  let grandEl=document.getElementById("os_grandTotal");
  if(grandEl)grandEl.textContent=money(grand);
}


// ══════ সামারি ও এডিট ══════
const esc=v=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt=(n,d)=>Number(n||0).toLocaleString("en-BD",{maximumFractionDigits:d===undefined?2:d});
const sumOf=(a,f)=>(a||[]).reduce((s,r)=>s+(+f(r)||0),0);
function lastDate(a){let d=(a||[]).map(r=>r.date).filter(Boolean).sort();return d.length?d[d.length-1]:"—"}
window._sums={};
function sumCards(id,items){window._sums[id]=items}
function cardHtml(x){return `<div class="sc${x[1]==="বর্তমান আছে"?" sc-live":""}"><div class="sci">${x[0]}</div><div style="min-width:0"><div class="scl">${x[1]}</div><div class="scv" ${x[3]?`style="color:${x[3]}"`:""}>${x[2]}</div></div></div>`}
function topCount(list){let c={};list.filter(Boolean).forEach(n=>{n=String(n).trim();if(n)c[n]=(c[n]||0)+1});let k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return k?k+" ("+c[k]+" বার)":"—"}
function renderSummaries(){
 let bs=batchSummary(state);
 let chicks=+state.chicks||0,dead=+state.dead||0,alive=Math.max(0,chicks-dead),sold=soldPcs(),live=livePcs();
 // খরচের পেজ: ফিড, medicine, বিভিন্ন খরচ, কাঠের গুড়া
 Object.keys(configs).forEach(k=>{
  let a=state[k]||[],cost=total(k),qty=sumOf(a,r=>r.qty);
  sumCards(k,[["🧾","মোট এন্ট্রি",a.length],["⚖️","মোট পরিমাণ",fmt(qty)],["💸","মোট খরচ",money(cost),"#fbbf24"],["📊","গড় দর",qty?money(cost/qty):"৳০"],["📈","মোট খরচের অংশ",bs.cost?(cost/bs.cost*100).toFixed(1)+"%":"০%"],["🐔","প্রতি জীবিত মুরগি",alive?money(cost/alive):"৳০"],["📅","শেষ এন্ট্রি",lastDate(a)]]);
 });
 // বাচ্চা
 sumCards("farm",[["📅","বয়স",days()+" দিন"],["🐣","মোট বাচ্চা",fmt(chicks,0)],["🐔","বর্তমান আছে",fmt(live,0),"#3ddc84"],["☠️","মৃত",fmt(dead,0),"#ff7070"],["⚖️","মৃত্যুর হার",(chicks?(dead/chicks*100).toFixed(2):0)+"%"],["🛒","বিক্রিত",fmt(sold,0)],["💵","বাচ্চা ক্রয় খরচ",money(chicks*(+state.chickPrice||0)),"#fbbf24"]]);
 // মৃত বাচ্চা
 let d=state.deaths||[],worst=d.slice().sort((a,b)=>(+b.qty||0)-(+a.qty||0))[0];
 sumCards("deaths",[["☠️","মোট মৃত",fmt(dead,0),"#ff7070"],["⚖️","মৃত্যুর হার",(chicks?(dead/chicks*100).toFixed(2):0)+"%"],["🐔","বর্তমান আছে",fmt(live,0),"#3ddc84"],["📋","রেকর্ড সংখ্যা",d.length],["❗","প্রধান কারণ",topCount(d.map(r=>r.reason))],["📆","সবচেয়ে বেশি মৃত দিন",worst?(worst.date||"—")+" ("+worst.qty+" টি)":"—"]]);
 // কর্মচারী
 let w=state.workers||[],taken=workersPaid(),ws=wageStats(state);
 if(ws.on){let bal=ws.earned-taken;sumCards("workers",[["🗓️","হাজিরা (দিন)",ws.present+" / "+ws.total],["✂️","কাটা দিন",ws.absent,ws.absent?"#ff9b70":""],["💰","দৈনিক মজুরি",money(state.dailyWage)],["🧮","মোট প্রাপ্য",money(ws.earned),"#fbbf24"],["🧾","মোট নিয়েছে",money(taken),"#fbbf24"],[bal>=0?"⏳":"⚠️",bal>=0?"বাকি পাবে":"বেশি নিয়েছে",money(Math.abs(bal)),bal>=0?"#3ddc84":"#ff7070"]])}
 else sumCards("workers",[["🧾","মোট নিয়েছে",money(taken),"#fbbf24"],["🔢","কতবার নিয়েছে",w.length],["📅","শেষ নেওয়া",lastDate(w)],["ℹ️","হাজিরা","সেট করা নেই"]]);
 // ভাড়া
 let rn=state.rent||[],rt=sumOf(rn,r=>r.amt),rp=sumOf(rn,r=>r.paid);
 sumCards("rent",[["🚚","মোট ভাড়া",money(rt),"#fbbf24"],["✅","দিয়েছি",money(rp),"#3ddc84"],["⏳","অবশিষ্ট",money(rt-rp),rt-rp>0?"#ff7070":"#3ddc84"],["🔢","মোট এন্ট্রি",rn.length],["📅","শেষ এন্ট্রি",lastDate(rn)]]);
 // মুরগি বিক্রি
 let sl=state.sales||[],sq=sumOf(sl,r=>r.qty),sw=sumOf(sl,r=>r.weight),st=sumOf(sl,r=>(+r.weight||0)*(+r.rate||0)),sp=sumOf(sl,r=>r.paid);
 let cust=new Set(sl.map(r=>(r.customer||"").trim()).filter(Boolean)).size;
 sumCards("sales",[["🐔","বিক্রিত মুরগি",fmt(sq,0)+" টি"],["⚖️","মোট ওজন",fmt(sw)+" কেজি"],["📏","গড় ওজন/মুরগি (পাইকারি)",sq?(sw/sq).toFixed(2)+" কেজি":"—"],["⚖️","মোট গড় (গিফট+খুচরা সহ)",allWeightStats().q?allWeightStats().avg.toFixed(2)+" কেজি":"—"],["🎁","গিফট/নিজের",fmt(giftPcs(),0)+" টি"],["🏷️","গড় দর/কেজি",sw?money(st/sw):"৳০"],["💰","মোট টাকা",money(st),"#3ddc84"],["✅","পেয়েছি",money(sp)],["⏳","বাকি পাব",money(Math.max(0,st-sp)),st-sp>0?"#ff7070":"#3ddc84"],["👥","ক্রেতা",cust+" জন"],["📦","এখনও অবশিষ্ট মুরগি",fmt(live,0)+" টি"],["📅","শেষ বিক্রি",lastDate(sl)]]);
 // ক্রেতা
 sumCards("customers",[["👥","মোট ক্রেতা",cust+" জন"],["🛒","মোট বিক্রির বার",sl.length],["💰","মোট বিক্রি",money(st),"#3ddc84"],["✅","পরিশোধ",money(sp)],["⏳","মোট বাকি",money(Math.max(0,st-sp)),st-sp>0?"#ff7070":"#3ddc84"]]);
 // অন্যান্য বিক্রি
 let os=state.otherSales||{};
 sumCards("othersales",[["🪵","লিটার",money(otherSalesTotal("litter"))],["🐔","খুচরা মুরগি",money(otherSalesTotal("chicken"))+" ("+fmt(retailPcs(),0)+" টি)"],["🎁","গিফট/নিজের",fmt(giftPcs(),0)+" টি"],["🛍️","বস্তা",money(otherSalesTotal("bag"))],["🌾","ফিড",money(otherSalesTotal("feed"))],["💰","সব মিলিয়ে",money(otherSalesGrand()),"#3ddc84"],["🔢","মোট এন্ট্রি",Object.keys(osCfg).reduce((n,k)=>n+((os[k]||[]).length),0)+(state.gifts||[]).length]]);
 // মেডিসিন শিডিউল
 let ms=state.medSchedule||[],names=[];
 ms.forEach(r=>["morning","noon","night"].forEach(t=>{if(r[t]&&r[t].name)names.push(r[t].name)}));
 let cnt=t=>ms.filter(r=>r[t]&&r[t].name).length;
 sumCards("medschedule",[["📋","মোট রেকর্ড",ms.length],["🌅","সকালের ডোজ",cnt("morning")+" বার"],["☀️","দুপুরের ডোজ",cnt("noon")+" বার"],["🌙","রাতের ডোজ",cnt("night")+" বার"],["💊","সবচেয়ে বেশি ব্যবহৃত",topCount(names)],["📅","শেষ তারিখ",lastDate(ms)]]);
 // নোট
 let nt=state.notes||[];
 sumCards("notes",[["📝","মোট নোট",nt.length],["📅","সর্বশেষ নোট",lastDate(nt)]]);
 // রিপোর্ট
 let inc=bs.sales;
 sumCards("breakdown",[["🐣","বাচ্চা ক্রয়",money(chicks*(+state.chickPrice||0))],["🌾","ফিড",money(total("feed"))],["💊","মেডিসিন",money(total("medicine"))],["👷","কর্মচারী",money(workersTotal())],["🧾","বিভিন্ন খরচ",money(total("other"))],["🪵","কাঠের গুড়া",money(total("litter"))],["⚡","বিদ্যুৎ ও জ্বালানি",money(total("power"))],["🚚","পরিবহন ভাড়া",money(rentTotal())]]);
 sumCards("report",[["💵","মোট খরচ",money(bs.cost),"#fbbf24"],["💰","মোট আয়",money(inc),"#3ddc84"],[bs.profit>=0?"📈":"📉",bs.profit>=0?"নিট লাভ":"নিট ক্ষতি",money(bs.profit),bs.profit>=0?"#3ddc84":"#ff7070"],["🐔","প্রতি জীবিত মুরগি খরচ",alive?money(bs.cost/alive):"৳০"]]);
 // সব ব্যাচ
 let all=store.batches.map(batchSummary),tp=all.reduce((s,x)=>s+x.profit,0);
 sumCards("batches",[["🗂️","মোট ব্যাচ",store.batches.length],["🟢","চলমান",store.batches.filter(b=>b.status!=="closed").length],["✅","সম্পন্ন",store.batches.filter(b=>b.status==="closed").length],[tp>=0?"📈":"📉","সব ব্যাচের লাভ/ক্ষতি",money(tp),tp>=0?"#3ddc84":"#ff7070"]]);
}


// ── ড্যাশবোর্ড কার্ডে চাপলে সামারি ──
const sumMeta={
 sales:{t:"🐔 বিক্রিত মুরগি",p:"sales"},feed:{t:"🌾 ফিড খরচ",p:"feed"},medicine:{t:"💊 মেডিসিন",p:"medicine"},other:{t:"🧾 বিভিন্ন খরচ",p:"other"},litter:{t:"🪵 কাঠের গুড়া",p:"litter"},power:{t:"⚡ বিদ্যুৎ ও জ্বালানি",p:"power"},
 workers:{t:"👷 কর্মচারী",p:"workers"},rent:{t:"🚚 পরিবহন ভাড়া",p:"rent"},farm:{t:"🐣 বাচ্চার সামারি",p:"farm"},deaths:{t:"☠️ মৃত বাচ্চা",p:"farm"},
 income:{t:"💰 মোট আয়",p:"sales",groups:["sales","othersales"],gh:["🐔 মুরগি বিক্রি","🛒 অন্যান্য বিক্রি"]},
 report:{t:"📊 লাভ-ক্ষতি",p:"report",groups:["report","breakdown"],gh:["📊 আয়-ব্যয়","💸 খরচের ভাগ"]}
};
function openPage(id){
 let _anc=null;if(id==="fcr"){id="analysis";_anc="anFcrBox"}if(id==="litter"){id="other";_anc="expLitter"}else if(id==="rent"){id="other";_anc="expRent"}else if(id==="power"){id="other";_anc="expPower"}
 let b=[...document.querySelectorAll(".nav")].find(x=>(x.getAttribute("onclick")||"").includes("go('"+id+"'"));
 if(b){go(id,b);window.scrollTo(0,0);b.scrollIntoView({inline:"center",block:"nearest"});if(_anc)setTimeout(()=>{let e=document.getElementById(_anc);if(e)e.scrollIntoView({block:"start"})},60)}
}

function showSummary(k){
 let m=sumMeta[k];if(!m)return;
 renderSummaries();
 let gs=m.groups||[k];
 sumTitle.textContent=m.t+" — "+state.name;
 sumBody.innerHTML=gs.map((g,gi)=>(m.gh?`<div class="section" style="margin:${gi?16:0}px 0 8px;font-size:14px">${m.gh[gi]}</div>`:"")+`<div class="pgsum">${(window._sums[g]||[]).map(cardHtml).join("")}</div>`).join("");
 /* বেজোড় সংখ্যক কার্ড হলে শেষটা পুরো প্রস্থে, যেন সারি ফাঁকা না থাকে */
 sumBody.querySelectorAll(".pgsum").forEach(g=>{let n=[...g.children].filter(c=>!c.classList.contains("sc-live"));if(n.length%2===1)n[n.length-1].classList.add("sc-wide")});
 sumOpen.onclick=()=>{closeSummary();openPage(m.p)};
 summaryModal.classList.add("show");
}
function closeSummary(){summaryModal.classList.remove("show")}


// ══════ ব্যাচ ক্লোজ ══════
function closeStats(){
 let bs=batchSummary(state);
 let sold=soldPcs(),gift=giftPcs();
 let live=Math.max(0,bs.chicks-bs.dead-sold-gift);
 let due=(state.sales||[]).reduce((s,r)=>s+Math.max(0,(+r.weight||0)*(+r.rate||0)-(+r.paid||0)),0);
 let hasSales=(state.sales||[]).length>0||otherSalesGrand()>0;
 return {bs:bs,sold:sold,gift:gift,live:live,due:due,hasSales:hasSales,dead:bs.dead};
}
function openClose(){
 if(state.status==="closed"){showToast("এই ব্যাচ আগেই ক্লোজ হয়েছে");return}
 let x=closeStats(),bs=x.bs;
 let cards=[["📅","বয়স",days()+" দিন"],["💵","মোট খরচ",money(bs.cost),"#fbbf24"],["💰","মোট আয়",money(bs.sales),"#3ddc84"],[bs.profit>=0?"📈":"📉",bs.profit>=0?"নিট লাভ":"নিট ক্ষতি",money(bs.profit),bs.profit>=0?"#3ddc84":"#ff7070"],["🛒","বিক্রিত মুরগি",fmt(x.sold,0)+" টি"],["🎁","গিফট/নিজের",fmt(x.gift,0)+" টি"],["☠️","মৃত",fmt(x.dead,0)+" টি","#ff7070"],["🐔","খামারে অবশিষ্ট",fmt(x.live,0)+" টি",x.live>0?"#ffd070":"#3ddc84"],["⏳","ক্রেতার কাছে বাকি",money(x.due),x.due>0?"#ff7070":"#3ddc84"]];
 let warns=[];
 if(!x.hasSales)warns.push("কোনো বিক্রি যোগ করা হয়নি");
 
 if(x.due>0)warns.push("ক্রেতাদের কাছে "+money(x.due)+" বাকি পাওনা আছে");
 closeBody.innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:8px">${esc(state.name)} — ক্লোজ করার আগে চূড়ান্ত হিসাব দেখে নিন</div>`
  +`<div class="pgsum">${cards.map(cardHtml).join("")}</div>`
  +(x.live>0?`<div class="warnbox" style="border-color:#ff7070;color:#ffb0b0">🚫 <b>ক্লোজ করা যাবে না!</b><br>খামারে এখনও ${fmt(x.live,0)} টি মুরগি অবশিষ্ট আছে। সব মুরগি বিক্রি / গিফট / নিজের খাওয়া হিসেবে এন্ট্রি না হওয়া পর্যন্ত ব্যাচ ক্লোজ হবে না।</div>`:"")+(x.live>0?"":warns.length?`<div class="warnbox">${warns.map(w=>"⚠️ "+w).join("<br>")}<div style="opacity:.8;margin-top:4px">চাইলে তবুও ক্লোজ করতে পারেন।</div></div>`:`<div class="okbox">✅ সব ঠিক আছে — সব মুরগির হিসাব ও টাকা মিলেছে</div>`)
  +`<div class="mfields" style="margin-top:12px"><label>ক্লোজের তারিখ<input id="closeDate" type="date" value="${state.lockedEnd||todayISO()}"${state.lockedEnd?" readonly":""}></label><label class="wide">নোট (ঐচ্ছিক)<input id="closeNote" placeholder="যেমন: সব মুরগি বিক্রি শেষ"></label></div>`
  +`<div style="font-size:11.5px;color:#7a9aaa;margin-top:10px;line-height:1.6">ℹ️ ক্লোজ করলে ব্যাচটি "সম্পন্ন" হবে। সব তথ্য ও রিপোর্ট সংরক্ষিত থাকবে, ডিলিট হবে না। পরে চাইলে "আবার চালু" করা যাবে। এরপর "➕ নতুন ব্যাচ" দিয়ে নতুন ব্যাচ শুরু করুন।</div>`;
 document.getElementById("closeConfirmBtn").style.display=x.live>0?"none":"";
 closeModal.classList.add("show");
}
function hideClose(){closeModal.classList.remove("show")}
function confirmClose(){
 if(state.status==="closed"){hideClose();return}
 if(closeStats().live>0){showToast("❌ সব মুরগি বিক্রি না হলে ব্যাচ ক্লোজ করা যাবে না");return}
 state.status="closed";
 if(!state.lockedEnd)state.lockedEnd=document.getElementById("closeDate").value||todayISO();
 state.closedAt=state.lockedEnd;
 state.closeNote=document.getElementById("closeNote").value.trim();
 save();hideClose();render();window.scrollTo(0,0);showToast("✅ ব্যাচ ক্লোজ হয়েছে");
}
function renderCloseBar(){
 let el=document.getElementById("closeBar");if(!el)return;
 if(state.status==="closed"){
  let bs=batchSummary(state);
  el.innerHTML=`<div class="closebar closed"><div><b>✅ ব্যাচ সম্পন্ন — ${state.closedAt||""}</b><div class="cbsub">চূড়ান্ত ${bs.profit>=0?"লাভ":"ক্ষতি"}: <b style="color:${bs.profit>=0?"#3ddc84":"#ff7070"}">${money(bs.profit)}</b>${state.closeNote?" • "+esc(state.closeNote):""}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="add" onclick="newBatch()">➕ নতুন ব্যাচ শুরু করুন</button><button class="tbtn-light" onclick="showSummary('report')">📊 রিপোর্ট</button><button class="tbtn-light" onclick="toggleBatchStatus()">🔓 আবার চালু</button></div></div>`;
 }else{
  el.innerHTML=`<div class="closebar"><div><b>🔒 ব্যাচ শেষ হয়েছে?</b><div class="cbsub">${livePcs()>0?`🐔 এখনও <b style="color:#ffd070">${livePcs()} টি</b> মুরগি অবশিষ্ট — সব মুরগি বিক্রি/গিফট না হলে ক্লোজ করা যাবে না`:"সব মুরগি শেষ — এখন ব্যাচ ক্লোজ করতে পারেন"}</div></div><button class="add" ${livePcs()>0?'style="opacity:.55"':""} onclick="openClose()">🔒 ব্যাচ ক্লোজ করুন</button></div>`;
 }
}

// ── এডিট ──
function openNameModal(kind,id,title,val){
 window._edit={kind:kind,id:id};
 editTitle.textContent=title;
 editBody.oninput=null;
 editBody.innerHTML=`<label class="wide">ব্যাচের নাম<input data-k="name" data-t="text" type="text" value="${esc(val)}"></label>`;
 editModal.classList.add("show");
 setTimeout(()=>{let i=editBody.querySelector("input");if(i){i.focus();i.select()}},60);
}
function renameBatch(id){let b=store.batches.find(x=>x.id===id);if(!b)return;openNameModal("batchName",id,"✏️ ব্যাচের নাম বদলান",b.name)}
function editSchema(kind,type,i){
 let T=["date","তারিখ","date"];
 if(configs[kind]){let v=configs[kind];let fl=[T,["name",v[1],"text",kind==="feed"?"feedNames":""],["qty",v[2],"number"],["rate","দর","number"]];if(kind==="medicine")fl.push(["_medgroup","গ্রুপ (শ্রেণি)","medgroup"]);return{title:v[0],arr:state[kind],fields:fl}}
 if(kind==="dailyFeed")return{title:"দৈনিক খাবার",arr:state.dailyFeed,fields:[T,["name","ফিডের নাম","text","feedNames"],["bags","বস্তা (সংখ্যা)","number"],["loose","আলাদা কেজি","number"],["bagKg","প্রতি বস্তায় কত কেজি","number"],["note","নোট","text"]]};
 if(kind==="deaths")return{title:"মৃত বাচ্চা",arr:state.deaths,fields:[T,["qty","মৃত পরিমাণ","number"],["reason","কারণ","text"],["action","কী ব্যবস্থা নেওয়া হয়েছে","text"]]};
 if(kind==="workers")return{title:"কর্মচারী",arr:state.workers,fields:[T,["amount","কত টাকা নিলো","number"],["note","মন্তব্য","text"]]};
 if(kind==="rent")return{title:"পরিবহন ভাড়া",arr:state.rent,fields:[T,["desc","বিবরণ","text"],["amt","ভাড়া কত","number"],["paid","দিলাম কত","number"]]};
 if(kind==="os"){
  let f=[T];
  if(type==="feed")f.push(["bags","বস্তা (সংখ্যা)","number"],["loose","আলাদা কেজি","number"],["bagKg","প্রতি বস্তায় কত কেজি","number"]);
  else{if(type==="chicken")f.push(["pcs","মুরগির পিস","number"]);f.push(["qty",type==="chicken"?"মোট ওজন (কেজি)":type==="bag"?"পরিমাণ (পিস)":"পরিমাণ (কেজি)","number"]);}
  f.push(["rate",type==="bag"?"প্রতি পিসের দাম (৳)":"দর/কেজি (৳)","number"],["buyer","ক্রেতার নাম","text"]);
  return{title:osCfg[type].label,arr:state.otherSales[type],fields:f};
 }
 if(kind==="gift")return{title:"গিফট / নিজের খাওয়া",arr:state.gifts,fields:[T,["kind","ধরন","select"],["name","নাম","text"],["qty","মুরগির পিস","number"],["weight","মোট ওজন (কেজি)","number"]]};
 if(kind==="notes")return{title:"নোট",arr:state.notes,fields:[T,["title","শিরোনাম","text"],["text","নোট বিস্তারিত","textarea"]]};
 if(kind==="medSchedule"){
  let f=[T,["age","বয়স (দিন)","number"]];
  [["morning","🌅 সকাল"],["noon","☀️ দুপুর"],["night","🌙 রাত"]].forEach(x=>{f.push([x[0]+".name",x[1]+" — মেডিসিন","text"],[x[0]+".dose",x[1]+" — ডোজ","text"],[x[0]+".note",x[1]+" — নোট","text"]);});
  return{title:"মেডিসিন শিডিউল",arr:state.medSchedule,fields:f};
 }
 if(kind==="sales"){
  let r=state.sales[i]||{};
  let f=[T,["customer","ক্রেতার নাম","text"]];
  if(r.pallas&&r.pallas.length)f.push(["pallas","পাল্লা (প্রতি লাইনে: মুরগি সংখ্যা, ওজন — যেমন 50, 95.5)","pallas"]);
  else f.push(["qty","মুরগি সংখ্যা","number"],["weight","মোট ওজন (কেজি)","number"]);
  f.push(["rate","দর/কেজি","number"],["paid","পরিশোধ কত","number"]);
  return{title:"মুরগি বিক্রি",arr:state.sales,fields:f};
 }
 return null;
}
const dotGet=(o,p)=>p.split(".").reduce((a,k)=>a==null?undefined:a[k],o);
function dotSet(o,p,v){let ks=p.split("."),t=o;for(let j=0;j<ks.length-1;j++){if(typeof t[ks[j]]!=="object"||t[ks[j]]===null)t[ks[j]]={};t=t[ks[j]]}t[ks[ks.length-1]]=v}
function openEdit(kind,i,type){
 let sc=editSchema(kind,type,i);if(!sc||!sc.arr||!sc.arr[i])return;
 let rec=sc.arr[i];window._edit={kind:kind,i:i,type:type};
 if(kind==="os"&&type==="feed"){if(rec.bags===undefined){rec.bags=0;rec.loose=+rec.qty||0}if(rec.bagKg===undefined)rec.bagKg=50}
 editTitle.textContent="✏️ "+sc.title+" — এডিট করুন";
 editBody.innerHTML=sc.fields.map(f=>{
  let val=f[2]==="pallas"?(rec.pallas||[]).map(p=>p.qty+", "+p.weight).join("\n"):dotGet(rec,f[0]);
  let wide=(f[2]==="textarea"||f[2]==="pallas")?" wide":"";
  if(f[2]==="medgroup"){let cur=medInfo(rec.name||"").g;return `<label class="wide">${f[1]}<select data-k="_medgroup" data-t="medgroup">${Object.keys(MED_GROUPS).map(k=>`<option value="${k}"${k===cur?" selected":""}>${MED_GROUPS[k]}</option>`).join("")}</select></label>`}
  if(f[2]==="select")return `<label>${f[1]}<select data-k="${f[0]}" data-t="select">${["গিফট","নিজের খাওয়া"].map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select></label>`;
  let inp=(f[2]==="textarea"||f[2]==="pallas")
   ?`<textarea data-k="${f[0]}" data-t="${f[2]}" rows="${f[2]==="pallas"?5:4}">${esc(val)}</textarea>`
   :`<input data-k="${f[0]}" data-t="${f[2]}" type="${f[2]}" ${f[3]?`list="${f[3]}" id="editFeedName" oninput="syncChips('editFeedName')"`:""} ${f[2]==="number"?'step=".01" inputmode="decimal"':""} value="${esc(val)}">`;
  return `<label class="${wide.trim()}">${f[1]}${inp}</label>`;
 }).join("");
 if(sc.fields.some(f=>f[3]))editBody.innerHTML+=`<div style="grid-column:1/-1">${feedChips("editFeedName",String(dotGet(rec,"name")||"").trim())}</div>`;
 editBody.innerHTML+=`<div id="editLive" style="grid-column:1/-1;padding:10px 14px;background:#0d2b1e;border:1px solid #1aad6e50;border-radius:10px;font-size:14px;color:#3ddc84;font-weight:700;display:none"></div>`;
 editBody.oninput=editLive;editLive();
 editModal.classList.add("show");
}
function editLive(){
 let e=window._edit,box=document.getElementById("editLive");if(!e||!box)return;
 let g=k=>{let el=editBody.querySelector('[data-k="'+k+'"]');return el?(+el.value||0):0};
 let html="";
 if(configs[e.kind]||(e.kind==="os"&&e.type!=="feed")){html="💰 মোট দাম: "+money(g("qty")*g("rate"));if(e.kind==="os"&&e.type==="chicken"&&g("pcs")&&g("qty"))html+=" • গড় "+(g("qty")/g("pcs")).toFixed(2)+" কেজি/পিস"}
 else if(e.kind==="os"){let kg=g("bags")*g("bagKg")+g("loose");html="💰 মোট দাম: "+money(kg*g("rate"))+" • মোট "+fmt(kg)+" কেজি"}
 else if(e.kind==="sales"){
  let pe=editBody.querySelector('[data-t="pallas"]'),w=0,q=0;
  if(pe){pe.value.split(/\n/).forEach(l=>{let a=l.trim().split(/[\s,]+/).map(Number);if(a.length>=2&&a[0]>0&&a[1]>0){q+=a[0];w+=a[1]}})}else{w=g("weight");q=g("qty")}
  html="💰 মোট দাম: "+money(w*g("rate"))+" • "+fmt(q,0)+" টি • "+fmt(w)+" কেজি"+(q?" • গড় "+(w/q).toFixed(2)+" কেজি":"");
 }
 else if(e.kind==="dailyFeed"){let kg=g("bags")*g("bagKg")+g("loose");html="🍽️ মোট খাবার: "+fmt(kg)+" কেজি"}
 else if(e.kind==="gift"){let q=g("qty"),w=g("weight");html="⚖️ গড় ওজন: "+(q&&w?(w/q).toFixed(2)+" কেজি/মুরগি":"—")}
 box.style.display=html?"block":"none";box.innerHTML=html;
}
function closeEdit(){editModal.classList.remove("show");window._edit=null}
function saveEdit(){
 let e=window._edit;if(!e)return;
 if(e.kind==="batchName"||e.kind==="newBatch"){
  let nv=editBody.querySelector("[data-k]").value.trim();
  if(e.kind==="batchName"){if(!nv){alert("নাম দিন");return}let b=store.batches.find(x=>x.id===e.id);if(b)b.name=nv;save();render();closeEdit();showToast("✅ ব্যাচের নাম বদলানো হয়েছে");return}
  let b=freshBatch(nv||"ব্যাচ "+(store.batches.length+1));store.batches.push(b);store.activeId=b.id;state=b;save();render();closeEdit();window.scrollTo(0,0);showToast("✅ নতুন ব্যাচ শুরু হয়েছে");return;
 }
 let sc=editSchema(e.kind,e.type,e.i);if(!sc||!sc.arr[e.i])return;
 let rec=sc.arr[e.i],vals={},pallas=null;
 let els=editBody.querySelectorAll("[data-k]");
 for(let el of els){
  let k=el.dataset.k,t=el.dataset.t;
  if(t==="medgroup"){window._medG=el.value;continue}
  if(t==="number")vals[k]=+el.value||0;
  else if(t==="pallas"){
   pallas=[];
   for(let line of el.value.split(/\n/)){
    line=line.trim();if(!line)continue;
    let pr=line.split(/[\s,]+/).map(Number);
    if(pr.length<2||!(pr[0]>0)||!(pr[1]>0)){alert("পাল্লার লাইন ঠিক নয়: \""+line+"\"\nসঠিক রূপ: মুরগি সংখ্যা, ওজন (যেমন 50, 95.5)");return;}
    pallas.push({qty:pr[0],weight:pr[1]});
   }
   if(!pallas.length){alert("অন্তত একটি পাল্লা দিন");return;}
  }
  else vals[k]=el.value;
 }
 Object.keys(vals).forEach(k=>dotSet(rec,k,vals[k]));
 if(e.kind==="os"&&e.type==="feed")rec.qty=(+rec.bags||0)*(+rec.bagKg||0)+(+rec.loose||0);
 if(e.kind==="os"&&e.type==="chicken")rec.pcs=Math.round(+rec.pcs||0);
 if(e.kind==="gift")rec.qty=Math.round(+rec.qty||0);
 if(pallas){rec.pallas=pallas;rec.qty=pallas.reduce((s,p)=>s+p.qty,0);rec.weight=+pallas.reduce((s,p)=>s+p.weight,0).toFixed(3);}
 if(e.kind==="deaths")state.dead=deathTotal();
 if(e.kind==="medicine"&&window._medG){let nm=medNorm(rec.name);if(nm){state.medGroups=state.medGroups||{};let au=medInfo(rec.name,true).g;if(window._medG===au)delete state.medGroups[nm];else state.medGroups[nm]=window._medG}}window._medG=undefined;
 save();render();renderTempPallas();closeEdit();showToast("✅ পরিবর্তন সংরক্ষণ হয়েছে");
}
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){closeEdit();closeSummary();hideClose();closeInfo()}});

// ── ভ্যাকসিন ──
const VAC=[
 {k:"ranikhet",name:"রানিক্ষেত (Newcastle) ভ্যাকসিন",ico:"🐥",from:1,to:3},
 {k:"gumboro1",name:"গামবোরো ভ্যাকসিন — ১ম ডোজ",ico:"💉",from:8,to:11},
 {k:"gumboro2",name:"গামবোরো ভ্যাকসিন — ২য় ডোজ (বুস্টার)",ico:"💉",from:17,to:20}
];
const bnN=n=>String(n).replace(/\d/g,d=>"০১২৩৪৫৬৭৮৯"[d]);
const vEsc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function vacStatus(v){
 let rec=(state.vaccines||{})[v.k];
 if(rec&&rec.date)return{s:"done",rec:rec};
 if(!state.startDate)return{s:"nodate"};
 let a=days();
 if(a>v.to)return{s:"late",late:a-v.to};
 if(a>=v.from)return{s:"due",left:v.to-a+1};
 if(a===v.from-1)return{s:"soon"};
 return{s:"wait",inDays:v.from-a};
}
function vacRange(v){
 if(!state.startDate)return"";
 let a=new Date(state.startDate+"T00:00:00"),b=new Date(a);
 a.setDate(a.getDate()+v.from);b.setDate(b.getDate()+v.to);
 let f=d=>d.toLocaleDateString("bn-BD",{day:"numeric",month:"long"});
 return f(a)+" – "+f(b);
}
function vacAlerts(){
 if(state.status==="closed"||!state.startDate)return[];
 return VAC.map(v=>({v:v,st:vacStatus(v)})).filter(x=>x.st.s==="due"||x.st.s==="late"||x.st.s==="soon");
}
function vacLine(x){
 let v=x.v,st=x.st,r="বয়স "+bnN(v.from)+"–"+bnN(v.to)+" দিন";
 if(st.s==="due")return"⚠️ "+v.name+" দেওয়ার সময় হয়েছে! ("+r+", আজসহ আর "+bnN(st.left)+" দিন)";
 if(st.s==="late")return"🚨 "+v.name+" — সময় পেরিয়ে গেছে ("+bnN(st.late)+" দিন দেরি), এখনই দিন!";
 return"🔔 কাল থেকে "+v.name+" দেওয়ার সময় শুরু ("+r+")";
}
function renderVacBanner(){
 let al=vacAlerts(),el=document.getElementById("vacBanner"),bd=document.getElementById("vacBadge");
 let n=al.filter(x=>x.st.s!=="soon").length;
 if(bd){bd.style.display=n?"inline-block":"none";bd.textContent=bnN(n)}
 if(el)el.innerHTML=al.map(x=>`<div class="vacwarn ${x.st.s==="soon"?"soon":x.st.s==="late"?"late":"due"}" onclick="openPage('vaccine')">${vEsc(vacLine(x))} <span style="opacity:.7;font-weight:600">👉 চাপুন</span></div>`).join("");
}
function renderVaccine(){
 let host=document.getElementById("vacList");
 if(host){
  let done=VAC.filter(v=>vacStatus(v).s==="done").length;
  let info=document.getElementById("vacInfo");
  if(info)info.innerHTML=state.startDate?`🐣 ব্যাচ: <b>${vEsc(state.name)}</b> &nbsp;|&nbsp; ⏱️ বর্তমান বয়স: <b>${bnN(days())} দিন</b> &nbsp;|&nbsp; ✅ দেওয়া হয়েছে: <b>${bnN(done)}/${bnN(VAC.length)}</b>`:`⚠️ আগে "🐣 বাচ্চা" পেজে বাচ্চা আসার তারিখ দিন — তারিখ ছাড়া ভ্যাকসিনের সময় হিসাব হবে না`;
  host.innerHTML=VAC.map(v=>{
   let st=vacStatus(v),cls="vac-wait",ic=v.ico,msg="",act="";
   let form=`<div class="vac-form"><label>তারিখ<input type="date" id="vd_${v.k}" value="${todayISO()}"></label><label>ভ্যাকসিনের নাম / নোট<input id="vn_${v.k}" placeholder="ঐচ্ছিক"></label><button class="add" onclick="markVac('${v.k}')">✅ দেওয়া হয়েছে</button></div>`;
   if(st.s==="done"){cls="vac-done";ic="✔";msg=`✅ দেওয়া হয়েছে — তারিখ: ${vEsc(st.rec.date)}${st.rec.note?" ("+vEsc(st.rec.note)+")":""}`;act=`<div class="vac-form"><button class="del" onclick="unmarkVac('${v.k}')">↩️ বাতিল করুন</button></div>`}
   else if(st.s==="due"){cls="vac-due";msg=`⚠️ এখনই দেওয়ার সময়! আজসহ আর ${bnN(st.left)} দিন`;act=form}
   else if(st.s==="late"){cls="vac-late";msg=`🚨 সময় পেরিয়ে গেছে (${bnN(st.late)} দিন দেরি) — দ্রুত দিন`;act=form}
   else if(st.s==="soon"){cls="vac-soon";msg="🔔 কাল থেকে শুরু";act=form}
   else if(st.s==="wait"){msg=`⏳ আর ${bnN(st.inDays)} দিন পরে শুরু`;act=form}
   else{msg="📅 বাচ্চা আসার তারিখ দিন";act=form}
   return`<div class="vac ${cls}"><div class="vac-ic">${ic}</div><div class="vac-body"><div class="vac-t">${v.name}</div><div class="vac-s">বয়স ${bnN(v.from)}–${bnN(v.to)} দিন${state.startDate?" &nbsp;•&nbsp; 📆 "+vacRange(v):""}</div><div class="vac-st">${msg}</div>${act}</div></div>`;
  }).join("");
 }
 let nb=document.getElementById("vacNotifBox");
 if(nb){
  let can=("Notification" in window)&&Notification.permission==="default";
  nb.innerHTML=can?`<button class="add" style="width:100%;margin-bottom:12px" onclick="vacAskNotif()">🔔 ফোনে নোটিফিকেশন ওয়ার্নিং চালু করুন</button>`:"";
 }
 renderVacBanner();
}
function markVac(k){
 let d=document.getElementById("vd_"+k),n=document.getElementById("vn_"+k);
 state.vaccines=state.vaccines||{};
 state.vaccines[k]={date:(d&&d.value)||todayISO(),note:(n&&n.value.trim())||""};
 save();render();showToast("✅ ভ্যাকসিন দেওয়া হয়েছে — সবুজ টিক পড়েছে");
}
async function unmarkVac(k){
 if(!await askConfirm("এই ভ্যাকসিনের 'দেওয়া হয়েছে' চিহ্ন বাতিল করবেন?"))return;
 if(state.vaccines)delete state.vaccines[k];
 save();render();
}
function vacAskNotif(){
 try{Notification.requestPermission().then(()=>{renderVaccine();vacCheck(true)})}catch(e){}
}
function vacNotify(title,body){
 try{
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body:body,icon:"icon-192.png",tag:"vaccine",lang:"bn"}));
  else new Notification(title,{body:body});
 }catch(e){}
}
function hideVacPopup(){document.getElementById("vacModal").classList.remove("show")}
let _vacDay="";
function vacCheck(force){
 renderVacBanner();
 let al=vacAlerts().filter(x=>x.st.s!=="soon");
 if(!al.length)return;
 let t=todayISO();
 if(_vacDay!==t||force===true){
  _vacDay=t;
  document.getElementById("vacModalBody").innerHTML=al.map(x=>`<div class="vacitem">${vEsc(vacLine(x))}</div>`).join("");
  document.getElementById("vacModal").classList.add("show");
 }
 try{
  if(localStorage.getItem("vacNotifDay")!==t){
   vacNotify("💉 ভ্যাকসিনের সময় হয়েছে",al.map(vacLine).join("\n"));
   localStorage.setItem("vacNotifDay",t);
  }
 }catch(e){}
}

// ══════ ফিড নাম সিলেকশন ══════
const FEED_NAMES=["প্রি-স্টাটার","স্টাটার","গ্রোয়ার","ফিনিশার"];
function chipBtns(id,cur){return FEED_NAMES.map(n=>`<button type="button" class="chip${n===cur?" sel":""}" data-for="${id}" onclick="pickFeed('${id}','${n}')">${n}</button>`).join("")}
function feedChips(id,cur){return `<div class="chips">${chipBtns(id,cur||"")}</div>`}
function syncChips(id){let el=document.getElementById(id);if(!el)return;let v=el.value.trim();document.querySelectorAll('.chip[data-for="'+id+'"]').forEach(b=>b.classList.toggle("sel",b.textContent===v))}
function pickFeed(id,n){let el=document.getElementById(id);if(!el)return;el.value=n;el.dispatchEvent(new Event("input",{bubbles:true}));syncChips(id)}

// ══════ দৈনিক খাবার ══════
function dfKg(r){return (+r.bags||0)*(+r.bagKg||0)+(+r.loose||0)}
function dailyFeedKg(){return sumOf(state.dailyFeed,dfKg)}
function ageOn(d){if(!state.startDate||!d)return null;let a=new Date(state.startDate+"T00:00:00"),b=new Date(d+"T00:00:00");return Math.max(0,Math.round((b-a)/86400000))}
function aliveOn(d){
 let before=x=>!x||!d||x<d, upto=x=>!x||!d||x<=d;
 let dl=state.deaths||[];
 let dead=dl.length?sumOf(dl.filter(r=>upto(r.date)),r=>r.qty):(+state.dead||0);
 let out=sumOf((state.sales||[]).filter(r=>before(r.date)),r=>r.qty)+sumOf(((state.otherSales&&state.otherSales.chicken)||[]).filter(r=>before(r.date)),r=>r.pcs)+sumOf((state.gifts||[]).filter(r=>before(r.date)),r=>r.qty);
 return Math.max(0,(+state.chicks||0)-dead-out);
}
function dfLive(){
 let v=id=>document.getElementById(id),el=v("dfLive");if(!el)return;
 let kg=(+v("dfBags").value||0)*(+v("dfBagKg").value||0)+(+v("dfLoose").value||0);
 let d=v("dfDate").value||todayISO(),al=aliveOn(d),ag=ageOn(d);
 el.innerHTML="🍽️ মোট খাবার: <b>"+fmt(kg)+" কেজি</b>"+(ag!==null?" • ⏱️ বয়স: <b>"+ag+" দিন</b>":"")+(kg&&al?" • 🐔 প্রতি মুরগি: <b>"+fmt(kg*1000/al,1)+" গ্রাম</b>":"");
}

/* ── কেজি লিখলে বস্তা নিজে আসে ── */
const KG_MAP={df:["dfKg","dfBags","dfLoose","dfBagKg","dfKgH",function(){dfLive()}],osf:["os_fKg","os_fBags","os_fLoose","os_fBagKg","os_fKgH",function(){osLive("feed")}]};
function _kgBn(n){return Number(n).toLocaleString("bn-BD",{maximumFractionDigits:2})}
function kgSplit(k){
 let m=KG_MAP[k],g=id=>document.getElementById(id),kg=+g(m[0]).value||0,bk=+g(m[3]).value||0;
 if(!(kg>0)){g(m[1]).value="";g(m[2]).value="";g(m[4]).textContent="";m[5]();return}
 if(!(bk>0)){g(m[1]).value="";g(m[2]).value=kg;g(m[4]).textContent="⚠️ আগে প্রতি বস্তায় কত কেজি তা দিন";m[5]();return}
 let bags=Math.floor(kg/bk+1e-9),loose=Math.round((kg-bags*bk)*100)/100;
 g(m[1]).value=bags||"";g(m[2]).value=loose>0?loose:"";
 g(m[4]).textContent="= "+(bags?_kgBn(bags)+" বস্তা":"")+(bags&&loose>0?" + ":"")+(loose>0?_kgBn(loose)+" কেজি আলাদা":"");
 m[5]();
}
function kgParts(k){
 let m=KG_MAP[k],g=id=>document.getElementById(id),b=+g(m[1]).value||0,l=+g(m[2]).value||0,bk=+g(m[3]).value||0,t=b*bk+l;
 g(m[0]).value=t>0?Math.round(t*100)/100:"";g(m[4]).textContent="";m[5]();
}
function kgBagKg(k){
 let m=KG_MAP[k],g=id=>document.getElementById(id);
 if(+g(m[0]).value>0&&document.activeElement===g(m[3])){kgSplit(k);return}
 kgParts(k);
}

// ── একই তারিখের এন্ট্রি যোগ করে এক সারি ──
function _joinTxt(a,b){a=(a||"").trim();b=(b||"").trim();if(!b)return a;if(!a)return b;return a.toLowerCase().split(/\s*[,|]\s*/).includes(b.toLowerCase())?a:a+", "+b}
function dfMergeInto(t,n){
 let kg=dfKg(t)+dfKg(n);
 if((+t.bags||0)===0||(+n.bags||0)===0||(+t.bagKg||0)===(+n.bagKg||0)){
  t.bagKg=(+t.bags>0?+t.bagKg:(+n.bags>0?+n.bagKg:(+t.bagKg||+n.bagKg||0)));
  t.bags=(+t.bags||0)+(+n.bags||0);t.loose=(+t.loose||0)+(+n.loose||0);
 }else{t.bags=0;t.loose=kg}
 t.note=_joinTxt(t.note,n.note);
}
function dfKey(r){return (r.date||"")+"|"+String(r.name||"").trim().toLowerCase()}
function dfDedupe(){
 let a=state.dailyFeed||[],out=[],by={},ch=false;
 a.forEach(r=>{let k=dfKey(r);if(r.date&&by[k]){dfMergeInto(by[k],r);ch=true}else{out.push(r);if(r.date)by[k]=r}});
 if(ch){state.dailyFeed=out;save()}
}
function deathMergeInto(t,n){t.qty=(+t.qty||0)+(+n.qty||0);t.reason=_joinTxt(t.reason,n.reason);t.action=_joinTxt(t.action,n.action);t.note=_joinTxt(t.note,n.note)}
function deathDedupe(){
 let a=state.deaths||[],out=[],by={},ch=false;
 a.forEach(r=>{if(r.date&&by[r.date]){deathMergeInto(by[r.date],r);ch=true}else{out.push(r);if(r.date)by[r.date]=r}});
 if(ch){state.deaths=out;state.dead=deathTotal();save()}
}
function addDailyFeed(){
 let v=id=>document.getElementById(id);
 let name=v("dfName").value.trim(),bags=+v("dfBags").value||0,loose=+v("dfLoose").value||0,bagKg=+v("dfBagKg").value||0;
 if(!name){showToast("❌ ফিডের নাম দিন");return}
 if(bags>0&&!(bagKg>0)){showToast("❌ প্রতি বস্তায় কত কেজি তা দিন");return}
 if(bags*bagKg+loose<=0){showToast("❌ খাবারের পরিমাণ দিন");return}
 state.dailyFeed=state.dailyFeed||[];
 let rec={date:v("dfDate").value||todayISO(),name:name,bags:bags,loose:loose,bagKg:bagKg,note:v("dfNote").value.trim()};
 let ex=state.dailyFeed.find(r=>dfKey(r)===dfKey(rec)),merged=false;
 if(ex){dfMergeInto(ex,rec);merged=true}else state.dailyFeed.push(rec);
 v("dfName").value="";syncChips("dfName");v("dfBags").value="";v("dfLoose").value="";v("dfKg").value="";v("dfKgH").textContent="";v("dfNote").value="";dfLive();
 save();render();showToast(merged?"✅ এই তারিখের আগের এন্ট্রির সাথে যোগ হয়েছে — মোট "+fmt(dfKg(ex))+" কেজি":"✅ দৈনিক খাবারের হিসাব সংরক্ষণ হয়েছে");
}
function dfBk(){return +state.feedBagKg>0?+state.feedBagKg:50}
function dfStock(fed){
 let box=document.getElementById("dfStockBox");
 if(!box){let c=document.getElementById("dfCards");if(!c)return;c.insertAdjacentHTML("afterend",'<div id="dfStockBox" class="fd-sum"></div>');box=document.getElementById("dfStockBox")}
 let bk=dfBk(),buy={};
 (state.feed||[]).forEach(r=>{let n=(r.name||"").trim()||"নাম নেই";buy[n]=(buy[n]||0)+(+r.qty||0)*bk});
 let names=[...new Set([...Object.keys(buy),...Object.keys(fed)])];
 if(!names.length){box.style.display="none";box.innerHTML="";return}
 box.style.display="";
 let cell=kg=>'<b>'+fmt(kg)+' কেজি</b><small>'+fmt(kg/bk,1)+' বস্তা</small>';
 let tb=0,tf=0;
 let row=(n,b,f,tot)=>{let r=b-f;return '<div class="fd-r'+(tot?' fd-tot':'')+'"><div class="fd-rn">'+(tot?'মোট':esc(n))+'</div><div class="fd-c"><span>কেনা</span>'+cell(b)+'</div><div class="fd-c"><span>খাওয়ানো</span>'+cell(f)+'</div><div class="fd-c '+(r<0?"fd-neg":"fd-pos")+'"><span>বাকি</span>'+(r<0?'<b>−'+fmt(-r)+' কেজি</b><small>'+fmt(-r/bk,1)+' বস্তা কম</small>':cell(r))+'</div></div>'};
 let rows=names.map(n=>{let b=buy[n]||0,f=fed[n]||0;tb+=b;tf+=f;return row(n,b,f)}).join("");
 let tr=tb-tf;
 box.innerHTML='<div class="fd-h">🌾 ফিড কেনা − খাওয়ানো = বাকি</div>'+rows+(names.length>1?row("",tb,tf,true):"")+
  '<div class="fd-n">কেনা ফিড "ফিড হিসাব" পেজ থেকে, প্রতি বস্তা '+fmt(bk)+' কেজি ধরে।'+(tr<0?' ⚠️ বাকি মাইনাস মানে কেনার চেয়ে বেশি খাওয়ানো লেখা হয়েছে — কেনা বা নাম মিলিয়ে দেখুন।':'')+'</div>';
}
function renderDailyFeed(){
 let tb=document.getElementById("dfTable");if(!tb)return;
 dfDedupe();
 let d=document.getElementById("dfDate");if(d&&!d.value)d.value=todayISO();
 let ch=document.getElementById("dfChips");if(ch)ch.innerHTML=chipBtns("dfName",document.getElementById("dfName").value.trim());
 let a=state.dailyFeed||[],tot=sumOf(a,dfKg),t=todayISO();
 let todayKg=sumOf(a.filter(r=>r.date===t),dfKg);
 let dates=[...new Set(a.map(r=>r.date).filter(Boolean))];
 let perBird=a.reduce((s,r)=>{let al=aliveOn(r.date);return s+(al?dfKg(r)*1000/al:0)},0);
 let byName={};a.forEach(r=>{let n=(r.name||"").trim()||"নাম নেই";byName[n]=(byName[n]||0)+dfKg(r)});
 let cards=[["🍽️","মোট খাওয়ানো",fmt(tot)+" কেজি • "+fmt(tot/dfBk(),1)+" বস্তা","#3ddc84"],["📅","আজকের খাবার",fmt(todayKg)+" কেজি"],["📊","গড় প্রতিদিন",dates.length?fmt(tot/dates.length)+" কেজি":"—"],["🐔","প্রতি মুরগি মোট",perBird>=1000?fmt(perBird/1000)+" কেজি":fmt(perBird,1)+" গ্রাম"],["🗓️","হিসাবের দিন",dates.length+" দিন"],["🕒","শেষ এন্ট্রি",lastDate(a)]];
 Object.keys(byName).forEach(n=>cards.push(["🌾",esc(n),fmt(byName[n])+" কেজি • "+fmt(byName[n]/dfBk(),1)+" বস্তা","#fbbf24"]));
 document.getElementById("dfCards").innerHTML=cards.map(cardHtml).join("");
 try{dfStock(byName)}catch(e){console.error(e)}
 let rows=a.map((r,i)=>({r:r,i:i})).sort((x,y)=>(y.r.date||"").localeCompare(x.r.date||"")||y.i-x.i);
 tb.innerHTML=rows.length?rows.map(o=>{let r=o.r,i=o.i,kg=dfKg(r),ag=ageOn(r.date),al=aliveOn(r.date);
  return `<tr><td>${r.date||"—"}</td><td>${ag===null?"—":ag+" দিন"}</td><td>${esc(r.name)||"—"}</td><td>${r.bags?fmt(r.bags,0)+" বস্তা":"—"}</td><td>${fmt(r.loose)} কেজি</td><td style="color:#3ddc84;font-weight:700">${fmt(kg)} কেজি</td><td>${al?fmt(kg*1000/al,1)+" গ্রাম":"—"}</td><td>${esc(r.note)}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('dailyFeed',${i})">✏️</button><button class="del" onclick="del('dailyFeed',${i})">মুছুন</button></td></tr>`}).join(""):`<tr><td colspan="9" class="empty">এখনও কোনো দৈনিক খাবারের হিসাব যোগ করা হয়নি</td></tr>`;
 dfLive();
}

// ══════ গড় ওজন ও FCR ══════
function avgBreak(){
 let sl=state.sales||[],rt=((state.otherSales&&state.otherSales.chicken)||[]).filter(r=>+r.pcs>0),gf=(state.gifts||[]).filter(r=>+r.qty>0);
 let g1=gf.filter(r=>r.kind!=="নিজের খাওয়া"),g2=gf.filter(r=>r.kind==="নিজের খাওয়া");
 let mk=(ic,l,arr,fq,fw)=>{let q=sumOf(arr,fq),w=sumOf(arr,fw);return{ic:ic,l:l,q:q,w:w,avg:q?w/q:0}};
 let rows=[mk("🛒","পাইকারি বিক্রি",sl,r=>r.qty,r=>r.weight),mk("🐔","খুচরা বিক্রি",rt,r=>r.pcs,r=>r.qty),mk("🎁","গিফট",g1,r=>r.qty,r=>r.weight),mk("🏠","বাসায় খাওয়া",g2,r=>r.qty,r=>r.weight)];
 let q=rows.reduce((s,x)=>s+x.q,0),w=rows.reduce((s,x)=>s+x.w,0);
 return{rows:rows,q:q,w:w,avg:q?w/q:0};
}
function fcrStats(){
 let feed=dailyFeedKg(),a=avgBreak(),live=livePcs(),la=+state.liveAvgWt||0,est=false;
 if(!(la>0)&&live>0&&state.startDate&&typeof window.anW0==="function"){let w=window.anW0().w;if(w>0){la=w;est=true}}
 let dead=deathTotal()||(+state.dead||0),birds=Math.max(0,(+state.chicks||0)-dead);
 let tw=a.w+live*la,tg=+state.targetFCR||1.6;
 return{feed:feed,harv:a.w,live:live,la:la,est:est,liveW:live*la,tw:tw,fcr:(feed>0&&tw>0)?feed/tw:0,tg:tg,birds:birds,need:feed/tg};
}
function renderFcrCards(){
 let f=fcrStats(),a=avgBreak();
 let e=document.getElementById("kFcr");if(e){e.textContent=f.fcr?f.fcr.toFixed(2):"—";e.style.color=f.fcr?(f.fcr<=f.tg?"#3ddc84":"#ff7070"):""}
 let g=document.getElementById("kAvgW");if(g)g.textContent=a.q?a.avg.toFixed(2)+" কেজি":"—";
}
function openAvgWeight(){
 let b=avgBreak();
 document.getElementById("infoTitle").textContent="⚖️ পুরো মুরগীর গড় ওজন — "+state.name;
 let top=[["⚖️","সামগ্রিক গড় ওজন",b.q?b.avg.toFixed(2)+" কেজি/মুরগি":"—","#3ddc84"],["🐔","মোট মুরগি",fmt(b.q,0)+" টি"],["📦","মোট ওজন",fmt(b.w)+" কেজি"]];
 let tr=b.rows.map(x=>`<tr><td>${x.ic} ${x.l}</td><td>${fmt(x.q,0)} টি</td><td>${fmt(x.w)} কেজি</td><td>${x.q?x.avg.toFixed(2)+" কেজি":"—"}</td></tr>`).join("");
 tr+=`<tr class="summary-row-total"><td>সব মিলিয়ে</td><td>${fmt(b.q,0)} টি</td><td>${fmt(b.w)} কেজি</td><td>${b.q?b.avg.toFixed(2)+" কেজি":"—"}</td></tr>`;
 let live=livePcs();
 document.getElementById("infoBody").innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:8px">পাইকারি, খুচরা, গিফট ও বাসায় খাওয়া — সব মুরগি মিলিয়ে গড়</div><div class="pgsum">${top.map(cardHtml).join("")}</div><div class="wrap summary-card" style="margin-top:10px"><table><thead><tr><th>ধরন</th><th>মুরগি</th><th>ওজন</th><th>গড়/মুরগি</th></tr></thead><tbody>${tr}</tbody></table></div>`+(live>0?`<div class="warnbox">🐔 খামারে এখনও ${fmt(live,0)} টি মুরগি আছে — এগুলো এই হিসাবে ধরা হয়নি (বিক্রি/গিফট হলে যোগ হবে)।</div>`:"");
 document.getElementById("infoModal").classList.add("show");
}
function fcrCalc(){
 let t=document.getElementById("fcrTarget"),l=document.getElementById("fcrLiveAvg"),out=document.getElementById("fcrOut");if(!t||!out)return;
 state.targetFCR=+t.value||0;state.liveAvgWt=+l.value||0;save();
 let f=fcrStats();
 if(!(f.feed>0)){out.innerHTML=`<div class="warnbox">⚠️ এখনও দৈনিক খাবারের কোনো হিসাব নেই। আগে "🍽️ দৈনিক খাবার" পেজে প্রতিদিনের খাবার যোগ করুন।</div>`;return}
 let perNeed=f.birds?f.need/f.birds:0,perNow=f.birds?f.tw/f.birds:0;
 let cards=[["🍽️","মোট খাওয়ানো ফিড",fmt(f.feed)+" কেজি","#fbbf24"],["🎯","টার্গেট FCR",f.tg.toFixed(2)],["⚖️","ফিড অনুযায়ী দরকারি মোট ওজন",fmt(f.need)+" কেজি","#70b8ff"],["🐔","প্রতি মুরগি দরকারি গড় ওজন",f.birds?perNeed.toFixed(2)+" কেজি":"—","#70b8ff"],["📦","এখন পর্যন্ত মোট ওজন",fmt(f.tw)+" কেজি"],["📏","বর্তমান প্রতি মুরগি গড়",f.birds&&f.tw?perNow.toFixed(2)+" কেজি":"—"],["📊","বাস্তব FCR",f.fcr?f.fcr.toFixed(2):"—",f.fcr?(f.fcr<=f.tg?"#3ddc84":"#ff7070"):""]];
 let h=`<div class="pgsum">${cards.map(cardHtml).join("")}</div>`;
 h+=`<div style="font-size:11.5px;color:#7a9aaa;margin-top:8px;line-height:1.6">📦 মোট ওজন = বিক্রি/খুচরা/গিফট/বাসায় খাওয়া ${fmt(f.harv)} কেজি + খামারের ${fmt(f.live,0)} টি মুরগি (আনুমানিক ${fmt(f.liveW)} কেজি)</div>`;
 if(f.live>0&&f.est)h+=`<div class="warnbox">ℹ️ খামারে ${fmt(f.live,0)} টি মুরগি আছে, তাদের ওজন আপনি দেননি। তাই স্ট্যান্ডার্ড ওজন (প্রতি মুরগি ${fmt(f.la*1000,0)} গ্রাম) ধরে আনুমানিক হিসাব দেখানো হচ্ছে। ওজন নমুনা বা গড় ওজন দিলে আরও ঠিক হবে।</div>`;
 if(f.tw>0){
  if(f.tw>=f.need)h+=`<div class="fcr-verdict good">✅ ওজন ঠিক আছে — ফিড অনুযায়ী ${fmt(f.need)} কেজি দরকার, আছে ${fmt(f.tw)} কেজি (বাড়তি ${fmt(f.tw-f.need)} কেজি)।</div>`;
  else h+=`<div class="fcr-verdict bad">⚠️ ওজন কম — ফিড অনুযায়ী ${fmt(f.need)} কেজি দরকার, আছে ${fmt(f.tw)} কেজি। আরও ${fmt(f.need-f.tw)} কেজি ওজন দরকার${f.birds?" (প্রতি মুরগি আরও প্রায় "+((f.need-f.tw)/f.birds).toFixed(2)+" কেজি)":""}।</div>`;
 }
 out.innerHTML=h;
}
function closeInfo(){let m=document.getElementById("infoModal");if(m){m.classList.remove("show");m.classList.remove("full")}renderFcrCards()}

// ══════ শিরোনাম পুরো লাইন জুড়ে ══════
function fitTitle(){
 let h=document.getElementById("farmTitle"),s=document.getElementById("farmTitleTxt");if(!h||!s)return;
 s.style.display="inline-block";h.style.fontSize="100px";
 let w=s.getBoundingClientRect().width,avail=h.clientWidth;
 if(w>0&&avail>0)h.style.fontSize=Math.max(16,Math.min(64,Math.floor(100*avail/w*0.98)))+"px";
}

function render(){renderDashboard();renderFarm();renderDeaths();renderWorkers();Object.keys(configs).forEach(renderTable);renderSales();renderLitterSales();renderLitterSalesPage();renderOtherSales();renderGifts();renderCustomers();renderRent();renderReport();renderBatchBar();renderBatchesPage();renderMedSchedule();renderNotes();renderVaccine();renderDailyFeed();renderSummaries();renderCloseBar()}
makePages();
(function(){ // কাঠের গুড়া ও পরিবহন ভাড়া → বিভিন্ন খরচ পেজে
 const host=document.getElementById("other");if(!host)return;
 const bar=document.createElement("div");bar.className="exp-jump";
 bar.innerHTML='<button type="button" onclick="expJump(\'expOther\')">🧾 বিভিন্ন খরচ</button><button type="button" onclick="expJump(\'expLitter\')">🪵 কাঠের গুড়া</button><button type="button" onclick="expJump(\'expRent\')">🚚 পরিবহন ভাড়া</button><button type="button" onclick="expJump(\'expPower\')">⚡ বিদ্যুৎ/জ্বালানি</button>';
 host.insertBefore(bar,host.firstChild);
 const first=document.createElement("div");first.id="expOther";host.insertBefore(first,bar.nextSibling);
 [["litter","expLitter","🪵 কাঠের গুড়া"],["rent","expRent","🚚 পরিবহন ভাড়া"],["power","expPower","⚡ বিদ্যুৎ ও জ্বালানি"]].forEach(x=>{
  const sec=document.getElementById(x[0]);if(!sec)return;
  const w=document.createElement("div");w.id=x[1];w.className="exp-block";
  w.innerHTML='<div class="exp-sep"><span>'+x[2]+'</span></div>';
  while(sec.firstChild)w.appendChild(sec.firstChild);
  host.appendChild(w);sec.remove();
 });
})();
window.expJump=function(id){const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:"smooth",block:"start"})};
const navItems=[["dashboard","🏠 ড্যাশবোর্ড"],["medschedule","💊 মেডিসিন শিডিউল"],["dailyfeed","🍽️ দৈনিক খাবার"],["analysis","📈 বিশ্লেষণ"],["farm","🐣 বাচ্চা ও মৃত"],["other","🧾 বিভিন্ন খরচ"],["vaccine","💉 ভ্যাকসিন"],["disease","🩺 রোগ ও প্রতিকার"],["feed","🌾 ফিড"],["medicine","💊 মেডিসিন"],["notes","📝 নোট"],["workers","👷 কর্মচারী"],["customers","👥 ক্রেতা"],["sales","💰 বিক্রি"],["othersales","🛒 অন্যান্য বিক্রি"],["report","📑 রিপোর্ট"],["batchcmp","📊 ব্যাচ তুলনা"],["batches","🗂️ সব ব্যাচ"]];
const navColors={disease:"linear-gradient(135deg,#e11d48,#9f1239)",fcr:"linear-gradient(135deg,#3d8bff,#1a5fff)",batchcmp:"linear-gradient(135deg,#8b5cf6,#6d28d9)",analysis:"linear-gradient(135deg,#0ea5e9,#0369a1)",dashboard:"linear-gradient(135deg,#6366f1,#4f46e5)",farm:"linear-gradient(135deg,#f59e0b,#d97706)",deaths:"linear-gradient(135deg,#ef4444,#b91c1c)",feed:"linear-gradient(135deg,#84cc16,#4d7c0f)",medicine:"linear-gradient(135deg,#a855f7,#7e22ce)",workers:"linear-gradient(135deg,#06b6d4,#0e7490)",other:"linear-gradient(135deg,#f97316,#c2410c)",litter:"linear-gradient(135deg,#a78bfa,#6d28d9)",rent:"linear-gradient(135deg,#14b8a6,#0f766e)",sales:"linear-gradient(135deg,#22c55e,#15803d)",othersales:"linear-gradient(135deg,#f43f5e,#be123c)",customers:"linear-gradient(135deg,#3b82f6,#1d4ed8)",medschedule:"linear-gradient(135deg,#ec4899,#9d174d)",dailyfeed:"linear-gradient(135deg,#f59e0b,#b45309)",vaccine:"linear-gradient(135deg,#22d3ee,#0891b2)",notes:"linear-gradient(135deg,#eab308,#a16207)",report:"linear-gradient(135deg,#0ea5e9,#0369a1)",batches:"linear-gradient(135deg,#8b5cf6,#6d28d9)"};
const navBtn=(x,i)=>{
  const grad=navColors[x[0]]||"linear-gradient(135deg,#1aad6e,#0d8050)";
  const isActive=i===0?"active":"";
  const style=isActive?`style="background:${grad}"`:`style="background:#ffffff0e"`;
  const badge=x[0]==="vaccine"?'<span id="vacBadge"></span>':"";
  return `<button class="nav ${i===0?"nav-dash ":""}${isActive}" data-grad="${grad}" ${style} onclick="go('${x[0]}',this)">${x[1]}${badge}</button>`;
};
nav.innerHTML='<div class="nav-top2">'+navBtn(navItems[0],0)+'<button class="nav-g" type="button" onclick="openGraphs()">📊 গ্রাফ</button>'+navBtn(navItems[3],3)+'</div><div class="nav-row">'+navItems.map((x,i)=>i>0&&x[0]!=="analysis"?navBtn(x,i):"").join("")+'</div>';
function go(id,b){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".nav").forEach(n=>{
    n.classList.remove("active");
    n.style.background="#ffffff0e";
    n.style.boxShadow="none";
  });
  b.classList.add("active");
  const grad=b.dataset.grad||"linear-gradient(135deg,#1aad6e,#0d8050)";
  b.style.background=grad;
  b.style.boxShadow="0 4px 14px #00000050";
}

// ══════ আজকের করণীয় কার্ড ══════
(function(){
const bn=n=>Number(n).toLocaleString("bn-BD");
const fb=(n,d)=>Number(n).toLocaleString("bn-BD",{maximumFractionDigits:d===undefined?2:d});
window.dzTodayCard=function(){
 let el=document.getElementById("dzTodayCard");if(!el)return;
 if(state.status==="closed"){el.innerHTML="";return}
 if(!state.startDate){el.innerHTML=`<div class="dzt"><div class="dzt-head"><b>🗓️ আজকের করণীয়</b></div><div class="dzt-row" onclick="openPage('farm')"><span class="dzt-ico">🐣</span><div class="dzt-body">বাচ্চা আসার তারিখ দিন, তাহলে প্রতিদিনের করণীয় এখানে দেখাবে।</div><span class="dzt-go">👉</span></div></div>`;return}
 let age=days(),t=todayISO(),rows=[];
 const row=(ico,cls,txt,sub,page)=>rows.push(`<div class="dzt-row ${cls}" onclick="openPage('${page}')"><span class="dzt-ico">${ico}</span><div class="dzt-body">${txt}${sub?`<small>${sub}</small>`:""}</div><span class="dzt-go">👉</span></div>`);
 // টিকা
 let al=vacAlerts();
 if(al.length)al.forEach(x=>row(x.st.s==="late"?"🚨":x.st.s==="soon"?"🔔":"💉","bad",vEsc(vacLine(x).replace(/^[^\wঀ-৿]+\s*/,"")),"","vaccine"));
 else{let pend=VAC.filter(v=>vacStatus(v).s==="wait");row("✅","good","আজ কোনো টিকার সময় নয়",pend.length?"পরের টিকা: "+vEsc(pend[0].name)+" (বয়স "+bn(pend[0].from)+" দিনে)":"সব টিকার সময় হিসাব করা আছে","vaccine")}
 // মেডিসিন শিডিউল
 let ms=(state.medSchedule||[]).filter(r=>r.date===t).slice(-1)[0];
 if(ms){let p=[["সকাল",ms.morning],["দুপুর",ms.noon],["রাত",ms.night]].filter(x=>x[1]&&x[1].name).map(x=>x[0]+": "+vEsc(x[1].name)+(x[1].dose?" ("+vEsc(x[1].dose)+")":""));
  row("💊","",p.length?"আজকের মেডিসিন — "+p.join(" • "):"আজকের মেডিসিন শিডিউলে ওষুধ নেই","","medschedule")}
 else row("💊","","আজকের মেডিসিন শিডিউল দেওয়া নেই","চাপলে শিডিউল যোগ করতে পারবেন","medschedule");
 // খাবার
 let fd=(state.dailyFeed||[]).filter(r=>r.date===t),kg=sumOf(fd,dfKg);
 if(fd.length){let av=aliveOn(t);row("🍽️","good","আজ খাবার: "+fb(kg)+" কেজি ("+bn(fd.length)+" বার)",av?"প্রতি মুরগি প্রায় "+fb(kg*1000/av,0)+" গ্রাম":"","dailyfeed")}
 else row("🍽️","bad","আজ এখনও খাবারের হিসাব দেননি","চাপলে দৈনিক খাবার যোগ করুন","dailyfeed");
 // মৃত
 let dd=sumOf((state.deaths||[]).filter(r=>r.date===t),r=>r.qty),dt=deathTotal()||(+state.dead||0),ch=+state.chicks||0,rate=ch?dt/ch*100:0;
 if(dd>0)row("☠️","bad","আজ মৃত "+bn(dd)+" টি","মোট মৃত "+bn(dt)+" টি ("+fb(rate,1)+"%)"+(rate>5?" — হার বেশি, কারণ খুঁজুন":""),"farm");
 else row("🐔","","আজ কোনো মৃত্যু যোগ করা হয়নি","মোট মৃত "+bn(dt)+" টি"+(ch?" ("+fb(rate,1)+"%)":"")+(rate>5?" — হার বেশি, কারণ খুঁজুন":""),"farm");
 // FCR
 let f=fcrStats();
 if(f.fcr)row("🎯",f.fcr<=f.tg?"good":"bad","FCR এখন "+fb(f.fcr,2)+" (টার্গেট "+fb(f.tg,2)+")",f.fcr<=f.tg?"টার্গেটের মধ্যে আছে":"টার্গেটের চেয়ে বেশি, ফিড বা ওজন দেখুন","dashboard");
 // ফিড মজুত
 let fi=window.anFeedInfo?anFeedInfo():null;
 if(fi&&fi.bought>0){let l=fi.left;row("🌾",(fi.stock<=0||(l!==null&&l<=2))?"bad":"","ফিডে এখন আছে "+fb(Math.max(0,fi.stock))+" কেজি"+(l!==null?" — আর প্রায় "+fb(l,1)+" দিন চলবে":""),"","analysis")}
 // বিক্রির প্রস্তুতি
 if(age>=28){let lv=livePcs();row("🛒","","বিক্রির সময় কাছে",(lv>0?"খামারে "+bn(lv)+" টি মুরগি। ":"")+"শেষ অ্যান্টিবায়োটিকের উইথড্রয়াল দিন মিলিয়ে নিন।","sales")}
 el.innerHTML=`<div class="dzt"><div class="dzt-head"><b>🗓️ আজকের করণীয়</b><span>${bn(age)} দিন • ${bn(Math.max(0,35-age))} দিন বাকি (৩৫ পর্যন্ত)</span></div>${rows.join("")}</div>`;
};
{const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{dzTodayCard()}catch(e){console.error(e)}return r}}
})();

// ══════ বিশ্লেষণ, গ্রাফ, চেকলিস্ট, ক্রেতার বোতাম ══════
(function(){
const bn=n=>Number(n).toLocaleString("bn-BD");
const fb=(n,d)=>Number(n).toLocaleString("bn-BD",{maximumFractionDigits:d===undefined?2:d});
const $a=id=>document.getElementById(id);
const STD_DAYS=[0,7,14,21,28,35,42];
const DEF_STD={0:42,7:185,14:465,21:943,28:1524,35:2191,42:2857};
const DEF_INT={0:13,7:39,14:75,21:117,28:158,35:193,42:220};
function intakeAt(day){
 let d=Math.max(0,Math.min(42,day));
 for(let i=0;i<STD_DAYS.length-1;i++){let a=STD_DAYS[i],b=STD_DAYS[i+1];if(d>=a&&d<=b)return DEF_INT[a]+(DEF_INT[b]-DEF_INT[a])*(d-a)/(b-a)}
 return DEF_INT[42];
}
const stdW=()=>Object.assign({},DEF_STD,state.stdWeights||{});
function stdAt(day){
 let o=stdW(),d=Math.max(0,Math.min(42,day));
 for(let i=0;i<STD_DAYS.length-1;i++){let a=STD_DAYS[i],b=STD_DAYS[i+1];if(d>=a&&d<=b)return (+o[a])+((+o[b])-(+o[a]))*(d-a)/(b-a)}
 return +o[42];
}
const bagKg=()=>(+state.feedBagKg>0?+state.feedBagKg:50);

// ── ১. ফিড মজুত ──
function feedInfo(){
 let bought=sumOf(state.feed,r=>r.qty)*bagKg();
 let used=sumOf(state.dailyFeed,dfKg);
 let sold=sumOf((state.otherSales&&state.otherSales.feed)||[],r=>r.qty);
 let stock=bought-used-sold;
 let by={};(state.dailyFeed||[]).forEach(r=>{by[r.date]=(by[r.date]||0)+dfKg(r)});
 let ds=Object.keys(by).sort().slice(-3);
 let avg=ds.length?ds.reduce((s,d)=>s+by[d],0)/ds.length:0;
 let left=null,flat=null;
 if(avg>0&&stock>0){
  flat=stock/avg;
  let rem=stock,d=0;left=60;
  let a0=days(),ref=intakeAt(Math.max(1,a0-1));while(d<60){let u=avg*intakeAt(a0+d+1)/ref;if(rem>=u){rem-=u;d++}else{left=d+rem/u;break}}
 }else if(avg>0){left=0;flat=0}
 let lr=(state.feed||[]).filter(r=>+r.rate>0).slice(-1)[0];
 return{bought:bought,used:used,sold:sold,stock:stock,avg:avg,left:left,flat:flat,ratePerKg:lr?(+lr.rate)/bagKg():0};
}
window.anFeedInfo=feedInfo;
function renderStock(){
 let el=$a("anStock");if(!el)return;
 let f=feedInfo();
 if(!(f.bought>0)&&!(f.used>0)){el.innerHTML='<div class="an-alert info">"🌾 ফিড" পেজে ফিড কেনা আর "🍽️ দৈনিক খাবার" পেজে প্রতিদিনের খাবার যোগ করলে ফিডের হিসাব এখানে আসবে।</div>';return}
 let cards=[["কেনা ফিড",fb(f.bought)+" কেজি"],["খাওয়ানো হয়েছে",fb(f.used)+" কেজি"]];
 if(f.sold>0)cards.push(["বিক্রি করা ফিড",fb(f.sold)+" কেজি"]);
 cards.push(["এখন আছে",fb(f.stock)+" কেজি ("+fb(f.stock/bagKg(),1)+" বস্তা)"]);
 cards.push(["গড় দৈনিক খাবার (শেষ ৩ দিন)",f.avg?fb(f.avg)+" কেজি":"—"]);
 cards.push(["আর কত দিন চলবে",f.left!==null?"প্রায় "+fb(f.left,1)+" দিন":"—"]);
 let al="";
 if(f.stock<0)al='<div class="an-alert bad">হিসাবে ফিড মাইনাসে গেছে। ফিড কেনার এন্ট্রি বাদ পড়েছে কিনা বা প্রতি বস্তার কেজি ঠিক আছে কিনা দেখুন।</div>';
 else if(f.left!==null&&f.left<=2)al='<div class="an-alert bad">⚠️ ফিড প্রায় শেষ। এখনই কেনার ব্যবস্থা করুন।</div>';
 else if(f.left!==null&&f.left<=4)al='<div class="an-alert info">🔔 ফিড আর কয়েক দিনের। কেনার তারিখ ঠিক করুন।</div>';
 else if(f.left!==null)al='<div class="an-alert good">✅ ফিড আপাতত যথেষ্ট আছে।</div>';
 el.innerHTML='<div class="an-cards">'+cards.map(c=>'<div class="an-card"><span>'+c[0]+'</span><b>'+c[1]+'</b></div>').join("")+'</div>'+al+
  '<div class="an-note">দিন দিন খাবার বাড়ে, তাই হিসাবে Rose-এর হারে প্রতিদিনের খাবার বাড়ছে ধরা হয়েছে'+(f.flat!==null?" (একই পরিমাণ ধরলে "+fb(f.flat,1)+" দিন)":"")+'।</div>';
}

// ── ২. ওজন নমুনা ও গ্রোথ চার্ট ──
window.anAddWeight=function(){
 let n=+$a("anWN").value||0,t=(+$a("anWTotal").value||0)/1000,d=$a("anWDate").value||todayISO();
 if(n<=0||t<=0){showToast("❌ মুরগির সংখ্যা ও মোট ওজন দিন");return}
 state.weights=state.weights||[];
 state.weights.push({date:d,n:Math.round(n),total:t});
 state.weights.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 $a("anWN").value="";$a("anWTotal").value="";
 save();render();showToast("✅ ওজন নমুনা যোগ হয়েছে");
};
window.anSaveStd=function(d,v){state.stdWeights=state.stdWeights||{};state.stdWeights[d]=+v>0?+v:DEF_STD[d];save();renderWeights()};
window.anResetStd=function(){delete state.stdWeights;save();render()};
function wPoints(){
 return (state.weights||[]).map((r,i)=>{let a=ageOn(r.date);return{i:i,date:r.date,n:r.n,age:a,g:(+r.total/+r.n)*1000}}).filter(p=>p.age!==null&&p.n>0);
}
function growthSvg(pts){
 const W=360,H=230,L=38,R=12,T=14,B=28,maxD=42;
 let maxG=3000;pts.forEach(p=>{if(p.g>maxG)maxG=Math.ceil(p.g/500)*500});
 const X=d=>L+(W-L-R)*d/maxD,Y=g=>T+(H-T-B)*(1-g/maxG);
 let o='<svg class="an-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="গ্রোথ চার্ট: আপনার মুরগির গড় ওজন ও স্ট্যান্ডার্ড ওজন">';
 for(let g=0;g<=maxG;g+=500)o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="#ffffff14"/><text x="'+(L-5)+'" y="'+(Y(g)+3)+'" text-anchor="end">'+(g?fb(g,0):"০")+'</text>';
 for(let d=0;d<=maxD;d+=7)o+='<text x="'+X(d)+'" y="'+(H-10)+'" text-anchor="middle">'+bn(d)+'</text>';
 o+='<text x="'+L+'" y="9">গ্রাম</text><text x="'+(W-R)+'" y="'+(H-1)+'" text-anchor="end">বয়স (দিন)</text>';
 let std=STD_DAYS.map(d=>X(d)+","+Y(stdAt(d))).join(" ");
 o+='<polyline points="'+std+'" fill="none" stroke="#86e3cc" stroke-width="2" stroke-dasharray="5 4"/>';
 let age=days();if(age>=0&&age<=maxD)o+='<line x1="'+X(age)+'" x2="'+X(age)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#ff8a5c" stroke-width="1" stroke-dasharray="2 3"/><text x="'+X(age)+'" y="'+(T-3)+'" text-anchor="middle" style="fill:#ff8a5c">আজ</text>';
 if(pts.length){
  o+='<polyline points="'+pts.map(p=>X(Math.min(maxD,p.age))+","+Y(p.g)).join(" ")+'" fill="none" stroke="#ff8a5c" stroke-width="2.5"/>';
  pts.forEach(p=>{o+='<circle cx="'+X(Math.min(maxD,p.age))+'" cy="'+Y(p.g)+'" r="4" fill="#ff8a5c" stroke="#15222c" stroke-width="2"><title>'+bn(p.age)+' দিন: '+fb(p.g,0)+' গ্রাম</title></circle>'});
  let l=pts[pts.length-1];o+='<text x="'+Math.min(X(l.age)+6,W-R)+'" y="'+(Y(l.g)-8)+'" text-anchor="'+(X(l.age)>W-70?"end":"start")+'" style="fill:#ff8a5c;font-weight:700">'+fb(l.g,0)+' গ্রাম</text>';
 }
 return o+'</svg>';
}
function renderWeights(){
 let g=$a("anGrowth"),tb=$a("anWTable");if(!g||!tb)return;
 let pts=wPoints();
 let leg='<div class="an-leg"><span><i style="background:#86e3cc"></i>Rose স্ট্যান্ডার্ড</span><span><i style="background:#ff8a5c"></i>আপনার মুরগি</span></div>';
 let verdict="";
 if(pts.length){
  let l=pts[pts.length-1],sg=stdAt(l.age),df=(l.g/sg-1)*100;
  let cls=df>=-5?"good":df<-10?"bad":"info";
  verdict='<div class="an-alert '+cls+'">'+bn(l.age)+' দিনে গড় ওজন '+fb(l.g,0)+' গ্রাম, স্ট্যান্ডার্ড '+fb(sg,0)+' গ্রাম ('+(df>=0?"+":"−")+fb(Math.abs(df),1)+'%)। '+(df>=-5?"ওজন ঠিকঠাক বাড়ছে।":df<-10?"ওজন বেশ কম। ফিড, পানি, রোগ ও ঘরের পরিবেশ দেখুন।":"ওজন একটু কম। নজর রাখুন।")+'</div>';
 }else verdict='<div class="an-alert info">এখনও কোনো ওজন নমুনা নেই। ১০টা মুরগি মেপে মোট ওজন লিখুন, চার্টে আপনার লাইন আসবে।</div>';
 g.innerHTML=leg+growthSvg(pts)+verdict;
 let rows=(state.weights||[]).map((r,i)=>{
  let a=ageOn(r.date),avg=(+r.total/+r.n)*1000,sg=a!==null?stdAt(a):0,df=sg?(avg/sg-1)*100:null;
  return '<tr><td>'+esc(r.date)+'</td><td>'+(a!==null?bn(a)+" দিন":"—")+'</td><td>'+bn(r.n)+' টি</td><td>'+fb(avg,0)+' গ্রাম</td><td>'+(df===null?"—":(df>=0?"+":"−")+fb(Math.abs(df),1)+"%")+'</td><td><button class="del" onclick="del(\'weights\','+i+')">মুছুন</button></td></tr>';
 });
 rows.reverse();
 tb.innerHTML=rows.length?rows.join(""):'<tr><td colspan="6" class="empty">এখনও কোনো নমুনা নেই</td></tr>';
 let st=$a("anStd");
 if(st&&!st.contains(document.activeElement)){let o=stdW();st.innerHTML=STD_DAYS.map(d=>'<label>দিন '+bn(d)+'<input type="number" min="1" inputmode="numeric" value="'+o[d]+'" onchange="anSaveStd('+d+',this.value)"></label>').join("")}
}

// ── ৩. কবে বিক্রি করলে বেশি লাভ ──
function lastSaleRate(){let r=(state.sales||[]).filter(x=>+x.rate>0).slice(-1)[0];return r?+r.rate:0}
function costSoFar(){return (+state.chicks||0)*(+state.chickPrice||0)+total("feed")+total("medicine")+workersTotal()+total("other")+total("litter")+total("power")+rentTotal()}
const tk=n=>"৳"+fb(n,0);
function renderProj(){
 try{syncShared()}catch(e){}
 let el=$a("anProj");if(!el)return;
 let fi=feedInfo(),age=days(),live=livePcs();
 let rate=+state.projRate||lastSaleRate(),frate=+state.projFeedRate||fi.ratePerKg;
 let r1=$a("anRate"),r2=$a("anFeedRate");
 if(r1&&document.activeElement!==r1){r1.value=state.projRate||"";r1.placeholder=lastSaleRate()?"শেষ বিক্রির দর: "+lastSaleRate():"যেমন ১৮০"}
 if(r2&&document.activeElement!==r2){r2.value=state.projFeedRate||"";r2.placeholder=fi.ratePerKg?"শেষ ফিড কেনা থেকে: "+fb(fi.ratePerKg):"যেমন ৫৫"}
 if(!state.startDate){el.innerHTML='<div class="an-alert info">আগে "🐣 বাচ্চা" পেজে বাচ্চা আসার তারিখ দিন।</div>';return}
 if(live<=0){el.innerHTML='<div class="an-alert info">খামারে এখন কোনো মুরগি নেই।</div>';return}
 if(!(rate>0)){el.innerHTML='<div class="an-alert info">বিক্রির দর (টাকা/কেজি) লিখুন, তাহলে হিসাব আসবে।</div>';return}
 let pts=wPoints(),w0,src;
 let lp=pts.length?pts[pts.length-1]:null;
 if(lp&&age-lp.age<=14){w0=(lp.g+stdAt(age)-stdAt(lp.age))/1000;src="শেষ ওজন নমুনা ("+bn(lp.age)+" দিন) থেকে"}
 else if(+state.liveAvgWt>0){w0=+state.liveAvgWt;src="FCR মডালে দেওয়া আনুমানিক গড় ওজন থেকে"}
 else{w0=stdAt(age)/1000;src="স্ট্যান্ডার্ড ওজন ধরে (ওজন নমুনা দিলে আরও ঠিক হবে)"}
 let net=salesTotal()+otherSalesGrand()-costSoFar();
 let rows=[],extra=0,extraKg=0,maxN=Math.min(7,Math.max(0,42-age)),fs=fcrStats();
 for(let n=0;n<=maxN;n++){
  if(n>0){let u=fi.avg*intakeAt(age+n)/intakeAt(Math.max(1,age-1));extra+=u*frate;extraKg+=u}
  let w=w0+(stdAt(age+n)-stdAt(age))/1000;
  let rev=live*w*rate,tw=fs.harv+live*w;
  rows.push({n:n,age:age+n,w:w,rev:rev,extra:extra,profit:net+rev-extra,fcr:(fs.feed>0&&tw>0)?(fs.feed+extraKg)/tw:0});
 }
 let best=rows.reduce((a,b)=>b.profit>a.profit?b:a,rows[0]);
 let msg=best.n===0?"আজ বিক্রি করাই সবচেয়ে ভালো মনে হচ্ছে।":"আরও "+bn(best.n)+" দিন রাখলে আজকের চেয়ে প্রায় ৳"+fb(best.profit-rows[0].profit,0)+" বেশি লাভ হতে পারে।";
 let bf=rows.filter(r=>r.fcr>0).reduce((a,b)=>b.fcr<a.fcr-0.005?b:a,rows.filter(r=>r.fcr>0)[0]);
 let fmsg=bf?(bf.n===0?"FCR আজই সবচেয়ে ভালো ("+bf.fcr.toFixed(2)+"), বেশি দিন রাখলে FCR খারাপ হবে।":"FCR সবচেয়ে ভালো "+bn(bf.n)+" দিন পরে ("+bf.fcr.toFixed(2)+")."):"";
 let h='<div class="an-alert '+(best.n===0?"info":"good")+'"><b>'+msg+'</b>'+(fmsg?'<br>'+fmsg+' লক্ষ্য FCR '+fs.tg.toFixed(2)+'।':'')+'</div>';
 h+='<div class="an-proj" style="margin-top:8px"><table><thead><tr><th>কবে</th><th>বয়স</th><th>গড় ওজন</th><th>মুরগি বিক্রি</th><th>বাড়তি ফিড খরচ</th><th>মোট নিট লাভ</th><th>FCR</th></tr></thead><tbody>';
 rows.forEach(r=>{h+='<tr class="'+(r===best?"best":"")+(r.profit<0?" neg":"")+'"><td>'+(r.n?"+"+bn(r.n)+" দিন":"আজ")+'</td><td>'+bn(r.age)+'</td><td>'+fb(r.w*1000,0)+' গ্রাম</td><td>'+tk(r.rev)+'</td><td>'+(r.extra?tk(r.extra):"—")+'</td><td>'+(r.profit<0?"−":"")+tk(Math.abs(r.profit))+'</td><td class="'+(r.fcr>fs.tg?"neg":"")+'"><b>'+(r.fcr>0?r.fcr.toFixed(2):"—")+'</b></td></tr>'});
 h+='</tbody></table></div>';
 h+='<div class="an-note">ধরা হয়েছে: খামারে '+bn(live)+' টি মুরগি আছে ও আর মরবে না। ওজন '+src+'; এরপরের দিনগুলোতে স্ট্যান্ডার্ড হারে বাড়বে। দর ও ফিডের দাম একই থাকবে।'+(fi.avg>0?"":" দৈনিক খাবারের হিসাব না থাকায় বাড়তি ফিডের খরচ ধরা হয়নি।")+(frate>0?"":" ফিডের দাম না থাকায় বাড়তি ফিডের খরচ ধরা হয়নি।")+' এটা অনুমান, আসল ফল আপনার মুরগির বৃদ্ধি ও বাজারদরের ওপর নির্ভর করে।</div>';
 el.innerHTML=h;
}
window.anSaveSet=function(){
 let b=+$a("anBagKg").value;if(b>0)state.feedBagKg=b;
 {let f1=$a("anFeedKg"),f2=$a("anFeedRate"),ae=document.activeElement,v=(ae===f2?+f2.value:(f1?+f1.value:+f2.value))||0;
  state.feedKgPrice=v;state.projFeedRate=v;if(f1&&ae!==f1)f1.value=v||"";if(f2&&ae!==f2)f2.value=v||""}
 try{renderDashPerBird()}catch(e){}
 state.projRate=+$a("anRate").value||0;
 save();renderStock();renderProj();
};

// ── ০. লাভ-লোকসান বিশ্লেষণ ──
function anW0(){
 let age=days(),pts=wPoints(),lp=pts.length?pts[pts.length-1]:null;
 if(lp&&age-lp.age<=14)return{w:(lp.g+stdAt(age)-stdAt(lp.age))/1000,src:"শেষ ওজন নমুনা থেকে"};
 if(+state.liveAvgWt>0)return{w:+state.liveAvgWt,src:"আপনার দেওয়া আনুমানিক গড় ওজন"};
 return{w:stdAt(age)/1000,src:"স্ট্যান্ডার্ড ওজন ধরে"};
}
window.anW0=anW0;
function renderProfit(){
 let el=$a("anProfit");if(!el)return;
 window._anSum=null;
 if(!(+state.chicks>0)){el.innerHTML='<div class="an-alert info">আগে "🐣 বাচ্চা ও মৃত" পেজে বাচ্চার সংখ্যা দিন।</div>';return}
 let chicks=+state.chicks||0,cp=chicks*(+state.chickPrice||0);
 let parts=[["🐣 বাচ্চা",cp,"#7fd1ff"],["🌾 ফিড",total("feed"),"#fbbf24"],["💊 মেডিসিন",total("medicine"),"#e0775a"],["👷 কর্মচারী",workersTotal(),"#b69cff"],["🧾 বিভিন্ন খরচ",total("other"),"#3ddc84"],["🪵 কাঠের গুড়া",total("litter"),"#f0a8d0"],["⚡ বিদ্যুৎ ও জ্বালানি",total("power"),"#fde047"],["🚚 পরিবহন ভাড়া",rentTotal(),"#5eead4"]];
 let cost=parts.reduce((a,b)=>a+b[1],0),inc=salesTotal()+otherSalesGrand(),net=inc-cost;
 let live=livePcs(),dead=deathTotal()||(+state.dead||0),out=Math.max(0,chicks-dead-live);
 let harv=(state.sales||[]).reduce((a,r)=>a+(+r.weight||0),0);
 let w0=anW0(),estKg=live>0&&state.startDate?live*w0.w:0,allKg=harv+estKg;
 let f=fcrStats(),ag=days();
 let card=(t,v,c,sub)=>'<div class="pa-card"><div class="pa-t">'+t+'</div><div class="pa-v"'+(c?' style="color:'+c+'"':'')+'>'+v+'</div>'+(sub?'<div class="pa-s">'+sub+'</div>':'')+'</div>';
 let h='<div class="pa-grid">'+
  card("মোট খরচ",tk(cost),"#fbbf24")+card("মোট আয়",tk(inc),"#3ddc84")+
  card(net>=0?"এখন পর্যন্ত নিট লাভ":"এখনও ক্ষতিতে",(net<0?"−":"")+tk(Math.abs(net)),net>=0?"#3ddc84":"#ff7070")+
  card("প্রতি জীবিত মুরগিতে খরচ",tk(cost/Math.max(1,chicks-dead)),"","মোট খরচ ÷ "+bn(Math.max(0,chicks-dead))+" জীবিত (মৃত বাদ: "+bn(dead)+")")+'</div>';
 // ব্রেক-ইভেন
 if(live>0&&state.startDate){
  let need=Math.max(0,-net);
  if(need<=0)h+='<div class="an-alert good"><b>✅ খরচ উঠে গেছে।</b> অবশিষ্ট '+bn(live)+' টি মুরগি যে দামেই বিক্রি হোক সেটা লাভ।</div>';
  else{let be=need/estKg;h+='<div class="an-alert info"><b>⚖️ শুধু অবশিষ্ট মুরগির ন্যূনতম দর: কেজিতে ৳'+fb(be,1)+'</b> (যা বিক্রি হয়ে গেছে তা বাদ দিয়ে)<br>অবশিষ্ট '+bn(live)+' টি মুরগির আনুমানিক ওজন প্রায় '+fb(estKg,0)+' কেজি ('+w0.src+')। খরচ তুলতে আরও ৳'+fb(need,0)+' লাগবে, তাই এর বেশি দরে বেচলে লাভ।'+(lastSaleRate()?'<br>শেষ বিক্রির দর ৳'+fb(lastSaleRate(),0)+(lastSaleRate()>=be?' — এই দরে বেচলে লাভ হবে।':' — এই দরে বেচলে এখনও ক্ষতি।'):'')+'</div>'}
 }
 // প্রতি কেজি খরচ
 if(allKg>0){let pk=cost/allKg;h+='<div class="an-note" style="margin:8px 0">📦 <b>প্রতি কেজি মুরগির উৎপাদন খরচ: ৳'+fb(pk,1)+'</b> (মোট ওজন '+fb(allKg,0)+' কেজি'+(estKg?', এর মধ্যে '+fb(estKg,0)+' কেজি আনুমানিক':'')+'). বাজারদর এর চেয়ে বেশি হলে লাভ।</div>'}
 // প্রতি কেজিতে লাভ/ক্ষতি
 let avgRate=harv>0?salesTotal()/harv:(+state.projRate||0);
 window._anSum={net:net,cost:cost,inc:inc,live:live,estKg:estKg,allKg:allKg,avgRate:avgRate,pp:(allKg>0&&avgRate>0)?avgRate-cost/allKg:null,pk:allKg>0?cost/allKg:null,be:(live>0&&estKg>0&&state.startDate)?(net>=0?0:Math.max(0,-net)/estKg):null,harv:harv};
 if(allKg>0&&avgRate>0){
  let pk2=cost/allKg,pp=avgRate-pk2;
  h+='<div class="pa-sub">⚖️ প্রতি কেজিতে হিসাব</div><div class="pa-grid">'+
   card(harv>0?"গড় বিক্রির দর":"আপনার দেওয়া দর","৳"+fb(avgRate,1),"#7fd1ff",harv>0?"এ পর্যন্ত বিক্রি থেকে":"\"কবে বিক্রি করলে\" অংশ থেকে")+
   card("উৎপাদন খরচ","৳"+fb(pk2,1),"#fbbf24","প্রতি কেজি মাংসে")+
   card(pp>=0?"কেজিতে লাভ":"কেজিতে ক্ষতি",(pp<0?"−":"")+"৳"+fb(Math.abs(pp),1),pp>=0?"#3ddc84":"#ff7070",pp>=0?"দর "+fb(pp,1)+" টাকা কমলেও শূন্য":"দর আরও "+fb(-pp,1)+" টাকা বাড়লে শূন্য")+
   card("মোট ওজনে প্রভাব",(pp<0?"−":"")+"৳"+fb(Math.abs(pp*allKg),0),pp>=0?"#3ddc84":"#ff7070","কেজিপ্রতি ফারাক × "+fb(allKg,0)+" কেজি")+'</div>';
 }
 // দর কমলে-বাড়লে অবশিষ্ট মুরগি বিক্রির পর শেষ লাভ
 if(live>0&&estKg>0&&state.startDate){
  let ref=Math.round(avgRate>0?avgRate:(Math.max(0,-net)/estKg)+10),rows=[];
  [-20,-10,0,10,20].forEach(dv=>{let r=ref+dv;if(r>0)rows.push([r,net+estKg*r,dv===0])});
  h+='<div class="pa-sub">🔮 অবশিষ্ট '+bn(live)+' টি মুরগি এই দরে বিক্রি হলে শেষ লাভ</div><div class="pa-row" style="font-weight:700;color:#8fb1a0"><span>কেজি দর</span><span>মোট নিট লাভ/ক্ষতি</span></div>'+
   rows.map(x=>'<div class="pa-row"'+(x[2]?' style="background:#ffffff0d;font-weight:700"':'')+'><span>৳'+bn(x[0])+(x[2]?' (ভিত্তি দর)':'')+'</span><span style="color:'+(x[1]>=0?'#3ddc84':'#ff7070')+'">'+(x[1]<0?'−':'+')+tk(Math.abs(x[1]))+'</span></div>').join("")+
   '<div class="an-note" style="margin-top:6px">অবশিষ্ট মুরগির আনুমানিক ওজন '+fb(estKg,0)+' কেজি ধরা ('+w0.src+')।</div>';
 }
 // খরচের ভাগ (গোল চার্ট)
 if(cost>0){
  const R=52,C=2*Math.PI*R;let off=0,arcs="";
  parts.filter(x=>x[1]>0).forEach(x=>{const len=x[1]/cost*C,seg=Math.max(0,len-1.5);arcs+='<circle cx="70" cy="70" r="'+R+'" fill="none" stroke="'+x[2]+'" stroke-width="22" stroke-dasharray="'+seg+' '+(C-seg)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 70 70)"><title>'+x[0]+': '+tk(x[1])+'</title></circle>';off+=len});
  h+='<div class="pa-sub">🥧 খরচের ভাগ</div><div style="display:flex;justify-content:center;margin:6px 0"><svg width="170" height="170" viewBox="0 0 140 140" role="img" aria-label="খরচের ভাগ"><circle cx="70" cy="70" r="'+R+'" fill="none" stroke="#ffffff10" stroke-width="22"/>'+arcs+'<text x="70" y="64" text-anchor="middle" style="fill:#8fb1a0;font-size:9px">মোট খরচ</text><text x="70" y="82" text-anchor="middle" style="fill:#fff;font-size:14px;font-weight:800">'+tk(cost)+'</text></svg></div>';
  h+=parts.filter(x=>x[1]>0).map(x=>'<div class="pa-row"><span><b class="pa-dot" style="background:'+x[2]+'"></b>'+x[0]+'</span><span>'+tk(x[1])+' <em>'+bn(Math.round(x[1]/cost*100))+'%</em>'+(allKg>0?' <em>• ৳'+fb(x[1]/allKg,1)+'/কেজি</em>':'')+'</span></div>').join("");
  let fs=total("feed")/cost*100;
  if(fs>70)h+='<div class="an-alert info" style="margin-top:8px"><b>🌾 ফিডের অংশ '+bn(Math.round(fs))+'%</b> (সাধারণত ৬০–৭০%)। ফিড নষ্ট, ইঁদুর-পাখি বা FCR বেশি কি না দেখুন।</div>';
 }
 // কার্যকারিতা
 let md=chicks?dead/chicks*100:0,pb=ag>0&&f.birds>0?f.feed/f.birds/ag*1000:0;
 h+='<div class="pa-sub">📊 খামারের কার্যকারিতা</div><div class="pa-grid">'+
  card("মৃত্যুহার",fb(md,1)+"%",md>5?"#ff7070":"#3ddc84","স্বাভাবিক ৫% এর নিচে")+
  card("FCR",f.fcr?f.fcr.toFixed(2):"—",f.fcr?(f.fcr<=f.tg?"#3ddc84":"#ff7070"):"","টার্গেট "+f.tg.toFixed(2))+
  card("প্রতি মুরগি দৈনিক ফিড",pb?fb(pb,0)+" গ্রাম":"—","","গড়, বয়স "+bn(ag)+" দিন")+
  card("ফিড খরচ প্রতি কেজি মাংসে",allKg>0&&total("feed")>0?"৳"+fb(total("feed")/allKg,1):"—","","ফিডের টাকা ÷ মোট ওজন")+'</div>';
 el.innerHTML=h;
}

// ── নতুন বিশ্লেষণ: লক্ষ্য, ফিড তুলনা, মৃত্যু, FCR পূর্বাভাস ──
function liveOn(d){
 let c=+state.chicks||0;
 let dead=(state.deaths||[]).filter(r=>String(r.date)<=d).reduce((a,r)=>a+(+r.qty||0),0);
 let sold=(state.sales||[]).filter(r=>String(r.date)<=d).reduce((a,r)=>a+(+r.qty||0),0)
  +(((state.otherSales||{}).chicken)||[]).filter(r=>String(r.date)<=d).reduce((a,r)=>a+(+r.pcs||0),0)
  +(state.gifts||[]).filter(r=>String(r.date)<=d).reduce((a,r)=>a+(+r.qty||0),0);
 return Math.max(0,c-dead-sold);
}
window.anGoalSave=function(){
 state.goalFcr=+$a("gFcr").value||0;state.goalMort=+$a("gMort").value||0;state.goalWt=+$a("gWt").value||0;state.goalProfit=+$a("gProfit").value||0;
 if(state.goalFcr>0)state.targetFCR=state.goalFcr;
 save();renderGoals();
};
function goalRow(t,now,goal,fmtv,lowerBetter,sub){
 if(!(goal>0))return '<div class="gl-row"><div class="gl-h"><span>'+t+'</span><em>লক্ষ্য দিন</em></div></div>';
 if(now===null)return '<div class="gl-row"><div class="gl-h"><span>'+t+'</span><em>এখনও হিসাব করার মতো তথ্য নেই</em></div></div>';
 let ok=lowerBetter?now<=goal:now>=goal;
 let pc=lowerBetter?Math.max(0,Math.min(100,goal/Math.max(now,1e-9)*100)):Math.max(0,Math.min(100,now/goal*100));
 return '<div class="gl-row"><div class="gl-h"><span>'+t+'</span><em style="color:'+(ok?"#3ddc84":"#ffb070")+'">'+(ok?"✅ ":"⚠️ ")+'এখন '+fmtv(now)+' / লক্ষ্য '+fmtv(goal)+'</em></div><div class="gl-bar"><i style="width:'+pc+'%;background:'+(ok?"#3ddc84":"#fbbf24")+'"></i></div>'+(sub?'<div class="gl-s">'+sub+'</div>':'')+'</div>';
}
function renderGoals(){
 let el=$a("anGoals");if(!el)return;
 [["gFcr","goalFcr"],["gMort","goalMort"],["gWt","goalWt"],["gProfit","goalProfit"]].forEach(x=>{let i=$a(x[0]);if(i&&document.activeElement!==i)i.value=state[x[1]]||""});
 let f=fcrStats(),chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0);
 let cost=(+state.chicks||0)*(+state.chickPrice||0)+total("feed")+total("medicine")+workersTotal()+total("other")+total("litter")+total("power")+rentTotal();
 let net=salesTotal()+otherSalesGrand()-cost;
 let w0=state.startDate&&livePcs()>0?anW0().w*1000:null;
 let ab=(typeof avgBreak==="function")?avgBreak():null;
 let curW=(ab&&ab.q>0&&livePcs()===0)?ab.avg*1000:w0;
 el.innerHTML=
  goalRow("🎯 FCR",f.fcr>0?f.fcr:null,+state.goalFcr,v=>v.toFixed(2),true,"FCR যত কম তত ভালো")+
  goalRow("☠️ মৃত্যুহার",chicks?dead/chicks*100:null,+state.goalMort,v=>fb(v,1)+"%",true,"মৃত্যু "+bn(dead)+" টি")+
  goalRow("⚖️ গড় ওজন",curW,+state.goalWt,v=>fb(v,0)+" গ্রাম",false,state.startDate?"বয়স "+bn(days())+" দিন":"")+
  goalRow("💰 নিট লাভ",net,+state.goalProfit,v=>(v<0?"−":"")+"৳"+fb(Math.abs(v),0),false,net<(+state.goalProfit||0)&&+state.goalProfit>0?"আরও ৳"+fb((+state.goalProfit)-net,0)+" দরকার":"");
}
function renderFeedCmp(){
 let el=$a("anFeedCmp");if(!el)return;
 if(!state.startDate){el.innerHTML='<div class="an-alert info">আগে বাচ্চা আসার তারিখ দিন।</div>';return}
 let by={};(state.dailyFeed||[]).forEach(r=>{by[r.date]=(by[r.date]||0)+dfKg(r)});
 let pts=Object.keys(by).sort().map(d=>{let a=ageOn(d),b=liveOn(d);return a===null||b<=0?null:{age:a,g:by[d]*1000/b,std:intakeAt(a),d:d}}).filter(Boolean);
 if(!pts.length){el.innerHTML='<div class="an-alert info">"দৈনিক খাবার" পেজে ফিড লিখলে এখানে তুলনা আসবে।</div>';return}
 const W=360,H=210,L=38,R=12,T=14,B=28,maxD=42;
 let maxG=250;pts.forEach(p=>{if(p.g>maxG)maxG=Math.ceil(p.g/50)*50});
 const X=d=>L+(W-L-R)*Math.min(d,maxD)/maxD,Y=g=>T+(H-T-B)*(1-g/maxG);
 let o='<div class="an-leg"><span><i style="background:#86e3cc"></i>স্ট্যান্ডার্ড</span><span><i style="background:#ff8a5c"></i>আপনার মুরগি</span></div><svg class="an-svg" viewBox="0 0 '+W+' '+H+'" role="img">';
 for(let g=0;g<=maxG;g+=50)o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="#ffffff14"/><text x="'+(L-5)+'" y="'+(Y(g)+3)+'" text-anchor="end">'+bn(g)+'</text>';
 for(let d=0;d<=maxD;d+=7)o+='<text x="'+X(d)+'" y="'+(H-10)+'" text-anchor="middle">'+bn(d)+'</text>';
 o+='<text x="'+L+'" y="9">গ্রাম/মুরগি/দিন</text><text x="'+(W-R)+'" y="'+(H-1)+'" text-anchor="end">বয়স (দিন)</text>';
 o+='<polyline points="'+[0,7,14,21,28,35,42].map(d=>X(d)+","+Y(intakeAt(d))).join(" ")+'" fill="none" stroke="#86e3cc" stroke-width="2" stroke-dasharray="5 4"/>';
 o+='<polyline points="'+pts.map(p=>X(p.age)+","+Y(p.g)).join(" ")+'" fill="none" stroke="#ff8a5c" stroke-width="2.2"/>';
 pts.forEach(p=>{o+='<circle cx="'+X(p.age)+'" cy="'+Y(p.g)+'" r="3" fill="#ff8a5c"><title>'+bn(p.age)+' দিন: '+fb(p.g,0)+' গ্রাম (স্ট্যান্ডার্ড '+fb(p.std,0)+')</title></circle>'});
 o+='</svg>';
 let last=pts.slice(-3),ag=last.reduce((a,p)=>a+p.g,0)/last.length,as=last.reduce((a,p)=>a+p.std,0)/last.length,df=(ag/as-1)*100;
 let cls=df>=-10&&df<=15?"good":df<-15?"bad":"info";
 o+='<div class="an-alert '+cls+'" style="margin-top:8px">শেষ '+bn(last.length)+' দিনের গড়: <b>'+fb(ag,0)+' গ্রাম/মুরগি/দিন</b>, স্ট্যান্ডার্ড '+fb(as,0)+' গ্রাম ('+(df>=0?"+":"−")+fb(Math.abs(df),0)+'%)। '+(df<-15?"খাওয়া বেশ কম — পানি, ফিডের মান, রোগ বা গরম দেখুন।":df<-10?"খাওয়া একটু কম, নজর রাখুন।":df>15?"স্ট্যান্ডার্ডের চেয়ে বেশি খাচ্ছে — অপচয় বা হিসাবের ভুল আছে কিনা দেখুন।":"খাওয়া স্বাভাবিক।")+'</div>';
 el.innerHTML=o;
}
function renderMort(){
 let el=$a("anMort");if(!el)return;
 let ds=(state.deaths||[]).filter(r=>+r.qty>0),chicks=+state.chicks||0;
 if(!ds.length){el.innerHTML='<div class="an-alert good">এখনও কোনো মৃত্যু যোগ করা হয়নি।</div>';return}
 let total=ds.reduce((a,r)=>a+(+r.qty||0),0),wk={},rs={};
 ds.forEach(r=>{let a=ageOn(r.date);let w=a===null?-1:Math.min(5,a<=7?0:Math.ceil(a/7)-1);wk[w]=(wk[w]||0)+(+r.qty||0);let k=String(r.reason||"").trim()||"কারণ লেখা নেই";rs[k]=(rs[k]||0)+(+r.qty||0)});
 const lab=["১ম সপ্তাহ (০–৭ দিন)","২য় সপ্তাহ (৮–১৪)","৩য় সপ্তাহ (১৫–২১)","৪র্থ সপ্তাহ (২২–২৮)","৫ম সপ্তাহ (২৯–৩৫)","৬ষ্ঠ+ সপ্তাহ (৩৬+)"];
 let max=Math.max.apply(null,Object.values(wk));
 let h='<div class="an-alert '+(chicks&&total/chicks*100>5?"bad":"info")+'"><b>মোট মৃত্যু '+bn(total)+' টি'+(chicks?' ('+fb(total/chicks*100,2)+'%)':'')+'</b></div><div class="pa-sub" style="margin-top:10px">বয়স অনুযায়ী</div>';
 for(let i=0;i<6;i++){let v=wk[i]||0;if(!v&&i>Math.max(0,days()?Math.ceil(days()/7)-1:0))continue;h+='<div class="mt-row"><span>'+lab[i]+'</span><div class="gl-bar"><i style="width:'+(max?v/max*100:0)+'%;background:#e0775a"></i></div><b>'+bn(v)+(chicks?' <small>('+fb(v/chicks*100,1)+'%)</small>':'')+'</b></div>'}
 if(wk[-1])h+='<div class="an-note">'+bn(wk[-1])+' টি মৃত্যুর বয়স বের করা যায়নি (বাচ্চা আসার তারিখ নেই)।</div>';
 let w1=wk[0]||0;
 if(chicks&&w1/chicks*100>1)h+='<div class="an-alert bad" style="margin-top:8px">⚠️ প্রথম সপ্তাহেই '+fb(w1/chicks*100,1)+'% মরেছে (সাধারণত ১% এর নিচে থাকে)। বাচ্চার মান, ব্রুডিং তাপমাত্রা ও প্রথম ২৪ ঘণ্টার পানি-খাবার দেখুন।</div>';
 h+='<div class="pa-sub" style="margin-top:12px">কারণ অনুযায়ী</div>';
 Object.keys(rs).sort((a,b)=>rs[b]-rs[a]).forEach(k=>{h+='<div class="pa-row"><span>'+esc(k)+'</span><span>'+bn(rs[k])+' টি <em>'+bn(Math.round(rs[k]/total*100))+'%</em></span></div>'});
 el.innerHTML=h;
}
function renderFcrProj(){
 let el=$a("anFcrProj");if(!el)return;
 let f=fcrStats(),age=days(),live=livePcs(),fi=feedInfo();
 if(!state.startDate){el.innerHTML='<div class="an-alert info">আগে বাচ্চা আসার তারিখ দিন।</div>';return}
 if(live<=0){el.innerHTML='<div class="an-alert info">খামারে এখন মুরগি নেই, তাই পূর্বাভাস দেওয়া যাচ্ছে না।</div>';return}
 if(!(f.feed>0)||!(fi.avg>0)){el.innerHTML='<div class="an-alert info">"দৈনিক খাবার" পেজে ফিড লিখুন, তাহলে পূর্বাভাস আসবে।</div>';return}
 let w0=anW0(),harv=f.harv,tg=f.tg,maxN=Math.min(7,Math.max(0,42-age)),rows=[],extra=0;
 for(let n=0;n<=maxN;n++){
  if(n>0)extra+=fi.avg*intakeAt(age+n)/intakeAt(Math.max(1,age-1));
  let w=w0.w+(stdAt(age+n)-stdAt(age))/1000,tw=harv+live*w,feed=f.feed+extra;
  rows.push({n:n,age:age+n,fcr:tw>0?feed/tw:0,feed:feed,avg:w});
 }
 let best=rows.reduce((a,b)=>b.fcr<a.fcr-0.005&&b.fcr>0?b:a,rows[0]);
 let h='<div class="an-alert info"><b>বর্তমান FCR '+rows[0].fcr.toFixed(2)+'</b> (টার্গেট '+tg.toFixed(2)+'). '+(best.n>0?'পূর্বাভাসে '+bn(best.n)+' দিন পরে FCR সবচেয়ে কম ('+best.fcr.toFixed(2)+').':'পূর্বাভাসে আজই FCR সবচেয়ে ভালো।')+' সাধারণত বয়স বাড়লে FCR বাড়ে, তাই বেশি দিন রাখলে ফিড খরচের তুলনায় লাভ কমতে পারে।</div>';
 h+='<div class="an-proj" style="margin-top:8px"><table><thead><tr><th>কবে</th><th>বয়স</th><th>গড় ওজন</th><th>মোট ফিড</th><th>FCR</th></tr></thead><tbody>';
 rows.forEach(r=>{h+='<tr class="'+(r.fcr>tg?"neg":"")+'"><td>'+(r.n?"+"+bn(r.n)+" দিন":"আজ")+'</td><td>'+bn(r.age)+'</td><td>'+fb(r.avg*1000,0)+' গ্রাম</td><td>'+fb(r.feed,0)+' কেজি</td><td><b>'+r.fcr.toFixed(2)+'</b></td></tr>'});
 h+='</tbody></table></div><div class="an-note">ধরা হয়েছে: ফিড শেষ ৩ দিনের গড় থেকে স্ট্যান্ডার্ড হারে বাড়বে, ওজন '+w0.src+' স্ট্যান্ডার্ড হারে বাড়বে। লাল সারি = টার্গেটের চেয়ে বেশি FCR।</div>';
 el.innerHTML=h;
}
// ── বিশ্লেষণ: ওপরের এক ঝলক সারাংশ ──
function anLight(c,t,v,sub){return '<div class="lt '+c+'"><i></i><div><small>'+t+'</small><b>'+v+'</b>'+(sub?'<em>'+sub+'</em>':'')+'</div></div>'}
function renderAnTop(){
 let el=$a("anTop");if(!el)return;
 if(!(+state.chicks>0)){el.innerHTML="";return}
 let f=fcrStats(),chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0),mr=chicks?dead/chicks*100:0,age=days();
 let lim=+state.goalMort>0?+state.goalMort:5,L=[],adv=[];
 if(f.fcr>0){let r=f.fcr/f.tg,c=r<=1?"g":r<=1.1?"y":"r";L.push(anLight(c,"FCR",f.fcr.toFixed(2),"লক্ষ্য "+f.tg.toFixed(2)+(f.est?" • আনুমানিক":"")));if(c==="r")adv.push("FCR বেশি — ফিডের অপচয়, ফিডারের জায়গা ও মুরগির ওজন দেখুন")}
 else L.push(anLight("n","FCR","—","ফিড/ওজন দিন"));
 {let c=mr<=lim*0.6?"g":mr<=lim?"y":"r";L.push(anLight(c,"মৃত্যুহার",mr.toFixed(1)+"%","সীমা "+lim+"%"));if(c==="r")adv.push("মৃত্যু সীমার ওপরে — মৃত্যুর বিশ্লেষণ ও 🩺 রোগ ও প্রতিকার পাতা দেখুন");else if(c==="y")adv.push("মৃত্যু সীমার কাছাকাছি — সতর্ক থাকুন")}
 {let w=anW0(),std=stdAt(age)/1000,has=wPoints().length>0||(+state.liveAvgWt>0);
  if(age>=7&&std>0&&has){let r=w.w/std,c=r>=0.97?"g":r>=0.9?"y":"r";L.push(anLight(c,"ওজন",Math.round(w.w*1000)+" গ্রাম","স্ট্যান্ডার্ড "+Math.round(std*1000)));if(c!=="g")adv.push("ওজন স্ট্যান্ডার্ডের চেয়ে কম — ফিড-পানি, ঘরের তাপ ও রোগ পরীক্ষা করুন")}
  else L.push(anLight("n","ওজন","—","ওজন নমুনা দিন"))}
 {let fi=feedInfo();
  if(fi.bought>0&&fi.avg>0){
   if(fi.stock<0){L.push(anLight("y","ফিড","হিসাব মেলেনি","খাওয়ানো বেশি"));adv.push("ফিড কেনা ও খাওয়ানোর হিসাব মেলেনি — এন্ট্রি দেখুন")}
   else{let d=fi.left===null?0:fi.left,c=d>=3?"g":d>=1?"y":"r";L.push(anLight(c,"ফিড",d>=60?"৬০+ দিন":Math.floor(d)+" দিন","চলবে"));if(c!=="g")adv.push("ফিড কমে আসছে — আজই ফিড কিনুন")}
  }else L.push(anLight("n","ফিড","—","হিসাব দিন"))}
 {let c0=lcCalc(),r5=lcP5(c0);
  if(r5){let c=r5.net>=0?"g":"r";L.push(anLight(c,"লাভ",(r5.net<0?"−":"")+"৳"+fe(Math.abs(r5.net)),"৳"+fe(c0.price)+" দরে বিক্রি করলে"));if(c==="r")adv.push("এই দরে বিক্রি করলে লোকসান — নিচে 'কবে বিক্রি' দেখুন")}
  else L.push(anLight("n","লাভ","—","বিক্রির দর দিন"))}
 let spike="";
 {let by={};(state.deaths||[]).forEach(r=>{by[r.date]=(by[r.date]||0)+(+r.qty||0)});let ks=Object.keys(by).sort();
  if(ks.length){let last=ks[ks.length-1],q=by[last],ago=Math.round((new Date(todayISO()+"T00:00:00")-new Date(last+"T00:00:00"))/864e5);
   let prev=ks.slice(0,-1).map(k=>by[k]),avg=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:0;
   if(ago>=0&&ago<=2&&q>=Math.max(5,avg*3,chicks*0.005)){spike='<div class="an-spike">🚨 '+(ago===0?"আজ":ago===1?"গতকাল":"২ দিন আগে")+' হঠাৎ '+bn(q)+' টি মুরগি মরেছে'+(avg>0?' (সাধারণত দিনে '+fb(avg,1)+' টি)':'')+' — ঘর, পানি-ফিড ও লক্ষণ এখনই দেখুন</div>';adv.unshift("হঠাৎ মৃত্যু বেড়েছে — 🩺 রোগ ও প্রতিকার পাতায় লক্ষণ মিলিয়ে দেখুন")}}}
 let ad=adv.length?'<div class="an-adv bad">👉 '+adv.slice(0,3).join('<br>👉 ')+'</div>':'<div class="an-adv ok">✅ এখন পর্যন্ত সব ঠিক আছে</div>';
 el.innerHTML='<div class="an-today"><div class="an-today-h">🚦 আজকের অবস্থা <span>বয়স '+bn(age)+' দিন</span></div><div class="lt-grid">'+L.join("")+'</div>'+spike+ad+'</div>';
}
// ── বিশ্লেষণ: সেকশন ভাঁজ করা (পছন্দ ফোনে মনে থাকে) ──
function anFoldGet(){try{return JSON.parse(localStorage.getItem("anFolded")||"[]")}catch(e){return []}}
function anFoldSet(a){try{localStorage.setItem("anFolded",JSON.stringify(a))}catch(e){}}
function anTitleKey(t){return String(t.textContent||"").trim()}
function anFoldApply(){
 let f=anFoldGet();
 document.querySelectorAll("#analysis .an-box,#analysis .dzc-box").forEach(b=>{let t=b.querySelector(":scope>.an-title");if(!t)return;b.classList.toggle("collapsed",f.indexOf(anTitleKey(t))>=0)});
}
window.anFoldAll=function(fold){
 let keys=[];
 document.querySelectorAll("#analysis .an-box,#analysis .dzc-box").forEach(b=>{let t=b.querySelector(":scope>.an-title");if(t)keys.push(anTitleKey(t))});
 anFoldSet(fold?keys:[]);anFoldApply();
};
(function(){
 const root=document.getElementById("analysis");if(!root)return;
 root.addEventListener("click",function(ev){
  let t=ev.target.closest&&ev.target.closest(".an-title");if(!t)return;
  let b=t.parentElement;if(!b||!(b.classList.contains("an-box")||b.classList.contains("dzc-box")))return;
  let k=anTitleKey(t),f=anFoldGet(),i=f.indexOf(k);
  if(i>=0)f.splice(i,1);else f.push(k);
  anFoldSet(f);anFoldApply();
 });
})();
// ── বিশ্লেষণ: আগের ব্যাচের সঙ্গে তুলনা ──
function cmpStats(b,cur){
 let chicks=+b.chicks||0;if(!(chicks>0))return null;
 let dead=(b.deaths&&b.deaths.length)?sumOf(b.deaths,r=>r.qty):(+b.dead||0);
 let sl=b.sales||[],rt=(b.otherSales&&b.otherSales.chicken)||[],gf=b.gifts||[];
 let wOut=sumOf(sl,r=>r.weight)+sumOf(rt,r=>r.qty)+sumOf(gf,r=>r.weight);
 let pOut=sumOf(sl,r=>r.qty)+sumOf(rt,r=>r.pcs)+sumOf(gf,r=>r.qty);
 let sm=batchSummary(b),feedKg=sumOf(b.dailyFeed,dfKg);
 let o={mort:dead/chicks*100,avgW:pOut>0?wOut/pOut:null,cost:sm.cost,inc:sm.sales,wOut:wOut};
 o.costKg=wOut>0?sm.cost/wOut:null;
 o.profKg=wOut>0?(sm.sales-sm.cost)/wOut:null;
 o.fcr=(feedKg>0&&wOut>0)?feedKg/wOut:null;
 return o;
}
function renderAnCmp(){
 let el=$a("anCmp");if(!el)return;
 let me=cmpStats(state);
 if(!me){el.innerHTML='<div class="an-note">আগে বাচ্চার সংখ্যা দিন।</div>';return}
 let s=window._anSum;
 // এই ব্যাচ: চলমান হলে বিশ্লেষণের আনুমানিক হিসাব নেওয়া হয়
 if(s&&s.allKg>0){me.costKg=s.pk;if(s.pp!==null)me.profKg=s.pp}
 let f=fcrStats();if(f.fcr)me.fcr=f.fcr;
 let others=(store.batches||[]).filter(b=>b.id!==state.id).map(b=>cmpStats(b)).filter(x=>x&&x.wOut>0);
 if(!others.length){el.innerHTML='<div class="an-note">তুলনার মতো আগের ব্যাচ এখনও নেই। অন্য ব্যাচে বিক্রির হিসাব থাকলে এখানে এই ব্যাচের পাশে দেখা যাবে।</div>';return}
 const avg=k=>{let v=others.map(x=>x[k]).filter(x=>x!==null&&isFinite(x));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
 const rows=[["প্রতি কেজিতে লাভ","profKg",1,v=>"৳"+fb(v,0)],["প্রতি কেজি উৎপাদন খরচ","costKg",-1,v=>"৳"+fb(v,0)],["FCR","fcr",-1,v=>fb(v,2)],["মৃত্যুহার","mort",-1,v=>fb(v,1)+"%"],["গড় ওজন/মুরগি","avgW",1,v=>fb(v,2)+" কেজি"]];
 let h='<table class="cmp-tbl"><thead><tr><th></th><th>এই ব্যাচ</th><th>আগের '+bn(others.length)+' ব্যাচের গড়</th><th></th></tr></thead><tbody>';
 rows.forEach(r=>{
  let a=me[r[1]],b=avg(r[1]);
  if((a===null||!isFinite(a))&&(b===null))return;
  let mark="",cls="";
  if(a!==null&&isFinite(a)&&b!==null){let d=(a-b)*r[2],tol=Math.abs(b)*0.03+0.0001;if(d>tol){mark="👍";cls="g"}else if(d<-tol){mark="⚠️";cls="r"}else mark="＝"}
  h+='<tr><td>'+r[0]+'</td><td class="'+cls+'">'+((a!==null&&isFinite(a))?r[3](a):"—")+'</td><td>'+(b!==null?r[3](b):"—")+'</td><td>'+mark+'</td></tr>';
 });
 h+='</tbody></table><div class="an-note">👍 আগের গড়ের চেয়ে ভালো, ⚠️ খারাপ। চলমান ব্যাচে কেজি-হিসাব আনুমানিক ওজনসহ। আগের ব্যাচে যে তথ্য নেই (যেমন FCR-এর জন্য দৈনিক খাবার) তা বাদ গেছে।</div>';
 el.innerHTML=h;
}

// ── গ্রাফে দেখুন ──
let _gid=0;
function lineSvg(xs,ys,o){
 o=o||{};const W=360,H=200,L=62,R=16,T=18,B=26,id="lg"+(++_gid);
 let mn=Math.min.apply(null,ys.concat(o.ref!==undefined?[o.ref]:[],[0])),mx=Math.max.apply(null,ys.concat(o.ref!==undefined?[o.ref]:[],[0]));
 if(mx===mn)mx=mn+1;let pad=(mx-mn)*0.1;if(mn<0)mn-=pad;mx+=pad;
 const n=xs.length,X=i=>L+(W-L-R)*(n>1?i/(n-1):0),Y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));
 const fm=o.fmt||(v=>fb(v,0));
 let last=ys[n-1],col=o.color||(last>=0?"#3ddc84":"#ff7070"),base=Y(0>mn?0:mn);
 let g='<svg class="an-svg ln-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(o.label||"গ্রাফ")+'"><defs><linearGradient id="'+id+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".95"/><stop offset="1" stop-color="'+col+'" stop-opacity=".25"/></linearGradient><filter id="'+id+'g" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
 for(let k=0;k<=4;k++){let v=mn+(mx-mn)*k/4;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#ffffff10" stroke-dasharray="2 5"/><text x="'+(L-6)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+fm(v)+'</text>'}
 if(mn<0&&mx>0)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="#ffffff66" stroke-width="1.2"/>';
 let step=Math.max(1,Math.ceil(n/6));for(let i=0;i<n;i+=step)g+='<text x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle">'+(o.xl?o.xl(xs[i]):xs[i])+'</text>';
 if(o.ref!==undefined)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(o.ref)+'" y2="'+Y(o.ref)+'" stroke="#fbbf24" stroke-dasharray="5 4"/><text x="'+(L+4)+'" y="'+(Y(o.ref)-4)+'" style="fill:#fbbf24;font-weight:700">'+(o.refl||"")+'</text>';
 let P=ys.map((v,i)=>[+X(i).toFixed(1),+Y(v).toFixed(1)]),z0=Y(0>mn&&0<mx?0:(mn>=0?mn:mx));
 let sw=n>70?1.6:n>40?2.2:n>20?3:4.5,dr=n>70?1.8:n>40?2.4:n>20?3.2:4.2;
 P.forEach((p,i)=>{g+='<line x1="'+p[0]+'" x2="'+p[0]+'" y1="'+z0+'" y2="'+p[1]+'" stroke="'+col+'" stroke-opacity=".6" stroke-width="'+sw+'" stroke-linecap="round" class="lo-stem" style="animation-delay:'+(i*(n>40?8:18))+'ms"/>'});
 P.forEach((p,i)=>{if(i===n-1)return;g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+dr+'" fill="'+col+'" class="lo-dot" style="animation-delay:'+(i*(n>40?8:18))+'ms"><title>'+fm(ys[i])+'</title></circle>'});
 let lx=P[n-1][0],ly=P[n-1][1],end=lx>W-90;
 g+='<circle cx="'+lx+'" cy="'+ly+'" r="9" fill="'+col+'" opacity=".25" class="ln-pulse"/><circle cx="'+lx+'" cy="'+ly+'" r="4.5" fill="'+col+'" stroke="#fff" stroke-width="1.6"/>';
 let txt=fm(last),tw=txt.length*6.2+14;
 g+='<rect x="'+(end?lx-tw-8:lx+8)+'" y="'+(ly-24)+'" width="'+tw+'" height="18" rx="9" fill="'+col+'"/><text x="'+((end?lx-tw-8:lx+8)+tw/2)+'" y="'+(ly-11.5)+'" text-anchor="middle" style="fill:#08140d;font-weight:800;font-size:10.5px">'+txt+'</text>';
 return g+'</svg>';
}
function hbars(rows){
 let mx=Math.max.apply(null,rows.map(r=>Math.abs(r.v)).concat([1]));
 return rows.map(r=>'<div class="hb-row"><div class="hb-top"><span>'+r.t+'</span><b style="color:'+r.c+'">'+r.s+'</b></div><div class="hb-bar"><i style="width:'+Math.max(2,Math.abs(r.v)/mx*100)+'%;background:linear-gradient(90deg,'+r.c+'55,'+r.c+')"></i></div></div>').join("");
}
function renderAnGraphs(id){
 let el=$a(id||"anGraphs");if(!el)return;
 if(!state.startDate){el.innerHTML='<div class="an-note">গ্রাফ দেখতে আগে বাচ্চা আসার তারিখ দিন।</div>';return}
 const a0=new Date(state.startDate+"T00:00:00"),t0=new Date(todayISO()+"T00:00:00");
 let nd=Math.max(1,Math.min(120,Math.round((t0-a0)/864e5)+1)),ds=[];
 for(let i=0;i<nd;i++){let d=new Date(a0);d.setDate(d.getDate()+i);ds.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"))}
 let idx={};ds.forEach((d,i)=>idx[d]=i);
 let cost=ds.map(()=>0),inc=ds.map(()=>0),dead=ds.map(()=>0);
 cost[0]+=(+state.chicks||0)*(+state.chickPrice||0);
 ["feed","medicine","other","litter","power"].forEach(k=>(state[k]||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=(+r.qty||0)*(+r.rate||0)}));
 if(wageOn(state))ds.forEach((d,i)=>{cost[i]+=wageOnDay(state,d)});else (state.workers||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amount||0});
 (state.rent||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amt||0});
 (state.sales||[]).forEach(r=>{if(r.date in idx)inc[idx[r.date]]+=(+r.weight||0)*(+r.rate||0)});
 (state.litterSales||[]).forEach(r=>{if(r.date in idx)inc[idx[r.date]]+=(+r.qty||0)*(+r.rate||0)});
 Object.keys(state.otherSales||{}).forEach(k=>(state.otherSales[k]||[]).forEach(r=>{if(r.date in idx)inc[idx[r.date]]+=(+r.qty||0)*(+r.rate||0)}));
 (state.deaths||[]).forEach(r=>{if(r.date in idx)dead[idx[r.date]]+=+r.qty||0});
 let cc=0,ci=0,cd=0,net=[],mort=[],tc=0,ti=0;
 ds.forEach((d,i)=>{cc+=cost[i];ci+=inc[i];cd+=dead[i];net.push(ci-cc);mort.push((+state.chicks>0)?cd/state.chicks*100:0)});
 tc=cc;ti=ci;
 const tk2=v=>(v<0?"−":"")+"৳"+fb(Math.abs(v),0),xl=d=>bn(d.slice(8))+"/"+bn(d.slice(5,7));
 let h=id==="dbTS"?"":'<div class="dzc-grp"><div class="dzc-t">💵 আয় বনাম খরচ <span>এখন পর্যন্ত</span></div>'+hbars([{t:"খরচ",v:tc,c:"#fbbf24",s:tk2(tc)},{t:"আয়",v:ti,c:"#3ddc84",s:tk2(ti)},{t:ti>=tc?"লাভ":"ক্ষতি",v:ti-tc,c:ti>=tc?"#3ddc84":"#ff7070",s:tk2(ti-tc)}])+'</div>';
 if(nd>1){
  h+='<div class="dzc-grp"><div class="dzc-t">📈 জমা লাভ-লোকসান <span>দিন ধরে (০ রেখার নিচে = ক্ষতি)</span></div>'+lineSvg(ds,net,{fmt:tk2,xl:xl,label:"জমা লাভ-লোকসান"})+'</div>';
  h+='<div class="dzc-grp"><div class="dzc-t">☠️ জমা মৃত্যুহার <span>% • হলুদ রেখা = '+(+state.goalMort>0?"আপনার লক্ষ্য":"সাধারণ সীমা ৫%")+'</span></div>'+lineSvg(ds,mort,{fmt:v=>fb(v,1)+"%",xl:xl,ref:(+state.goalMort>0?+state.goalMort:5),refl:"সীমা",color:mort[mort.length-1]>((+state.goalMort>0)?+state.goalMort:5)?"#ff7070":"#e0a75a",label:"জমা মৃত্যুহার"})+'</div>';
 }else h+='<div class="an-note">বাচ্চা আসার পর কয়েক দিন গেলে লাইন-গ্রাফ দেখা যাবে।</div>';
 if(el.id==="dbGraphs"){let all=dayList(14),fx={};all.forEach((d,i)=>fx[d]=i);let fv=all.map(()=>0);(state.dailyFeed||[]).forEach(r=>{if(r.date in fx)fv[fx[r.date]]+=dfKg(r)});h+='<div class="dzc-grp"><div class="dzc-t">🍽️ শেষ ১৪ দিনের খাবার <span>কেজি</span></div>'+barSvg(fv,all,v=>fb(v,1)+" কেজি","var(--dz2)",v=>bn(Math.round(v*10)/10))+'</div>'}
 el.innerHTML=h;
}

// ── ড্যাশবোর্ডের গোল মিটার ──
function ringSvg(pct,col,big,small){
 const R=40,C=2*Math.PI*R,p=Math.max(0,Math.min(1,pct||0)),id="rg"+(++_gid);
 return '<svg viewBox="0 0 100 100" class="rg-svg" role="img"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+col+'"/><stop offset="1" stop-color="'+col+'" stop-opacity=".55"/></linearGradient></defs><circle cx="50" cy="50" r="'+R+'" fill="none" stroke="#ffffff12" stroke-width="10"/><circle cx="50" cy="50" r="'+R+'" fill="none" stroke="url(#'+id+')" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(C*p).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 50 50)" class="rg-arc" style="--c:'+C.toFixed(1)+';filter:drop-shadow(0 0 4px '+col+'88)"/><text x="50" y="'+(small?50:55)+'" text-anchor="middle" class="rg-big" style="fill:'+col+'">'+big+'</text>'+(small?'<text x="50" y="64" text-anchor="middle" class="rg-sm">'+small+'</text>':'')+'</svg>';
}
function ringCard(t,pct,col,big,small,note){return '<div class="rg-card'+(pct>=1?' rg-gold':'')+'"><div class="rg-t">'+t+'</div>'+ringSvg(pct,col,big,small)+'<div class="rg-n">'+note+'</div></div>'}
function renderDashRings(){
 let el=$a("dbGraphs");if(!el)return;
 let chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0);
 let parts=[["বাচ্চা কেনা",chicks*(+state.chickPrice||0),"#f59e0b"],["ফিড",total("feed"),"#3ddc84"],["মেডিসিন",total("medicine"),"#a78bfa"],["কর্মচারী",workersTotal(),"#38bdf8"],["অন্যান্য",total("other")+total("litter")+total("power")+rentTotal(),"#fb7185"]];
 let cost=parts.reduce((a,x)=>a+x[1],0),inc=salesTotal()+otherSalesGrand(),net=inc-cost;
 let lim=+state.goalMort>0?+state.goalMort:5,mr=chicks?dead/chicks*100:0;
 let born=Math.max(0,chicks-dead),sold=soldPcs(),f=fcrStats(),tf=+state.targetFCR||1.6,age=state.startDate?days():0;
 let h='<div class="rg-grid">';
 h+=ringCard("💰 খরচ উঠেছে",cost>0?inc/cost:0,inc>=cost?"#3ddc84":"#fbbf24",fb(cost>0?inc/cost*100:0,0)+"%",net>=0?"লাভে":"ক্ষতিতে",(net<0?"−":"")+"৳"+fb(Math.abs(net),0));
 h+=ringCard("☠️ মৃত্যুহার",lim?mr/(lim*2):0,mr>lim?"#ff7070":"#3ddc84",fb(mr,1)+"%","সীমা "+fb(lim,0)+"%",mr>lim?"সীমার ওপরে":"নিরাপদ");
 h+=ringCard("🛒 বিক্রি হয়েছে",born>0?sold/born:0,"#38bdf8",fb(born>0?sold/born*100:0,0)+"%","",bn(sold)+" / "+bn(born)+" টি");
 h+=ringCard("📅 ব্যাচের বয়স",age/42,"#a78bfa",bn(age),"দিন","৪২ দিনে ধরলে "+fb(Math.min(100,age/42*100),0)+"%");
 h+='</div>';
 if(f&&f.fcr>0)h+='<div class="rg-wide">'+ringSvg(Math.min(1,tf/f.fcr),f.fcr<=tf?"#3ddc84":"#fbbf24",fb(f.fcr,2),"FCR")+'<div><b>🎯 FCR</b><div class="rg-n">লক্ষ্য '+fb(tf,2)+' • '+(f.fcr<=tf?"লক্ষ্যের মধ্যে ✅":"লক্ষ্যের চেয়ে বেশি ⚠️")+'</div></div></div>';
 if(cost>0){
  const R=40,C=2*Math.PI*R;let off=0,arcs="",leg="";
  parts.forEach(x=>{if(x[1]<=0)return;let fr=x[1]/cost,len=C*fr;arcs+='<circle cx="50" cy="50" r="'+R+'" fill="none" stroke="'+x[2]+'" stroke-width="14" stroke-dasharray="'+Math.max(0,len-1.2).toFixed(1)+' '+C.toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 50 50)"><title>'+x[0]+'</title></circle>';off+=len;leg+='<div class="rg-leg"><i style="background:'+x[2]+'"></i><span>'+x[0]+'</span><b>'+fb(fr*100,0)+'%</b></div>'});
  h+='<div class="rg-wide rg-pie"><svg viewBox="0 0 100 100" class="rg-svg"><circle cx="50" cy="50" r="'+R+'" fill="none" stroke="#ffffff10" stroke-width="14"/>'+arcs+'<text x="50" y="48" text-anchor="middle" class="rg-sm">মোট খরচ</text><text x="50" y="61" text-anchor="middle" class="rg-big" style="fill:#fbbf24;font-size:11px">৳'+fb(cost,0)+'</text></svg><div style="flex:1"><b>🥧 খরচ কোথায় গেল</b>'+leg+'</div></div>';
 }
 try{h+=renderDashExtra()}catch(e){console.error(e)}
 el.innerHTML=h;
 {let t=document.createElement("div");t.id="dbTS";el.appendChild(t);try{renderAnGraphs("dbTS")}catch(e){console.error(e)}}
}

// ── প্রতি মুরগির খরচ (ড্যাশবোর্ড) ──
function perBirdCalc(){
 let chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0),alive=Math.max(0,chicks-dead);
 let chickCost=chicks*(+state.chickPrice||0);
 let other=total("medicine")+workersTotal()+total("other")+total("litter")+total("power")+rentTotal();
 let kg=dailyFeedKg(),bought=sumOf(state.feed,r=>r.qty)*bagKg();
 let price=+state.feedKgPrice||0,auto=false;
 if(!(price>0)&&bought>0){price=total("feed")/bought;auto=true}
 let feedCost=kg*price,all=chickCost+other+feedCost;
 return{chicks:chicks,dead:dead,alive:alive,chickCost:chickCost,other:other,kg:kg,price:price,auto:auto,feedCost:feedCost,all:all,per:alive>0?all/alive:null};
}
function renderDashPerBird(){
 let v=$a("kPerBird");if(!v)return;
 let c=perBirdCalc();
 v.textContent=(c.chicks>0&&c.per!==null)?"৳"+fe(c.per):"—";
 let s=$a("kPerBirdS");try{renderLcTiles()}catch(e){}if(s)s.textContent=c.chicks>0?("খাওয়ানো ফিড + সব খরচ • ফিড ৳"+fe(c.price)+((+state.feedKgPrice>0)?"":" (গড়)")+"/কেজি"):"বাচ্চার তথ্য দিন";
}
window.openGraphs=function(){let m=$a("grModal");if(!m)return;try{renderDashRings()}catch(e){console.error(e)}m.classList.add("show");let b=$a("grBody");if(b)b.scrollTop=0};
window.closeGraphs=function(){let m=$a("grModal");if(m)m.classList.remove("show")};

// ── লাভ ক্ষতি সারাংশ (ড্যাশবোর্ড) ──
function lcCalc(){
 let bs=batchSummary(state),pb=perBirdCalc(),w0=anW0(),ha=avgBreak();
 let price=+state.projRate||lastSaleRate(),aw=+state.liveAvgWt||0;
 return{cost:bs.cost,alive:pb.alive,chicks:pb.chicks,price:price,aw:aw,w0:aw>0?aw:w0.w,w0src:w0.src,wm:w0.w,harv:ha.w,live:livePcs(),
  inc:salesTotal()+otherSalesGrand(),need:price>0?bs.cost/price:0,perNeed:(price>0&&pb.alive>0)?bs.cost/pb.alive/price:0,costPer:pb.alive>0?bs.cost/pb.alive:0};
}
function syncShared(){
 let a=+state.feedKgPrice,b=+state.projFeedRate;
 if(a>0&&!(b>0))state.projFeedRate=a;else if(b>0&&!(a>0))state.feedKgPrice=b;
 let ae=document.activeElement,sr=$a("salesRate"),r=+state.projRate||lastSaleRate();
 if(sr&&!sr._lcL){sr._lcL=1;sr.addEventListener("input",()=>{sr.dataset.auto="0"})}
 if(sr&&ae!==sr&&(!sr.value||sr.dataset.auto==="1")&&r>0){sr.value=r;sr.dataset.auto="1"}
 let fl=$a("fcLive");if(fl&&ae!==fl&&+state.liveAvgWt>0)fl.value=state.liveAvgWt;
 let bk=$a("dfBagKg");if(bk&&ae!==bk&&bk.value==="50"&&+state.feedBagKg>0&&+state.feedBagKg!==50)bk.value=state.feedBagKg;
}
function fe(n,d){n=+n||0;return n.toLocaleString("en-US",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})}
function en(s){return String(s||"").replace(/[০-৯]/g,x=>"০১২৩৪৫৬৭৮৯".indexOf(x))}
function renderLcTiles(){
 try{syncShared()}catch(e){}
 if(!$a("lcV1"))return;
 let c=lcCalc(),set=(i,v,s)=>{let x=$a("lcV"+i);if(!x)return;x.textContent=v;$a("lcS"+i).textContent=s};
 let pb=perBirdCalc(),dp=c.price>0?"বিক্রির দর ৳"+fe(c.price)+"/কেজি":"দর দিতে চাপুন",cur=c.harv+c.live*c.w0;
 let nm=(need)=>{let d=cur-need;return "এখন আছে "+fe(cur)+" কেজি • "+(d>=0?"পর্যাপ্ত ✅":"আরও "+fe(-d)+" কেজি লাগবে")};
 {let tw=cur,ok=tw>0,pr=c.price;
  let sub=(cost)=>(pr>0&&cost>0)?"কত কেজি লাগবে: "+fe(cost/pr)+" কেজি (দর ৳"+fe(pr)+")":"বিশ্লেষণ পাতায় মুরগির দর দিন";
  set(6,ok&&pb.all>0?"৳"+fe(pb.all/tw,2)+"/কেজি":"—",sub(pb.all));
  set(1,ok&&c.cost>0?"৳"+fe(c.cost/tw,2)+"/কেজি":"—",sub(c.cost))}
 {let rows=[[7,pb.alive>0?pb.all/pb.alive:null],[8,c.alive>0?c.cost/c.alive:null]];
  rows.forEach(([n,cp])=>{let t=$a("lcT"+n),ok=c.price>0&&cp!==null&&cp>0;
   if(ok){let need=cp/c.price;set(n,fe(need,2)+" কেজি","৳"+fe(cp,2)+" ÷ ৳"+fe(c.price)+" • এখন গড় "+fe(c.w0,2)+" কেজি");if(t){t.classList.remove("m-red","m-green");t.classList.add(c.w0>=need?"m-green":"m-red")}}
   else set(n,"—",c.price>0?"বাচ্চার তথ্য দিন":"দর দিতে চাপুন")})}
 let k4=$a("kCostPerKg");if(k4)k4.textContent=c.alive>0?"৳"+fe(c.cost/c.alive,2):"—";
}
function lcP5(c,p){
 p=p||c.price;let aw=c.aw>0?c.aw:c.w0;if(!(p>0)||!(c.chicks>0))return null;
 let rev=c.live*aw*p,tot=c.inc+rev,net=tot-c.cost;
 return{aw:aw,p:p,rev:rev,tot:tot,net:net,per:c.alive>0?net/c.alive:0};
}
function lcRow(l,v){return '<div class="lc-row"><span>'+l+'</span><b>'+v+'</b></div>'}
function lcM(n){return "৳"+fe(n)}
function lcBody(){
 let k=window._lcK,c=lcCalc(),h="",W=en(c.w0src),
 inP='<label class="lc-in">বিক্রির দর (৳ প্রতি কেজি)<input id="lcPrice" type="number" min="0" step=".01" inputmode="decimal" placeholder="যেমন: 160" value="'+(c.price||"")+'" oninput="lcSet()"></label>',
 ex=t=>'<div class="lc-ex">'+t+'</div>',cur=c.harv+c.live*c.w0;
 if(k===1||k===6){
  let pb=perBirdCalc(),isF=k===6,cost=isF?pb.all:c.cost,tw=cur,pk=tw>0?cost/tw:0,boughtKg=sumOf(state.feed,r=>r.qty)*bagKg();
  h=ex(isF?"১ কেজি মুরগি তৈরিতে কত টাকা খরচ হয়েছে। ফিড ধরা হয়েছে <b>শুধু যত কেজি খাইয়েছেন</b> তত, সঙ্গে বাচ্চা ও অন্য সব খরচ।":"১ কেজি মুরগি তৈরিতে কত টাকা খরচ হয়েছে। ফিড ধরা হয়েছে <b>যত কিনেছেন সব</b>, সঙ্গে বাচ্চা ও অন্য সব খরচ।")+'<div id="lcRes">'+(pk>0?
   lcRow("বাচ্চা কেনা",lcM(pb.chickCost))+lcRow("ফিড বাদে অন্য সব খরচ",lcM(pb.other))+
   (isF?lcRow("ফিড: "+fe(pb.kg)+" কেজি খাইয়েছেন × ৳"+fe(pb.price,2),lcM(pb.feedCost)):lcRow("কেনা সব ফিড"+(boughtKg>0?" ("+fe(boughtKg)+" কেজি)":""),lcM(total("feed"))))+
   lcRow("মোট খরচ",lcM(cost))+
   lcRow("বিক্রি হয়েছে",fe(c.harv)+" কেজি")+lcRow("খামারে আছে ("+fe(c.live)+" টি × "+fe(c.w0,2)+" কেজি)",fe(c.live*c.w0)+" কেজি")+lcRow("মোট ওজন",fe(tw)+" কেজি")+
   '<div class="lc-big"><span>প্রতি কেজি মুরগিতে খরচ</span><b>৳'+fe(pk,2)+'</b></div>'+
   (c.price>0?'<div class="lc-big"><span>খরচ উঠতে মোট বিক্রি করতে হবে ('+(isF?'৳'+fe(pb.all):'৳'+fe(c.cost))+' ÷ ৳'+fe(c.price)+')</span><b>'+fe(cost/c.price)+' কেজি</b></div>'+
    '<div class="lc-v '+(tw>=cost/c.price?'ok':'no')+'">'+(tw>=cost/c.price?'✅ মোট ওজন ('+fe(tw)+' কেজি) যথেষ্ট, বাড়তি '+fe(tw-cost/c.price)+' কেজি':'⏳ আরও '+fe(cost/c.price-tw)+' কেজি ওজন লাগবে (এখন '+fe(tw)+' কেজি)')+'</div>'
   :'<div class="hint">মুরগির দর দিলে কত কেজি লাগবে দেখাবে — বিশ্লেষণ পাতায় দর লিখুন</div>')+
   (isF?'<div class="lc-n">ফিডের দর ৳'+fe(pb.price,2)+' প্রতি কেজি'+(pb.auto?" (কেনা ফিডের গড়)":"")+' — বিশ্লেষণ পাতার ফিড দর থেকে নেওয়া। ওজন ধরা হয়েছে: '+W+'</div>':'<div class="lc-n">ওজন ধরা হয়েছে: '+W+'</div>')
   :'<div class="hint">ওজনের তথ্য নেই — বিক্রি বা ওজন নমুনা দিন</div>')+'</div>';
 }else if(k===4){
  let tk=cur,be=tk>0?c.cost/tk:0;
  h=ex("মুরগির যত ওজন আছে সব এই দরে বিক্রি করলে ঠিক খরচ উঠবে — এর কম দরে বিক্রি করলে ক্ষতি, বেশি দরে বিক্রি করলে লাভ।")+'<div id="lcRes">'+(be>0?
   lcRow("এ পর্যন্ত মোট খরচ",lcM(c.cost))+lcRow("বিক্রি হয়েছে",fe(c.harv)+" কেজি")+
   lcRow("খামারে আছে ("+fe(c.live)+" টি × "+fe(c.w0,2)+" কেজি)",fe(c.live*c.w0)+" কেজি")+lcRow("মোট ওজন",fe(tk)+" কেজি")+
   '<div class="lc-big"><span>ন্যূনতম গড় দর (সব মুরগি)</span><b>৳'+fe(be,2)+' প্রতি কেজি</b></div>'+
   (c.price>0?'<div class="lc-v '+(c.price>=be?'ok':'no')+'">'+(c.price>=be?'✅ আপনার দর ৳'+fe(c.price)+' এর চেয়ে বেশি, লাভ থাকবে':'⚠️ আপনার দর ৳'+fe(c.price)+' এর চেয়ে কম, ক্ষতি হবে')+'</div>':'')+
   '<div class="lc-n">খামারের গড় ওজন ধরা হয়েছে — '+W+'</div>'
   :'<div class="hint">ওজনের তথ্য নেই — বিক্রি বা ওজন নমুনা দিন</div>')+'</div>';
 }else if(k===5){
  let aw=c.aw>0?c.aw:c.w0,r=lcP5(c);
  h=ex("খামারের অবশিষ্ট মুরগি এই দরে বিক্রি করলে সব মিলিয়ে কত লাভ বা ক্ষতি হবে।")+inP+'<label class="lc-in">খামারের মুরগির গড় ওজন (কেজি)<input id="lcAw" type="number" min="0" step=".01" inputmode="decimal" value="'+(Math.round(aw*100)/100)+'" oninput="lcSet()"></label><div id="lcRes">'+(r?
   lcRow("এ পর্যন্ত বিক্রি থেকে পেয়েছেন",lcM(c.inc))+lcRow("অবশিষ্ট "+fe(c.live)+" টি বিক্রি করলে পাবেন",lcM(r.rev))+lcRow("মোট আয় হবে",lcM(r.tot))+lcRow("মোট খরচ",lcM(c.cost))+
   '<div class="lc-big'+(r.net>=0?'':' bad')+'"><span>'+(r.net>=0?'মোট লাভ':'মোট ক্ষতি')+'</span><b>৳'+fe(Math.abs(r.net))+'</b></div>'+
   lcRow("প্রতি মুরগিতে (বিক্রি সহ মোট "+fe(c.alive)+" টি)",(r.per>=0?"লাভ ৳":"ক্ষতি ৳")+fe(Math.abs(r.per),2))
   :'<div class="hint">উপরে বিক্রির দর লিখুন</div>')+'</div>';
 }else if(k===7||k===8){
  let pb=perBirdCalc(),cp=k===7?(pb.alive>0?pb.all/pb.alive:null):(c.alive>0?c.cost/c.alive:null),
   lbl=k===7?"খাওয়ানো ফিডে খরচ":"সব ফিড + সব খরচ",need=(c.price>0&&cp>0)?cp/c.price:0,d=c.w0-need;
  h=ex("উপরের “"+lbl+"” (প্রতি মুরগি)-কে বিক্রির দর দিয়ে ভাগ করলে বোঝা যায় প্রতিটা মুরগি কত কেজি হলে খরচ উঠে আসবে। ফিড ধরা হয়েছে <b>"+(k===7?"শুধু যত খাইয়েছেন":"যত কিনেছেন")+"</b> তত।")+inP+'<div id="lcRes">'+
   (need>0?
   lcRow("প্রতি মুরগি — "+lbl,"৳"+fe(cp,2))+lcRow("বিক্রির দর","৳"+fe(c.price,2)+" প্রতি কেজি")+
   '<div class="lc-big'+(d>=0?'':' bad')+'"><span>প্রতি মুরগি এত কেজি হতে হবে</span><b>'+fe(need,2)+' কেজি</b></div>'+
   lcRow("এখন গড় ওজন",fe(c.w0,2)+" কেজি")+
   '<div class="lc-v '+(d>=0?'ok':'no')+'">'+(d>=0?'✅ গড় ওজন পৌঁছে গেছে, বাড়তি '+fe(d,2)+' কেজি':'⏳ প্রতি মুরগি আরও '+fe(-d,2)+' কেজি বাড়তে হবে')+'</div>'+
   '<div class="lc-n">ভাগ: ৳'+fe(cp,2)+' ÷ ৳'+fe(c.price,2)+' = '+fe(need,2)+' কেজি। দর বদলালে সাথে সাথে বদলে যায়।</div>'
   :'<div class="hint">'+(c.price>0?'আগে বাচ্চার তথ্য দিন':'উপরে বিক্রির দর লিখুন')+'</div>')+'</div>';
 }else h='';
 return h;
}
window.openLc=function(k){
 window._lcK=k;let m=$a("lcModal");if(!m)return;
 $a("lcTitle").textContent=({1:"🎯 প্রতি কেজিতে খরচ — কেনা সব ফিড + সব খরচ",6:"🌾 প্রতি কেজিতে খরচ — খাওয়ানো ফিড + সব খরচ",4:"🏷️ ন্যূনতম গড় দর (সব মুরগি)",5:"📊 এই দরে বিক্রি করলে লাভ/ক্ষতি",7:"🐔 প্রতি মুরগি কত কেজি লাগবে — খাওয়ানো ফিডে খরচ",8:"🐔 প্রতি মুরগি কত কেজি লাগবে — সব ফিড + সব খরচ"})[k];
 $a("lcBody").innerHTML=lcBody();m.classList.add("show");
};
window.closeLc=function(){let m=$a("lcModal");if(m)m.classList.remove("show");try{render()}catch(e){console.error(e)}};
window.lcSet=function(){
 let p=$a("lcPrice"),w=$a("lcAw");
 if(p)state.projRate=+p.value>0?+p.value:0;
 if(w)state.liveAvgWt=+w.value>0?+w.value:0;
 {let f=$a("lcFp");if(f){state.feedKgPrice=+f.value>0?+f.value:0;state.projFeedRate=state.feedKgPrice}}
 save();let r=$a("lcRes"),keep=document.activeElement&&document.activeElement.id;
 if(window._lcK===2){let c=lcCalc(),aw=c.aw>0?c.aw:c.w0,e=$a("lcR2");if(e)e.textContent=fb(c.alive*aw,0)+" কেজি"}
 else if(r){let t=document.createElement("div");t.innerHTML=lcBody();let n=t.querySelector("#lcRes");if(n)r.innerHTML=n.innerHTML}
 renderLcTiles();try{renderAnalysis()}catch(e){console.error(e)}
};

// ── অতিরিক্ত গোল গ্রাফ ──
function gaugeSvg(pct,col,big,small,bandsGood){
 const R=42,cx=50,cy=54,L=Math.PI*R,p=Math.max(0,Math.min(1,pct||0)),id="gg"+(++_gid);
 const pt=(f,r)=>{let a=Math.PI*(1-f);return[(cx+r*Math.cos(a)).toFixed(1),(cy-r*Math.sin(a)).toFixed(1)]};
 let n=pt(p,34),b0=pt(0,R),b1=pt(1,R);
 return '<svg viewBox="0 0 100 86" class="rg-svg rg-gauge"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3ddc84"/><stop offset=".55" stop-color="#fbbf24"/><stop offset="1" stop-color="#ff5d5d"/></linearGradient></defs><path d="M'+b0.join(",")+' A'+R+','+R+' 0 0 1 '+b1.join(",")+'" fill="none" stroke="#ffffff12" stroke-width="9" stroke-linecap="round"/><path d="M'+b0.join(",")+' A'+R+','+R+' 0 0 1 '+b1.join(",")+'" fill="none" stroke="url(#'+id+')" stroke-width="9" stroke-linecap="round" opacity=".95"/><line x1="'+cx+'" y1="'+cy+'" x2="'+n[0]+'" y2="'+n[1]+'" stroke="#fff" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 3px #fff8)"/><circle cx="'+cx+'" cy="'+cy+'" r="4.5" fill="#fff"/><text x="50" y="'+(cy+19)+'" text-anchor="middle" class="rg-big" style="fill:'+col+';font-size:14px">'+big+'</text>'+(small?'<text x="50" y="'+(cy+27)+'" text-anchor="middle" class="rg-sm" style="font-size:6.5px">'+small+'</text>':'')+'</svg>';
}
function multiRing(rs){
 let o='<svg viewBox="0 0 100 100" class="rg-svg" style="width:128px;height:128px">';
 rs.forEach((r,i)=>{let R=44-i*11,C=2*Math.PI*R,p=Math.max(0,Math.min(1,r.p));o+='<circle cx="50" cy="50" r="'+R+'" fill="none" stroke="'+r.c+'" stroke-opacity=".15" stroke-width="8"/><circle cx="50" cy="50" r="'+R+'" fill="none" stroke="'+r.c+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+(C*p).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 50 50)" class="rg-arc" style="--c:'+C.toFixed(1)+';filter:drop-shadow(0 0 3px '+r.c+'99)"/>'});
 return o+'</svg>';
}
function sparkSvg(vals,col){
 const W=120,H=34,n=vals.length,mx=Math.max.apply(null,vals.concat([1])),bw=9,gap=(W-n*bw)/(n-1);
 let o='<svg viewBox="0 0 '+W+' '+H+'" class="sp-svg">';
 vals.forEach((v,i)=>{let h=Math.max(v>0?3:1.5,(H-6)*v/mx),x=i*(bw+gap);o+='<rect x="'+x.toFixed(1)+'" y="'+(H-2-h).toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" rx="4.5" fill="'+col+'" opacity="'+(v>0?(i===n-1?1:.75):.25)+'" class="bar-r" style="animation-delay:'+(i*60)+'ms"/>'});
 return o+'</svg>';
}
function renderDashExtra(){
 let el=$a("dbGraphs");if(!el)return "";
 let chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0),mr=chicks?dead/chicks*100:0,f=fcrStats(),tf=+state.targetFCR||1.6;
 let cost=chicks*(+state.chickPrice||0)+total("feed")+total("medicine")+workersTotal()+total("other")+total("litter")+total("power")+rentTotal(),inc=salesTotal()+otherSalesGrand();
 let born=Math.max(0,chicks-dead),sold=soldPcs();
 let h='';
 // ১. মিটার (স্পিডোমিটার)
 let lim=+state.goalMort>0?+state.goalMort:5;
 h+='<div class="rg-grid" style="margin-top:12px">'+
  '<div class="rg-card"><div class="rg-t">🎯 FCR মিটার</div>'+gaugeSvg(f&&f.fcr>0?(f.fcr-1)/(2.4-1):0,f&&f.fcr>0&&f.fcr<=tf?"#3ddc84":"#fbbf24",f&&f.fcr>0?fb(f.fcr,2):"—","লক্ষ্য "+fb(tf,2))+'<div class="rg-n">১ থেকে ২.৪ এর মধ্যে</div></div>'+
  '<div class="rg-card"><div class="rg-t">☠️ মৃত্যু মিটার</div>'+gaugeSvg(Math.min(1,mr/(lim*2)),mr>lim?"#ff7070":"#3ddc84",fb(mr,1)+"%","সীমা "+fb(lim,0)+"%")+'<div class="rg-n">কাঁটা ডানে = বিপদ</div></div></div>';
 // ২. তিন রিং
 let rec=cost>0?inc/cost:0,surv=chicks?born/chicks:1,sp=born>0?sold/born:0;
 h+='<div class="rg-wide" style="margin-top:12px">'+multiRing([{p:surv,c:"#3ddc84"},{p:Math.min(1,rec),c:"#fbbf24"},{p:sp,c:"#38bdf8"}])+'<div style="flex:1"><b>🎖️ তিন রিং</b><div class="rg-leg"><i style="background:#3ddc84"></i><span>বেঁচে আছে</span><b>'+fb(surv*100,0)+'%</b></div><div class="rg-leg"><i style="background:#fbbf24"></i><span>খরচ উঠেছে</span><b>'+fb(rec*100,0)+'%</b></div><div class="rg-leg"><i style="background:#38bdf8"></i><span>বিক্রি হয়েছে</span><b>'+fb(sp*100,0)+'%</b></div></div></div>';
 // ৩ ও ৪. ওজন ও ফিড মজুত
 let tw=+state.goalWt>0?+state.goalWt:2000,cw=state.startDate?anW0().w*1000:0,fi=feedInfo(),stP=fi.bought>0?Math.max(0,fi.stock)/fi.bought:0;
 h+='<div class="rg-grid" style="margin-top:12px">'+
  '<div class="rg-card"><div class="rg-t">⚖️ গড় ওজন</div>'+ringSvg(cw/tw,"#a78bfa",fb(cw,0),"গ্রাম")+'<div class="rg-n">লক্ষ্য '+fb(tw,0)+' গ্রাম</div></div>'+
  '<div class="rg-card"><div class="rg-t">🌾 ফিডে এখন আছে</div>'+ringSvg(stP,stP<.15?"#ff7070":"#3ddc84",fb(Math.max(0,fi.stock),0),"কেজি")+'<div class="rg-n">'+(fi.left!==null&&fi.left!==undefined?"আরও প্রায় "+bn(Math.floor(fi.left))+" দিন চলবে":"খাবারের হিসাব দিন")+'</div></div></div>';
 // ৫. ক্রেতা ডোনাট
 let by={};(state.sales||[]).forEach(r=>{let k=(r.customer||"").trim()||"নাম নেই";by[k]=(by[k]||0)+(+r.weight||0)*(+r.rate||0)});
 Object.keys(state.otherSales||{}).forEach(t=>(state.otherSales[t]||[]).forEach(r=>{let k=(r.buyer||"").trim()||"নাম নেই";by[k]=(by[k]||0)+(+r.qty||0)*(+r.rate||0)}));
 let names=Object.keys(by).filter(k=>by[k]>0).sort((a,b)=>by[b]-by[a]),tot=names.reduce((a,k)=>a+by[k],0);
 if(tot>0){
  const cols=["#3ddc84","#38bdf8","#fbbf24","#fb7185","#a78bfa"],R=40,C=2*Math.PI*R;let top=names.slice(0,4),rest=names.slice(4).reduce((a,k)=>a+by[k],0),items=top.map(k=>[k,by[k]]);if(rest>0)items.push(["অন্যান্য",rest]);
  let off=0,arcs="",leg="";items.forEach((x,i)=>{let len=C*x[1]/tot;arcs+='<circle cx="50" cy="50" r="'+R+'" fill="none" stroke="'+cols[i]+'" stroke-width="14" stroke-dasharray="'+Math.max(0,len-1.2).toFixed(1)+' '+C.toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 50 50)"/>';off+=len;leg+='<div class="rg-leg"><i style="background:'+cols[i]+'"></i><span>'+esc(x[0])+'</span><b>'+fb(x[1]/tot*100,0)+'%</b></div>'});
  h+='<div class="rg-wide rg-pie" style="margin-top:12px"><svg viewBox="0 0 100 100" class="rg-svg"><circle cx="50" cy="50" r="'+R+'" fill="none" stroke="#ffffff10" stroke-width="14"/>'+arcs+'<text x="50" y="48" text-anchor="middle" class="rg-sm">মোট আয়</text><text x="50" y="61" text-anchor="middle" class="rg-big" style="fill:#3ddc84;font-size:11px">৳'+fb(tot,0)+'</text></svg><div style="flex:1"><b>👥 কার কাছ থেকে আয়</b>'+leg+'</div></div>';
 }
 // ৭. গত ৭ দিন
 let ds=dayList(7),ix={};ds.forEach((d,i)=>ix[d]=i);let fv=ds.map(()=>0),dv=ds.map(()=>0),cv=ds.map(()=>0);
 (state.dailyFeed||[]).forEach(r=>{if(r.date in ix)fv[ix[r.date]]+=dfKg(r)});(state.deaths||[]).forEach(r=>{if(r.date in ix)dv[ix[r.date]]+=+r.qty||0});
 ["feed","medicine","other","litter","power"].forEach(k=>(state[k]||[]).forEach(r=>{if(r.date in ix)cv[ix[r.date]]+=(+r.qty||0)*(+r.rate||0)}));
 const sm=a=>a.reduce((x,y)=>x+y,0);
 h+='<div class="rg-wide" style="margin-top:12px;display:block"><b>📆 গত ৭ দিন</b>'+
  [["🍽️ খাবার",fv,"#3ddc84",v=>fb(v,0)+" কেজি"],["☠️ মৃত্যু",dv,"#ff7070",v=>bn(v)+" টি"],["🧾 খরচ",cv,"#fbbf24",v=>"৳"+fb(v,0)]].map(r=>'<div class="sp-row"><span>'+r[0]+'</span>'+sparkSvg(r[1],r[2])+'<b style="color:'+r[2]+'">'+r[3](sm(r[1]))+'</b></div>').join("")+'</div>';
 return h;
}
function renderAnalysis(){
 if(!$a("anStock"))return;
 try{renderProfit();renderGoals();renderFeedCmp();renderMort();renderFcrProj()}catch(e){console.error(e)}
 try{renderAnTop();renderAnCmp();anFoldApply()}catch(e){console.error(e)}
 let b=$a("anBagKg");if(b&&document.activeElement!==b)b.value=bagKg();
 let fk=$a("anFeedKg");if(fk&&document.activeElement!==fk)fk.value=+state.feedKgPrice||"";
 let d=$a("anWDate");if(d&&!d.value)d.value=todayISO();
 renderStock();renderWeights();renderProj();
 try{if(typeof window.renderAnExtra==="function")window.renderAnExtra()}catch(e){console.error(e)}
}

// ── ৪. ড্যাশবোর্ডের ১৫ দিনের গ্রাফ ──
function dayList(n){let a=[];for(let i=n-1;i>=0;i--){let d=new Date();d.setDate(d.getDate()-i);a.push(d.toLocaleDateString("en-CA"))}return a}
function barSvg(vals,days,fmtv,color,unit){
 const BW=22,gap=4,H=96,B=16,T=4,n=vals.length,W=Math.max(300,n*(BW+gap));
 let max=Math.max.apply(null,vals);
 if(!(max>0))return '<div class="an-note">এই ব্যাচে এখনও কোনো এন্ট্রি নেই।</div>';
 let o='<div class="dzc-scroll"><svg class="dzc-svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img">';
 let gi="bg"+(++_gid);o+='<defs><linearGradient id="'+gi+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+color+'" stop-opacity=".95"/><stop offset="1" style="stop-color:'+color+'" stop-opacity=".25"/></linearGradient><linearGradient id="'+gi+'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--dz3)"/><stop offset="1" style="stop-color:var(--dz3)" stop-opacity=".3"/></linearGradient></defs><line x1="0" x2="'+W+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="#ffffff22"/>';
 let mo="";
 vals.forEach((v,i)=>{
  let h=Math.max(0,(H-B-T)*v/max),x=i*(BW+gap),a=days[i].split("-"),last=i===n-1;
  if(v>0){
   o+='<rect x="'+x+'" y="'+(H-B-h)+'" width="'+BW+'" height="'+h+'" rx="5" class="bar-r" style="fill:url(#'+gi+(last?'l':'')+');stroke:none"><title>'+a[2]+'/'+a[1]+': '+fmtv(v)+'</title></rect>';
   o+='<text class="dzc-val" transform="translate('+(x+BW/2+3.2)+','+(H-B-3)+') rotate(-90)">'+unit(v)+'</text>';
  }
  o+='<text x="'+(x+BW/2)+'" y="'+(H-4)+'" text-anchor="middle"'+(last?' style="fill:#86e3cc;font-weight:700"':'')+'>'+bn(+a[2])+'</text>';
 });
 return o+'</svg></div>';
}
function renderCharts(){
 let el=$a("dzCharts");if(!el)return;
 if(!state.startDate){el.innerHTML="";return}
 let all=dayList(70),si=all.indexOf(state.startDate),ds=si>=0?all.slice(si):all.slice(-60),idx={};ds.forEach((d,i)=>idx[d]=i);
 let feed=ds.map(()=>0),dead=ds.map(()=>0),cost=ds.map(()=>0);
 (state.dailyFeed||[]).forEach(r=>{if(r.date in idx)feed[idx[r.date]]+=dfKg(r)});
 (state.deaths||[]).forEach(r=>{if(r.date in idx)dead[idx[r.date]]+=+r.qty||0});
 ["feed","medicine","other","litter","power"].forEach(k=>(state[k]||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=(+r.qty||0)*(+r.rate||0)}));
 if(wageOn(state))ds.forEach((d,i)=>{cost[i]+=wageOnDay(state,d)});else (state.workers||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amount||0});
 (state.rent||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amt||0});
 const f1=v=>{let r=Math.round(v*10)/10;return bn(r)};
 el.innerHTML='<div class="form dzc-box"><div class="an-title" style="margin-bottom:2px">📉 পুরো ব্যাচের হিসাব <span class="dzc-sub">(নিচের সংখ্যা = তারিখ)</span></div>'+
  '<div class="dzc-grp"><div class="dzc-t">🍽️ দৈনিক খাবার <span>কেজি • মোট '+fb(sumOf(feed,x=>x),1)+'</span></div>'+barSvg(feed,ds,v=>fb(v,1)+" কেজি","var(--dz2)",f1)+'</div>'+
  '<div class="dzc-grp"><div class="dzc-t">☠️ দৈনিক মৃত্যু <span>টি • মোট '+bn(sumOf(dead,x=>x))+'</span></div>'+barSvg(dead,ds,v=>bn(v)+" টি","#e0775a",v=>bn(v))+'</div>'+
  '<div class="dzc-grp"><div class="dzc-t">🧾 দৈনিক খরচ <span>যেদিন যত, বাচ্চা কেনা বাদে</span></div>'+barSvg(cost,ds,v=>"৳"+fb(v,0),"var(--dzt)",v=>"৳"+fb(v,0))+'</div></div>';
 el.querySelectorAll(".dzc-scroll").forEach(d=>d.scrollLeft=d.scrollWidth);
}

// ── ৬. ক্রেতার কল ও WhatsApp ──
const intl=p=>{let d=String(p||"").replace(/\D/g,"");if(!d)return"";if(d.startsWith("880"))return d;if(d.startsWith("0"))return "88"+d;return "880"+d};
window.custSavePhone=function(k,v){let n=decodeURIComponent(k);state.custPhones=state.custPhones||{};if(v.trim())state.custPhones[n]=v.trim();else delete state.custPhones[n];save();renderCustomers()};
window.custTools=function(n,due){
 let ph=(state.custPhones||{})[n]||"",k=encodeURIComponent(n),p=intl(ph);
 let msg=due>0?"আসসালামু আলাইকুম "+n+", ব্রাদার্স পোল্ট্রি ফার্মের পক্ষ থেকে জানাচ্ছি, আপনার ৳"+fb(due,0)+" বাকি আছে। সুবিধামতো পরিশোধ করার অনুরোধ রইল। ধন্যবাদ।":"আসসালামু আলাইকুম "+n+", ব্রাদার্স পোল্ট্রি ফার্মের সাথে থাকার জন্য ধন্যবাদ।";
 return '<div class="cust-tools"><input type="tel" inputmode="tel" placeholder="ফোন নম্বর (০১XXXXXXXXX)" value="'+esc(ph)+'" onchange="custSavePhone(\''+k+'\',this.value)">'+
  (p?'<a class="cust-call" href="tel:+'+p+'">📞 কল</a><a class="cust-wa" target="_blank" rel="noopener" href="https://wa.me/'+p+'?text='+encodeURIComponent(msg)+'">💬 WhatsApp</a>':"")+'</div>';
};

window.intakeAt=intakeAt;window.stdAt=stdAt;window.liveOn=liveOn;
{const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{renderAnalysis();renderCharts();renderDashRings();renderDashPerBird()}catch(e){console.error(e)}return r}}
})();

// ══════ ব্যাচ তুলনা, ব্যাকআপ রিমাইন্ডার, ঘরের অবস্থা ══════
(function(){
const bn=n=>Number(n).toLocaleString("bn-BD");
const fb=(n,d)=>Number(n).toLocaleString("bn-BD",{maximumFractionDigits:d===undefined?2:d});
const tk=n=>(n<0?"−":"")+"৳"+fb(Math.abs(n),0);
const $b=id=>document.getElementById(id);
const S=(a,f)=>(a||[]).reduce((s,r)=>s+(+f(r)||0),0);

// ── ব্যাচ তুলনা ──
function bc(b){
 let os=b.otherSales||{},sm=batchSummary(b);
 let chicks=sm.chicks,dead=sm.dead;
 let outQ=S(b.sales,r=>r.qty)+S(os.chicken,r=>r.pcs)+S(b.gifts,r=>r.qty);
 let harv=S(b.sales,r=>r.weight)+S(os.chicken,r=>r.qty)+S(b.gifts,r=>r.weight);
 let live=Math.max(0,chicks-dead-outQ),closed=b.status==="closed";
 let feedKg=S(b.dailyFeed,dfKg),tw=harv+(closed?0:live*(+b.liveAvgWt||0));
 let end=closed&&b.closedAt?b.closedAt:(b.lockedEnd||todayISO()),dur=null;
 if(b.startDate){dur=Math.max(0,Math.round((new Date(end+"T00:00:00")-new Date(b.startDate+"T00:00:00"))/86400000))}
 let alive=chicks-dead;
 return{b:b,closed:closed,chicks:chicks,dead:dead,dur:dur,
  mort:chicks?dead/chicks*100:null,
  fcr:(feedKg>0&&tw>0)?feedKg/tw:null,
  avgW:outQ>0?harv/outQ:null,
  feedKg:feedKg,cost:sm.cost,sales:sm.sales,profit:sm.profit,
  ppb:alive>0?sm.profit/alive:null,
  cpk:harv>0?sm.cost/harv:null};
}
const BC_ROWS=[
 ["🐣 বাচ্চা",m=>m.chicks?bn(m.chicks)+" টি":"—",null,null],
 ["⏱️ সময়কাল",m=>m.dur===null?"—":bn(m.dur)+" দিন","dur",null],
 ["☠️ মৃত্যুর হার",m=>m.mort===null?"—":fb(m.mort,1)+"%","mort","low"],
 ["🎯 FCR",m=>m.fcr===null?"—":fb(m.fcr,2),"fcr","low"],
 ["📏 গড় ওজন (বিক্রি)",m=>m.avgW===null?"—":fb(m.avgW,2)+" কেজি","avgW","high"],
 ["🌾 মোট ফিড",m=>m.feedKg?fb(m.feedKg,0)+" কেজি":"—",null,null],
 ["💸 মোট খরচ",m=>tk(m.cost),null,null],
 ["💰 মোট আয়",m=>tk(m.sales),null,null],
 ["📊 নিট লাভ",m=>tk(m.profit),"profit","high"],
 ["🐔 প্রতি মুরগি লাভ",m=>m.ppb===null?"—":tk(m.ppb),"ppb","high"],
 ["⚖️ কেজি প্রতি খরচ",m=>m.cpk===null?"—":tk(m.cpk),"cpk","low"]
];
function renderBatchCmp(){
 let h=$b("bcHost");if(!h)return;
 let bs=(store.batches||[]).slice(-8).map(bc);
 if(!bs.length){h.innerHTML='<div class="hint">কোনো ব্যাচ নেই।</div>';return}
 let maxAbs=Math.max.apply(null,bs.map(m=>Math.abs(m.profit)).concat([1]));
 let bars=bs.map(m=>{let w=Math.abs(m.profit)/maxAbs*50;return '<div class="bc-bar"><span>'+esc(m.b.name)+'</span><div class="bc-track"><i style="left:'+(m.profit>=0?50:50-w)+'%;width:'+w+'%;background:'+(m.profit>=0?"#2f9e82":"#e0775a")+'"></i><i style="left:50%;width:1px;background:#ffffff40;height:100%"></i></div><b>'+tk(m.profit)+'</b></div>'}).join("");
 let head='<tr><th></th>'+bs.map(m=>'<th><span class="bn">'+esc(m.b.name)+'</span><span class="bs">'+(m.closed?"সম্পন্ন":"চলমান")+'</span></th>').join("")+'</tr>';
 let body=BC_ROWS.map(r=>{
  let vals=bs.map(m=>r[2]?m[r[2]]:null);
  let ok=vals.filter(v=>v!==null&&isFinite(v));
  let best=null,worst=null;
  if(r[3]&&ok.length>=2){best=r[3]==="low"?Math.min.apply(null,ok):Math.max.apply(null,ok);worst=r[3]==="low"?Math.max.apply(null,ok):Math.min.apply(null,ok);if(best===worst){best=null;worst=null}}
  return '<tr><td>'+r[0]+'</td>'+bs.map((m,i)=>{let v=vals[i],c="";if(v!==null&&isFinite(v)){if(v===best)c="best";else if(v===worst)c="worst"}return '<td class="'+c+'">'+r[1](m)+'</td>'}).join("")+'</tr>';
 }).join("");
 let ms=bs.filter(m=>m.ppb!==null),top=ms.length>=2?ms.reduce((a,b)=>b.ppb>a.ppb?b:a):null;
 let msg=bs.length<2?"তুলনার জন্য কমপক্ষে ২টি ব্যাচ লাগবে। এখন শুধু এই ব্যাচের সারাংশ দেখাচ্ছে। নতুন ব্যাচ শুরু করলে পাশাপাশি তুলনা আসবে।":(top?"প্রতি মুরগি সবচেয়ে বেশি লাভ: "+esc(top.b.name)+" ("+tk(top.ppb)+")।":"");
 h.innerHTML='<div class="form an-box"><div class="an-title">📊 নিট লাভ (ব্যাচ অনুযায়ী)</div><div class="bc-bars">'+bars+'</div>'+(msg?'<div class="an-alert info" style="margin-top:8px">'+msg+'</div>':"")+'</div>'+
  '<div class="form an-box"><div class="an-title">বিস্তারিত তুলনা</div><div class="bc-wrap"><table class="bc-tbl"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+
  '<div class="an-note">সবুজ ঘর সেরা, লালচে লেখা সবচেয়ে খারাপ। চলমান ব্যাচের লাভ, FCR ও গড় ওজন এখনো শেষ হয়নি, তাই সম্পন্ন ব্যাচের সাথে সরাসরি মেলানো যায় না। FCR-এর জন্য দৈনিক খাবারের হিসাব থাকতে হবে।</div></div>';
}

// ── ব্যাকআপ রিমাইন্ডার ──
function hasData(){return (store.batches||[]).some(b=>(b.feed||[]).length||(b.sales||[]).length||(b.dailyFeed||[]).length||(b.deaths||[]).length||(b.medicine||[]).length||(b.workers||[]).length)}
function renderBackup(){
 let el=$b("dzBackup");if(!el)return;
 let last=+store.lastBackup||0,now=Date.now(),snooze=+store.backupSnooze||0;
 let ds=last?Math.floor((now-last)/86400000):null;
 if(!hasData()||now<snooze||(last&&ds<7)){el.innerHTML="";return}
 el.innerHTML='<div class="bk-card"><b>💾 ব্যাকআপ নেওয়ার সময়</b><p>'+(last?"শেষ ব্যাকআপ "+bn(ds)+" দিন আগে।":"এখনও ব্যাকআপ নেওয়া হয়নি।")+' ফোন হারালে বা অ্যাপ মুছলে সব হিসাব চলে যাবে। ব্যাকআপ ফাইলটা WhatsApp বা Drive-এ রেখে দিন।</p><div class="bk-btns"><button class="bk-go" type="button" onclick="backupData()">💾 ব্যাকআপ নিন</button><button class="bk-sh" type="button" onclick="backupShare()">📤 শেয়ার করুন</button><button class="bk-later" type="button" onclick="backupLater()">পরে</button></div></div>';
}
{const _b=window.backupData;window.backupData=function(){let r=_b.apply(this,arguments);store.lastBackup=Date.now();delete store.backupSnooze;save();renderBackup();return r}}
window.backupLater=function(){store.backupSnooze=Date.now()+86400000;save();renderBackup()};
window.backupShare=async function(){
 try{
  let d=todayISO(),f=new File([JSON.stringify(store,null,2)],"poultry-backup-"+d+".json",{type:"application/json"});
  if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"ব্রাদার্স পোল্ট্রি ফার্ম ব্যাকআপ"});store.lastBackup=Date.now();delete store.backupSnooze;save();renderBackup();showToast("✅ ব্যাকআপ শেয়ার হয়েছে");return}
 }catch(e){if(e&&e.name==="AbortError")return}
 backupData();
};

{const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{renderBatchCmp();renderBackup()}catch(e){console.error(e)}return r}}
})();
// ══════ 🩺 খামার ডাক্তার (নিয়মভিত্তিক আগাম সতর্কতা — রোগ নির্ণয় নয়) ══════
(function(){
const bn=n=>Number(n).toLocaleString("bn-BD");
const fb=(n,d)=>Number(n).toLocaleString("bn-BD",{maximumFractionDigits:d===undefined?1:d});
const dstr=off=>{const d=new Date();d.setDate(d.getDate()-off);const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())};
const ageOf=(b,ds)=>{if(!b.startDate)return null;const a=new Date(b.startDate+"T00:00:00"),c=new Date(ds+"T00:00:00");return Math.round((c-a)/86400000)};
function deathsUpTo(b,age){return (b.deaths||[]).reduce((s,r)=>{const a=ageOf(b,r.date);return s+(a!==null&&a<=age?(+r.qty||0):0)},0)}
// বয়স অনুযায়ী সম্ভাব্য কারণ ও করণীয় (সাধারণ নির্দেশনা, ডাক্তারের বিকল্প নয়)
function hint(age){
 if(age<=7)return{why:"ব্রুডিং/তাপমাত্রার সমস্যা, বাচ্চার মান, নাভি পচা (ওম্ফালাইটিস) বা পানির অভাব হতে পারে।",do:"ঘরের তাপমাত্রা ও পানি-খাবারের জায়গা দেখুন, বাচ্চা গুছিয়ে আছে না ছড়িয়ে আছে দেখুন।"};
 if(age<=21)return{why:"সিআরডি/ই-কোলাই, গামবোরো বা কক্সিডিওসিস (রক্তমাখা পায়খানা) হতে পারে।",do:"শ্বাসের শব্দ, পায়খানার রং, ঘরের ধুলো-গন্ধ ও লিটারের ভেজা ভাব দেখুন। ২–৩টা মরা মুরগি ডাক্তারকে দেখান।"};
 return{why:"ই-কোলাই/সিআরডি, কক্সিডিওসিস, গরমে হিটস্ট্রোক, বা অ্যাসাইটিস/হঠাৎ মৃত্যু (দ্রুত বাড়ার কারণে) হতে পারে।",do:"শ্বাসকষ্ট, পাখা ঝোলা, পেট ফোলা ও ঘরের গরম-বাতাস দেখুন। মরা মুরগির পোস্টমর্টেম করান।"};
}
function analyze(){
 const f=[]; // {lv:2 লাল|1 হলুদ|0 তথ্য|-1 ভালো, t, d, a}
 const age=days(),chicks=+state.chicks||0;
 if(!state.startDate||chicks<=0||state.status==="closed"||age<1||age>42)return null;
 const live=liveOn(dstr(0))||chicks;
 const h=hint(age);
 // দৈনিক মৃত্যু (শেষ ১০ দিন)
 const dm=[];for(let o=9;o>=0;o--)dm.push({ds:dstr(o),q:0});
 (state.deaths||[]).forEach(r=>{const x=dm.find(y=>y.ds===r.date);if(x)x.q+=(+r.qty||0)});
 const t0=dm[9].q,t1=dm[8].q,prev=dm.slice(0,7);
 const pavg=prev.reduce((s,x)=>s+x.q,0)/prev.length;
 let mortBad=false;
 const rate0=live>0?t0/live*100:0;
 if(t0>=3&&(rate0>=1||t0>=Math.max(3,pavg*2.5))){
  const lv=(rate0>=1||t0>=8)?2:1;mortBad=true;
  f.push({lv:lv,t:"আজ মৃত্যু বেশি: "+bn(t0)+" টি ("+fb(rate0,2)+"%)",d:"আগের কয়েক দিনের গড় ছিল "+fb(pavg,1)+" টি। "+h.why,a:h.do});
 }else if(t0>0&&t1>0&&t0>t1&&dm[7].q>0&&t1>dm[7].q&&t0>=2){
  mortBad=true;
  f.push({lv:1,t:"টানা ৩ দিন মৃত্যু বাড়ছে ("+bn(dm[7].q)+" → "+bn(t1)+" → "+bn(t0)+")",d:h.why,a:h.do});
 }
 // মোট মৃত্যুহার
 const totDead=deathsUpTo(state,age),cum=totDead/chicks*100;
 if(age<=7&&cum>1){f.push({lv:cum>2?2:1,t:"প্রথম সপ্তাহে মৃত্যু "+fb(cum,1)+"% (স্বাভাবিক ১% এর নিচে)",d:"বাচ্চার মান বা ব্রুডিং-এর সমস্যা হতে পারে।",a:"ঘরের তাপমাত্রা, পানি ও প্রথম ৩ দিনের খাবার/ট্রেতে খাবার আছে কি না দেখুন।"})}
 else if(age>7&&cum>(age<=21?3:5)){f.push({lv:cum>(age<=21?5:7)?2:1,t:"এখন পর্যন্ত মোট মৃত্যু "+fb(cum,1)+"%",d:"এই বয়সে এটা স্বাভাবিকের চেয়ে বেশি।",a:"কারণ খুঁজতে মরা মুরগির পোস্টমর্টেম করান।"})}
 // আগের ব্যাচের সঙ্গে তুলনা
 const olds=(store.batches||[]).filter(b=>b.id!==state.id&&b.startDate&&(+b.chicks||0)>0&&(b.deaths||[]).length);
 if(olds.length){
  const avg=olds.reduce((s,b)=>s+deathsUpTo(b,age)/b.chicks*100,0)/olds.length;
  if(cum>avg*1.5&&cum-avg>=0.5)f.push({lv:0,t:"আগের ব্যাচের তুলনায় মৃত্যু বেশি",d:"এই বয়সে আগের ব্যাচগুলোতে গড়ে "+fb(avg,1)+"% ছিল, এবার "+fb(cum,1)+"%।",a:""});
 }
 // ভ্যাকসিনের পর স্বাভাবিক ধাক্কা?
 let vacRecent=false;
 (typeof VAC!=="undefined"?VAC:[]).forEach(v=>{const r=(state.vaccines||{})[v.k];if(r&&r.date){const a=ageOf(state,r.date);if(a!==null&&age-a>=0&&age-a<=2)vacRecent=true}});
 // খাবার (শেষ ২ দিনের মধ্যে যে দিনের এন্ট্রি আছে)
 const fd={};(state.dailyFeed||[]).forEach(r=>{fd[r.date]=(fd[r.date]||0)+dfKg(r)});
 let fday=null;for(let o=0;o<=1;o++){if(fd[dstr(o)]>0){fday=dstr(o);break}}
 let feedLow=false;
 if(fday){
  const a=ageOf(state,fday),l=liveOn(fday)||live,g=fd[fday]*1000/l,std=intakeAt(a),ratio=g/std;
  // আগের ২ দিনের গড়ের সঙ্গে হঠাৎ পতন
  let pv=[];for(let o=2;o<=4;o++)if(fd[dstr(o)]>0)pv.push(fd[dstr(o)]*1000/(liveOn(dstr(o))||l));
  const pa=pv.length?pv.reduce((s,x)=>s+x,0)/pv.length:0,drop=pa>0?(1-g/pa)*100:0;
  if(ratio<0.8||(drop>15&&age>=5)){
   feedLow=true;
   let lv=ratio<0.65?2:1;if(vacRecent&&lv===1)lv=0;
   f.push({lv:lv,t:"খাবার কম খাচ্ছে: "+fb(g,0)+" গ্রাম/মুরগি (স্ট্যান্ডার্ড "+fb(std,0)+")",d:(drop>15?"আগের কয়েক দিনের চেয়ে "+fb(drop,0)+"% কমেছে। ":"")+(vacRecent?"সম্প্রতি ভ্যাকসিন দিয়েছেন, ১–২ দিন সামান্য কমা স্বাভাবিক। ":h.why),a:vacRecent?"আগামীকালও কম থাকলে ঘর ও পানি পরীক্ষা করুন।":h.do});
  }else if(ratio>1.25){
   f.push({lv:0,t:"খাবার স্ট্যান্ডার্ডের চেয়ে বেশি ("+fb(g,0)+" গ্রাম/মুরগি)",d:"মুরগির সংখ্যা কম লেখা, খাবার নষ্ট বা ইঁদুর-পাখির কারণ হতে পারে।",a:"মুরগির সংখ্যা ও খাবারের হিসাব মিলিয়ে নিন।"});
  }else f.push({lv:-1,t:"খাবার স্বাভাবিক ("+fb(g,0)+" গ্রাম/মুরগি, স্ট্যান্ডার্ড "+fb(std,0)+")",d:"",a:""});
 }else{
  const noFeed3=age>=4&&!fd[dstr(0)]&&!fd[dstr(1)]&&!fd[dstr(2)];
  f.push({lv:noFeed3?1:0,t:noFeed3?"৩ দিন ধরে খাবারের এন্ট্রি নেই":"আজ/গতকালের খাবারের এন্ট্রি নেই",d:noFeed3?"খাবারের হিসাব না থাকলে খাবার কমে যাওয়া (রোগের প্রথম ইশারা) ধরা যায় না।":"\"দৈনিক খাবার\" পেজে লিখলে খাবার বিশ্লেষণ হবে।",a:noFeed3?"\"দৈনিক খাবার\" পেজে এখনই লিখে ফেলুন।":""});
 }
 // সম্মিলিত সতর্কতা
 if(feedLow&&mortBad&&!vacRecent){f.forEach(x=>{if(/^(আজ মৃত্যু বেশি|টানা ৩ দিন|খাবার কম খাচ্ছে)/.test(x.t)){x.d=x.d.replace(h.why,"").trim();if(x.a===h.do||x.a.indexOf(h.do)===0)x.a=""}});f.unshift({lv:2,t:"খাবার কমছে আর মৃত্যু বাড়ছে — একসঙ্গে",d:h.why,a:"আজই "+h.do+" ২৪ ঘণ্টায় না কমলে ডাক্তার ডাকুন।"})}
 // ওজন (শেষ ৭ দিনের মধ্যে)
 const ws=(state.weights||[]).filter(r=>+r.n>0&&ageOf(state,r.date)!==null&&ageOf(state,r.date)>=age-7);
 if(ws.length){
  const w=ws[ws.length-1],a=ageOf(state,w.date),g=(+w.total/+w.n)*1000,std=stdAt(a),ratio=g/std;
  if(ratio<0.9)f.push({lv:ratio<0.8?2:1,t:"ওজন কম: "+fb(g,0)+" গ্রাম (স্ট্যান্ডার্ড "+fb(std,0)+", "+bn(a)+" দিনে)",d:"স্ট্যান্ডার্ডের "+fb(ratio*100,0)+"%। ফিডের মান, পানি বা তাপমাত্রা/রোগের কারণ হতে পারে।",a:"ফিড CP-এর ঠিক ধাপ (প্রি-স্টার্টার/স্টার্টার/গ্রোয়ার) দিচ্ছেন কি না ও ঘরে ভিড় আছে কি না দেখুন।"});
  else f.push({lv:-1,t:"ওজন ঠিক আছে: "+fb(g,0)+" গ্রাম (স্ট্যান্ডার্ড "+fb(std,0)+")",d:"",a:""});
 }

 // ── ওজন বাড়ার গতি (দৈনিক গ্রাম) ও FCR ──
 {
  const wl=(state.weights||[]).filter(r=>+r.n>0&&+r.total>0&&ageOf(state,r.date)!==null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const gOf=r=>(+r.total/+r.n)*1000;
  if(wl.length>=2){
   const w2=wl[wl.length-1],w1=wl[wl.length-2],a2=ageOf(state,w2.date),a1=ageOf(state,w1.date),span=a2-a1;
   if(span>=2&&age-a2<=10){
    const gain=(gOf(w2)-gOf(w1))/span,sg=(stdAt(a2)-stdAt(a1))/span,ratio=sg>0?gain/sg:1;
    if(gain<=0)f.push({lv:2,t:"ওজন বাড়ছে না ("+bn(a1)+"→"+bn(a2)+" দিনে)",d:"শেষ দুই মাপে ওজন একই বা কমেছে। এই বয়সে দৈনিক প্রায় "+fb(sg,0)+" গ্রাম বাড়ার কথা।",a:"রোগ, ফিডের মান, পানি ও ঘরের তাপমাত্রা দেখুন; দরকারে ডাক্তারের সঙ্গে কথা বলুন।"});
    else if(ratio<0.7)f.push({lv:ratio<0.5?2:1,t:"ওজন ধীরে বাড়ছে: দৈনিক "+fb(gain,0)+" গ্রাম (স্বাভাবিক ~"+fb(sg,0)+")",d:bn(a1)+" থেকে "+bn(a2)+" দিনে স্বাভাবিকের "+fb(ratio*100,0)+"% হারে বেড়েছে।",a:"ফিড ঠিকমতো খাচ্ছে কি না, পানি পরিষ্কার কি না ও ঘরের গরম-ঠান্ডা দেখুন।"});
    else f.push({lv:-1,t:"ওজন বাড়ার গতি ভালো: দৈনিক "+fb(gain,0)+" গ্রাম (স্বাভাবিক ~"+fb(sg,0)+")",d:"",a:""});
   }
  }
  // FCR (সর্বশেষ ওজন মাপার দিন পর্যন্ত জমা হিসাব)
  if(wl.length){
   const w=wl[wl.length-1],a=ageOf(state,w.date);
   if(a>=10&&age-a<=10){
    const feedDates=new Set(),upTo=(state.dailyFeed||[]).filter(r=>r.date<=w.date);
    let feedKg=0;upTo.forEach(r=>{feedDates.add(r.date);feedKg+=dfKg(r)});
    const complete=feedDates.size>=a*0.8;
    if(!complete)f.push({lv:0,t:"FCR বলা যাচ্ছে না — খাবারের হিসাব সব দিনের নেই",d:bn(feedDates.size)+" দিনের খাবারের এন্ট্রি আছে, "+bn(a)+" দিনের মধ্যে।",a:"শুরু থেকে প্রতিদিন \"দৈনিক খাবার\" লিখলে FCR ধরা যাবে।"});
    else{
     const outW=sumOf((state.sales||[]).filter(r=>r.date<=w.date),r=>r.weight)+sumOf(((state.otherSales&&state.otherSales.chicken)||[]).filter(r=>r.date<=w.date),r=>r.qty)+sumOf((state.gifts||[]).filter(r=>r.date<=w.date),r=>r.weight);
     const alive=liveOn(w.date)||0,totW=outW+alive*gOf(w)/1000;
     if(totW>0&&feedKg>0){
      const fcr=feedKg/totW,T=[[7,0.9],[14,1.05],[21,1.25],[28,1.42],[35,1.58],[42,1.72]];
      let std=T[T.length-1][1];for(let i=0;i<T.length-1;i++){if(a<=T[i+1][0]){const lo=T[i],hi=T[i+1];std=a<=lo[0]?lo[1]:lo[1]+(hi[1]-lo[1])*(a-lo[0])/(hi[0]-lo[0]);break}}
      if(a<7)std=T[0][1];
      const diff=fcr-std;
      if(diff>0.15)f.push({lv:diff>0.3?2:1,t:"FCR বেশি: "+fb(fcr,2)+" ("+bn(a)+" দিনে স্বাভাবিক ~"+fb(std,2)+")",d:"কম ওজনের জন্য বেশি ফিড লাগছে। ফিড নষ্ট, ইঁদুর-পাখি, রোগ বা ফিডের মান কারণ হতে পারে।",a:"ফিড মাপ ও পাত্র থেকে ছড়িয়ে পড়া দেখুন; ওজন নমুনা ঠিকমতো নিয়েছেন কি না মিলিয়ে নিন।"});
      else f.push({lv:-1,t:"FCR ভালো: "+fb(fcr,2)+" ("+bn(a)+" দিনে স্বাভাবিক ~"+fb(std,2)+")",d:"",a:""});
     }
    }
   }
  }
  // ওজন মাপার ফাঁক
  if(age>=7){
   const lastW=wl.length?ageOf(state,wl[wl.length-1].date):null;
   if(lastW===null)f.push({lv:0,t:"এখনও ওজন মাপা হয়নি",d:"ওজন না মাপলে ওজন বাড়ার গতি ও FCR বলা যায় না।",a:"সপ্তাহে একবার ১০–২০টা মুরগি মেপে \"বিশ্লেষণ\" পেজে ওজন নমুনা যোগ করুন।"});
   else if(age-lastW>7)f.push({lv:0,t:bn(age-lastW)+" দিন ওজন মাপা হয়নি",d:"শেষ ওজন নমুনা "+bn(lastW)+" দিনে নেওয়া।",a:"নতুন করে ১০–২০টা মুরগি মেপে ওজন নমুনা যোগ করুন।"});
  }
 }
 // ── বিক্রির আগে ওষুধের অপেক্ষার সময় (অ্যান্টিবায়োটিক) ──
 {
  const AB=/অ্যান্টি\s*বায়ো|এন্টি\s*বায়ো|antibio|কোলিস্টিন|colisti|এনরো|enro|ডক্সি|doxy|অক্সি\s*টেট্রা|oxy\s*tetra|টেট্রা|tetra|টাইলো|tylo|অ্যামোক্সি|এমোক্সি|amox|সিপ্রো|cipro|নিওমাইসিন|neomy|জেন্টা|genta|ফ্লোরফেনিকল|florfen|লিনকো|linco|স্পেকটিনো|spectino|সালফা|sulfa|ট্রাইমেথো|trimetho|কো-?ট্রাই|cotrim|স্ট্রেপটো|strepto|ফসফোমাইসিন|fosfo|এরিথ্রো|eryth/i;
  const t0=dstr(0);let last=null,lastName="";
  (state.medSchedule||[]).forEach(r=>{if(!r.date||r.date>t0)return;["morning","noon","night"].forEach(k=>{const m=r[k];if(m&&m.name&&AB.test(m.name)){if(!last||r.date>last){last=r.date;lastName=m.name}}})});
  if(last){
   const since=Math.round((new Date(t0+"T00:00:00")-new Date(last+"T00:00:00"))/86400000);
   const wd=+state.withdrawDays>0?+state.withdrawDays:7,left=wd-since;
   if(left>0&&age>=21){
    const safe=new Date();safe.setDate(safe.getDate()+left);const p=n=>String(n).padStart(2,"0");
    const safeTxt=bn(safe.getDate())+"/"+bn(safe.getMonth()+1);
    const safeAge=age+left;
    f.push({lv:age>=28?(left>=3?2:1):0,t:"বিক্রির আগে ওষুধের অপেক্ষার সময় বাকি: "+bn(left)+" দিন",d:"শেষ অ্যান্টিবায়োটিক ("+lastName+") "+(since===0?"আজ":bn(since)+" দিন আগে")+" দিয়েছেন। সাধারণ হিসাবে অন্তত "+bn(wd)+" দিন পর বিক্রি নিরাপদ, অর্থাৎ "+safeTxt+" থেকে ("+bn(safeAge)+" দিন বয়সে)।"+(safeAge>35?" ৩৫ দিনে বিক্রি করতে চাইলে নতুন অ্যান্টিবায়োটিক দেওয়া এড়ান।":""),a:"ওষুধের লেবেলে লেখা উইথড্রয়াল দিন দেখুন; ডাক্তারের পরামর্শ নিন।"});
   }else if(age>=28&&left<=0)f.push({lv:-1,t:"ওষুধের অপেক্ষার সময় পার ("+bn(since)+" দিন আগে শেষ অ্যান্টিবায়োটিক)",d:"",a:""});
  }
 }
 // ভ্যাকসিন দেরি
 (typeof VAC!=="undefined"?VAC:[]).forEach(v=>{
  const s=typeof vacStatus==="function"?vacStatus(v):null;
  if(s&&s.s==="late")f.push({lv:s.late>=2?2:1,t:v.name+" "+bn(s.late)+" দিন দেরি",d:"সময়মতো না দিলে রোগের ঝুঁকি বাড়ে।",a:"যত দ্রুত সম্ভব দিন (ডাক্তারের পরামর্শে)।"});
 });
 f.sort((a,b)=>b.lv-a.lv);
 const worst=f.reduce((m,x)=>Math.max(m,x.lv),-1);
 return{f:f,worst:worst,age:age};
}
window.renderFarmDoc=function(){
 const el=document.getElementById("farmDoc");if(!el)return;
 const r=analyze();
 if(!r){el.innerHTML="";return}
 const col=r.worst>=2?{c:"#ff6b6b",bg:"#ff6b6b14",tx:"🔴 সমস্যার ইশারা — আজই দেখুন"}:r.worst===1?{c:"#f5b942",bg:"#f5b94214",tx:"🟡 নজর রাখুন"}:{c:"#1aad6e",bg:"#1aad6e12",tx:"🟢 এখন পর্যন্ত সব ঠিক"};
 const icon=lv=>lv>=2?"🔴":lv===1?"🟡":lv===0?"ℹ️":"✅";
 el.innerHTML='<div class="fdoc" style="border-color:'+col.c+'66;background:'+col.bg+'"><div class="fdoc-head"><b>🩺 খামার ডাক্তার</b><span style="color:'+col.c+'">'+col.tx+'</span></div>'+
  r.f.map(x=>'<div class="fdoc-row"><span class="fdoc-i">'+icon(x.lv)+'</span><div><div class="fdoc-t">'+x.t+'</div>'+(x.d?'<div class="fdoc-d">'+x.d+'</div>':'')+(x.a?'<div class="fdoc-a">👉 '+x.a+'</div>':'')+'</div></div>').join("")+
  '<div class="fdoc-n">বয়স '+bn(r.age)+' দিন • রোস জাত, সিপি ফিডের স্ট্যান্ডার্ড ধরে হিসাব। এটা আগাম ইশারা, নিশ্চিত রোগ নির্ণয় নয়। ২৪ ঘণ্টায় না কমলে ডাক্তার দেখান।</div></div>';
};
{const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{renderFarmDoc()}catch(e){console.error(e)}return r}}
window.APP_VERSION="v89";
(function(){const d=document.getElementById("dashboard");if(d&&!document.getElementById("appVer")){const e=document.createElement("div");e.id="appVer";e.style.cssText="text-align:center;font-size:11px;color:#6f8794;margin:22px 0 8px";e.innerHTML='ব্রাদার্স পোল্ট্রি ফার্ম • সংস্করণ '+window.APP_VERSION+'<br><button type="button" id="appUpd" style="margin-top:8px;border:1px solid #ffffff30;background:#ffffff10;color:#cfe9dc;border-radius:10px;padding:7px 14px;font:inherit;font-size:12px;cursor:pointer">🔄 নতুন সংস্করণ লোড করুন (ডেটা মুছবে না)</button>';d.appendChild(e);
 document.getElementById("appUpd").onclick=async function(){try{this.textContent="⏳ আপডেট হচ্ছে...";if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(_){}location.reload()}}})();
/* কোনো কোড-ত্রুটি হলে আর চুপচাপ ব্যর্থ নয় — পর্দায় দেখাবে */
window.addEventListener("error",ev=>{try{showToast("⚠️ সমস্যা হয়েছে: "+String(ev.message||"অজানা ত্রুটি").slice(0,80))}catch(_){}});
window.addEventListener("unhandledrejection",ev=>{try{showToast("⚠️ সমস্যা হয়েছে: "+String((ev.reason&&ev.reason.message)||ev.reason||"অজানা").slice(0,80))}catch(_){}});
})();

["renderMedSchedule","renderNotes","renderOtherSales"].forEach(n=>{const f=window[n];window[n]=function(){f.apply(this,arguments);renderSummaries()}});
render();
renderTempPallas();
if(window.__restoredFromBak){save();setTimeout(()=>{try{showToast("⚠️ মূল ডেটা নষ্ট ছিল, গতকালের কপি থেকে ফেরত আনা হয়েছে")}catch(e){}},1200)}
setTimeout(()=>vacCheck(),700);setInterval(()=>vacCheck(),600000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)vacCheck()});
fitTitle();window.addEventListener("resize",fitTitle);window.addEventListener("load",fitTitle);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitTitle);
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("service-worker.js").catch(()=>{})})}

// ══════ ✨ গ্রাফিক্স: পেজ ব্যানার ও ড্যাশবোর্ডের দৃশ্য ══════
(function(){
 const SUB={farm:"বাচ্চা আসা, দাম আর মৃত্যুর হিসাব",feed:"ফিড কেনা ও খরচ",medicine:"মেডিসিনের খরচ",workers:"দৈনিক হাজিরা, প্রাপ্য ও নেওয়া টাকা",other:"বিভিন্ন খরচ, কাঠের গুড়া ও পরিবহন ভাড়া",litter:"কাঠের গুড়ার খরচ",rent:"পরিবহন ভাড়া",sales:"মুরগি বিক্রি ও বাকি",othersales:"লিটার, খুচরা, বস্তা ও ফিড বিক্রি",customers:"ক্রেতাভিত্তিক হিসাব",medschedule:"রোজকার ওষুধের সময়সূচি",dailyfeed:"প্রতিদিন কত খাবার",notes:"দরকারি নোট",vaccine:"টিকার সময়সূচি",analysis:"ওজন, ফিড আর লাভের হিসাব",batchcmp:"পুরনো ব্যাচের সাথে তুলনা",fcr:"স্বয়ংক্রিয় হিসাব + নিজের মতো করে হিসাব",report:"PDF ও Excel রিপোর্ট",batches:"সব ব্যাচ একনজরে"};
 const FALL=["#1aad6e","#0d8050"];
 function grad(id){const g=(typeof navColors!=="undefined"&&navColors[id])||"";const m=g.match(/#[0-9a-fA-F]{3,8}/g);return m&&m.length>=2?m:FALL}
 function banners(){
  if(typeof navItems==="undefined")return;
  document.querySelectorAll("main section.page, section.page").forEach(sec=>{
   if(sec.id==="dashboard"||sec.querySelector(":scope>.pg-banner"))return;
   const it=navItems.find(x=>x[0]===sec.id);if(!it)return;
   const t=it[1],i=t.indexOf(" "),ico=i>0?t.slice(0,i):"📋",name=i>0?t.slice(i+1):t,c=grad(sec.id);
   const d=document.createElement("div");d.className="pg-banner";d.style.setProperty("--g1",c[0]);d.style.setProperty("--g2",c[1]);
   d.innerHTML='<div class="pg-ico">'+ico+'</div><div class="pg-tx"><b>'+name+'</b><span>'+(SUB[sec.id]||"ব্রাদার্স পোল্ট্রি ফার্ম")+'</span></div><div class="pg-dots"><i></i><i></i><i></i></div>';
   sec.insertBefore(d,sec.firstChild);
  });
 }
 function scene(){
  const h=document.querySelector(".db-hero");if(!h||h.querySelector(".hero-scene"))return;
  const hen=(x,cls,sc)=>'<g transform="translate('+x+' 44) scale('+sc+')"><g class="hs-hen '+cls+'"><ellipse cx="0" cy="0" rx="13" ry="10" fill="#fff6e6"/><circle cx="11" cy="-9" r="6.5" fill="#fff6e6"/><path d="M9 -17 q2 -5 4 0 q2 -4 3 1z" fill="#ef4444"/><path d="M17 -9 l7 2 l-7 2z" fill="#f59e0b"/><circle cx="13" cy="-10" r="1.3" fill="#1b1b1b"/><path d="M-12 -2 q-9 -4 -8 6 q4 2 9 -2z" fill="#ffe2b0"/><path d="M-2 10 v8 M4 10 v8" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/></g></g>';
  const wheat=x=>'<g transform="translate('+x+' 78)" stroke="#e9c46a" stroke-width="1.6" fill="#e9c46a" opacity=".8"><path d="M0 0 V-22" fill="none"/><ellipse cx="-3" cy="-18" rx="2" ry="4" transform="rotate(-25 -3 -18)"/><ellipse cx="3" cy="-18" rx="2" ry="4" transform="rotate(25 3 -18)"/><ellipse cx="-3" cy="-11" rx="2" ry="4" transform="rotate(-25 -3 -11)"/><ellipse cx="3" cy="-11" rx="2" ry="4" transform="rotate(25 3 -11)"/></g>';
  const svg='<svg viewBox="0 0 400 78" preserveAspectRatio="xMidYMax meet" overflow="visible" aria-hidden="true">'+
   '<defs><linearGradient id="hsG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c8a5a"/><stop offset="1" stop-color="#0b4d33"/></linearGradient><linearGradient id="hsG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14744a"/><stop offset="1" stop-color="#073a27"/></linearGradient></defs>'+
   '<g class="hs-sun"><circle cx="338" cy="22" r="26" fill="#fbbf24" opacity=".18"/><circle cx="338" cy="22" r="15" fill="#fcd34d"/></g>'+
   '<g class="hs-cloud" opacity=".55"><ellipse cx="40" cy="16" rx="18" ry="6" fill="#fff"/><ellipse cx="52" cy="12" rx="12" ry="6" fill="#fff"/></g>'+
   '<path d="M-800 52 L0 50 Q70 28 150 46 T300 40 T400 48 L1200 52 V78 H-800Z" fill="url(#hsG1)"/>'+
   '<path d="M-800 62 L0 62 Q90 46 190 60 T400 58 L1200 60 V78 H-800Z" fill="url(#hsG2)"/>'+
   wheat(30)+wheat(44)+wheat(360)+wheat(374)+hen(110,"a",.95)+hen(200,"b",1.05)+hen(285,"c",.9)+'</svg>';
  const d=document.createElement("div");d.className="hero-scene";d.innerHTML=svg;h.appendChild(d);
 }
 function run(){try{banners()}catch(e){console.error(e)}}
 run();
 const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);run();return r};
})();

// ══════ 🎯 FCR পেজ ══════
(function(){
 const bnx=n=>Number(n).toLocaleString("bn-BD");
 const f1=(n,d)=>Number(n).toLocaleString("bn-BD",{minimumFractionDigits:d===undefined?0:d,maximumFractionDigits:d===undefined?2:d});
 const card=(i,l,v,c)=>'<div class="sc"><div class="sci">'+i+'</div><div><div class="scl">'+l+'</div><div class="scv"'+(c?' style="color:'+c+'"':'')+'>'+v+'</div></div></div>';
 const el=id=>document.getElementById(id);
 function verdict(fcr,tg){return fcr<=tg?'<div class="fcr-verdict good">✅ FCR টার্গেটের মধ্যে আছে ('+f1(fcr,2)+' ≤ '+f1(tg,2)+')</div>':'<div class="fcr-verdict bad">⚠️ FCR টার্গেটের চেয়ে বেশি ('+f1(fcr,2)+' > '+f1(tg,2)+') — ওজন নমুনা দিয়ে মিলিয়ে দেখুন; ফিড অপচয় বা কম ওজন কারণ হতে পারে</div>'}
 window.fcAutoIn=function(){
  state.targetFCR=+el("fcTarget").value||0;state.liveAvgWt=+el("fcLive").value||0;save();fcAuto();
 };
 function fcAuto(){
  const out=el("fcAutoOut");if(!out)return;
  const f=fcrStats();
  if(!(f.feed>0)){out.innerHTML='<div class="warnbox">⚠️ এখনও দৈনিক খাবারের কোনো হিসাব নেই। "🍽️ দৈনিক খাবার" পেজে প্রতিদিনের খাবার যোগ করুন।</div>';return}
  const pn=f.birds?f.need/f.birds:0,pw=f.birds&&f.tw?f.tw/f.birds:0;
  let h='<div class="pgsum">'+card("🍽️","মোট খাওয়ানো ফিড",f1(f.feed)+" কেজি","#fbbf24")+card("📦","মোট ওজন",f1(f.tw)+" কেজি")+card("🎯","টার্গেট FCR",f1(f.tg,2))+card("📊","বাস্তব FCR",f.fcr?f1(f.fcr,2):"—",f.fcr?(f.fcr<=f.tg?"#3ddc84":"#ff7070"):"")+card("⚖️","ফিড অনুযায়ী দরকারি ওজন",f1(f.need)+" কেজি","#70b8ff")+card("🐔","দরকারি গড় ওজন/মুরগি",f.birds?f1(pn,2)+" কেজি":"—","#70b8ff")+card("📏","এখন গড় ওজন/মুরগি",pw?f1(pw,2)+" কেজি":"—")+card("🐣","জীবিত মুরগি (মোট)",bnx(f.birds)+" টি")+'</div>';
  h+='<div style="font-size:11.5px;color:#7a9aaa;margin-top:8px;line-height:1.7">📦 মোট ওজন = বিক্রি/খুচরা/গিফট/বাসায় খাওয়া '+f1(f.harv)+' কেজি + খামারের '+bnx(f.live)+' টি মুরগি (আনুমানিক '+f1(f.liveW)+' কেজি)</div>';
  if(f.live>0&&f.est)h+='<div class="warnbox">ℹ️ খামারে '+bnx(f.live)+' টি মুরগি আছে, তাদের ওজন আপনি দেননি। তাই স্ট্যান্ডার্ড ওজন (প্রতি মুরগি '+bnx(Math.round(f.la*1000))+' গ্রাম) ধরে আনুমানিক FCR দেখানো হচ্ছে। উপরের ঘরে গড় ওজন বা ওজন নমুনা দিলে আরও ঠিক হবে।</div>';
  if(f.fcr)h+=verdict(f.fcr,f.tg);
  out.innerHTML=h;
 }
 function renderFcrPage(){
  if(!el("fcTarget"))return;
  const a=document.activeElement;
  if(a!==el("fcTarget"))el("fcTarget").value=+state.targetFCR||1.6;
  if(a!==el("fcLive"))el("fcLive").value=+state.liveAvgWt||"";
  fcAuto();
 }
 renderFcrPage();
 const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{renderFcrPage()}catch(e){console.error(e)}return r};
})();

// ══════ Google Drive ব্যাকআপ ══════
(function(){
 const FILE="poultry-backup-latest.json",SCOPE="https://www.googleapis.com/auth/drive.file";
 const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
 const cid=()=>(LS("gdClientId")||"").trim();
 let tok=null,tokExp=0,tc=null,gisP=null;
 function loadGis(){
  if(window.google&&google.accounts&&google.accounts.oauth2)return Promise.resolve();
  if(gisP)return gisP;
  gisP=new Promise((res,rej)=>{let sc=document.createElement("script");sc.src="https://accounts.google.com/gsi/client";sc.onload=res;sc.onerror=()=>{gisP=null;rej(new Error("ইন্টারনেট নেই"))};document.head.appendChild(sc)});
  return gisP;
 }
 function getToken(interactive){
  if(tok&&Date.now()<tokExp-60000)return Promise.resolve(tok);
  return loadGis().then(()=>new Promise((res,rej)=>{
   tc=google.accounts.oauth2.initTokenClient({client_id:cid(),scope:SCOPE,
    callback:r=>{if(r&&r.access_token){tok=r.access_token;tokExp=Date.now()+(+r.expires_in||3600)*1000;LS("gdLinked","1");res(tok)}else rej(new Error((r&&r.error)||"অনুমতি পাওয়া যায়নি"))},
    error_callback:e=>rej(new Error((e&&e.type)||"popup_closed"))});
   tc.requestAccessToken({prompt:interactive?(LS("gdLinked")?"":"consent"):""});
  }));
 }
 async function api(url,opt){
  let r=await fetch(url,Object.assign({headers:{Authorization:"Bearer "+tok}},opt));
  if(r.status===401){tok=null;throw new Error("আবার সাইন-ইন দরকার")}
  if(!r.ok)throw new Error("Drive ত্রুটি "+r.status);
  return r;
 }
 async function findFile(){
  let q=encodeURIComponent("name='"+FILE+"' and trashed=false");
  let j=await (await api("https://www.googleapis.com/drive/v3/files?q="+q+"&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&spaces=drive")).json();
  return (j.files||[])[0]||null;
 }
 async function upload(){
  let body=JSON.stringify(store),ex=await findFile(),b="bnd"+Date.now();
  let meta=ex?{name:FILE}:{name:FILE,mimeType:"application/json"};
  let mp="--"+b+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(meta)+"\r\n--"+b+"\r\nContent-Type: application/json\r\n\r\n"+body+"\r\n--"+b+"--";
  let url=ex?"https://www.googleapis.com/upload/drive/v3/files/"+ex.id+"?uploadType=multipart":"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  await api(url,{method:ex?"PATCH":"POST",headers:{Authorization:"Bearer "+tok,"Content-Type":"multipart/related; boundary="+b},body:mp});
 }
 function stamp(){store.lastBackup=Date.now();store.lastDrive=todayISO();delete store.backupSnooze;save();try{renderBackup()}catch(e){}}
 function status(m,c){let e=document.getElementById("gdStatus");if(e){e.textContent=m;e.style.color=c||"#9fd8b8"}}
 window.gdBackupNow=async function(){
  if(!cid()){status("আগে Client ID বসান","#ffb070");return}
  status("⏳ ব্যাকআপ হচ্ছে...");
  try{await getToken(true);await upload();stamp();status("✅ Drive-এ ব্যাকআপ হয়েছে ("+new Date().toLocaleTimeString("bn-BD")+")");showToast("☁️ Drive-এ ব্যাকআপ হয়েছে")}
  catch(e){status("❌ "+e.message,"#ff8a8a")}
 };
 window.gdRestoreNow=async function(){
  if(!cid()){status("আগে Client ID বসান","#ffb070");return}
  status("⏳ Drive থেকে খোঁজা হচ্ছে...");
  try{
   await getToken(true);let f=await findFile();
   if(!f){status("Drive-এ কোনো ব্যাকআপ পাওয়া যায়নি","#ffb070");return}
   let t=await (await api("https://www.googleapis.com/drive/v3/files/"+f.id+"?alt=media")).text();
   status("ব্যাকআপ পাওয়া গেছে ("+new Date(f.modifiedTime).toLocaleString("bn-BD")+")");
   closeInfo();restoreData(new File([t],FILE,{type:"application/json"}));
  }catch(e){status("❌ "+e.message,"#ff8a8a")}
 };
 window.gdSaveId=function(){
  let v=document.getElementById("gdCid").value.trim();
  if(v&&!/\.apps\.googleusercontent\.com$/.test(v)){status("❌ Client ID ঠিক নয় (শেষে .apps.googleusercontent.com থাকবে)","#ff8a8a");return}
  LS("gdClientId",v||null);tok=null;status(v?"✅ Client ID সেভ হয়েছে":"মুছে ফেলা হয়েছে");
 };
 window.gdAuto=function(on){LS("gdAuto",on?"1":"0")};
 window.gdOpen=function(){
  let lastD=store.lastDrive?("শেষ Drive ব্যাকআপ: "+store.lastDrive):"";
  document.getElementById("infoTitle").textContent="☁️ ব্যাকআপ ও ফেরত আনা";
  document.getElementById("infoBody").innerHTML=
  '<div style="font-size:13px;color:#9fd8b8;margin-bottom:10px">'+lastD+'</div>'+
  '<div style="font-weight:700;margin-bottom:6px">📧 Gmail-এ ব্যাকআপ</div>'+
  '<div style="font-size:12.5px;color:#9ab;line-height:1.7;margin-bottom:8px">নিচের বাটন চাপুন → খোলা তালিকা থেকে <b>Gmail</b> বেছে নিন → নিজের ঠিকানায় পাঠান। ব্যাকআপ ফাইল সংযুক্ত হয়ে যাবে।</div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="tbtn" onclick="closeInfo();backupShare()">📧 Gmail-এ পাঠান</button><button class="tbtn" onclick="closeInfo();document.getElementById(\'restoreFile\').click()">📥 ফেরত আনুন</button></div>'+
  '<div style="font-size:12px;color:#7a9aaa;line-height:1.6;margin-bottom:10px">ফেরত আনতে: Gmail থেকে ফাইলটা ফোনে ডাউনলোড করুন, তারপর "ফেরত আনুন" চেপে ওই ফাইল বেছে নিন।</div>'+
  '<details style="margin-top:6px"><summary style="cursor:pointer;color:#ffd070;font-size:13px">☁️ Google Drive (পরে লাগলে)</summary><div style="margin-top:8px">'+
  '<label style="font-size:12px;color:#9ab">Google Client ID (একবারই বসাতে হবে)</label>'+
  '<input id="gdCid" type="text" placeholder="১২৩...apps.googleusercontent.com" value="'+esc(cid())+'" style="width:100%;margin:4px 0 6px">'+
  '<button class="tbtn" onclick="gdSaveId()" style="margin-bottom:10px">💾 Client ID সেভ</button>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="tbtn" onclick="gdBackupNow()">☁️ এখনই Drive-এ ব্যাকআপ</button><button class="tbtn" onclick="gdRestoreNow()">📥 Drive থেকে ফেরত আনুন</button></div>'+
  '<label style="font-size:13px;display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" '+(LS("gdAuto")==="1"?"checked":"")+' onchange="gdAuto(this.checked)" style="width:auto"> অ্যাপ খুললে দিনে একবার অটো-ব্যাকআপ</label>'+
  '<div id="gdStatus" style="font-size:13px;min-height:18px;margin:6px 0"></div>'+
  '<details style="font-size:12.5px;color:#9ab;line-height:1.7"><summary style="cursor:pointer;color:#ffd070">❓ Client ID কীভাবে পাবেন?</summary>'+
  '<ol style="padding-left:18px;margin:6px 0"><li>console.cloud.google.com এ গিয়ে Gmail দিয়ে ঢুকুন → নতুন Project বানান।</li>'+
  '<li>APIs &amp; Services → Library → <b>Google Drive API</b> → Enable।</li>'+
  '<li>OAuth consent screen → External → অ্যাপের নাম দিন, নিজের Gmail দিন → Save। এরপর Audience/Test users এ নিজের Gmail যোগ করুন।</li>'+
  '<li>Credentials → Create Credentials → OAuth client ID → <b>Web application</b>।</li>'+
  '<li>Authorized JavaScript origins এ আপনার অ্যাপের ঠিকানা দিন: <code>'+esc(location.origin)+'</code></li>'+
  '<li>Create চাপলে যে Client ID আসবে তা কপি করে উপরের ঘরে বসান।</li></ol></details></div></details>';
  document.getElementById("infoModal").classList.add("show");
 };
 // দিনে একবার অটো
 setTimeout(function(){
  try{
   if(LS("gdAuto")!=="1"||!cid()||!LS("gdLinked")||!navigator.onLine||!hasData())return;
   if(store.lastDrive===todayISO())return;
   getToken(false).then(upload).then(()=>{stamp();showToast("☁️ অটো ব্যাকআপ হয়েছে")}).catch(()=>{});
  }catch(e){}
 },4000);
})();

// ══════ ফাইল আউটপুট (JPG / PDF সেভ ও শেয়ার) ══════
const toEn=t=>String(t==null?"":t).replace(/[০-৯]/g,d=>"০১২৩৪৫৬৭৮৯".indexOf(d));
function deepEn(o){if(typeof o==="string")return toEn(o);if(Array.isArray(o))return o.map(deepEn);if(o&&typeof o==="object"){let r={};for(const k in o)r[k]=deepEn(o[k]);return r}return o}
{const _rd=reportData;reportData=function(){return deepEn(_rd.apply(this,arguments))}}
function _enNodes(root){let w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;while(n=w.nextNode()){if(/[০-৯]/.test(n.nodeValue))n.nodeValue=toEn(n.nodeValue)}}
{const _rr=renderReport;renderReport=function(){let r=_rr.apply(this,arguments);let e=document.getElementById("reportSheet");if(e)_enNodes(e);return r}}
window.outJpg=(c,q)=>new Promise(res=>c.toBlob(res,"image/jpeg",q||0.95));
window.outPdf=async function(canvases){
 const enc=new TextEncoder(),parts=[],offs=[];let len=0;
 const add=d=>{let u=typeof d==="string"?enc.encode(d):d;parts.push(u);len+=u.length};
 const PW=595,PH=842,n=canvases.length;
 let jpgs=[];for(const c of canvases){jpgs.push(new Uint8Array(await (await outJpg(c,0.95)).arrayBuffer()))}
 add("%PDF-1.4\n");
 const obj=(k,body)=>{offs[k]=len;add(k+" 0 obj\n"+body+"\nendobj\n")};
 obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
 obj(2,"<< /Type /Pages /Kids ["+canvases.map((c,i)=>(3+i*3)+" 0 R").join(" ")+"] /Count "+n+" >>");
 canvases.forEach((c,i)=>{
  let pg=3+i*3,im=pg+1,ct=pg+2,w=c.width,h=c.height,sc=Math.min(PW/w,PH/h),iw=(w*sc).toFixed(2),ih=(h*sc).toFixed(2),ix=((PW-w*sc)/2).toFixed(2),iy=((PH-h*sc)/2).toFixed(2);
  let content="q "+iw+" 0 0 "+ih+" "+ix+" "+iy+" cm /Im0 Do Q";
  obj(pg,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+PW+" "+PH+"] /Resources << /XObject << /Im0 "+im+" 0 R >> >> /Contents "+ct+" 0 R >>");
  offs[im]=len;add(im+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+w+" /Height "+h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpgs[i].length+" >>\nstream\n");add(jpgs[i]);add("\nendstream\nendobj\n");
  obj(ct,"<< /Length "+content.length+" >>\nstream\n"+content+"\nendstream");
 });
 const total=3+n*3,xr=len;let x="xref\n0 "+total+"\n0000000000 65535 f \n";
 for(let k=1;k<total;k++)x+=String(offs[k]).padStart(10,"0")+" 00000 n \n";
 add(x+"trailer\n<< /Size "+total+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF");
 return new Blob(parts,{type:"application/pdf"});
};
window.outSave=function(files){ // সরাসরি ডাউনলোড (শেয়ার নয়)
 files.forEach((f,i)=>setTimeout(()=>{let a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},i*500));
 showToast("✅ "+files.map(f=>f.name.split(".").pop().toUpperCase()).join(", ")+" সেভ হয়েছে (ডাউনলোডে দেখুন)");
};
window.outShare=async function(files){
 try{if(navigator.canShare&&navigator.canShare({files:files})){await navigator.share({files:files,title:"ব্রাদার্স পোল্ট্রি ফার্ম"});return true}}catch(e){if(e&&e.name==="AbortError")return true}
 outSave(files);return false;
};
window.outFont="'Hind Siliguri','Noto Sans Bengali','Noto Sans',sans-serif";
function _wrapTxt(x,t,maxW){let words=String(t).split(" "),lines=[],cur="";words.forEach(w=>{let tr=cur?cur+" "+w:w;if(x.measureText(tr).width>maxW&&cur){lines.push(cur);cur=w}else cur=tr});if(cur)lines.push(cur);return lines}
async function reportCanvases(){
 try{await document.fonts.ready}catch(e){}
 const d=reportData(),S=2,W=1000,PH=1414,M=48,F=outFont,pages=[];
 let logo=await new Promise(res=>{let im=new Image(),el=document.querySelector(".logo-img");if(!el){res(null);return}im.onload=()=>res(im);im.onerror=()=>res(null);im.src=el.src});
 let cv,x,y;
 const np=()=>{cv=document.createElement("canvas");cv.width=W*S;cv.height=PH*S;x=cv.getContext("2d");x.scale(S,S);x.fillStyle="#fff";x.fillRect(0,0,W,PH);pages.push(cv);y=M};
 const th=()=>{x.fillStyle="#0a4a2f";x.fillRect(M,y,W-2*M,50);x.fillStyle="#fff";x.font="800 24px "+F;x.textAlign="left";x.textBaseline="middle";x.fillText("খাত",M+14,y+26);x.fillText("পরিমাণ",560,y+26);x.textAlign="right";x.fillText("টাকা (৳)",W-M-14,y+26);y+=50};
 np();
 // হেডার
 let g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,"#06301f");g.addColorStop(1,"#0d7a4a");x.fillStyle=g;x.fillRect(0,0,W,170);
 if(logo)x.drawImage(logo,30,15,140,140);
 x.fillStyle="#fff";x.textAlign="left";x.textBaseline="alphabetic";x.font="800 46px "+F;x.fillText("ব্রাদার্স পোল্ট্রি ফার্ম",190,80);
 x.fillStyle="#ffe08a";x.font="700 26px "+F;x.fillText("পূর্ণাঙ্গ রিপোর্ট",190,120);
 x.fillStyle="#cdeedd";x.font="600 20px "+F;let sl=_wrapTxt(x,d.sub,W-190-30);sl.slice(0,2).forEach((t,i)=>x.fillText(t,190,150+i*0));
 y=170+24;
 // তথ্য
 d.info.forEach(it=>{x.font="600 22px "+F;let vl=_wrapTxt(x,it[1],W-2*M-300),h=Math.max(44,vl.length*30+14);
  x.fillStyle="#eef6f1";x.fillRect(M,y,W-2*M,h-4);x.fillStyle="#334";x.textBaseline="middle";x.textAlign="left";x.font="600 22px "+F;x.fillText(it[0],M+12,y+(h-4)/2);
  x.fillStyle="#000";x.font="800 22px "+F;x.textAlign="right";vl.forEach((t,i)=>x.fillText(t,W-M-12,y+(h-4)/2+(i-(vl.length-1)/2)*30));y+=h});
 y+=16;th();
 d.rows.forEach(r=>{
  let big=r.t==="profit"||r.t==="loss",fs=big?26:23,wt=(r.t==="sec"||r.t==="tot"||big)?"800":"600";
  x.font=wt+" "+fs+"px "+F;
  let ll=_wrapTxt(x,r.l,r.t==="sec"?W-2*M-28:480),amt=r.v!==undefined?r.v:(r.a==null?"—":money(r.a)),h=Math.max(r.t==="sec"?48:52,ll.length*32+16);
  if(y+h>PH-90){np();th()}
  let bg=r.t==="sec"?"#e1f1e8":r.t==="tot"?"#ececec":r.t==="profit"?"#d4f0df":r.t==="loss"?"#fbdcdc":"#fff",col=r.t==="sec"?"#0a4a2f":r.t==="profit"?"#066a3f":r.t==="loss"?"#b01212":"#000";
  x.fillStyle=bg;x.fillRect(M,y,W-2*M,h);x.fillStyle="#ccc";x.fillRect(M,y+h-1,W-2*M,1);
  x.fillStyle=col;x.textBaseline="middle";x.textAlign="left";x.font=wt+" "+fs+"px "+F;
  ll.forEach((t,i)=>x.fillText(t,M+14,y+h/2+(i-(ll.length-1)/2)*32));
  if(r.t!=="sec"){x.font="600 22px "+F;x.fillStyle="#222";if(r.q)x.fillText(r.q,560,y+h/2);x.fillStyle=col;x.font=(r.t==="tot"||big?"800 ":"700 ")+fs+"px "+F;x.textAlign="right";x.fillText(amt,W-M-14,y+h/2)}
  y+=h;
 });
 if(d.note){x.font="600 20px "+F;let nl=_wrapTxt(x,d.note,W-2*M);if(y+nl.length*28+20>PH-90)np();y+=14;x.fillStyle="#8a5a00";x.textAlign="left";x.textBaseline="top";nl.forEach((t,i)=>x.fillText(t,M,y+i*28));y+=nl.length*28}
 pages.forEach((c,i)=>{let k=c.getContext("2d");k.font="500 18px "+F;k.fillStyle="#666";k.textBaseline="alphabetic";k.textAlign="left";
  k.fillText("রিপোর্ট তৈরির তারিখ: "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})+"  •  ব্রাদার্স পোল্ট্রি ফার্ম",M,PH-34);k.textAlign="right";k.fillText("Page "+(i+1)+" / "+pages.length,W-M,PH-34)});
 return pages;
}
window.reportOut=async function(kind,mode){
 try{
  showToast("⏳ তৈরি হচ্ছে...");
  let cs=await reportCanvases(),base=toEn(reportFileBase()).replace(/[^\w\u0980-\u09FF\-. ]+/g,"_").replace(/\s+/g,"_").replace(/_+/g,"_")||"report",files=[];
  if(kind==="pdf")files.push(new File([await outPdf(cs)],base+".pdf",{type:"application/pdf"}));
  else for(let i=0;i<cs.length;i++)files.push(new File([await outJpg(cs[i])],base+(cs.length>1?"-"+(i+1):"")+".jpg",{type:"image/jpeg"}));
  if(mode==="share")await outShare(files);else outSave(files);
 }catch(e){showToast("❌ ফাইল তৈরি হয়নি: "+e.message)}
};
// ══════ বিক্রির মেমো / রসিদ ══════
(function(){
 const bn=n=>Number(n).toLocaleString("en-US");
 const fb=(n,d)=>Number(n).toLocaleString("en-US",{maximumFractionDigits:d===undefined?2:d});
 let cur=null;
 function loadLogo(){return new Promise(res=>{let im=new Image();let el=document.querySelector(".logo-img");if(!el){res(null);return}im.onload=()=>res(im);im.onerror=()=>res(null);im.src=el.src})}
 /* কর্তৃপক্ষের স্বাক্ষর (স্বচ্ছ ব্যাকগ্রাউন্ডের ছবি) */
 const SIGN_SRC="data:image/png;base64,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";
 let _signP=null;
 function loadSign(){if(!_signP)_signP=new Promise(res=>{let im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=SIGN_SRC});return _signP}
 async function draw(r,idx){
  try{await document.fonts.ready}catch(e){}
  const W=760,PL0=r.pallas||[],PLS=Math.min(PL0.length,20),PLR=Math.min(10,PLS);
  const yDue=345+58*4+(PL0.length?10+14+PLR*34+(PL0.length>20?34:0)+40:0)+30+70+62;
  const H=Math.max(1040,yDue+335),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const F="'Hind Siliguri','Noto Sans Bengali',sans-serif";
  x.fillStyle="#fff";x.fillRect(0,0,W,H);
  // হেডার
  let g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,"#06301f");g.addColorStop(1,"#0d7a4a");x.fillStyle=g;x.fillRect(0,0,W,210);
  let lg=await loadLogo();if(lg)x.drawImage(lg,30,18,174,174);
  x.fillStyle="#fff";x.textBaseline="alphabetic";x.font="800 46px "+F;x.fillText("ব্রাদার্স পোল্ট্রি ফার্ম",224,98);
  x.fillStyle="#fff";x.font="600 25px "+F;x.fillText("📞 ০১৭১৪৬৫২২২৬",226,132);
  x.fillStyle="#ffe08a";x.font="600 26px "+F;x.fillText("বিক্রয় মেমো / রসিদ",224,166);
  x.fillStyle="#bfe9d3";x.font="500 20px "+F;x.fillText("মেমো নং: "+bn(idx+1)+" • "+(r.date||""),224,196);
  // গ্রাহক
  x.fillStyle="#0a4a2f";x.font="700 28px "+F;x.fillText("ক্রেতা: "+(r.customer||"—"),40,272);
  x.strokeStyle="#cfe3d8";x.lineWidth=2;x.beginPath();x.moveTo(40,292);x.lineTo(W-40,292);x.stroke();
  let q=+r.qty||0,w=+r.weight||0,rate=+r.rate||0,tot=w*rate,paid=+r.paid||0,due=tot-paid;
  let rows=[["মুরগির সংখ্যা",bn(q)+" টি"],["মোট ওজন",fb(w)+" কেজি"],["গড় ওজন",q?fb(w/q)+" কেজি/মুরগি":"—"],["দর",fb(rate,0)+" টাকা/কেজি"]];
  let y=345;
  rows.forEach((rw,i)=>{if(i%2===0){x.fillStyle="#f3faf6";x.fillRect(40,y-38,W-80,58)}x.fillStyle="#445";x.font="500 26px "+F;x.textAlign="left";x.fillText(rw[0],56,y);x.fillStyle="#111";x.font="700 26px "+F;x.textAlign="right";x.fillText(rw[1],W-56,y);y+=58});
  x.textAlign="left";
  // পাল্লা
  let pl=PL0;
  if(pl.length){y+=10;x.fillStyle="#0a4a2f";x.font="700 22px "+F;x.fillText("পাল্লা অনুযায়ী",56,y);y+=14;
   x.fillStyle="#556";x.font="500 21px "+F;
   pl.slice(0,20).forEach((p,i)=>{let col=i<10?0:1,row=i%10;x.fillText("পাল্লা "+bn(i+1)+": "+bn(p.qty)+" টি, "+fb(p.weight)+" কেজি",col?(W/2+10):56,y+(row+1)*34)});
   y+=PLR*34;
   if(pl.length>20){y+=34;x.fillText("... আরও "+bn(pl.length-20)+" টি পাল্লা (মোট "+bn(pl.length)+" টি)",56,y)}
   y+=40}
  y+=30;
  // মোট
  x.fillStyle="#0a4a2f";x.fillRect(40,y-40,W-80,70);x.fillStyle="#fff";x.font="700 30px "+F;x.fillText("মোট টাকা",60,y+6);x.textAlign="right";x.fillText("৳"+fb(tot,0),W-60,y+6);x.textAlign="left";y+=70;
  x.fillStyle="#445";x.font="600 26px "+F;x.fillText("জমা / পরিশোধ",60,y+10);x.textAlign="right";x.fillStyle="#0d7a4a";x.fillText("৳"+fb(paid,0),W-60,y+10);x.textAlign="left";y+=62;
  x.fillStyle=due>0?"#fdecea":"#e8f7ee";x.fillRect(40,y-38,W-80,64);x.fillStyle=due>0?"#c62828":"#0d7a4a";x.font="800 30px "+F;x.fillText(due>0?"বাকি":"পরিশোধিত",60,y+4);x.textAlign="right";x.fillText(due>0?"৳"+fb(due,0):"✔ বাকি নেই",W-60,y+4);x.textAlign="left";
  // ফুটার
  {let sg=await loadSign();if(sg){let sw=150,sh=sw*sg.height/sg.width;x.imageSmoothingQuality="high";x.drawImage(sg,W-175-sw/2,H-136-sh,sw,sh)}}
  x.strokeStyle="#999";x.lineWidth=1.5;x.beginPath();x.moveTo(W-300,H-130);x.lineTo(W-50,H-130);x.stroke();
  x.fillStyle="#667";x.font="500 20px "+F;x.textAlign="center";x.fillText("কর্তৃপক্ষের স্বাক্ষর",W-175,H-100);
  x.textAlign="left";x.fillStyle="#0a4a2f";x.font="700 26px "+F;x.fillText("ধন্যবাদ, আবার আসবেন 🙏",50,H-100);
  x.fillStyle="#aab";x.font="500 16px "+F;x.fillText("ব্রাদার্স পোল্ট্রি ফার্ম • ০১৭১৪৬৫২২২৬",50,H-60);
  return c;
 }
 window.memoOpen=async function(i){
  let r=state.sales[i];if(!r)return;cur={r:r,i:i};
  let c=await draw(r,i);cur.c=c;
  document.getElementById("infoTitle").textContent="🧾 বিক্রির মেমো";
  document.getElementById("infoBody").innerHTML='<img id="memoImg" src="'+c.toDataURL("image/png")+'" style="width:100%;border-radius:10px;background:#fff">'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="tbtn" onclick="memoOut(\'jpg\',\'save\')">🖼️ JPG সেভ</button><button class="tbtn" onclick="memoOut(\'pdf\',\'save\')">📄 PDF সেভ</button><button class="tbtn" onclick="memoOut(\'jpg\',\'share\')">📤 শেয়ার</button><button class="tbtn" onclick="memoPrint()">🖨️ প্রিন্ট</button></div>';
  document.getElementById("infoModal").classList.add("show");
 };
 window.memoOut=async function(kind,mode){
  if(!cur)return;
  let base="memo-"+toEn((cur.r.customer||"customer")).replace(/[^\wঀ-৿]+/g,"_")+"-"+(cur.r.date||""),files=[];
  if(kind==="pdf")files.push(new File([await outPdf([cur.c])],base+".pdf",{type:"application/pdf"}));
  else files.push(new File([await outJpg(cur.c)],base+".jpg",{type:"image/jpeg"}));
  if(mode==="share")await outShare(files);else outSave(files);
 };
 window.memoPrint=function(){
  if(!cur)return;let u=cur.c.toDataURL("image/png"),f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);
  let d=f.contentWindow.document;d.open();d.write('<html><head><style>@page{margin:10mm}body{margin:0}img{width:100%}</style></head><body><img src="'+u+'"></body></html>');d.close();
  f.onload=function(){};setTimeout(()=>{f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),2000)},300);
 };
})();


/* ── শাওন নামে টোকা দিলে ইমোজির আতশবাজি ── */
(function(){
 const n=document.getElementById("hhName");if(!n)return;
 const E=["✨","⭐","🐔","🐥","🥚","🌾","💫","🎉","💚","🌟"];
 n.addEventListener("click",function(ev){
  n.classList.remove("pop");void n.offsetWidth;n.classList.add("pop");
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const r=n.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(let i=0;i<16;i++){
   const s=document.createElement("span");s.textContent=E[Math.floor(Math.random()*E.length)];
   s.style.cssText="position:fixed;left:"+cx+"px;top:"+cy+"px;font-size:"+(14+Math.random()*16)+"px;pointer-events:none;z-index:99999;will-change:transform,opacity";
   document.body.appendChild(s);
   const ang=Math.random()*Math.PI*2,d=50+Math.random()*90,dx=Math.cos(ang)*d,dy=Math.sin(ang)*d-30;
   const an=s.animate([{transform:"translate(-50%,-50%) scale(.3) rotate(0)",opacity:1},{transform:"translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px)) scale(1.1) rotate("+(Math.random()*360-180)+"deg)",opacity:1,offset:.6},{transform:"translate(calc(-50% + "+dx*1.1+"px),calc(-50% + "+(dy+60)+"px)) scale(.6)",opacity:0}],{duration:900+Math.random()*500,easing:"cubic-bezier(.2,.7,.3,1)"});
   an.onfinish=()=>s.remove();
  }
 });
})();

// ══════ রোগ ও প্রতিকার ══════
const DIS_DATA=[{"n": "বার্ড ফ্লু (অ্যাভিয়ান ইনফ্লুয়েঞ্জা)", "e": "🚨", "t": ["হঠাৎ", "শ্বাস", "ফোলা", "চোখ-মাথা", "চামড়া-পালক", "পা/হাঁটা"], "urgent": 1, "s": "হঠাৎ একসাথে অনেক মুরগি মরা, ঝুঁটি ও মুখ ফোলা বা নীলচে, পায়ে লালচে দাগ, শ্বাসকষ্ট, খাবার একদম বন্ধ।", "r": "নিজে চিকিৎসা করার চেষ্টা করবেন না। সাথে সাথে স্থানীয় প্রাণিসম্পদ অফিস বা ডাক্তারকে জানান। অসুস্থ ও মরা মুরগি আলাদা রাখুন, বাইরের মানুষ ও গাড়ি ঢুকতে দেবেন না। মরা মুরগি খালি হাতে ধরবেন না।", "p": "খামারে বাইরের লোক ও পাখি ঢুকতে না দেওয়া, ঢোকার মুখে জুতা ডুবানোর জীবাণুনাশক রাখা, হাঁস-মুরগি বা অন্য পাখির সাথে মেশাবেন না।", "m": "কোনো ওষুধ নেই। চিকিৎসার চেষ্টা না করে প্রাণিসম্পদ অফিসকে জানান।", "c": "ভাইরাস। সাধারণত যেকোনো বয়সে হয়। বন্য পাখি/হাঁস, মরা পাখি, গাড়ি, খাঁচা, জুতা ও পানির মাধ্যমে ছড়ায়। অতি-তীব্র রূপে ২৪–৪৮ ঘণ্টায় প্রায় সব মুরগি মারা যেতে পারে।", "l": [["হঠাৎ ও মৃত্যু", ["কোনো আগের লক্ষণ ছাড়াই হঠাৎ অনেক মুরগি মরা", "২–৩ দিনে মৃত্যুহার ৯০–১০০% পর্যন্ত যেতে পারে", "ভোরে গিয়ে একসাথে অনেক মরা পাওয়া"]], ["মাথা ও মুখ", ["ঝুঁটি ও গলার লতি ফুলে যাওয়া, নীলচে-বেগুনি রং", "মুখ-মাথা-চোখের চারপাশ ফোলা", "চোখ দিয়ে পানি বা আঠালো স্রাব", "ঝুঁটির মাথায় কালচে রক্ত জমা দাগ"]], ["পা ও চামড়া", ["পায়ের শঙ্কে (হকের নিচে) লালচে রক্তের দাগ", "চামড়ার নিচে রক্তক্ষরণ", "পা ফুলে যাওয়া"]], ["শ্বাস ও ডাক", ["কাশি, হাঁচি, ঘড়ঘড় শব্দ, হাঁ করে শ্বাস", "নাক-মুখ দিয়ে সর্দি/পানি"]], ["খাওয়া ও পায়খানা", ["খাবার-পানি হঠাৎ প্রায় বন্ধ", "সবুজ-সাদা পাতলা পায়খানা", "ঝিমিয়ে বসে থাকা, পালক খাড়া"]], ["স্নায়ু", ["কাঁপুনি, ঘাড় বাঁকা, হাঁটতে না পারা বা চক্কর দেওয়া (কিছু ক্ষেত্রে)"]]], "pm": [["চামড়া ও চর্বি", "চামড়ার নিচে ও পায়ের শঙ্কে রক্তক্ষরণ"], ["ট্রাকিয়া (শ্বাসনালী)", "রক্তে ভরা, লালচে প্রদাহ, শ্লেষ্মা"], ["প্রোভেন্ট্রিকুলাস (গ্রন্থিল পাকস্থলী)", "গ্রন্থির মাথায় পিনপয়েন্ট রক্তবিন্দু (খুব গুরুত্বপূর্ণ)"], ["জিজার্ড (পেষণ থলি)", "খোসার নিচে রক্তক্ষরণ, উঠে আসা খোসা"], ["অন্ত্র", "ডিউডেনাম ও সিকাল টনসিলে রক্তক্ষরণ"], ["হৃদপিণ্ড", "হৃদপিণ্ডের চর্বিতে ও পেশিতে রক্তবিন্দু"], ["ফুসফুস", "জমাট, রক্তে ভরা, পানি জমা"], ["ডিমের কুসুম/ডিম্বাশয় (লেয়ারে)", "ফেটে যাওয়া বা রক্তাক্ত কুসুম"], ["মগজ", "কখনো রক্ত জমা ও ফোলা"]], "df": "রানিক্ষেত, ফাউল কলেরা, গরমে হঠাৎ মৃত্যু। পার্থক্য: ঝুঁটি-মুখ ফোলা আর পায়ে লালচে রক্তক্ষরণ একসাথে দেখলে সন্দেহ বেশি। ল্যাবে নমুনা ছাড়া নিশ্চিত হওয়া যায় না।"}, {"n": "রানিক্ষেত (Newcastle)", "e": "🦠", "t": ["পায়খানা", "শ্বাস", "স্নায়ু", "হঠাৎ", "চোখ-মাথা"], "s": "সবুজ-সাদা পাতলা পায়খানা, কাশি ও শ্বাসকষ্ট, ঘাড় বাঁকা বা মাথা ঘুরিয়ে পড়ে যাওয়া, খাবার কমে যাওয়া, হঠাৎ বেশি মৃত্যু।", "r": "ভাইরাস রোগ, সরাসরি ওষুধ নেই। পানিতে ভিটামিন ও ইলেক্ট্রোলাইট দিন, ঘর গরম-ঠান্ডা সামলান। দ্বিতীয় ব্যাকটেরিয়া সংক্রমণ আটকাতে ডাক্তারের পরামর্শে ওষুধ দিন। অসুস্থগুলো আলাদা করুন।", "p": "সময়মতো টিকা দেওয়া (অ্যাপের ভ্যাকসিন শিডিউল দেখুন), জীবনিরাপত্তা মানা, নতুন বাচ্চা আর পুরোনো মুরগি আলাদা রাখা।", "m": "ভাইরাসের ওষুধ নেই। সহায়ক: ইলেক্ট্রোলাইট/ওআরএস, গ্লুকোজ, ভিটামিন-সি, মাল্টিভিটামিন (এ, ডি৩, ই, বি-কমপ্লেক্স), লিভার টনিক। দ্বিতীয় সংক্রমণ ঠেকাতে ডাক্তারের দেওয়া অ্যান্টিবায়োটিক (যেমন ডক্সিসাইক্লিন বা অ্যামোক্সিসিলিন)।", "c": "ভাইরাস (প্যারামিক্সো)। বাতাস, ধূলা, মল, মানুষ-গাড়ির মাধ্যমে খুব দ্রুত ছড়ায়। টিকা না থাকলে বা টিকা ব্যর্থ হলে সব বয়সে হয়; বাচ্চায় মৃত্যু বেশি। ৩–৬ দিনের মধ্যে লক্ষণ আসে।", "l": [["শ্বাস", ["হাঁচি, কাশি, নাকে ঘড়ঘড় শব্দ", "হাঁ করে শ্বাস নেওয়া, গলা লম্বা করে শ্বাস", "নাক-মুখ দিয়ে পিচ্ছিল স্রাব", "শ্বাসের সাথে 'ক্যাক' শব্দ"]], ["পায়খানা", ["সবুজ বা হলদে-সবুজ পানির মতো পায়খানা", "কখনো রক্ত মেশানো"]], ["স্নায়ু", ["ঘাড় বাঁকা বা মোচড় (টর্টিকোলিস)", "মাথা পেছনে বাঁকানো", "চক্কর দিয়ে ঘোরা", "ডানা ঝুলে পড়া", "এক পা বা দুই পা অবশ হওয়া", "কাঁপুনি, উল্টে পড়া"]], ["খাওয়া ও আচরণ", ["খাবার ও পানি কমে যাওয়া", "ঝিমানো, চোখ বন্ধ করে বসে থাকা", "পালক এলোমেলো"]], ["মাথা-মুখ", ["চোখের চারপাশ ও মাথা ফোলা (ফুলে যাওয়া)", "ঝুঁটি ফ্যাকাশে বা নীলচে"]], ["ডিম/বাড়ন", ["বাড়ন থেমে যাওয়া", "লেয়ারে ডিম হঠাৎ কমা, নরম খোসার বা বিবর্ণ ডিম"]]], "pm": [["ট্রাকিয়া", "ভেতরে প্রদাহ ও রক্তক্ষরণ, শ্লেষ্মা"], ["প্রোভেন্ট্রিকুলাস", "গ্রন্থির মাথায় রক্তের বিন্দু বা রক্তক্ষরণ (সাধারণ চিহ্ন)"], ["অন্ত্র", "অন্ত্রের দেয়ালে আলসার, বোতামের মতো উঁচু রক্তাক্ত/কালচে ক্ষত"], ["সিকাল টনসিল", "ফোলা, রক্তক্ষরণ বা আলসার"], ["পেয়ার্স প্যাচ", "ফোলা ও ক্ষতযুক্ত"], ["এয়ারস্যাক", "ঘোলাটে, ঘন হয়ে যাওয়া"], ["ফুসফুস", "জমাট ও লালচে"], ["মগজ", "বাইরে থেকে বোঝা না গেলেও স্নায়ু লক্ষণ থাকে"]], "df": "ইনফেকশাস ব্রঙ্কাইটিস, বার্ড ফ্লু, সিআরডি। পার্থক্য: স্নায়ু লক্ষণ (ঘাড় বাঁকা) + সবুজ পায়খানা + প্রোভেন্ট্রিকুলাসে রক্তবিন্দু একসাথে থাকলে রানিক্ষেত বেশি সন্দেহ।"}, {"n": "গামবোরো (IBD)", "e": "💧", "t": ["পায়খানা", "ফোলা", "স্নায়ু", "চামড়া-পালক"], "s": "সাধারণত ৩–৬ সপ্তাহে। সাদা পানির মতো পায়খানা, পালক ফুলিয়ে ঝিমানো, পায়ুদ্বার ঠোকরানো, কাঁপুনি, হঠাৎ মৃত্যু বাড়া।", "r": "ভাইরাস রোগ। পানিতে গ্লুকোজ-ইলেক্ট্রোলাইট ও ভিটামিন দিন, প্রচুর পরিষ্কার পানি নিশ্চিত করুন, ঘরে চাপ ও ভিড় কমান। ডাক্তারকে দেখান।", "p": "গামবোরো টিকা সময়মতো দেওয়া (অ্যাপের শিডিউলে ১ম ও ২য় ডোজ), ঘর পরিষ্কার ও শুকনো রাখা।", "m": "ভাইরাসের ওষুধ নেই। সহায়ক: ইলেক্ট্রোলাইট, গ্লুকোজ, ভিটামিন-সি, ভিটামিন-কে ও বি-কমপ্লেক্স, লিভার-কিডনি টনিক। অ্যান্টিবায়োটিক গামবোরোতে কাজ করে না, ডাক্তার চাইলে শুধু দ্বিতীয় সংক্রমণের জন্য দেবেন।", "c": "ভাইরাস (IBD)। ৩–৬ সপ্তাহ বয়সে বেশি হয়। বার্সা অফ ফ্যাব্রিসিয়াস নষ্ট করে রোগ প্রতিরোধ ক্ষমতা কমিয়ে দেয়। লিটার, খাবার, মানুষ, জিনিসপত্রের মাধ্যমে ছড়ায়। হঠাৎ শুরু, ৩–৪ দিনে চূড়ান্ত।", "l": [["পায়খানা", ["সাদা চুনের মতো পানির মতো পাতলা পায়খানা", "পায়ুপথ ও পালক ময়লায় ভেজা", "পায়ু ঠোকরানো"]], ["আচরণ", ["হঠাৎ ঝিমিয়ে পড়া, কুঁজো হয়ে বসে থাকা", "পালক খাড়া, শরীর কাঁপা", "নিজের পায়ুতে ঠোকর মারা", "খাবার একদম বন্ধ", "বেশি পানি খাওয়া শুরু, পরে পানিও বন্ধ"]], ["শরীর", ["ডিহাইড্রেশন, চোখ বসে যাওয়া", "পা ঠান্ডা", "হাঁটতে কষ্ট"]], ["মৃত্যু ধরন", ["হঠাৎ মৃত্যু বাড়ে, ২–৩ দিনে চূড়ান্ত, তারপর কমে", "বেঁচে যাওয়ার পরেও বাড়ন কম ও অন্য রোগ বেশি হয়"]]], "pm": [["বার্সা অফ ফ্যাব্রিসিয়াস", "শুরুতে ফোলা, হলদে জেলির মতো আবরণ, পরে রক্তক্ষরণ; শেষে সঙ্কুচিত ও ধূসর (সবচেয়ে নির্ভরযোগ্য চিহ্ন)"], ["পেশি", "বুক ও উরুর পেশিতে রক্তক্ষরণ"], ["প্রোভেন্ট্রিকুলাস-জিজার্ড সংযোগ", "রক্তক্ষরণ"], ["কিডনি", "ফ্যাকাশে, ইউরেট জমে ফোলা"], ["অন্ত্র", "শ্লেষ্মা ও পানি"], ["স্প্লিন", "ফোলা, ছোট সাদা দাগ কখনো"]], "df": "কক্সিডিওসিস, ই-কোলাই, রানিক্ষেত। পার্থক্য: ৩ সপ্তাহের পর হঠাৎ সাদা পাতলা পায়খানা আর বার্সা ফোলা/রক্তাক্ত হলে গামবোরো।"}, {"n": "কক্সিডিওসিস", "e": "🩸", "t": ["পায়খানা"], "s": "রক্ত বা রক্তমাখা পায়খানা, ঝিমানো, পালক এলোমেলো, খাবার কমে যাওয়া, গা গুটিয়ে বসে থাকা। ভেজা লিটারে বেশি হয়।", "r": "ডাক্তারের পরামর্শে কক্সিডিয়া-নাশক ওষুধ দিন, সাথে ভিটামিন ও পর্যাপ্ত পানি। লিটার শুকনো রাখুন, ভেজা অংশ তুলে ফেলুন।", "p": "লিটার শুকনো রাখা, পানির নিপল বা পাত্র লিক না করা, ঘরে ভিড় না করা, ফিডে ডাক্তারের পরামর্শে প্রতিরোধক ব্যবস্থা।", "m": "অ্যামপ্রোলিয়াম, টলট্রাজুরিল, সালফাকুইনক্সালিন বা সালফাডিমিথক্সিন (সালফা গ্রুপ)। সাথে ভিটামিন-কে ও ভিটামিন-এ। প্রতিরোধে ডিক্লাজুরিল বা কক্সিডিওস্ট্যাট ফিডে।", "c": "প্রোটোজোয়া (আইমেরিয়া)। আর্দ্র ও ভেজা লিটার, বেশি ঘনত্বে বেশি হয়। ২–৬ সপ্তাহে বেশি। জীবাণুযুক্ত মল থেকে ডিম-গুটি (ওওসিস্ট) খেয়ে ছড়ায়। ৪–৭ দিনে লক্ষণ।", "l": [["পায়খানা", ["রক্ত মেশানো পায়খানা (লাল/চকলেটি) — সিকাল ধরন", "বাদামি-কমলা শ্লেষ্মা মেশানো পায়খানা — ক্ষুদ্রান্ত্র ধরন", "পায়ু ও পালক রক্তে/ময়লায় মাখামাখি", "পেট খারাপ ও অপরিপাক খাবার বের হওয়া"]], ["আচরণ", ["ঝিমিয়ে কুঁজো হয়ে বসে থাকা", "পালক এলোমেলো, ডানা ঝুলানো", "খাবার কমে যাওয়া, পানি বেশি", "একসাথে জড়ো হয়ে থাকা"]], ["শরীর", ["ঝুঁটি ও চামড়া ফ্যাকাশে (রক্তশূন্যতা)", "দুর্বল ও রোগা হওয়া", "বাড়ন থেমে যাওয়া", "ওজন একসাথে সমান থাকে না (অসম বাড়ন)"]], ["মৃত্যু", ["কয়েক দিনে হঠাৎ মৃত্যু", "বেঁচে যাওয়া মুরগিতে FCR খারাপ"]]], "pm": [["সিকা (অন্ধান্ত্র)", "ফোলা, রক্ত ও জমাট রক্তে ভরা, পনিরের মতো ঝিল্লি"], ["ক্ষুদ্রান্ত্র", "ফোলা, দেয়াল পুরু, ছোট সাদা-ধূসর দাগ, রক্ত ও শ্লেষ্মা"], ["অন্ত্রের বাইরের দেয়াল", "সাদা ছোপ বা সিঁড়ির মতো দাগ"], ["অন্ত্রের ভেতরের বিষয়বস্তু", "বাদামি-কমলা বা রক্তাক্ত পানি, গ্যাস"], ["লিভার", "ফ্যাকাশে কখনো"], ["অন্যান্য", "রক্তশূন্যতা, শরীর ফ্যাকাশে"]], "df": "নেক্রোটিক এন্টেরাইটিস, গামবোরো, ই-কোলাই। পার্থক্য: রক্ত মেশানো পায়খানা + সিকা রক্তে ভরা হলে কক্সিডিওসিস প্রায় নিশ্চিত।"}, {"n": "ই-কোলাই / কোলিব্যাসিলোসিস", "e": "🫁", "t": ["শ্বাস", "ফোলা", "পায়খানা", "নাভি/বাচ্চা"], "s": "শ্বাসকষ্ট, পেট ফোলা, ঝিমানো, হলদেটে বা সবজেটে পায়খানা। ছোট বাচ্চায় নাভি ফোলা বা পচা, বাচ্চা দুর্বল।", "r": "ব্যাকটেরিয়া রোগ। ডাক্তারের পরামর্শে উপযুক্ত অ্যান্টিবায়োটিক দিন এবং কোর্স শেষ করুন। ওষুধের উইথড্রয়াল সময় মেনে তবেই মুরগি বেচুন।", "p": "ঘর, পানি ও লিটার পরিষ্কার রাখা, ধুলা ও অ্যামোনিয়া কমানো, বাতাস চলাচল ভালো রাখা, পানির ট্যাংক নিয়মিত ধোয়া।", "m": "ডাক্তার সংবেদনশীলতা বুঝে ঠিক করবেন। সাধারণত ব্যবহৃত: অ্যামোক্সিসিলিন, ডক্সিসাইক্লিন, ফ্লরফেনিকল, এনরোফ্লক্সাসিন। সাথে প্রোবায়োটিক ও ইলেক্ট্রোলাইট।", "c": "ব্যাকটেরিয়া (E. coli)। নোংরা পানি-লিটার-ধূলা, অতিরিক্ত অ্যামোনিয়া, ভাইরাস বা সিআরডির পর দ্বিতীয় সংক্রমণ হিসেবে বেশি আসে। ২–৬ সপ্তাহে বেশি; ডিমের খোসায় ফাটা থাকলে হ্যাচারি থেকেও আসে।", "l": [["শ্বাস", ["শ্বাসকষ্ট, ঘড়ঘড়, হাঁ করে শ্বাস", "শ্বাসে 'শিস' শব্দ"]], ["পেট ও পায়খানা", ["সবুজ-হলদে বা সাদা পাতলা পায়খানা", "পেট ফোলা, ঝুলে থাকা"]], ["আচরণ", ["ঝিমানো, ঝিমিয়ে চোখ বন্ধ", "পালক এলোমেলো", "খাবার কমে যাওয়া"]], ["শরীর", ["বাড়ন কম, রোগা", "পা বা সন্ধি ফোলা (কখনো)", "মাথা ফুলে যাওয়া (সোয়েলেড হেড, কখনো)"]], ["মৃত্যু", ["বিচ্ছিন্ন মৃত্যু, কয়েকদিনে বাড়ে", "সুস্থ হয়েও FCR খারাপ"]]], "pm": [["পেরিহেপাটাইটিস", "লিভারের উপর সাদা-হলুদ পনিরের মতো আবরণ"], ["পেরিকার্ডাইটিস", "হৃদপিণ্ডের ঝিল্লিতে সাদা-হলুদ ঘন আবরণ ও পানি"], ["এয়ারস্যাকুলাইটিস", "এয়ারস্যাকে ঘোলাটে পনিরের মতো আবরণ"], ["পেরিটোনাইটিস", "পেটের ভেতরে পুঁজ, দুর্গন্ধ"], ["লিভার", "ফোলা, গাঢ় বা সবুজ-কালচে ছোপ"], ["কখনো", "সন্ধি ও মাথায় পুঁজ"]], "df": "সিআরডি (সাথে ই-কোলাই থাকে), গামবোরো, ফাউল কলেরা। পার্থক্য: লিভার ও হৃদপিণ্ডের উপর সাদা-হলুদ 'ঢাকনা' ই-কোলাইয়ের বিশেষ চিহ্ন।"}, {"n": "সিআরডি (শ্বাসনালীর দীর্ঘস্থায়ী রোগ)", "e": "🤧", "t": ["শ্বাস"], "s": "নাক-চোখ দিয়ে পানি পড়া, হাঁচি-কাশি, শ্বাসের ঘড়ঘড় শব্দ, চোখ ফোলা, বৃদ্ধি কমে যাওয়া।", "r": "ডাক্তারের পরামর্শে মাইকোপ্লাজমা ও ব্যাকটেরিয়ার ওষুধ দিন। ঘরের বাতাস চলাচল ও তাপমাত্রা ঠিক রাখুন, অ্যামোনিয়া কমান।", "p": "ঠান্ডা ও আর্দ্রতা সামলানো, ঘরে ধুলা ও অ্যামোনিয়া কম রাখা, সুস্থ বাচ্চা সংগ্রহ।", "m": "টাইলোসিন, ডক্সিসাইক্লিন, টিয়ামুলিন, এরিথ্রোমাইসিন বা এনরোফ্লক্সাসিন (ডাক্তারের পরামর্শে)। সাথে ভিটামিন-এ ও সি।", "c": "মাইকোপ্লাজমা (MG) + তার সাথে ই-কোলাই ও অ্যামোনিয়া। ধীরে ধীরে বাড়ে। ঠান্ডা, ধূলা, অতিরিক্ত ভিড়, ভেজা ঘরে বেশি। ডিমের মাধ্যমেও ছড়ায়।", "l": [["শ্বাস", ["নাক দিয়ে সর্দি, নাক বন্ধ", "হাঁচি, ঘড়ঘড় শব্দ (বিশেষ করে রাতে ও ভোরে)", "কাশি", "শ্বাস নেওয়ার সময় 'টক টক' বা ঘরঘর শব্দ"]], ["চোখ-মুখ", ["চোখে পানি, ফেনা, চোখ ফুলে যাওয়া", "সাইনাস ফোলা (চোখের নিচে)", "চোখ বন্ধ থাকা"]], ["আচরণ", ["খাবার কিছু কমে, বাড়ন কম", "মাঝেমাঝে মাথা ঝাঁকানো"]], ["শরীর", ["রোগা, FCR খারাপ", "কখনো পা ফোলা"]]], "pm": [["ট্রাকিয়া", "ফেনা বা পনিরের মতো আবরণ"], ["এয়ারস্যাক", "ঘোলাটে, ফেনাযুক্ত, পরে পনিরের মতো ঘন"], ["নাকের সাইনাস", "শ্লেষ্মা-পুঁজ"], ["ফুসফুস", "জমাট ও কিছু ক্ষত"], ["অন্যান্য", "ই-কোলাই যুক্ত হলে লিভার-হৃদপিণ্ডে আবরণ"]], "df": "রানিক্ষেত (হালকা), আইবি, করাইজা। পার্থক্য: ধীরে ধীরে বাড়ে, মৃত্যু কম কিন্তু বাড়ন ও FCR নষ্ট, এয়ারস্যাকে ফেনা।"}, {"n": "সাদা পাতলা পায়খানা (সালমোনেলা / পুলোরাম) — ছোট বাচ্চা", "e": "🐣", "t": ["পায়খানা", "হঠাৎ", "নাভি/বাচ্চা"], "s": "প্রথম ১–২ সপ্তাহে। সাদা চুনের মতো পায়খানা, পায়ুদ্বারে লেগে থাকা, ঝিমানো, বাচ্চা জড়ো হয়ে থাকা, মৃত্যু বাড়া।", "r": "ডাক্তারের পরামর্শে উপযুক্ত ওষুধ দিন। উষ্ণ ও পরিষ্কার পরিবেশ দিন, পানিতে গ্লুকোজ-ভিটামিন দিন।", "p": "ভালো মানের সুস্থ বাচ্চা কেনা, ঘর আগে থেকে জীবাণুমুক্ত ও গরম রাখা, ব্রুডিংয়ে সঠিক তাপ।", "m": "অ্যামোক্সিসিলিন, ফ্লরফেনিকল বা এনরোফ্লক্সাসিন (ডাক্তারের পরামর্শে)। সাথে গ্লুকোজ, ভিটামিন ও প্রোবায়োটিক।", "c": "ব্যাকটেরিয়া (সালমোনেলা পুলোরাম/গ্যালিনারাম)। ডিমের ভেতর থেকে বা হ্যাচারি থেকে আসে। ১–১৪ দিন বয়সী বাচ্চায় বেশি মৃত্যু।", "l": [["পায়খানা", ["সাদা চুনের মতো পাতলা পায়খানা", "পায়ুর চারপাশে সাদা চুন লেগে শুকিয়ে যাওয়া (পেস্টি ভেন্ট)"]], ["আচরণ", ["একসাথে জড়ো হয়ে গরমের উৎসের কাছে বসে থাকা", "ঝিমানো, চোখ বন্ধ", "পালক এলোমেলো", "খাবার না খাওয়া"]], ["শরীর", ["পেট ফোলা", "ডানা ঝুলে যাওয়া", "কিছু বাচ্চায় শ্বাসকষ্ট", "কিছুতে সন্ধি ফোলা/খুঁড়িয়ে হাঁটা"]], ["মৃত্যু", ["১ম–২য় সপ্তাহে ৫–৩০% বা বেশি মৃত্যু", "সুস্থরা দুর্বল ও কম বাড়ন"]]], "pm": [["কুসুম থলি", "না শোষা, সবুজ-হলুদ/ছানাকাটা"], ["লিভার", "ফোলা, ফ্যাকাশে বা সাদা ছোট দাগ"], ["ফুসফুস", "সাদা-ধূসর গুটি (নোডিউল)"], ["হৃদপিণ্ড", "সাদা গুটি"], ["অন্ত্র", "প্রদাহ, সিকায় পনিরের মতো জমাট"], ["জিজার্ড", "সাদা গুটি"]], "df": "কুসুম থলির সংক্রমণ, ই-কোলাই, অ্যাসপারজিলোসিস। পার্থক্য: ১ম সপ্তাহে সাদা চুনের মতো পায়খানা আর লিভার-হৃদপিণ্ডে গুটি হলে সালমোনেলা।"}, {"n": "গরমে হাঁসফাঁস (হিট স্ট্রেস)", "e": "🌡️", "t": ["শ্বাস", "হঠাৎ"], "s": "হা করে হাঁপানো, ডানা ঝুলিয়ে মাটিতে বসা, খুব বেশি পানি খাওয়া, খাবার কম খাওয়া, দুপুরে হঠাৎ মৃত্যু।", "r": "এখনই ঘরে বাতাস বাড়ান, ফ্যান বা জানালা খুলুন, ঠান্ডা পরিষ্কার পানি দিন, পানিতে ইলেক্ট্রোলাইট ও ভিটামিন-সি দিন। দুপুরে ঘরে ঢোকা ও ধরাধরি কমান, ভোরে বা রাতে ফিড দিন।", "p": "ঘরে ভিড় কম রাখা, ছাদে পানি বা ছায়া, বাতাস চলাচল, পর্যাপ্ত ঠান্ডা পানির ব্যবস্থা।", "m": "ইলেক্ট্রোলাইট, ভিটামিন-সি, বেটেইন বা ওআরএস পানিতে। ওষুধের চেয়ে ঘর ঠান্ডা করা ও পানি বেশি জরুরি।", "c": "পরিবেশ। তাপমাত্রা ৩২°সে এর ওপর, আর্দ্রতা বেশি, ভিড়, বাতাস বন্ধ ঘর। ৩ সপ্তাহের পর বড় বাড়ন্ত মুরগি বেশি আক্রান্ত।", "l": [["শ্বাস", ["মুখ হাঁ করে হাঁপানো (পেন্টিং)", "শ্বাস দ্রুত ও গভীর", "গলা ফুলে ওঠানামা"]], ["শরীর", ["ডানা শরীর থেকে আলগা করে রাখা", "মাটিতে শুয়ে থাকা, ছড়িয়ে পড়া", "ঝুঁটি লাল থেকে বেগুনি/ফ্যাকাশে", "পা ফ্যাকাশে"]], ["পানি-খাবার", ["খাবার কমে যাওয়া", "পানি অনেক বেশি খাওয়া", "পাতলা পায়খানা (বেশি পানির কারণে)"]], ["মৃত্যু", ["দুপুরে বা বিকেলে হঠাৎ মৃত্যু", "মোটা, বড় মুরগি আগে মরে", "ডিমের লেয়ারে ডিম কমে ও পাতলা খোসা"]]], "pm": [["সাধারণ", "ঝুঁটি নীল, শরীর ফ্যাকাশে, বুকের পেশি লালচে"], ["ফুসফুস", "রক্তে ভরা, লালচে"], ["হৃদপিণ্ড", "ফ্যাকাশে বা ডান দিক ফোলা"], ["পেশি", "রক্তশূন্য, শুষ্ক"], ["পাকস্থলী", "খাবার কম বা শুকনো"]], "df": "বার্ড ফ্লু, রানিক্ষেত। পার্থক্য: গরম দিনে ঘরের ভেতর বাতাস বন্ধ থাকলে ও ঠান্ডা করার পর মুরগি স্বাভাবিক হলে হিট স্ট্রেস।"}, {"n": "ঠান্ডা লাগা / ব্রুডিংয়ে ভুল", "e": "🥶", "t": ["হঠাৎ", "নাভি/বাচ্চা", "পা/হাঁটা"], "s": "বাচ্চা এক জায়গায় জড়ো হয়ে গাদাগাদি করা, কাঁপা, ডাকাডাকি, খাবার কম, নাভি না শুকানো।", "r": "ব্রুডারে তাপ ঠিক করুন, ঘরের কোণা গোল করে ঘিরে দিন, ঠান্ডা বাতাস আটকান, গরম পানি ও ভিটামিন দিন।", "p": "বাচ্চা আসার আগেই ঘর গরম করা, বাচ্চার ছড়িয়ে থাকা দেখে তাপ বোঝা (জড়ো = ঠান্ডা, দূরে সরে = গরম)।", "m": "গ্লুকোজ, মাল্টিভিটামিন ও ইলেক্ট্রোলাইট। আগে ঘরের তাপ ঠিক করুন। সংক্রমণ হলে ডাক্তারের দেওয়া অ্যান্টিবায়োটিক।", "c": "পরিবেশ ও ব্যবস্থাপনা। ব্রুডিং তাপমাত্রা কম, বাতাসের ঝাপটা, রাতে তাপ কমে যাওয়া। ১–১০ দিনের বাচ্চা বেশি আক্রান্ত।", "l": [["আচরণ", ["বাচ্চা একসাথে জড়ো হয়ে স্তূপ করে বসে থাকা (পাইলিং)", "কিচিরমিচির আওয়াজ বেশি, শ্বাস দ্রুত", "ব্রুডারের নিচে ঘেঁষে থাকা", "খাবার-পানি খেতে না যাওয়া"]], ["শরীর", ["পা ও গা ঠান্ডা", "কাঁপা, পালক খাড়া", "বাড়ন কম ও অসম", "পায়ে ফোলা (সুপ্ত)"]], ["মৃত্যু", ["চাপা পড়ে মৃত্যু (স্মাদারিং)", "কয়েক দিনে মৃত্যুহার বেড়ে যায়", "সাদা পায়খানা/ওমফালাইটিস দ্বিতীয় সংক্রমণ হিসেবে যোগ হয়"]]], "pm": [["সাধারণ", "কুসুম থলি না শোষা, পেট ফোলা"], ["ফুসফুস", "রক্ত জমা, ফুলে ওঠা"], ["অন্ত্র", "পানি জমা বা খালি"], ["পা", "ঠান্ডা, নীলচে"]], "df": "সাদা পাতলা পায়খানা, ওমফালাইটিস। পার্থক্য: ব্রুডারের তাপ ঠিক করলে মুরগি ছড়িয়ে স্বাভাবিক হয়।"}, {"n": "পেটে পানি জমা (অ্যাসাইটিস)", "e": "🫧", "t": ["ফোলা", "শ্বাস", "হঠাৎ"], "s": "পেট ফুলে নরম, হাঁটতে কষ্ট, ঝুঁটি নীলচে, শ্বাসকষ্ট। দ্রুত বাড়া ব্রয়লারে বেশি হয়।", "r": "নির্দিষ্ট ওষুধ নেই। ঘরে অক্সিজেন বাড়াতে বাতাস চলাচল ঠিক করুন, ঠান্ডা সামলান, ফিড সীমিত করে বৃদ্ধির গতি কমানো যায়। ডাক্তারকে দেখান।", "p": "বাতাস চলাচল ভালো রাখা, ঠান্ডা ও ধুলা কমানো, ফিডে লবণ ও পুষ্টি ঠিক রাখা।", "m": "নির্দিষ্ট ওষুধ নেই। ভিটামিন-ই ও সি সহায়ক। কোনো মূত্রবর্ধক বা অন্য ওষুধ ডাক্তারের পরামর্শ ছাড়া নয়।", "c": "বিপাকীয় রোগ। দ্রুত বাড়ন, উচ্চ প্রোটিন ফিড, কম অক্সিজেন, ঠান্ডা, ধূলা, উঁচু এলাকা, ফুসফুস-হৃদযন্ত্রের উপর চাপ। ৩ সপ্তাহের পর বেশি।", "l": [["পেট", ["পেট ফুলে ঝুলে যাওয়া, নরম পানির বেলুনের মতো", "চাপ দিলে 'ছলাৎ' শব্দ", "হাঁটতে কষ্ট, পেট মাটিতে ঠেকে যায়"]], ["শ্বাস", ["হাঁপানো, হাঁ করে শ্বাস", "দৌড়ালে বা ধরলে বেশি কষ্ট"]], ["রং ও আচরণ", ["ঝুঁটি নীলচে/বেগুনি", "পা ও মুখ নীলচে", "অলস, বসে থাকা", "ভিড়ের মধ্যে শ্বাস কষ্টে মৃত্যু"]], ["মৃত্যু", ["দ্রুত বাড়া মুরগি হঠাৎ মরে", "ঠান্ডা বা ভিড়ে বেশি মরে"]]], "pm": [["পেট", "হলুদ-স্বচ্ছ পানি জমা (লিটারে)"], ["হৃদপিণ্ড", "ডান দিক ফোলা, পেরিকার্ডিয়ামে পানি"], ["লিভার", "ফোলা, কখনো সঙ্কুচিত, ফাইব্রিন"], ["ফুসফুস", "ভিড় ও পানি জমা"], ["কিডনি", "ফোলা"]], "df": "ই-কোলাই, হার্ট ফেইলিউর। পার্থক্য: পেটে হলুদ স্বচ্ছ পানি জমা এবং হৃদপিণ্ড ফোলা।"}, {"n": "পা বাঁকা / হাঁটতে না পারা", "e": "🦵", "t": ["স্নায়ু", "পা/হাঁটা"], "s": "পা বেঁকে যাওয়া, খুঁড়িয়ে হাঁটা, বসে থাকা, নড়তে না চাওয়া। দ্রুত বাড়ায় বা ফিডে ঘাটতি থেকে হতে পারে।", "r": "ফিডের মান ও ক্যালসিয়াম-ফসফরাস-ভিটামিন ডি ঠিক আছে কিনা দেখুন। ডাক্তারের পরামর্শে ভিটামিন-মিনারেল দিন। দুর্বলগুলো আলাদা করে পানি-খাবার সামনে দিন।", "p": "ভালো মানের ফিড, লিটার শুকনো রাখা, পর্যাপ্ত আলো ও হাঁটার জায়গা।", "m": "ক্যালসিয়াম, ফসফরাস, ভিটামিন-ডি৩ ও ভিটামিন-ই (সেলেনিয়ামসহ), বি-কমপ্লেক্স (বিশেষ করে কোলিন, বায়োটিন)।", "c": "পুষ্টি ও ব্যবস্থাপনা। দ্রুত বাড়ন, ক্যালসিয়াম-ফসফরাস-ভিটামিন D এর অভাব বা অনুপাত ভুল, পিছলা মেঝে, ভারী ওজন। বা কখনো সংক্রমণ (স্ট্যাফিলোকক্কাস)।", "l": [["হাঁটা", ["পা বাইরের দিকে বাঁকা (ভ্যালগাস/ভারাস)", "হাঁটতে খুঁড়িয়ে চলা বা একদম না হাঁটা", "বসে থাকা, হাঁটুতে ভর দিয়ে (হক) চলা", "হাঁটুর জয়েন্ট ফোলা"]], ["পা-হাড়", ["হাড় নরম বা বাঁকা", "পায়ে হাড় সহজে ভেঙে যাওয়া", "পা ফুলে ও গরম হওয়া (সংক্রমণ হলে)"]], ["আচরণ", ["খাবার-পানি পর্যন্ত যেতে না পারা", "দুর্বল হয়ে মরে যাওয়া বা বাকিদের কাছে পায়ে মাড়ানো"]]], "pm": [["হাড়", "নরম, রাবারের মতো বাঁকা, হাড়ের মাথা ফোলা"], ["সন্ধি", "ফোলা, পুঁজ বা তরল (সংক্রমণে)"], ["টিবিয়া (পায়ের হাড়)", "ডিসকন্ড্রোপ্লাসিয়া — হাড়ের মাথায় সাদা অস্বাভাবিক তরুণাস্থি"], ["অন্যান্য", "কিডনি ইউরেট, দুর্বল শরীর"]], "df": "ভিটামিন বি২ অভাব, কেঁচো/অন্য রোগ। পার্থক্য: দ্রুত বাড়া ভারী মুরগিতে বাঁকা পা হলে পুষ্টি/ব্যবস্থাপনা কারণ।"}, {"n": "ছত্রাকের বিষ (আফলাটক্সিন) — নষ্ট ফিড", "e": "🌾", "t": ["হঠাৎ", "পায়খানা", "চামড়া-পালক"], "s": "খাবার কমে যাওয়া, বৃদ্ধি কমে যাওয়া, রক্তশূন্যতা, হঠাৎ মৃত্যু। ফিড স্যাঁতসেঁতে বা গন্ধযুক্ত থাকলে সন্দেহ করুন।", "r": "নষ্ট বা ছত্রাকপড়া ফিড তখনই বন্ধ করুন, নতুন ভালো ফিড দিন, পানিতে ভিটামিন ও লিভার-সহায়ক দিন। ডাক্তারকে জানান।", "p": "ফিড শুকনো ও বাতাস চলাচলের জায়গায় রাখা, মেঝেতে না রেখে পাটাতনের উপর রাখা, পুরোনো ফিড আগে খাওয়ানো।", "m": "মাইকোটক্সিন বাইন্ডার (বেন্টোনাইট বা তৈরি বাইন্ডার), লিভার টনিক (কোলিন, সরবিটল, সিলিমারিন), ভিটামিন-কে, ই ও বি-কমপ্লেক্স।", "c": "বিষ। ভেজা, ছত্রাক পড়া ফিড বা কাঁচামাল (ভুট্টা, সয়াবিন), গরম ও আর্দ্র আবহাওয়া। কম মাত্রায় ধীরে, বেশি মাত্রায় হঠাৎ বিপদ।", "l": [["খাওয়া ও বাড়ন", ["খাবার কম খাওয়া", "বাড়ন থেমে যাওয়া", "FCR খারাপ", "ডিম কমে (লেয়ার)"]], ["শরীর", ["ঝিমানো, পালক এলোমেলো", "রক্তশূন্যতা, ফ্যাকাশে ঝুঁটি", "চামড়ার নিচে রক্তক্ষরণ, ঠোঁট-পায়ে কালচে দাগ", "পা ও পায়ের রং ফ্যাকাশে"]], ["পায়খানা", ["পাতলা বা সবুজ-হলুদ পায়খানা"]], ["স্নায়ু", ["কাঁপুনি, ডানা ঝুলে পড়া (তীব্র)"]], ["মৃত্যু", ["ধীরে ধীরে মৃত্যু বাড়ে", "ইমিউনিটি কমে টিকা ব্যর্থ ও অন্য রোগ বেশি"]]], "pm": [["লিভার", "ফ্যাকাশে বা হলুদ, ফোলা, চর্বিযুক্ত, কখনো শক্ত ও ছোট"], ["কিডনি", "ফ্যাকাশে, ফোলা"], ["পেশি", "রক্তক্ষরণ, বুক ও উরুতে"], ["বার্সা", "ছোট ও সঙ্কুচিত (ইমিউন কমে)"], ["অন্ত্র", "পানি, প্রদাহ"], ["সাধারণ", "চামড়ার নিচে রক্ত দাগ, ফ্যাকাশে শরীর"]], "df": "গামবোরো, কক্সিডিওসিস। পার্থক্য: ফিড বদলের পর শুরু, লিভার হলুদ/ফ্যাকাশে।"}, {"n": "ইনফেকশাস ব্রঙ্কাইটিস (IB)", "e": "🌬️", "t": ["শ্বাস", "ফোলা"], "s": "হাঁচি, কাশি, ঘড়ঘড়, নাক-চোখে পানি, ছোট বাচ্চায় শ্বাসকষ্ট; কিডনিতেও ক্ষতি হতে পারে।", "c": "করোনাভাইরাস। বাতাস ও সংস্পর্শে খুব দ্রুত ছড়ায়। ১–৪ সপ্তাহের বাচ্চায় বেশি; কিছু ধরনে কিডনি আক্রান্ত হয়ে ইউরেট জমে।", "l": [["শ্বাস", ["হাঁচি, কাশি, ঘড়ঘড়", "নাক-চোখে পানি ও ফেনা", "ঘুমে ছোট শ্বাসকষ্ট, রাতে বেশি"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার কম", "পালক এলোমেলো"]], ["কিডনি ধরন", ["পানি বেশি খাওয়া", "পাতলা সাদা পায়খানা (ইউরেট)", "পা শুকনো, মাংসপেশি শুকিয়ে যাওয়া", "হঠাৎ মৃত্যু"]], ["ডিম (লেয়ার)", ["ডিম কমে যাওয়া", "বাঁকা, পাতলা বা ঘোলা খোসা, কুসুম নরম"]]], "pm": [["ট্রাকিয়া", "ফেনা, শ্লেষ্মা, প্রদাহ"], ["এয়ারস্যাক", "ঘোলাটে"], ["কিডনি", "ফোলা, ফ্যাকাশে, ইউরেট জমে (সাদা চুন)"], ["ইউরেটার", "সাদা ইউরেট ভরা"], ["ডিম্বাশয়", "ক্ষতি, কুসুম ছড়ানো (লেয়ারে)"]], "df": "রানিক্ষেত, সিআরডি। পার্থক্য: কিডনিতে ইউরেট আর ডিমের খোসায় সমস্যা আইবির বিশেষ চিহ্ন।", "r": "আলাদা ওষুধ নেই। ভাইরাস রোগে ঘর গরম ও শুকনো রাখুন, ভিটামিন-ইলেক্ট্রোলাইট দিন, ব্যাকটেরিয়ার দ্বিতীয় সংক্রমণ হলে ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক।", "m": "ভিটামিন সি, ইলেক্ট্রোলাইট/গ্লুকোজ; দ্বিতীয় সংক্রমণে (ডাক্তারের পরামর্শে) ডক্সিসাইক্লিন বা এনরোফ্লক্সাসিন জাতীয়; কিডনির জন্য কিডনি টনিক/পটাশিয়াম সাইট্রেট জাতীয়।", "p": "আইবি টিকা সময়মতো দেওয়া, ঘরে ঠান্ডা বাতাস ও ধূলা কম রাখা, ভেন্টিলেশন ঠিক রাখা।"}, {"n": "নেক্রোটিক এন্টেরাইটিস (NE)", "e": "🩸", "t": ["পায়খানা", "হঠাৎ"], "s": "হঠাৎ মৃত্যু, কালচে বা রক্তমাখা পাতলা পায়খানা, ঝিমানো, ফোলা অন্ত্র।", "c": "ব্যাকটেরিয়া (ক্লোস্ট্রিডিয়াম)। কক্সিডিওসিসের পরে, খাবারে প্রোটিন বেশি, ফিড হঠাৎ বদলালে বেশি হয়। ২–৬ সপ্তাহে।", "l": [["হঠাৎ", ["হঠাৎ মৃত্যু, আগের লক্ষণ প্রায় নেই", "একদিনে বেশি মরা", "মরা মুরগি পেট ফুলে থাকে"]], ["পায়খানা", ["কালচে, রক্তমাখা বা বাদামি পাতলা পায়খানা", "ফেনাযুক্ত দুর্গন্ধযুক্ত পায়খানা"]], ["আচরণ", ["ঝিমিয়ে থাকা", "পালক এলোমেলো", "খাবার কমে যাওয়া", "বসে থাকা, ডানা ঝুলানো"]], ["কম আক্রান্ত", ["ক্রনিক ক্ষেত্রে বাড়ন কম ও FCR খারাপ", "দুর্বল ও ফ্যাকাশে"]]], "pm": [["ক্ষুদ্রান্ত্র", "ফোলা, গ্যাসে ভরা, দেয়াল পাতলা, 'টার্কিশ তোয়ালে' মতো পুরু ও ভাঁজযুক্ত পর্দা"], ["অন্ত্রের ভেতর", "কালচে-বাদামি, দুর্গন্ধযুক্ত তরল ও গ্যাস"], ["অন্ত্রের দেয়াল", "ধূসর-হলুদ ঝিল্লি, মৃত কোষ"], ["লিভার", "ফ্যাকাশে বা হলুদ ছোপ"], ["সাধারণ", "দ্রুত পচে যাওয়া শরীর"]], "df": "কক্সিডিওসিস, গামবোরো। পার্থক্য: ক্ষুদ্রান্ত্র গ্যাসে ফোলা, 'তোয়ালে' মতো পর্দা, দুর্গন্ধ।", "r": "ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক। ফিড বদল হলে পুরনো ফিডে ফিরুন বা ধীরে ধীরে বদলান। কক্সিডিওসিস থাকলে একসাথে চিকিৎসা করুন।", "m": "অ্যামোক্সিসিলিন, ব্যাসিট্রাসিন, লিনকোমাইসিন-স্পেকটিনোমাইসিন, টাইলোসিন জাতীয়; সাথে প্রোবায়োটিক ও লিভার টনিক।", "p": "কক্সিডিওসিস নিয়ন্ত্রণে রাখা, ফিড হঠাৎ না বদলানো, লিটার শুকনো রাখা, প্রোবায়োটিক/এসিডিফায়ার ব্যবহার।"}, {"n": "ইনক্লুশন বডি হেপাটাইটিস (IBH)", "e": "🫀", "t": ["হঠাৎ", "ফোলা"], "s": "হঠাৎ মৃত্যু, ফ্যাকাশে ঝুঁটি, ঝিমানো, হৃদপিণ্ডের চারপাশে পানি।", "c": "অ্যাডেনোভাইরাস। ডিম ও লিটারের মাধ্যমে ছড়ায়, প্রায়ই গামবোরো, CIA বা মাইকোটক্সিনের সাথে মিলে বাড়ে। ৩–৭ সপ্তাহে বেশি।", "l": [["হঠাৎ", ["কয়েক দিনে হঠাৎ মৃত্যু বাড়া", "৩–৪ দিনের পর কমে যায়"]], ["আচরণ", ["ঝিমানো, পালক এলোমেলো", "ঝুঁটি ফ্যাকাশে", "খাবার কম"]], ["শরীর", ["রক্তশূন্যতা, পা ফ্যাকাশে", "হৃদযন্ত্র দুর্বল, শ্বাসকষ্ট"]]], "pm": [["লিভার", "ফোলা, ফ্যাকাশে বা হলদে, ছোট রক্তক্ষরণ বিন্দু"], ["পেরিকার্ডিয়াম", "হৃদপিণ্ডের চারপাশে হলুদ স্বচ্ছ পানি (হাইড্রোপেরিকার্ডিয়াম)"], ["কিডনি", "ফোলা"], ["হাড়ের মজ্জা", "হলদে ও ফ্যাকাশে"], ["পেশি", "রক্তক্ষরণ"]], "df": "CIA, গামবোরো, আফলাটক্সিন। পার্থক্য: লিভার ফ্যাকাশে/হলদে ও হৃদপিণ্ডে পানি জমা।", "r": "নির্দিষ্ট ওষুধ নেই। সহায়ক চিকিৎসা: লিভার টনিক, ভিটামিন ই-সেলেনিয়াম, ভিটামিন সি। অন্য রোগ ও বিষ কমান।", "m": "লিভার টনিক (সরবিটল/কোলিন), ভিটামিন ই + সেলেনিয়াম, ভিটামিন সি, ইলেক্ট্রোলাইট।", "p": "স্বাস্থ্যকর বাচ্চা, জীবাণুমুক্ত লিটার, মাইকোটক্সিন কম, গামবোরো ও অন্য টিকা ঠিকমতো।"}, {"n": "চিকেন ইনফেকশাস অ্যানিমিয়া (CIA)", "e": "🩸", "t": ["চামড়া-পালক", "ফোলা"], "s": "ফ্যাকাশে শরীর, ঝিমানো, চামড়ায় পচা ঘা, বাড়ন কম।", "c": "ভাইরাস। ডিমের মাধ্যমে (বাবা-মা মুরগি থেকে) বা সংস্পর্শে ছড়ায়। ১–৩ সপ্তাহের বাচ্চায় বেশি; রোগ প্রতিরোধ ক্ষমতা ভেঙে অন্য রোগ বাড়ায়।", "l": [["রক্তশূন্যতা", ["ঝুঁটি ও পায়ের চামড়া ফ্যাকাশে", "দুর্বল, ঝিমানো", "খাবার কম", "বাড়ন কম"]], ["চামড়া", ["ডানা-পা-শরীরে কালচে, ভেজা, পচা ঘা", "পালক ঝরে যাওয়া"]], ["মৃত্যু", ["১৪–২৮ দিনে মৃত্যু বাড়া", "টিকা ব্যর্থ ও অন্য সংক্রমণ বেড়ে যাওয়া"]]], "pm": [["থাইমাস", "ছোট ও সঙ্কুচিত"], ["বার্সা", "ছোট ও সঙ্কুচিত"], ["হাড়ের মজ্জা", "ফ্যাকাশে বা হলদে (লাল নয়)"], ["পেশি", "ফ্যাকাশে ও রক্তক্ষরণ"], ["চামড়া", "ক্ষত ও পচা"]], "df": "IBH, গামবোরো, আফলাটক্সিন। পার্থক্য: থাইমাস ও বার্সা সঙ্কুচিত এবং হাড়ের মজ্জা ফ্যাকাশে।", "r": "ভাইরাসের কোনো সরাসরি ওষুধ নেই। দ্বিতীয় সংক্রমণে অ্যান্টিবায়োটিক ডাক্তারের পরামর্শে, সাথে ভিটামিন ও আয়রন-টনিক।", "m": "আয়রন-ভিটামিন বি১২ টনিক, ভিটামিন সি, ভিটামিন কে, ডাক্তারের পরামর্শে অ্যামোক্সিসিলিন জাতীয়।", "p": "ভালো ফার্ম থেকে বাচ্চা, বাবা-মা মুরগির টিকা, ঘর জীবাণুমুক্ত।"}, {"n": "অ্যাসপারজিলোসিস (ছত্রাক নিউমোনিয়া)", "e": "🍄", "t": ["শ্বাস", "নাভি/বাচ্চা"], "s": "বাচ্চার শ্বাসকষ্ট, হাঁ করে শ্বাস, ঝিমানো, ফুসফুসে হলদে-সাদা গুটি।", "c": "ছত্রাক (Aspergillus)। ভেজা লিটার, ছত্রাকপড়া খড়-তুষ, নষ্ট ফিড, নোংরা হ্যাচারি ট্রে। ১–২ সপ্তাহের বাচ্চা বেশি। ছত্রাকের ধূলা মানুষের জন্যও ক্ষতিকর, তাই মাস্ক পরুন।", "l": [["শ্বাস", ["হাঁ করে শ্বাস, গলা লম্বা করে হাঁপানো", "ঘড়ঘড়, হাঁচি", "শ্বাস দ্রুত"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার না খাওয়া", "পালক এলোমেলো"]], ["শরীর", ["চোখ ঘোলা বা পুঁজ", "স্নায়ু লক্ষণ (কখনো): ঘাড় বাঁকা, চক্কর"]], ["মৃত্যু", ["প্রথম ২ সপ্তাহে হঠাৎ মৃত্যু বাড়া", "একসাথে অনেক মরে"]]], "pm": [["ফুসফুস", "হলদে-সাদা বা ধূসর ছোট গুটি, শক্ত"], ["এয়ারস্যাক", "সবুজ-ধূসর মখমলের মতো ছত্রাকের আবরণ"], ["ট্রাকিয়া", "গুটি বা পনিরের মতো আবরণ"], ["চোখ", "ঘোলা পুঁজ ও পনির"], ["মগজ", "কখনো ফোড়া"]], "df": "সালমোনেলা, ই-কোলাই। পার্থক্য: ফুসফুসে শক্ত হলদে গুটি ও এয়ারস্যাকে সবুজ ছত্রাক।", "r": "ছত্রাকের ওষুধ (অ্যান্টিফাঙ্গাল) ডাক্তারের পরামর্শে। ভেজা লিটার সরান, নতুন শুকনো লিটার দিন, ঘরে ভালো বাতাস রাখুন।", "m": "নিস্ট্যাটিন, কপার সালফেট (ডাক্তারের পরামর্শে নিয়ম মেনে), অ্যান্টিফাঙ্গাল ফিড অ্যাডিটিভ।", "p": "শুকনো পরিষ্কার লিটার, নতুন ও শুকনো খড়-তুষ, হ্যাচারি ও ট্রে পরিষ্কার, নষ্ট ফিড না খাওয়ানো।"}, {"n": "নাভি পচা / কুসুম থলির সংক্রমণ (ওমফালাইটিস)", "e": "🐣", "t": ["নাভি/বাচ্চা", "পায়খানা"], "s": "প্রথম সপ্তাহে বাচ্চা মরা, নাভি ভেজা/লাল/কালচে, পেট ফোলা।", "c": "ব্যাকটেরিয়া (ই-কোলাই, স্ট্যাফ, প্রোটিয়াস)। নোংরা ডিম, হ্যাচারি দুর্বলতা, তাপ কম-বেশি, নাভি বন্ধ না হওয়া। জন্মের প্রথম ১–৫ দিনে বেশি।", "l": [["নাভি", ["নাভি ভেজা, লাল বা কালচে ফোলা", "দুর্গন্ধ", "নাভি সম্পূর্ণ বন্ধ হয়নি"]], ["পেট", ["পেট ফোলা, ভারী", "কুসুম থলি শরীরে ঝুলে থাকা"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার-পানি না খাওয়া", "কিচিরমিচির কমে যাওয়া"]], ["শরীর", ["ছোট ও দুর্বল বাচ্চা", "সাদা-সবুজ পায়খানা"]]], "pm": [["কুসুম থলি", "না শোষা, সবুজ-হলুদ বা কালচে, ছানাকাটা বা পচা"], ["নাভির চারপাশ", "ফোলা, লাল, ভেজা, পুঁজ"], ["লিভার", "ফ্যাকাশে বা সবুজ ছোপ"], ["হৃদপিণ্ড", "কখনো আবরণ"], ["পেট", "তরল জমা"]], "df": "সালমোনেলা, ব্রুডিংয়ে ভুল, অ্যাসপারজিলোসিস। পার্থক্য: কুসুম থলি পচা ও নাভি ভেজা/কালচে।", "r": "ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক। ব্রুডিং তাপমাত্রা ঠিক রাখুন, পরিষ্কার পানি-ফিড দিন, মরা বাচ্চা সরিয়ে ফেলুন।", "m": "এনরোফ্লক্সাসিন/অ্যামোক্সিসিলিন জাতীয়, ভিটামিন-ইলেক্ট্রোলাইট, প্রোবায়োটিক।", "p": "ভালো বাচ্চার উৎস, ডিম ও ট্রে জীবাণুমুক্ত, ব্রুডার আগে গরম করা, প্রথম থেকে পরিষ্কার পানি ও ফিড।"}, {"n": "হঠাৎ মৃত্যু সিন্ড্রোম (SDS / ফ্লিপ-ওভার)", "e": "💔", "t": ["হঠাৎ"], "s": "দ্রুত বাড়া, সুস্থ দেখতে মোটা মুরগি হঠাৎ চিৎ হয়ে মরা।", "c": "বিপাকীয়/ব্যবস্থাপনাজনিত। দ্রুত বাড়ন, উচ্চ শক্তির ফিড, আলো বেশি, হঠাৎ শব্দ বা ভয়। ২–৪ সপ্তাহে, মোরগে বেশি।", "l": [["মৃত্যু ধরন", ["সুস্থ দেখতে মোটা মুরগি হঠাৎ চিৎকার করে পড়ে যাওয়া", "ডানা ঝাপটানো, পিঠ বাঁকা করে মরে যাওয়া", "বেশিরভাগ চিৎ হয়ে মরা"]], ["আচরণ", ["আগে কোনো অসুস্থতার লক্ষণ নেই", "খাবার-পানি স্বাভাবিক"]], ["কখন", ["বেশি আলোতে, হঠাৎ শব্দে বা ভয়ে বেশি", "রাতে কম"]]], "pm": [["হৃদপিণ্ড", "বড়, ফোলা, কখনো রক্তে ভরা"], ["ফুসফুস", "রক্ত জমা ও পানি"], ["লিভার", "ফোলা, নরম"], ["পেট", "খাবারে ভরা"], ["অন্ত্র", "স্বাভাবিক"]], "df": "অ্যাসাইটিস, হিট স্ট্রেস, বিষক্রিয়া। পার্থক্য: সুস্থ মোটা মুরগি হঠাৎ চিৎ হয়ে মরা, অন্য রোগের চিহ্ন নেই।", "r": "নির্দিষ্ট চিকিৎসা নেই। ব্যবস্থাপনা ঠিক করুন, ফিড নিয়ন্ত্রণ করুন।", "m": "নির্দিষ্ট ওষুধ নেই। সহায়ক: ভিটামিন ই, সেলেনিয়াম, ইলেক্ট্রোলাইট।", "p": "ফিড নিয়ন্ত্রিত দিন (প্রথম সপ্তাহের পর), আলোর মাত্রা কম রাখা, হঠাৎ শব্দ ও ভয় কমানো, ঘনত্ব ঠিক রাখা।"}, {"n": "ভিটামিন ই–সেলেনিয়াম অভাব (এনকেফালোমালাসিয়া)", "e": "🧠", "t": ["স্নায়ু", "চামড়া-পালক"], "s": "মাথা পেছনে বাঁকানো, চলতে না পারা, চামড়ার নিচে সবুজ-নীল ফোলা।", "c": "পুষ্টি অভাব। ফিডে ভিটামিন ই/সেলেনিয়াম কম, চর্বি নষ্ট (রেন্সিড)। ১–৪ সপ্তাহে।", "l": [["স্নায়ু", ["মাথা পেছনে বা পাশে বাঁকানো", "চক্কর দিয়ে হাঁটা বা পড়ে যাওয়া", "পা সামনে-পেছনে ছুড়া", "ভারসাম্য হারানো", "কাঁপুনি"]], ["চামড়া (এক্সুডেটিভ ডায়াথেসিস)", ["পেট ও বুকে সবুজ-নীলচে ফোলা", "চামড়ার নিচে রক্ত-তরল জমা", "পা ও ডানার নিচে ফোলা"]], ["মাংসপেশি", ["শরীর শুকিয়ে যাওয়া", "ডানা-পা দুর্বল"]]], "pm": [["সেরিবেলাম (মগজ)", "নরম, ফোলা, কখনো সবুজ-হলুদ ছোপ"], ["চামড়ার নিচে", "সবুজ-নীল তরল ও ফোলা"], ["পেশি", "সাদা-ধূসর ফ্যাকাশে রেখা"], ["জিজার্ড", "ফ্যাকাশে পেশি"]], "df": "রানিক্ষেত, মেরেক্স, ভিটামিন বি১ অভাব। পার্থক্য: জ্বর বা পায়খানা সমস্যা নেই, ভিটামিন ই দিলে উন্নতি হয়।", "r": "ভিটামিন ই ও সেলেনিয়াম পানিতে বা ফিডে দিন (ডাক্তারের পরামর্শে মাত্রায়)। নষ্ট ফিড বদলান।", "m": "ভিটামিন ই + সেলেনিয়াম, মাল্টিভিটামিন প্রিমিক্স।", "p": "ভালো ফিড, ফিড ঠান্ডা ও শুকনো জায়গায় সংরক্ষণ, এন্টিঅক্সিডেন্ট যুক্ত ফিড।"}, {"n": "অ্যামোনিয়া পোড়া (লিটারের গ্যাস)", "e": "🧪", "t": ["শ্বাস", "চোখ-মাথা"], "s": "চোখ লাল, পানি, চোখ বন্ধ, শ্বাসকষ্ট, ঘরে ঝাঁঝালো গন্ধ।", "c": "পরিবেশ। ভেজা লিটার, বাতাস চলাচল কম, বেশি ঘনত্ব, বেশি তাপ।", "l": [["চোখ", ["চোখ লাল, পানি পড়া", "চোখ বন্ধ করে বসে থাকা", "চোখ ফোলা ও আঠালো, অন্ধ হয়ে যেতে পারে"]], ["শ্বাস", ["শ্বাসকষ্ট, কাশি", "নাক দিয়ে সর্দি"]], ["পা ও বুক", ["পায়ের পাতা পোড়া/ফোলা (ফুট প্যাড ডার্মাটাইটিস)", "বুকে ফোসকা বা কালচে দাগ"]], ["আচরণ", ["খাবার কম, বাড়ন কম", "ঝিমানো, ঘরের এক কোণে জড়ো হওয়া", "সিআরডি-ই-কোলাই দ্বিতীয় সংক্রমণ"]]], "pm": [["চোখ", "লাল, ঘোলা, কর্নিয়ায় ক্ষত"], ["ট্রাকিয়া", "লাল ও প্রদাহ"], ["ফুসফুস", "জমাট"], ["এয়ারস্যাক", "ঘোলা"], ["পায়ের তলা", "পোড়া ঘা"]], "df": "সিআরডি, আইবি, করাইজা। পার্থক্য: ঘরে ঝাঁঝালো গন্ধ আর চোখ লাল, বাতাস ঠিক করলে উন্নতি।", "r": "ঘরের বাতাস চলাচল বাড়ান, ভেজা লিটার সরান, নতুন শুকনো লিটার দিন। ভিটামিন এ ও সি দিন।", "m": "ভিটামিন এ, ভিটামিন সি, চোখের জন্য ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক চোখের ড্রপ।", "p": "লিটার শুকনো রাখা, পানির পাত্র ফুটো/উপচে না পড়া, লিটার ট্রিটমেন্ট, ভেন্টিলেশন ঠিক।"}, {"n": "গাউট ও কিডনি সমস্যা (ইউরেট জমা)", "e": "🧂", "t": ["ফোলা", "পা/হাঁটা"], "s": "পা ও জয়েন্ট ফোলা, খোঁড়ানো, কিডনি ফ্যাকাশে, সাদা চুন জমা।", "c": "বিপাকীয়/পানির অভাব। পানি কম খাওয়া, প্রোটিন ও ক্যালসিয়াম বেশি, আইবি-ভাইরাসে কিডনি আক্রান্ত, ওষুধ বা বিষ।", "l": [["জয়েন্ট (আর্টিকুলার গাউট)", ["পায়ের জয়েন্ট ফোলা ও শক্ত", "খুঁড়িয়ে হাঁটা", "হাঁটতে কষ্ট"]], ["পেটের (ভিসেরাল গাউট)", ["ঝিমানো, খাবার কম", "পানি বেশি বা কম খাওয়া", "হঠাৎ মৃত্যু", "সাদা পাতলা মল (ইউরেট)"]], ["শরীর", ["ডিহাইড্রেশন", "পা শুকনো", "রোগা"]]], "pm": [["কিডনি", "ফ্যাকাশে, ফোলা, ইউরেট জমে সাদা চুনের মতো"], ["ইউরেটার", "সাদা চুন জমে নল ভরে যাওয়া"], ["হৃদপিণ্ড-লিভার", "উপরে সাদা চুনের আবরণ (ভিসেরাল গাউট)"], ["জয়েন্ট", "সাদা চকের মতো ইউরেট জমা"]], "df": "ই-কোলাই (লিভারে সাদা আবরণ), আইবি। পার্থক্য: কিডনি ও জয়েন্টে সাদা চুনের মতো শক্ত জমাট।", "r": "পরিষ্কার ঠান্ডা পানি পর্যাপ্ত দিন, প্রোটিন কিছুটা কমান, কিডনি টনিক ও ইলেক্ট্রোলাইট দিন (ডাক্তারের পরামর্শে)।", "m": "কিডনি টনিক (পটাশিয়াম সাইট্রেট), ইলেক্ট্রোলাইট; ডাক্তারের পরামর্শে অন্য ওষুধ।", "p": "পানির পাত্র সবসময় ভরা, ফিডে ক্যালসিয়াম-ফসফরাস অনুপাত ঠিক, আইবি টিকা, গরমে পানি ঠান্ডা রাখা।"}, {"n": "পানিশূন্যতা (ডিহাইড্রেশন) ও পানির সমস্যা", "e": "💧", "t": ["ফোলা"], "s": "চোখ বসে যাওয়া, পা শুকনো, ঝিমানো, পানির পাত্র খালি বা নোংরা।", "c": "ব্যবস্থাপনা। পানির লাইন বন্ধ, নিপল কম, গরম, নোংরা বা ঘোলা পানি, ওষুধ/টিকার কারণে পানি কম খাওয়া।", "l": [["শরীর", ["চোখ বসে যাওয়া", "পা ও চামড়া শুকনো, ভাঁজ পড়া", "ঝুঁটি ফ্যাকাশে ও শুকনো", "রোগা, ওজন কমে"]], ["আচরণ", ["ঝিমানো, পানির কাছে বারবার যাওয়া", "হাঁপানো", "খাবার কমে যাওয়া"]], ["পায়খানা", ["শুকনো, কঠিন পায়খানা বা অতিরিক্ত ইউরেট"]], ["মৃত্যু", ["শুকিয়ে মৃত্যু, বিশেষ করে ছোট বাচ্চায়", "গরমে বেশি"]]], "pm": [["শরীর", "শুকনো, মাংস কালচে"], ["কিডনি", "ফ্যাকাশে, ইউরেট জমা"], ["অন্ত্র", "শুকনো"], ["ক্রপ", "খালি"]], "df": "হিট স্ট্রেস, গাউট, IB। পার্থক্য: পানির পাত্র খালি/নষ্ট, পানি দিলে দ্রুত ভালো হয়।", "r": "পরিষ্কার, ঠান্ডা পানি সাথে সাথে দিন। ইলেক্ট্রোলাইট ও গ্লুকোজ দিন। পানির লাইন ও নিপল পরীক্ষা করুন।", "m": "ইলেক্ট্রোলাইট, গ্লুকোজ, ওরাল স্যালাইন (পোল্ট্রির জন্য), ভিটামিন সি।", "p": "পানির লাইন নিয়মিত পরীক্ষা, পর্যাপ্ত নিপল/পাত্র, গরমে ঠান্ডা পানি, ট্যাংক পরিষ্কার, ওষুধ/টিকার পর পানি কম খায় কিনা দেখা।"}];
const DIS_CHIPS=["পায়খানা", "শ্বাস", "স্নায়ু", "হঠাৎ", "ফোলা", "পা/হাঁটা", "চোখ-মাথা", "চামড়া-পালক", "নাভি/বাচ্চা"];


let _disChip="",_disQ="";
function disNorm(s){return String(s||"").toLowerCase()}
function disUl(a){return '<ul class="dis-ul">'+a.map(x=>'<li>'+x+'</li>').join("")+'</ul>'}
function disCard(d){
 let sy=(d.l||[]).map(g=>'<div class="dis-g">'+g[0]+'</div>'+disUl(g[1])).join("")||'<p>'+d.s+'</p>';
 let pm=(d.pm||[]).length?'<div class="dis-k">🔬 পোস্টমর্টেমে কী পাওয়া যাবে</div><table class="dis-pm"><tbody>'+d.pm.map(x=>'<tr><th>'+x[0]+'</th><td>'+x[1]+'</td></tr>').join("")+'</tbody></table>':'';
 return '<details class="dis-card'+(d.urgent?' urgent':'')+'"><summary><span class="dis-e">'+d.e+'</span><span class="dis-n">'+d.n+'</span></summary><div class="dis-b">'+
  (d.c?'<div class="dis-k">📌 কী কারণে হয়</div><p>'+d.c+'</p>':'')+
  '<div class="dis-k">🔍 লক্ষণ (বিস্তারিত)</div>'+sy+pm+
  (d.df?'<div class="dis-k">⚖️ কোনটার সাথে গুলিয়ে ফেলা যায়</div><p>'+d.df+'</p>':'')+
  '<div class="dis-k">💊 কী করবেন</div><p>'+d.r+'</p><div class="dis-k">🧪 ওষুধের নাম (উদাহরণ)</div><p>'+d.m+'</p><div class="dis-k">🛡️ প্রতিরোধ</div><p>'+d.p+'</p></div></details>';
}
const DIS_PMGUIDE='<details class="dis-card dis-pmg"><summary><span class="dis-e">🧤</span><span class="dis-n">পোস্টমর্টেম কীভাবে দেখবেন</span></summary><div class="dis-b"><div class="dis-k">আগে নিরাপত্তা</div>'+disUl(["দস্তানা, মাস্ক ও পুরনো কাপড় পরুন","বার্ড ফ্লু বা রানিক্ষেত সন্দেহ হলে নিজে কাটবেন না, ডাক্তারকে জানান","বন্ধ ঘরে নয়, খোলা জায়গায় আলাদা টেবিলে দেখুন","মরা মুরগি অসুস্থ মুরগির কাছে না রাখা"])+'<div class="dis-k">কোন মুরগি দেখবেন</div>'+disUl(["সদ্য মরা (২–৩ ঘণ্টার মধ্যে) মুরগি ভালো, পচা হলে ভুল হতে পারে","একটার বদলে ৩–৫টা দেখুন","মরণাপন্ন কিন্তু বেঁচে থাকা ১–২টা মুরগিও দেখলে সুবিধা হয়"])+'<div class="dis-k">কীভাবে দেখবেন (ধাপে ধাপে)</div>'+disUl(["১. বাইরে: চোখ, মুখ, ঝুঁটি, পা, পায়ু, নাভি, চামড়া দেখুন","২. বুক-পেটের চামড়া কেটে নিচের পেশি ও চর্বি দেখুন (রক্তক্ষরণ?)","৩. বুকের হাড় কেটে হৃদপিণ্ড, লিভার, ফুসফুস, এয়ারস্যাক দেখুন","৪. ট্রাকিয়া (শ্বাসনালী) লম্বা করে কেটে ভেতর দেখুন","৫. পাকস্থলী-জিজার্ড কেটে দেখুন; অন্ত্র খুলে সিকা, ক্ষুদ্রান্ত্র দেখুন","৬. বার্সা (লেজের কাছে ছোট থলি), কিডনি, স্প্লিন, ডিম্বাশয় দেখুন","৭. পায়ের জয়েন্ট ও স্নায়ুও দেখুন যদি পা সমস্যা থাকে"])+'<div class="dis-k">শেষে</div>'+disUl(["মরা মুরগি গভীরে পুঁতে দিন বা পুড়িয়ে ফেলুন, ফেলে রাখবেন না","হাত-সরঞ্জাম জীবাণুনাশকে ধুয়ে নিন","কাজের জামা আলাদা ধুয়ে ফেলুন","যা পেলেন তা লিখে রাখুন, ছবি তুলে ডাক্তারকে দেখান"])+'</div></details>';
function renderDisease(){
 let el=document.getElementById("disList");if(!el)return;
 let q=disNorm(_disQ).trim(),c=_disChip;
 let txt=d=>disNorm([d.n,d.s,d.c,d.r,d.p,d.m,d.df,(d.l||[]).map(g=>g[0]+" "+g[1].join(" ")).join(" "),(d.pm||[]).map(x=>x[0]+" "+x[1]).join(" ")].join(" "));
 let list=DIS_DATA.filter(d=>(!c||d.t.indexOf(c)>=0)&&(!q||txt(d).indexOf(q)>=0));
 let chips=document.getElementById("disChips");
 if(chips)chips.innerHTML='<button type="button" class="dchip'+(c?"":" on")+'" onclick="disChip(\'\')">সব ('+DIS_DATA.length+')</button>'+DIS_CHIPS.map(x=>'<button type="button" class="dchip'+(c===x?" on":"")+'" onclick="disChip(\''+x+'\')">'+x+'</button>').join("");
 el.innerHTML=(q||c?"":DIS_PMGUIDE)+(list.length?list.map(disCard).join(""):'<div class="hint">কিছু পাওয়া যায়নি</div>');
}
window.disChip=function(c){_disChip=c;renderDisease()};
window.disSearch=function(v){_disQ=v;renderDisease()};

try{renderDisease()}catch(e){console.error(e)}

/* ── দ্রুত যাওয়ার বোতাম (অন্যান্য বিক্রি ও বিশ্লেষণ পাতা) ── */
function jumpNavH(){let n=document.querySelector("nav");return n?n.getBoundingClientRect().height:0}
function buildJumps(pageId,items){
 let pg=document.getElementById(pageId);if(!pg)return;pg.querySelectorAll(".jump-row").forEach(r=>r.remove());
 let row=document.createElement("div");row.className="jump-row";
 items.forEach(it=>{let b=document.createElement("button");b.type="button";b.className="dchip";b.textContent=it.label;
  b.onclick=()=>{let nh=jumpNavH()+(row.getBoundingClientRect().height||44)+6;let y=it.el.getBoundingClientRect().top+window.pageYOffset-nh;window.scrollTo({top:Math.max(0,y),behavior:"smooth"});
   row.querySelectorAll(".dchip").forEach(x=>x.classList.remove("on"));b.classList.add("on");row.scrollTo({left:b.offsetLeft-row.clientWidth/2+b.clientWidth/2,behavior:"smooth"})};row.appendChild(b)});
 pg.insertBefore(row,pg.firstChild);
 let fix=()=>{row.style.top=jumpNavH()+"px"};fix();window.addEventListener("resize",fix);
 /* নেভ উচ্চতা বদলালে আবার ঠিক করা */
 new MutationObserver(fix).observe(document.body,{attributes:true,subtree:false});setTimeout(fix,600);setTimeout(fix,2000);
}
function initJumps(){
 try{
  let os=document.getElementById("othersales");
  if(os){let it=[...os.querySelectorAll(":scope > .section")].map(el=>({el,label:el.textContent.replace(/\s+/g," ").trim().replace("বেচে যাওয়া ","").replace("অন্যান্য বিক্রির ","").replace("গিফট / নিজের খাওয়ার মুরগি","গিফট")}));buildJumps("othersales",it)}
  /* বিশ্লেষণের বোতাম renderAnExtra থেকে বানানো হয় */
 }catch(e){console.error(e)}
}
initJumps();


(function(){
const $a=id=>document.getElementById(id);
const bn=n=>Number(n).toLocaleString("bn-BD");
const fb=(n,d)=>Number(n).toLocaleString("bn-BD",{maximumFractionDigits:d===undefined?2:d});
const tk=n=>(n<0?"−":"")+"৳"+fb(Math.abs(n),0);
const en=s=>String(s||"").replace(/[০-৯]/g,x=>"০১২৩৪৫৬৭৮৯".indexOf(x));
/* ── বিশ্লেষণ: নতুন অংশ (ব্যাচের মান, ক্রেতা, জমা খরচ) ── */
function renderEpef(){
 let el=$a("anEpef");if(!el)return;
 let f=fcrStats(),chicks=+state.chicks||0,dead=deathTotal()||(+state.dead||0),age=days();
 if(!(chicks>0)||!state.startDate||age<=0||!(f.fcr>0)){el.innerHTML='<div class="an-alert info">বাচ্চা, তারিখ ও দৈনিক ফিডের হিসাব দিলে এখানে ব্যাচের মান দেখা যাবে।</div>';return}
 let bq=Math.max(0,chicks-dead),sv=chicks>0?bq/chicks*100:0,aw=bq>0?f.tw/bq:0,ep=sv*aw*100/(age*f.fcr);
 let lv=ep>=350?["চমৎকার","#3ddc84"]:ep>=300?["ভালো","#7fe0b0"]:ep>=250?["মোটামুটি","#fbbf24"]:["দুর্বল","#ff7070"];
 let row=(l,v)=>'<div class="lc-row"><span>'+l+'</span><b>'+v+'</b></div>';
 el.innerHTML='<div class="epef-big" style="color:'+lv[1]+'"><b>'+Math.round(ep)+'</b><span>'+lv[0]+'</span></div>'+
  '<div class="epef-scale"><i style="left:'+Math.max(0,Math.min(100,(ep-150)/250*100))+'%"></i></div><div class="epef-lab"><span>১৫০</span><span>২৫০</span><span>৩০০</span><span>৩৫০+</span></div>'+
  row("বাঁচার হার",sv.toFixed(1)+"%")+row("গড় ওজন",aw.toFixed(2)+" কেজি"+(f.est?" (আনুমানিক)":""))+row("বয়স",bn(age)+" দিন")+row("FCR",f.fcr.toFixed(2))+
  '<div class="an-note">ব্যাচের মান (EPEF) = বাঁচার হার% × গড় ওজন(কেজি) × ১০০ ÷ (বয়স × FCR)। যত বেশি তত ভালো: ৩৫০+ চমৎকার, ৩০০–৩৪৯ ভালো, ২৫০–২৯৯ মোটামুটি, ২৫০ এর নিচে দুর্বল। ব্যাচ চলছে, তাই আজকের হিসাবে। এটা বিভিন্ন ব্যাচ মেলাতে কাজে লাগে।</div>';
}
function renderBuyers(){
 let el=$a("anBuyers");if(!el)return;
 let m={};(state.sales||[]).forEach(r=>{let n=String(r.customer||"").trim()||"নাম নেই",o=m[n]||(m[n]={n:n,q:0,kg:0,amt:0,paid:0});o.q+=+r.qty||0;o.kg+=+r.weight||0;o.amt+=(+r.weight||0)*(+r.rate||0);o.paid+=+r.paid||0});
 let a=Object.keys(m).map(k=>m[k]);
 if(!a.length){el.innerHTML='<div class="an-note">এখনও কোনো বিক্রি নেই।</div>';return}
 a.sort((x,y)=>(y.amt-y.paid)-(x.amt-x.paid)||y.amt-x.amt);
 let T=a.reduce((t,x)=>({q:t.q+x.q,kg:t.kg+x.kg,amt:t.amt+x.amt,paid:t.paid+x.paid}),{q:0,kg:0,amt:0,paid:0}),due=T.amt-T.paid;
 let h=due>0?'<div class="an-alert info"><b>মোট বাকি ৳'+fb(due,0)+'</b>'+(a[0].amt-a[0].paid>0?' — সবচেয়ে বেশি বাকি: '+a[0].n+' (৳'+fb(a[0].amt-a[0].paid,0)+')':'')+'</div>':'<div class="an-alert good"><b>✅ কোনো বাকি নেই</b></div>';
 h+='<div class="an-proj" style="margin-top:8px"><table><thead><tr><th>ক্রেতা</th><th>মুরগি</th><th>কেজি</th><th>গড় দর</th><th>মোট</th><th>বাকি</th></tr></thead><tbody>';
 a.forEach(x=>{let d=x.amt-x.paid;h+='<tr class="'+(d>0?"neg":"")+'"><td>'+x.n+'</td><td>'+bn(x.q)+'</td><td>'+fb(x.kg,0)+'</td><td>'+(x.kg>0?'৳'+fb(x.amt/x.kg,0):'—')+'</td><td>'+tk(x.amt)+'</td><td>'+(d>0?tk(d):'—')+'</td></tr>'});
 h+='<tr class="best"><td><b>সব মিলিয়ে</b></td><td>'+bn(T.q)+'</td><td>'+fb(T.kg,0)+'</td><td>'+(T.kg>0?'৳'+fb(T.amt/T.kg,0):'—')+'</td><td>'+tk(T.amt)+'</td><td>'+(due>0?tk(due):'—')+'</td></tr></tbody></table></div>';
 el.innerHTML=h;
}
function renderCostWk(){
 let el=$a("anCostWk");if(!el)return;
 if(!state.startDate||!(+state.chicks>0)){el.innerHTML='<div class="an-note">বাচ্চা ও বাচ্চা আসার তারিখ দিন।</div>';return}
 const a0=new Date(state.startDate+"T00:00:00"),t0=new Date(todayISO()+"T00:00:00");
 let nd=Math.max(1,Math.min(120,Math.round((t0-a0)/864e5)+1)),ds=[];
 for(let i=0;i<nd;i++){let d=new Date(a0);d.setDate(d.getDate()+i);ds.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"))}
 let idx={};ds.forEach((d,i)=>idx[d]=i);let cost=ds.map(()=>0),dead=ds.map(()=>0),chickCost=(+state.chicks||0)*(+state.chickPrice||0);
 ["feed","medicine","other","litter","power"].forEach(k=>(state[k]||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=(+r.qty||0)*(+r.rate||0)}));
 if(wageOn(state))ds.forEach((d,i)=>{cost[i]+=wageOnDay(state,d)});else (state.workers||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amount||0});
 (state.rent||[]).forEach(r=>{if(r.date in idx)cost[idx[r.date]]+=+r.amt||0});
 (state.deaths||[]).forEach(r=>{if(r.date in idx)dead[idx[r.date]]+=+r.qty||0});
 let rows=[],cc=0,cd=0,prev=0,chicks=+state.chicks||0;
 for(let w=0;w*7<nd;w++){let e=Math.min(nd-1,w*7+6),wc=0;for(let i=w*7;i<=e;i++){wc+=cost[i];cd+=dead[i]}cc+=wc;let alive=Math.max(1,chicks-cd),per=(cc-0)/alive+chickCost/alive,inc=wc/alive;rows.push({w:w+1,days:e-w*7+1,wc:wc,per:per,inc:inc,part:e-w*7<6})}
 if(!rows.length||rows.every(r=>r.wc===0)){el.innerHTML='<div class="an-note">এখনও কোনো খরচের এন্ট্রি নেই।</div>';return}
 let full=rows.filter(r=>!r.part),note="";
 if(full.length>=2){let l=full[full.length-1],p=full[full.length-2];if(p.inc>0&&l.inc>p.inc*1.25)note='<div class="an-alert info"><b>⚠️ '+bn(l.w)+'ম সপ্তাহে প্রতি মুরগির খরচ আগের সপ্তাহের চেয়ে অনেক বেড়েছে</b> (৳'+fb(l.inc,1)+' বনাম ৳'+fb(p.inc,1)+') — ফিড, ওষুধ বা অন্য বড় খরচ দেখুন।</div>'}
 let h=note+'<div class="an-proj"><table><thead><tr><th>সপ্তাহ</th><th>সেই সপ্তাহে খরচ</th><th>প্রতি মুরগিতে বাড়ল</th><th>প্রতি মুরগিতে জমা (বাচ্চা সহ)</th></tr></thead><tbody>';
 rows.forEach(r=>{h+='<tr><td>'+bn(r.w)+'ম'+(r.part?' <small>('+bn(r.days)+' দিন)</small>':'')+'</td><td>'+tk(r.wc)+'</td><td>৳'+fb(r.inc,1)+'</td><td><b>৳'+fb(r.per,1)+'</b></td></tr>'});
 h+='</tbody></table></div><div class="an-note">প্রতি মুরগি = সেই দিন পর্যন্ত মোট খরচ ÷ বেঁচে থাকা মুরগি (বিক্রি সহ)। এতে দেখা যায় কোন সপ্তাহে খরচ বেশি বাড়ছে।</div>';
 el.innerHTML=h;
}
var _anJSig="";
function anVisibleBoxes(){let an=$a("analysis");return an?[...an.querySelectorAll(".an-box")].filter(el=>el.style.display!=="none"&&!el.dataset.hide):[]}
function anJumpLabel(el){let t=el.querySelector(".an-title");if(!t)return null;let l=t.textContent.replace(/\s+/g," ").trim().split(/[(—]/)[0].trim();
 return l.replace("আগের ব্যাচের সঙ্গে তুলনা","ব্যাচ তুলনা").replace("কবে বিক্রি করলে বেশি লাভ","কবে বিক্রি").replace("দৈনিক ফিড বনাম স্ট্যান্ডার্ড","ফিড বনাম স্ট্যান্ডার্ড").replace("ফিড কতদিন চলবে","ফিড").replace("লাভ-লোকসান বিশ্লেষণ","লাভ-লোকসান").replace("ক্রেতা অনুযায়ী বিশ্লেষণ","ক্রেতা").replace("প্রতি মুরগির জমা খরচ","জমা খরচ").replace("মৃত্যুর বিশ্লেষণ","মৃত্যু")}
function anEnDigits(){let an=$a("analysis");if(!an)return;let w=document.createTreeWalker(an,NodeFilter.SHOW_TEXT,null),n,L=[];while(n=w.nextNode()){if(/[০-৯]/.test(n.nodeValue))L.push(n)}L.forEach(x=>{x.nodeValue=en(x.nodeValue)})}
function renderAnExtra(){
 renderEpef();renderBuyers();renderCostWk();
 let cb=$a("anCmpBox"),cmp=$a("anCmp");if(cb&&cmp)cb.style.display=/এখনও নেই/.test(cmp.textContent)?"none":"";
 let bx=anVisibleBoxes(),sig=bx.map(anJumpLabel).join("|");
 if(sig!==_anJSig){_anJSig=sig;buildJumps("analysis",bx.map(el=>({el:el,label:anJumpLabel(el)})).filter(x=>x.label))}
 anEnDigits();
}
(function(){let an=document.getElementById("analysis");if(!an||typeof MutationObserver==="undefined")return;let busy=false;
 new MutationObserver(()=>{if(busy)return;busy=true;try{anEnDigits()}catch(e){}busy=false}).observe(an,{childList:true,subtree:true,characterData:true})})();
/* ── ড্যাশবোর্ডে বয়সের নিচে ওজন ── */
function heroW(){
 let es=$a("hhS");
 if(es){try{let q=0,w=0;(state.sales||[]).forEach(r=>{q+=+r.qty||0;w+=+r.weight||0});
  if(q>0&&w>0){es.style.display="";es.innerHTML='<em>🐔 বিক্রিত গড় ওজন</em><b class="hw-g">'+en(bn(Math.round(w/q*1000)))+' গ্রাম</b><small>'+en(bn(q))+' টি বিক্রি</small>'}else{es.innerHTML="";es.style.display="none"}}catch(e){es.style.display="none"}}
 let el=$a("hhW");if(!el)return;
 try{
  if(!(+state.chicks>0)||!state.startDate){el.innerHTML="";el.style.display="none";return}
  let age=days(),w=anW0(),std=stdAt(age)/1000;
  if(!(w&&w.w>0)||!(std>0)||age<1){el.innerHTML="";el.style.display="none";return}
  let r=w.w/std,c=r>=0.97?"g":r>=0.9?"y":"r",g=Math.round(w.w*1000);
  el.style.display="";el.innerHTML='<em>⚖️ ওজন</em><b class="hw-'+c+'">'+en(bn(g))+' গ্রাম</b><small>স্ট্যান্ডার্ড '+en(bn(Math.round(std*1000)))+'</small>';
 }catch(e){el.innerHTML="";el.style.display="none"}
}
const _rHW=window.render;
window.render=function(){const r=_rHW.apply(this,arguments);try{heroW()}catch(e){}return r};
try{heroW()}catch(e){}
window.renderAnExtra=renderAnExtra;
try{renderAnExtra()}catch(e){console.error(e)}
})();

/* ── ড্যাশবোর্ডে নামের নিচে: অবশিষ্ট মুরগি ও মোট বিক্রির কেজি ── */
(function(){
 function upd(){
  let el=document.getElementById("hhLine");if(!el)return;
  let wh=0,rt=0;
  (state.sales||[]).forEach(r=>{wh+=+r.weight||0});
  ((state.otherSales&&state.otherSales.chicken)||[]).forEach(r=>{if(+r.pcs>0)rt+=+r.qty||0});
  let live=livePcs();
  el.innerHTML=`<span>🐔 অবশিষ্ট <b>${fmt(live,0)}</b> টি</span><i>•</i><span>⚖️ বিক্রি <b>${fmt(wh+rt)}</b> কেজি</span>`;
 }
 const r0=window.render;
 window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── মেডিসিনের গ্রুপ ও জেনেরিক ── */
const MED_GROUPS={anti:"🦠 অ্যান্টিবায়োটিক",vit:"🍊 ভিটামিন ও মিনারেল",liver:"🫀 লিভার ও টনিক",cal:"🦴 ক্যালসিয়াম",pro:"🌿 প্রোবায়োটিক ও হজম",cocci:"🧪 কক্সিডিওসিস",worm:"🪱 কৃমিনাশক",elec:"💧 ইলেক্ট্রোলাইট ও গরমের",resp:"🫁 সর্দি ও শ্বাসকষ্ট",vac:"💉 ভ্যাকসিন",dis:"🧴 জীবাণুনাশক",water:"🚰 পানির pH ও অ্যাসিডিফায়ার",oth:"📦 অন্যান্য"};
const MED_DB=[
 ["anti",["অ্যামোক্সিসিলিন","অ্যামক্সিসিলিন","amoxicillin","amoxycillin"],"Amoxicillin"],
 ["anti",["সিপ্রোফ্লক্সাসিন","সিপ্রো","ciprofloxacin"],"Ciprofloxacin"],
 ["anti",["এনরোফ্লক্সাসিন","enrofloxacin"],"Enrofloxacin"],
 ["anti",["নরফ্লক্সাসিন","norfloxacin"],"Norfloxacin"],
 ["anti",["ডক্সিসাইক্লিন","ডক্সি","doxycycline"],"Doxycycline"],
 ["anti",["অক্সিটেট্রাসাইক্লিন","oxytetracycline"],"Oxytetracycline"],
 ["anti",["কোলিস্টিন","colistin"],"Colistin"],
 ["anti",["টাইলোসিন","tylosin"],"Tylosin"],
 ["anti",["জেন্টামাইসিন","gentamicin"],"Gentamicin"],
 ["anti",["অ্যাজিথ্রোমাইসিন","azithromycin"],"Azithromycin"],
 ["anti",["মেট্রোনিডাজল","মেট্রো","metronidazole","metronitazole","metronidazol","metroni"],"Metronidazole"],
 ["pro",["টক্সিবাইন্ডিং","টক্সি বাইন্ডার","টক্সিন বাইন্ডার","toxibinding","toxibainding","toxibind","toxin bind","toxi bind","binder"],"টক্সিন বাইন্ডার (বিষ শোষক)"],
 ["water",["=ph","পিএইচ","পি এইচ","acidifier","অ্যাসিডিফায়ার","ph down","ph balance","ph reducer","ph control"],"পানির pH ঠিক রাখার জন্য"],
 ["anti",["এন্টিবায়োটিক","অ্যান্টিবায়োটিক","antibiotic"],""],
 ["cocci",["অ্যাম্প্রোলিয়াম","amprolium"],"Amprolium"],
 ["cocci",["টলট্রাজুরিল","toltrazuril"],"Toltrazuril"],
 ["cocci",["সালফা","sulfa","sulpha"],"Sulfonamide"],
 ["cocci",["কক্সি","cocci"],""],
 ["worm",["অ্যালবেন্ডাজল","albendazole"],"Albendazole"],
 ["worm",["লেভামিসোল","levamisole"],"Levamisole"],
 ["worm",["ফেনবেন্ডাজল","fenbendazole"],"Fenbendazole"],
 ["worm",["পাইপারাজিন","piperazine"],"Piperazine"],
 ["worm",["কৃমি","dewormer","worm"],""],
 ["resp",["ব্রমহেক্সিন","bromhexine"],"Bromhexine"],
 ["resp",["সর্দি","শ্বাস","কাশি"],""],
 ["vac",["ভ্যাকসিন","vaccine","রানিক্ষেত","গামবোরো","বিসিআরডিভি"],""],
 ["cal",["ক্যালসিয়াম","calcium","ক্যাল"],"Calcium"],
 ["liver",["সরবিটল","sorbitol"],"Sorbitol"],
 ["liver",["সিলিমারিন","silymarin"],"Silymarin"],
 ["liver",["লিভার","liver","টনিক","tonic"],""],
 ["pro",["প্রোবায়োটিক","probiotic"],""],
 ["pro",["এনজাইম","enzyme","হজম","টক্সিন বাইন্ডার","toxin"],""],
 ["elec",["ইলেক্ট্রোলাইট","electrolyte","স্যালাইন","গ্লুকোজ","ইলেক্ট্রাল","গরম"],""],
 ["vit",["এডি৩ই","ad3e","মাল্টিভিটামিন","বি-কমপ্লেক্স","ভিটামিন","vitamin","মিনারেল","mineral"],""],
 ["dis",["জীবাণুনাশক","ডিসইনফেক্ট","ফরমালিন","পটাশ","আয়োডিন","ব্লিচিং","disinfect"],""]
];
function medNorm(n){return String(n||"").trim().toLowerCase().replace(/\s+/g," ")}
function medInfo(name,noCustom){
 let n=medNorm(name);if(!n)return null;
 let cu=(state.medGroups||{})[n];
 let hit=null;let toks=n.split(/[^a-z0-9\u0980-\u09ff]+/).filter(Boolean);for(const [g,ks,gen] of MED_DB){if(ks.some(k=>k[0]==='='?toks.includes(k.slice(1)):n.includes(k.toLowerCase()))){hit={g:g,gen:gen};break}}
 if(!noCustom&&cu&&MED_GROUPS[cu])return{g:cu,gen:hit?hit.gen:"",custom:true};
 return hit||{g:"oth",gen:""};
}
window.medSetGroup=function(name,g){state.medGroups=state.medGroups||{};let n=medNorm(name);if(g)state.medGroups[n]=g;else delete state.medGroups[n];save();render();medHint()};
function medHint(){
 let inp=document.getElementById("medicineName");if(!inp)return;
 let box=document.getElementById("medGenHint");
 if(!box){box=document.createElement("div");box.id="medGenHint";box.className="mg-hint";let f=inp.closest(".fields")||inp.parentNode;f.appendChild(box)}
 let v=inp.value.trim();if(!v){box.style.display="none";return}
 let i=medInfo(v);box.style.display="block";
 let opts=Object.keys(MED_GROUPS).map(k=>`<option value="${k}"${k===i.g?" selected":""}>${MED_GROUPS[k]}</option>`).join("");
 box.innerHTML=`<span class="mg-chip">${MED_GROUPS[i.g]}</span>`+(i.gen?` <span class="mg-gen">জেনেরিক: <b>${esc(i.gen)}</b></span>`:"")+(i.g==="oth"?` <span class="mg-q">চিনতে পারিনি — গ্রুপ বেছে নিন:</span>`:"")+`<select class="mg-sel" onchange="medSetGroup(document.getElementById('medicineName').value,this.value)">${opts}</select>`;
}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="medicineName")medHint()});

window.medSumToggle=function(){window._medSumOpen=!window._medSumOpen;render()};
/* ── মেডিসিন (খরচ) পেজের সামারি ── */
(function(){
 function upd(){
  let pg=document.getElementById("medicine");if(!pg)return;
  let box=document.getElementById("medCostSum");
  if(!box){let s=pg.querySelector(".section");if(!s)return;box=document.createElement("div");box.id="medCostSum";s.parentNode.insertBefore(box,s)}
  let a=state.medicine||[];
  if(!a.length){box.innerHTML="";return}
  let by={},tot=0,qtyAll=0,last="";
  a.forEach(r=>{let k=String(r.name||"নাম নেই").trim(),q=+r.qty||0,c=q*(+r.rate||0);let o=by[k]=by[k]||{n:k,q:0,c:0,t:0};o.q+=q;o.c+=c;o.t++;tot+=c;qtyAll+=q;if(r.date&&r.date>last)last=r.date});
  let list=Object.values(by).sort((x,y)=>y.c-x.c);
  let gb={};list.forEach(o=>{o.g=medInfo(o.n).g;let q=gb[o.g]=gb[o.g]||{c:0,n:0};q.c+=o.c;q.n++});
  let glist=Object.keys(gb).sort((x,y)=>gb[y].c-gb[x].c);
  let avg=(+state.chicks||0)>0?tot/(+state.chicks):0;
  let _gc={};a.forEach(r=>{let g=medInfo(String(r.name||"")).g;_gc[g]=(_gc[g]||0)+1});
  let _gm=Object.keys(_gc).sort((x,y)=>_gc[y]-_gc[x])[0],_gd=glist[0];
  let _nm=g=>g?MED_GROUPS[g].replace(/^\S+\s*/,""):"—",_ic=g=>g?MED_GROUPS[g].split(" ")[0]:"";
  let gMost={n:_ic(_gm)+" "+_nm(_gm),s:_gm?_gc[_gm]+" বার কেনা":""},gDear={n:_ic(_gd)+" "+_nm(_gd),s:_gd?money(gb[_gd].c):""};
  let _op=!!window._medSumOpen;
  box.innerHTML='<div class="ms-sum mc-sum"><div class="ms-sg mc-g ms-frz"><div><b style="color:#fbbf24">'+money(tot)+'</b><small>মোট খরচ</small></div><div><b>'+(avg?money(Math.round(avg*100)/100):"—")+'</b><small>প্রতি মুরগি</small></div><div><b class="gn">'+gMost.n+'</b><small>বেশি কেনা গ্রুপ<br>'+gMost.s+'</small></div><div><b class="gn">'+gDear.n+'</b><small>বেশি দামের গ্রুপ<br>'+gDear.s+'</small></div></div>'+
   '<div class="ms-sh2" style="cursor:pointer" onclick="medSumToggle()"><b>📋 মেডিসিন সামারি</b><span><b style="color:#fbbf24">'+money(tot)+'</b> • '+(_op?"▲ বন্ধ করুন":"▼ খুলুন")+'</span></div><div id="medSumBody" style="display:'+(_op?"block":"none")+'">'+
   '<div class="mg-gh">গ্রুপ অনুযায়ী খরচ</div>'+glist.map(g=>'<div class="ms-sr"><span class="ms-sn">'+MED_GROUPS[g]+' <i>('+gb[g].n+'টি)</i></span><span class="ms-sv"><b style="color:#fbbf24">'+money(gb[g].c)+'</b> • '+(tot?Math.round(gb[g].c/tot*100):0)+'%</span></div>').join("")+'<div class="mg-gh">ওষুধ অনুযায়ী</div>'+
   list.map(o=>'<div class="ms-sr"><span class="ms-sn">'+MED_GROUPS[o.g].split(" ")[0]+' '+esc(o.n)+'</span><span class="ms-sv">পরিমাণ '+fmt(o.q)+' • <b style="color:#fbbf24">'+money(o.c)+'</b></span></div>').join("")+'</div></div>';
 }
 const r0=window.render;
 window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── বিভিন্ন খরচ ও অন্যান্য বিক্রি পেজের উপরের সামারি ── */
(function(){
 function put(pgId,boxId,html){
  let pg=document.getElementById(pgId);if(!pg)return;
  let box=document.getElementById(boxId);
  if(!box){box=document.createElement("div");box.id=boxId;pg.insertBefore(box,pg.firstChild)}
  box.innerHTML=html;
 }
 // items: [icon,name,sub,value,color]
 function build(cls,title,date,total,totLabel,chips,items){
  let sum=items.reduce((s,x)=>s+x[3],0);
  let bar=items.map(x=>sum>0&&x[3]>0?'<i style="width:'+(x[3]/sum*100)+'%;background:'+x[4]+'"></i>':'').join("");
  let tiles=items.map(x=>{let p=sum>0?Math.round(x[3]/sum*100):0;return '<div class="pg-t" style="--c:'+x[4]+'"><div class="pg-th"><span class="pg-ic">'+x[0]+'</span><span class="pg-p">'+p+'%</span></div><div class="pg-tn">'+x[1]+'</div><div class="pg-tv">'+money(x[3])+'</div><div class="pg-ts">'+x[2]+'</div><div class="pg-tb"><i style="width:'+p+'%"></i></div></div>'}).join("");
  let ch=chips.map(c=>'<div class="pg-chip"><b'+(c[2]?' style="color:'+c[2]+'"':'')+'>'+c[0]+'</b><small>'+c[1]+'</small></div>').join("");
  return '<div class="pg-sum '+cls+'"><div class="pg-hero"><div class="pg-hl"><small>'+title+'</small><b>'+money(total)+'</b><span>'+totLabel+'</span></div><div class="pg-hr">'+esc(date||"—")+'<small>শেষ এন্ট্রি</small></div></div><div class="pg-bar">'+bar+'</div><div class="pg-grid">'+tiles+'</div><div class="pg-chips">'+ch+'</div></div>';
 }
 function upd(){
  let ot=total("other"),li=total("litter"),pw=total("power"),rt=rentTotal(),all=ot+li+pw+rt;
  let rp=sumOf(state.rent||[],r=>r.paid),last="";
  ["other","litter","power","rent"].forEach(k=>(state[k]||[]).forEach(r=>{if(r.date&&r.date>last)last=r.date}));
  let L=k=>(state[k]||[]).length,n=L("other")+L("litter")+L("power")+L("rent");
  put("other","expTopSum",n?build("pg-exp","📋 মোট খরচ — এই পেজের চার খাত",last,all,n+"টি এন্ট্রি",
   [[money(rp),"ভাড়া দিয়েছি","#3ddc84"],[money(Math.max(0,rt-rp)),"ভাড়া বাকি",rt-rp>0?"#ff7070":"#3ddc84"]],
   [["🧾","বিভিন্ন খরচ",L("other")+"টি এন্ট্রি",ot,"#f97316"],["🪵","কাঠের গুড়া",L("litter")+"টি এন্ট্রি",li,"#a78bfa"],["🚚","পরিবহন ভাড়া",L("rent")+"টি এন্ট্রি",rt,"#14b8a6"],["⚡","বিদ্যুৎ ও জ্বালানি",L("power")+"টি এন্ট্রি",pw,"#fde047"]]):"");
  let os=state.otherSales||{},g=otherSalesGrand(),cnt=Object.keys(osCfg).reduce((a,k)=>a+((os[k]||[]).length),0)+(state.gifts||[]).length;
  let by2=new Set(),l2="";Object.keys(os).forEach(k=>(os[k]||[]).forEach(r=>{let b=(r.buyer||"").trim();if(b)by2.add(b);if(r.date&&r.date>l2)l2=r.date}));
  put("othersales","osTopSum",cnt?build("pg-os","💰 মোট বিক্রি — অন্যান্য সব মিলিয়ে",l2,g,cnt+"টি এন্ট্রি",
   [[by2.size+" জন","আলাদা ক্রেতা"],[fmt(giftPcs(),0)+" টি","গিফট/নিজের"]],
   [["🪵","লিটার",fmt(sumOf(os.litter||[],r=>r.qty))+" কেজি",otherSalesTotal("litter"),"#a78bfa"],["🐔","খুচরা মুরগি",fmt(retailPcs(),0)+" টি • "+fmt(sumOf(os.chicken||[],r=>r.qty))+" কেজি",otherSalesTotal("chicken"),"#22c55e"],["🛍️","বস্তা",fmt(sumOf(os.bag||[],r=>r.qty),0)+" পিস",otherSalesTotal("bag"),"#38bdf8"],["🌾","ফিড",fmt(sumOf(os.feed||[],r=>r.qty))+" কেজি",otherSalesTotal("feed"),"#fbbf24"]]):"");
 }
 const r0=window.render;
 window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── মেডিসিন টেবিল: গ্রুপ অনুযায়ী সাজানো (কোন ওষুধ কিসের কাজ করে) ── */
const MED_USE={anti:"ব্যাকটেরিয়ার রোগ সারায় (সর্দি-কাশি, পাতলা পায়খানা, ইনফেকশন)",vit:"বৃদ্ধি বাড়ায়, রোগ প্রতিরোধ ক্ষমতা ও দুর্বলতা ঠিক করে",liver:"লিভার ভালো রাখে, খাবার হজম ও ক্ষুধা বাড়ায়",cal:"হাড় ও পা শক্ত করে, পা বাঁকা হওয়া ঠেকায়",pro:"পেট ভালো রাখে, হজম ঠিক করে, পাতলা পায়খানা কমায়",cocci:"রক্ত-আমাশয় (কক্সিডিওসিস) ঠেকায় ও সারায়",worm:"পেটের কৃমি দূর করে",elec:"গরমে ও দুর্বলতায় পানি ও শক্তি পূরণ করে",resp:"সর্দি, কাশি ও শ্বাসকষ্ট কমায়",vac:"রোগ হওয়ার আগেই প্রতিরোধ করে",dis:"খামার ও যন্ত্রপাতি জীবাণুমুক্ত রাখে",water:"পানির মান ঠিক রাখে, পেটের জীবাণু কমায়",oth:"গ্রুপ ঠিক করা হয়নি — এডিটে গিয়ে গ্রুপ বেছে নিন"};
window.medGrpToggle=function(g){window._medClosed=window._medClosed||{};window._medClosed[g]=!window._medClosed[g];medGrpApply()};
function medGrpApply(){
 let tb=document.getElementById("medicineTable");if(!tb)return;
 let closed=window._medClosed||{};
 tb.querySelectorAll("tr[data-mg]").forEach(r=>{r.style.display=closed[r.dataset.mg]?"none":""});
 tb.querySelectorAll("tr.mg-hrow").forEach(r=>{let c=closed[r.dataset.g];let a=r.querySelector(".mg-arr");if(a)a.textContent=c?"◀":"▼"});
}
function medGrpBuild(){
 let tb=document.getElementById("medicineTable");if(!tb)return;
 let rows=[...tb.querySelectorAll("tr:not(.mg-hrow)")].filter(r=>r.children.length>=5);
 tb.querySelectorAll("tr.mg-hrow").forEach(r=>r.remove());
 if(!rows.length)return;
 let G={};
 rows.forEach((r,i)=>{
  let nm=(r.children[1].dataset.nm||r.children[1].textContent).trim();r.children[1].dataset.nm=nm;
  let info=medInfo(nm),g=info.g;r.dataset.mg=g;
  let cost=parseFloat(String(r.children[4].textContent).replace(/[^0-9.]/g,"").replace(/[০-৯]/g,d=>"০১২৩৪৫৬৭৮৯".indexOf(d)))||0;
  if(!r.children[1].querySelector(".mg-gsub")&&info.gen){let s=document.createElement("div");s.className="mg-gsub";s.textContent=info.gen;r.children[1].appendChild(s)}
  let o=G[g]=G[g]||{rows:[],c:0};o.rows.push(r);
 });
 // টাকার হিসাব আসল ডেটা থেকে
 (state.medicine||[]).forEach(m=>{let g=medInfo(m.name).g;if(G[g])G[g].c+=(+m.qty||0)*(+m.rate||0)});
 let order=Object.keys(G).sort((a,b)=>G[b].c-G[a].c);
 let closed=window._medClosed||{};
 order.forEach(g=>{
  let h=document.createElement("tr");h.className="mg-hrow";h.dataset.g=g;
  h.innerHTML='<td colspan="6" onclick="medGrpToggle(\''+g+'\')"><div class="mg-hd"><div><b>'+MED_GROUPS[g]+'</b><span class="mg-use">'+MED_USE[g]+'</span></div><div class="mg-hr"><b>'+money(G[g].c)+'</b><small>'+G[g].rows.length+'টি • <i class="mg-arr">▼</i></small></div></div></td>';
  tb.appendChild(h);G[g].rows.forEach(r=>tb.appendChild(r));
 });
 medGrpApply();
}
(function(){const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{medGrpBuild()}catch(e){console.error(e)}return x};
window.addEventListener("load",()=>{try{medGrpBuild()}catch(e){}})})();

/* ── ওষুধ যোগ করার সময় গ্রুপ বেছে ওষুধ নেওয়া ── */
const MED_PICK={
 anti:["Amoxicillin","Ciprofloxacin","Enrofloxacin","Norfloxacin","Doxycycline","Oxytetracycline","Colistin","Tylosin","Gentamicin","Azithromycin","Metronidazole"],
 cocci:["Amprolium","Toltrazuril","Sulfonamide (সালফা)"],
 worm:["Albendazole","Levamisole","Fenbendazole","Piperazine"],
 resp:["Bromhexine","সর্দি-কাশির ওষুধ"],
 vit:["AD3E","মাল্টিভিটামিন","বি-কমপ্লেক্স","মিনারেল মিক্সচার"],
 cal:["ক্যালসিয়াম সিরাপ","ক্যালসিয়াম পাউডার"],
 liver:["Sorbitol","Silymarin","লিভার টনিক"],
 pro:["প্রোবায়োটিক","এনজাইম","টক্সিন বাইন্ডার (Toxibinding)"],
 elec:["ইলেক্ট্রোলাইট","গ্লুকোজ","স্যালাইন পাউডার"],
 water:["পানির pH ঠিক রাখার ওষুধ","অ্যাসিডিফায়ার"],
 dis:["ফরমালিন","পটাশ","আয়োডিন","ব্লিচিং পাউডার"],
 vac:["রানিক্ষেত ভ্যাকসিন","গামবোরো ভ্যাকসিন","বিসিআরডিভি ভ্যাকসিন"],
 oth:[]
};
window.medPickGroup=function(g){window._medPickG=(window._medPickG===g?"":g);medPickDraw()};
window.medPickName=function(g,i){
 let list=medPickList(g),nm=list[i];if(!nm)return;
 let inp=document.getElementById("medicineName");if(!inp)return;
 inp.value=nm.replace(/\s*\(.*\)\s*$/,"");
 // গ্রুপ আলাদা হলে মনে রাখি
 if(medInfo(inp.value).g!==g)medSetGroup(inp.value,g);
 inp.dispatchEvent(new Event("input",{bubbles:true}));
 let q=document.getElementById("medicineQty");if(q)q.focus();
};
function medPickList(g){
 let L=(MED_PICK[g]||[]).slice();
 (state.medicine||[]).forEach(r=>{let n=String(r.name||"").trim();if(n&&medInfo(n).g===g&&!L.some(x=>medNorm(x).replace(/\s*\(.*\)\s*$/,"")===medNorm(n)))L.push(n)});
 return L;
}
function medPickDraw(){
 let inp=document.getElementById("medicineName");if(!inp)return;
 let f=inp.closest(".fields")||inp.parentNode;
 let box=document.getElementById("medPick");
 if(!box){box=document.createElement("div");box.id="medPick";box.className="mp-box";f.insertBefore(box,f.firstChild)}
 let sel=window._medPickG||"";
 let chips=Object.keys(MED_GROUPS).filter(k=>k!=="oth").map(k=>`<button type="button" class="mp-c${sel===k?" on":""}" onclick="medPickGroup('${k}')">${MED_GROUPS[k]}</button>`).join("");
 let panel="";
 if(sel){
  let L=medPickList(sel);
  panel=`<div class="mp-p"><div class="mp-u">${MED_USE[sel]}</div><div class="mp-l">`+L.map((n,i)=>`<button type="button" class="mp-i" onclick="medPickName('${sel}',${i})">${esc(n)}</button>`).join("")+`</div><div class="mp-t">তালিকায় না থাকলে নিচের ঘরে নিজে লিখুন — এই গ্রুপে যাবে না চাইলে লেখার পর গ্রুপ বদলে নিন।</div></div>`;
 }
 box.innerHTML=`<div class="mp-h">🗂️ আগে গ্রুপ (কাজ) বেছে নিন</div><div class="mp-cs">${chips}</div>${panel}`;
}
(function(){const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{medPickDraw()}catch(e){console.error(e)}return x};
window.addEventListener("load",()=>{try{medPickDraw()}catch(e){}})})();

/* ছোট ঘর আলাদা করে পেজের সরাসরি ভেতরে রাখি, যাতে sticky কাজ করে */
(function(){
 function mv(){
  let box=document.getElementById("medCostSum");if(!box)return;
  let st=box.querySelector(".ms-frz");let fz=document.getElementById("medFrz");
  if(!st){if(fz)fz.innerHTML="";return}
  if(!fz){fz=document.createElement("div");fz.id="medFrz";box.parentNode.insertBefore(fz,box)}
  fz.innerHTML="";fz.appendChild(st);
 }
 const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{mv()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{mv()}catch(e){}});
})();
/* সামারির ছোট ঘর স্ক্রল করলেও উপরে আটকে থাকে — মেনুর উচ্চতা মেপে নেয় */
(function(){
 function fix(){let n=document.getElementById("nav")||document.querySelector(".nav-row");let h=0;
  document.querySelectorAll("#nav,.sticky-nav").forEach(e=>{if(getComputedStyle(e).position==="sticky"||getComputedStyle(e).position==="fixed")h=Math.max(h,e.getBoundingClientRect().bottom)});
  if(!h&&n)h=n.getBoundingClientRect().bottom;
  document.documentElement.style.setProperty("--navh",Math.max(0,Math.round(h))+"px")}
 window.addEventListener("load",fix);window.addEventListener("resize",fix);setInterval(fix,1500);
})();

/* ── মেডিসিন শিডিউলের গোলাপি বক্সে ছোট সামারি ── */
(function(){
 function upd(){
  let ban=document.querySelector("#medschedule .pg-banner");if(!ban)return;
  let mini=ban.querySelector(".pg-mini");
  let a=state.medSchedule||[];
  if(!a.length){if(mini)mini.remove();ban.classList.remove("has-mini");return}
  let by={},slot={},tot=0,dn=0;
  a.forEach(r=>MS_SL.forEach(x=>{let m=r[x[0]];if(!m||!m.name)return;let k=m.name.trim(),o=by[k]=by[k]||{n:k,days:new Set()};o.days.add(r.date);tot++;slot[x[0]]=(slot[x[0]]||0)+1;if(r.done&&r.done[x[0]])dn++}));
  let list=Object.values(by).sort((x,y)=>y.days.size-x.days.size||x.n.localeCompare(y.n));
  if(!list.length){if(mini)mini.remove();return}
  let top=list[0],sk=Object.keys(slot).sort((x,y)=>slot[y]-slot[x])[0],sx=MS_SL.find(x=>x[0]===sk)||["","","",""];
  let slotName=sx[2]||"";
  let chips=[["🔥","সবচেয়ে বেশি",top.n+" • "+top.days.size+" দিন"],["💊","আলাদা ওষুধ",list.length+"টি"],["🕒","বেশি ডোজ",sx[1]+" "+slotName+" • "+slot[sk]+"টি"],["✅","দেওয়া হয়েছে",tot?Math.round(dn/tot*100)+"% ("+dn+"/"+tot+")":"—"]];
  if(!mini){mini=document.createElement("div");mini.className="pg-mini";ban.appendChild(mini)}
  ban.classList.add("has-mini");
  mini.innerHTML=chips.map(c=>'<div><span>'+c[0]+' '+c[1]+'</span><b>'+esc(c[2])+'</b></div>').join("");
 }
 const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 const m0=window.renderMedSchedule;if(typeof m0==="function")window.renderMedSchedule=function(){const x=m0.apply(this,arguments);try{upd()}catch(e){}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── বাচ্চা ও মৃত পেজের হলুদ বক্সে ছোট সামারি ── */
(function(){
 function upd(){
  let ban=document.querySelector("#farm .pg-banner");if(!ban)return;
  let mini=ban.querySelector(".pg-mini");
  let n=+state.chicks||0;
  if(!n){if(mini)mini.remove();ban.classList.remove("has-mini");return}
  let dead=deathTotal()||(+state.dead||0),price=+state.chickPrice||0,live=livePcs();
  let chips=[["💰","বাচ্চার মোট দাম",price>0?money(n*price):"—","hi"],["🐔","মোট অবশিষ্ট মুরগি",fmt(live,0)+" টি","hi"],["☠️","মোট মৃত",fmt(dead,0)+" টি",""],["📉","মৃত্যুর হার",(n?Math.round(dead/n*1000)/10:0)+"%",""]];
  if(!mini){mini=document.createElement("div");mini.className="pg-mini m4";ban.appendChild(mini)}
  ban.classList.add("has-mini");
  mini.innerHTML=chips.map(c=>'<div class="'+c[3]+'"><span>'+c[0]+' '+c[1]+'</span><b>'+esc(c[2])+'</b></div>').join("");
 }
 const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── বিভিন্ন খরচ পেজের কমলা বক্সে ছোট সামারি ── */
(function(){
 function upd(){
  let ban=document.querySelector("#other .pg-banner");if(!ban)return;
  let mini=ban.querySelector(".pg-mini");
  let L=k=>(state[k]||[]).length,n=L("other")+L("litter")+L("power")+L("rent");
  if(!n){if(mini)mini.remove();ban.classList.remove("has-mini");return}
  let P=[["🧾","বিভিন্ন খরচ",total("other")],["🪵","কাঠের গুড়া",total("litter")],["🚚","পরিবহন ভাড়া",rentTotal()],["⚡","বিদ্যুৎ/জ্বালানি",total("power")]];
  let all=P.reduce((s,x)=>s+x[2],0),top=P.slice().sort((x,y)=>y[2]-x[2])[0];
  let due=Math.max(0,rentTotal()-sumOf(state.rent||[],r=>r.paid));
  let chips=[["💰","মোট খরচ (৪ খাত)",money(all),"hi"],["🏆","সবচেয়ে বড় খাত",top[0]+" "+top[1],"hi"],["🧮","মোট এন্ট্রি",n+"টি",""],["🚚","ভাড়া বাকি",money(due),""]];
  if(!mini){mini=document.createElement("div");mini.className="pg-mini m4";ban.appendChild(mini)}
  ban.classList.add("has-mini");
  mini.innerHTML=chips.map(c=>'<div class="'+c[3]+'"><span>'+c[0]+' '+c[1]+'</span><b>'+esc(c[2])+'</b></div>').join("");
 }
 const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();

/* ── কর্মচারী পেজের বক্সে ছোট সামারি ── */
(function(){
 function upd(){
  let ban=document.querySelector("#workers .pg-banner");if(!ban)return;
  let mini=ban.querySelector(".pg-mini");
  let paid=workersPaid(state),on=wageOn(state);
  if(!on&&!paid){if(mini)mini.remove();ban.classList.remove("has-mini");return}
  let s=wageStats(state),w=+state.dailyWage||0,earn=on?s.earned:paid;
  let chips=on?[["📅","মোট দিন",s.total+" দিন"],["✂️","কর্তন",s.absent+" দিন"],["💰","মোট টাকা",money(earn)],["✅","দিলাম",money(paid)],["⏳",earn-paid>=0?"পাবে":"বেশি দিলাম",money(Math.abs(earn-paid))]]:[["✅","দিলাম",money(paid)]];
  if(!mini){mini=document.createElement("div");mini.className="pg-mini m5";ban.appendChild(mini)}
  ban.classList.add("has-mini");
  mini.innerHTML=chips.map((c,i)=>'<div'+(i===chips.length-1&&on?' class="hi"':'')+'><span>'+c[0]+' '+c[1]+'</span><b>'+esc(c[2])+'</b></div>').join("");
 }
 const r0=window.render;window.render=function(){const x=r0.apply(this,arguments);try{upd()}catch(e){console.error(e)}return x};
 window.addEventListener("load",()=>{try{upd()}catch(e){}});
})();
