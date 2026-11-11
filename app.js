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
 if(state.status==="closed"){state.status="active";state.closedAt=null;showToast("🔓 ব্যাচ পুনরায় চালু হয়েছে");}
 else{if(closeStats().live>0){showToast("❌ এখনও "+livePcs()+" টি মুরগি অবশিষ্ট — ক্লোজ করা যাবে না");return;}if(!await askConfirm("এই ব্যাচটি সম্পন্ন হিসেবে চিহ্নিত করবেন? পরে চাইলে আবার চালু করা যাবে।"))return;state.status="closed";state.closedAt=todayISO();showToast("✅ ব্যাচ সম্পন্ন হিসেবে চিহ্নিত হয়েছে");}
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
function days(){if(!state.startDate)return 0;let a=new Date(state.startDate+"T00:00:00"),b=new Date();a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.max(0,Math.floor((b-a)/86400000))}
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
function addDeath(){
 let q=+deathQty.value||0;if(q<=0){showToast("❌ মৃত মুরগির সংখ্যা লিখুন");return}
 state.deaths=state.deaths||[];
 let drec={date:deathDate.value||todayISO(),qty:q,reason:deathReason.value.trim(),action:deathAction.value.trim(),note:""};
 let dex=state.deaths.find(r=>r.date===drec.date);
 if(dex)deathMergeInto(dex,drec);else state.deaths.push(drec);
 state.dead=deathTotal();deathQty.value="";deathReason.value="";deathAction.value="";save();render();showToast("✅ মৃত্যু যোগ হয়েছে: "+q+" টি");
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
<div class="form"><div class="fields"><label>তারিখ<input id="${key}Date" type="date"></label><label>${v[1]}<input id="${key}Name"${key==="feed"?` list="feedNames" placeholder="নাম লিখুন বা নিচে চাপ দিন" oninput="syncChips('feedName')"`:key==="medicine"?``:""}></label><label>${v[2]}<input id="${key}Qty" type="number" min="0" step=".01"></label><label>দর<input id="${key}Rate" type="number" min="0" step=".01"></label></div>${key==="feed"?feedChips("feedName"):""}<button class="add" onclick="addRow('${key}')">➕ যোগ করুন</button></div>
<div class="section">${v[0]} টেবিল</div><div class="wrap"><table><thead><tr><th>তারিখ</th><th>${v[1]}</th><th>${v[2]}</th><th>দর</th><th>মোট</th><th>অ্যাকশন</th></tr></thead><tbody id="${key}Table"></tbody></table></div></section>`);
}
host.insertAdjacentHTML("beforeend",`<section id="sales" class="page"><div class="section">💰 বিক্রি হিসাব</div>
<div class="form">
<div class="fields"><label>তারিখ<input id="salesDate" type="date"></label><label>ক্রেতার নাম<input id="salesCustomer" list="customerList" placeholder="যেমন: করিম মিয়া"></label></div>
<datalist id="customerList"></datalist>
<div id="pallaTotals" class="pl-sum"></div>
<div class="section" style="margin:8px 0 4px;font-size:13px">⚖️ পাল্লা যোগ করুন</div>
<div class="pl-row"><label>মুরগি সংখ্যা<input id="pallaQty" type="number" min="0" inputmode="numeric"></label><label>ওজন (কেজি)<input id="pallaWeight" type="number" min="0" step=".01" inputmode="decimal"></label><button class="add pl-btn" onclick="addPalla()">➕ যোগ</button></div>
<div class="wrap pl-wrap" style="margin-top:6px"><table><thead><tr><th>পাল্লা</th><th>মুরগি</th><th>ওজন</th><th>গড়/মুরগি</th><th></th></tr></thead><tbody id="pallaTempTable"></tbody></table></div>
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
 tempPallas.push({qty:q,weight:w});
 pallaQty.value="";pallaWeight.value="";pallaQty.focus();
 renderTempPallas();
}
function payFull(){let w=tempPallas.reduce((x,p)=>x+p.weight,0),r=+salesRate.value||0;if(!(w*r>0)){showToast('❌ আগে পাল্লা ও দর দিন');return}salesPaid.value=Math.round(w*r*100)/100;renderTempPallas()}
function removePalla(i){tempPallas.splice(i,1);renderTempPallas()}
function renderTempPallas(){
 pallaTempTable.innerHTML=tempPallas.length?tempPallas.map((p,i)=>`<tr><td>${i+1}</td><td>${p.qty} টি</td><td>${p.weight} কেজি</td><td>${(p.weight/p.qty||0).toFixed(2)} কেজি</td><td><button class="del" onclick="removePalla(${i})">✕</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty" style="padding:8px">এখনও কোনো পাল্লা নেই</td></tr>`;
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
 tempPallas=[];salesCustomer.value="";salesPaid.value="";salesRate.value="";
 save();render();renderTempPallas();showToast("✅ বিক্রি সংরক্ষণ হয়েছে");
}
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
function renderSales(){if(!salesDate.value)salesDate.value=todayISO();salesTable.innerHTML=state.sales.length?dsort(state.sales).map(([r,i])=>{let tot=r.weight*r.rate;let paid=+r.paid||0;let due=tot-paid;let pallas=r.pallas||[];let pc=pallas.length;let detail=pallas.map((p,pi)=>`<tr><td style="padding:4px 8px">পাল্লা ${pi+1}</td><td style="padding:4px 8px">${p.qty} টি</td><td style="padding:4px 8px">${p.weight} কেজি</td><td style="padding:4px 8px">গড়: ${(p.weight/p.qty||0).toFixed(2)} কেজি/মুরগি</td></tr>`).join("");let mainRow=`<tr><td>${r.date||""}</td><td>${r.customer||"—"}</td><td>${r.qty}${pc?` <span style="opacity:.6;font-size:11px">(${pc} পাল্লা)</span>`:""}</td><td>${r.weight}</td><td>${money(r.rate)}</td><td>${money(tot)}</td><td>${money(paid)}</td><td>${due>0?money(due):"—"}</td><td>${(r.weight/r.qty||0).toFixed(2)} কেজি</td><td>${pc?`<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="toggleDetails(${i})">বিস্তারিত</button>`:""}<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="memoOpen(${i})">🧾 মেমো</button><button class="edt" onclick="openEdit('sales',${i})">✏️</button><button class="del" onclick="del('sales',${i})">মুছুন</button></td></tr>`;let detailRow=pc?`<tr id="pallaDetail${i}" style="display:none"><td colspan="10" style="padding:0;background:#f7f9fa"><table style="width:100%;font-size:12px">${detail}</table></td></tr>`:"";return mainRow+detailRow}).join(""):`<tr><td colspan="10" class="empty">এখনও কোনো বিক্রি যোগ করা হয়নি</td></tr>`;
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
function wageEnd(b){return (b.status==="closed"&&b.closedAt)?b.closedAt:_wIso()}
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
 let map={};
 (state.sales||[]).forEach(r=>{
  let name=(r.customer||"").trim()||"নাম উল্লেখ নেই";
  if(!map[name])map[name]={qty:0,weight:0,total:0,paid:0,visits:0,pallaCount:0};
  let tot=(+r.weight||0)*(+r.rate||0);
  map[name].qty+=(+r.qty||0);map[name].weight+=(+r.weight||0);map[name].total+=tot;map[name].paid+=(+r.paid||0);map[name].visits+=1;
  map[name].pallaCount+=(r.pallas&&r.pallas.length)?r.pallas.length:1;
 });
 let names=Object.keys(map).sort((a,b)=>map[b].total-map[a].total);
 host.innerHTML=names.length?names.map(n=>{
  let c=map[n];let due=c.total-c.paid;let avg=c.qty?(c.weight/c.qty).toFixed(2):"0";
  return `<div class="batch-card">
   <div class="bhead"><b>${n}</b><span class="${due>0?"badge-closed":"badge-active"}">${due>0?"বাকি আছে":"পরিশোধিত"}</span></div>
   <div class="bstat">🛒 বার: ${c.visits} • ⚖️ পাল্লা: ${c.pallaCount} • 🐔 মুরগি: ${c.qty} টি</div>
   <div class="bstat">📦 মোট ওজন: ${c.weight.toFixed(2)} কেজি • 📏 গড় ওজন/মুরগি: ${avg} কেজি</div>
   <div class="bstat">💰 মোট: ${money(c.total)} • ✅ পরিশোধ: ${money(c.paid)} • ⏳ বাকি: ${money(Math.max(0,due))}</div>${window.custTools?custTools(n,due):""}
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
function addNote(){
  let title=document.getElementById("noteTitle").value.trim();
  let text=document.getElementById("noteText").value.trim();
  if(!title&&!text){showToast("❌ শিরোনাম বা নোট লিখুন");return;}
  state.notes=state.notes||[];
  state.notes.push({date:document.getElementById("noteDate").value||todayISO(),title:title,text:text,createdAt:new Date().toISOString()});
  save();renderNotes();
  document.getElementById("noteTitle").value="";document.getElementById("noteText").value="";
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
    return `<div class="note-row" onclick="openNote(${x.i})" role="button" tabindex="0"><div class="note-ic">📌</div><div class="note-mid"><div class="note-t">${esc(t)}</div>${pv?`<div class="note-pv">${esc(pv)}${String(r.text||"").length>70?"…":""}</div>`:""}</div><div class="note-d">${esc(r.date||"")}<span>👉</span></div></div>`;
  }).join("");
}
function openNote(i){
  let r=(state.notes||[])[i];if(!r)return;
  let t=(r.title||"").trim()||"📝 নোট";
  document.getElementById("infoTitle").textContent="📌 "+t;
  document.getElementById("infoBody").innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:10px">📅 ${esc(r.date||"তারিখ নেই")}</div><div style="font-size:15px;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:#e8edf2;background:#0d1923;border:1px solid #ffffff14;border-radius:12px;padding:12px;max-height:55vh;overflow:auto">${r.text?esc(r.text):"<span style='color:#7a9aaa'>কোনো বিস্তারিত লেখা নেই</span>"}</div><div style="display:flex;gap:8px;margin-top:12px"><button class="edt" style="flex:1;padding:10px" onclick="closeInfo();openEdit('notes',${i})">✏️ এডিট</button><button class="del" style="flex:1;padding:10px" onclick="closeInfo();delNote(${i})">🗑️ মুছুন</button></div>`;
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
  if(type==="feed"){v("os_fBags").value="";v("os_fLoose").value="";}
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
 sumCards("sales",[["🐔","বিক্রিত মুরগি",fmt(sq,0)+" টি"],["⚖️","মোট ওজন",fmt(sw)+" কেজি"],["📏","গড় ওজন/মুরগি (পাইকারি)",sq?(sw/sq).toFixed(2)+" কেজি":"—"],["⚖️","মোট গড় (গিফট+খুচরা সহ)",allWeightStats().q?allWeightStats().avg.toFixed(2)+" কেজি":"—"],["🎁","গিফট/নিজের",fmt(giftPcs(),0)+" টি"],["🏷️","গড় দর/কেজি",sw?money(st/sw):"৳০"],["💰","মোট টাকা",money(st),"#3ddc84"],["✅","পেয়েছি",money(sp)],["⏳","বাকি পাব",money(Math.max(0,st-sp)),st-sp>0?"#ff7070":"#3ddc84"],["👥","ক্রেতা",cust+" জন"],["📦","এখনও বাকি মুরগি",fmt(live,0)+" টি"],["📅","শেষ বিক্রি",lastDate(sl)]]);
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
 let cards=[["📅","বয়স",days()+" দিন"],["💵","মোট খরচ",money(bs.cost),"#fbbf24"],["💰","মোট আয়",money(bs.sales),"#3ddc84"],[bs.profit>=0?"📈":"📉",bs.profit>=0?"নিট লাভ":"নিট ক্ষতি",money(bs.profit),bs.profit>=0?"#3ddc84":"#ff7070"],["🛒","বিক্রিত মুরগি",fmt(x.sold,0)+" টি"],["🎁","গিফট/নিজের",fmt(x.gift,0)+" টি"],["☠️","মৃত",fmt(x.dead,0)+" টি","#ff7070"],["🐔","খামারে বাকি",fmt(x.live,0)+" টি",x.live>0?"#ffd070":"#3ddc84"],["⏳","ক্রেতার কাছে বাকি",money(x.due),x.due>0?"#ff7070":"#3ddc84"]];
 let warns=[];
 if(!x.hasSales)warns.push("কোনো বিক্রি যোগ করা হয়নি");
 
 if(x.due>0)warns.push("ক্রেতাদের কাছে "+money(x.due)+" বাকি পাওনা আছে");
 closeBody.innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:8px">${esc(state.name)} — ক্লোজ করার আগে চূড়ান্ত হিসাব দেখে নিন</div>`
  +`<div class="pgsum">${cards.map(cardHtml).join("")}</div>`
  +(x.live>0?`<div class="warnbox" style="border-color:#ff7070;color:#ffb0b0">🚫 <b>ক্লোজ করা যাবে না!</b><br>খামারে এখনও ${fmt(x.live,0)} টি মুরগি অবশিষ্ট আছে। সব মুরগি বিক্রি / গিফট / নিজের খাওয়া হিসেবে এন্ট্রি না হওয়া পর্যন্ত ব্যাচ ক্লোজ হবে না।</div>`:"")+(x.live>0?"":warns.length?`<div class="warnbox">${warns.map(w=>"⚠️ "+w).join("<br>")}<div style="opacity:.8;margin-top:4px">চাইলে তবুও ক্লোজ করতে পারেন।</div></div>`:`<div class="okbox">✅ সব ঠিক আছে — সব মুরগির হিসাব ও টাকা মিলেছে</div>`)
  +`<div class="mfields" style="margin-top:12px"><label>ক্লোজের তারিখ<input id="closeDate" type="date" value="${todayISO()}"></label><label class="wide">নোট (ঐচ্ছিক)<input id="closeNote" placeholder="যেমন: সব মুরগি বিক্রি শেষ"></label></div>`
  +`<div style="font-size:11.5px;color:#7a9aaa;margin-top:10px;line-height:1.6">ℹ️ ক্লোজ করলে ব্যাচটি "সম্পন্ন" হবে। সব তথ্য ও রিপোর্ট সংরক্ষিত থাকবে, ডিলিট হবে না। পরে চাইলে "আবার চালু" করা যাবে। এরপর "➕ নতুন ব্যাচ" দিয়ে নতুন ব্যাচ শুরু করুন।</div>`;
 document.getElementById("closeConfirmBtn").style.display=x.live>0?"none":"";
 closeModal.classList.add("show");
}
function hideClose(){closeModal.classList.remove("show")}
function confirmClose(){
 if(state.status==="closed"){hideClose();return}
 if(closeStats().live>0){showToast("❌ সব মুরগি বিক্রি না হলে ব্যাচ ক্লোজ করা যাবে না");return}
 state.status="closed";
 state.closedAt=document.getElementById("closeDate").value||todayISO();
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
 if(configs[kind]){let v=configs[kind];return{title:v[0],arr:state[kind],fields:[T,["name",v[1],"text",kind==="feed"?"feedNames":""],["qty",v[2],"number"],["rate","দর","number"]]}}
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
 v("dfName").value="";syncChips("dfName");v("dfBags").value="";v("dfLoose").value="";v("dfNote").value="";dfLive();
 save();render();showToast(merged?"✅ এই তারিখের আগের এন্ট্রির সাথে যোগ হয়েছে — মোট "+fmt(dfKg(ex))+" কেজি":"✅ দৈনিক খাবারের হিসাব সংরক্ষণ হয়েছে");
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
 let cards=[["🍽️","মোট খাওয়ানো",fmt(tot)+" কেজি","#3ddc84"],["📅","আজকের খাবার",fmt(todayKg)+" কেজি"],["📊","গড় প্রতিদিন",dates.length?fmt(tot/dates.length)+" কেজি":"—"],["🐔","প্রতি মুরগি মোট",perBird>=1000?fmt(perBird/1000)+" কেজি":fmt(perBird,1)+" গ্রাম"],["🗓️","হিসাবের দিন",dates.length+" দিন"],["🕒","শেষ এন্ট্রি",lastDate(a)]];
 Object.keys(byName).forEach(n=>cards.push(["🌾",esc(n),fmt(byName[n])+" কেজি","#fbbf24"]));
 document.getElementById("dfCards").innerHTML=cards.map(cardHtml).join("");
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
 let feed=dailyFeedKg(),a=avgBreak(),live=livePcs(),la=+state.liveAvgWt||0;
 let dead=deathTotal()||(+state.dead||0),birds=Math.max(0,(+state.chicks||0)-dead);
 let tw=a.w+live*la,tg=+state.targetFCR||1.6;
 return{feed:feed,harv:a.w,live:live,la:la,liveW:live*la,tw:tw,fcr:(feed>0&&tw>0)?feed/tw:0,tg:tg,birds:birds,need:feed/tg};
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
function openFCR(){
 document.getElementById("infoTitle").textContent="🎯 FCR — "+state.name;
 document.getElementById("infoBody").innerHTML=`<div style="font-size:12px;color:#7a9aaa;margin-bottom:8px">FCR = মোট খাওয়ানো ফিড (কেজি) ÷ মোট মুরগির ওজন (কেজি)। যত কম, তত ভালো। টার্গেট FCR বদলে ফিড অনুযায়ী কত ওজন দরকার দেখুন।</div>
 <div class="mfields"><label>টার্গেট FCR<input id="fcrTarget" type="number" min="0" step=".01" inputmode="decimal" value="${+state.targetFCR||1.6}" oninput="fcrCalc()"></label><label>খামারের বর্তমান মুরগির আনুমানিক গড় ওজন (কেজি)<input id="fcrLiveAvg" type="number" min="0" step=".01" inputmode="decimal" value="${+state.liveAvgWt||""}" placeholder="যেমন: 1.2" oninput="fcrCalc()"></label></div>
 <div id="fcrOut" style="margin-top:12px"></div>`;
 fcrCalc();
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
 if(f.live>0&&!f.la)h+=`<div class="warnbox">ℹ️ খামারে ${fmt(f.live,0)} টি মুরগি আছে। তাদের আনুমানিক গড় ওজন দিলে FCR আরও সঠিক হবে।</div>`;
 if(f.tw>0){
  if(f.tw>=f.need)h+=`<div class="fcr-verdict good">✅ ওজন ঠিক আছে — ফিড অনুযায়ী ${fmt(f.need)} কেজি দরকার, আছে ${fmt(f.tw)} কেজি (বাড়তি ${fmt(f.tw-f.need)} কেজি)।</div>`;
  else h+=`<div class="fcr-verdict bad">⚠️ ওজন কম — ফিড অনুযায়ী ${fmt(f.need)} কেজি দরকার, আছে ${fmt(f.tw)} কেজি। আরও ${fmt(f.need-f.tw)} কেজি ওজন দরকার${f.birds?" (প্রতি মুরগি আরও প্রায় "+((f.need-f.tw)/f.birds).toFixed(2)+" কেজি)":""}।</div>`;
 }
 out.innerHTML=h;
}
function closeInfo(){let m=document.getElementById("infoModal");if(m)m.classList.remove("show");renderFcrCards()}

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
 if(fi&&fi.bought>0){let l=fi.left;row("🌾",(fi.stock<=0||(l!==null&&l<=2))?"bad":"","ফিড মজুত "+fb(Math.max(0,fi.stock))+" কেজি"+(l!==null?" — আর প্রায় "+fb(l,1)+" দিন চলবে":""),"","analysis")}
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
 if(!(f.bought>0)&&!(f.used>0)){el.innerHTML='<div class="an-alert info">"🌾 ফিড" পেজে ফিড কেনা আর "🍽️ দৈনিক খাবার" পেজে প্রতিদিনের খাবার যোগ করলে মজুত হিসাব এখানে আসবে।</div>';return}
 let cards=[["কেনা ফিড",fb(f.bought)+" কেজি"],["খাওয়ানো হয়েছে",fb(f.used)+" কেজি"]];
 if(f.sold>0)cards.push(["বিক্রি করা ফিড",fb(f.sold)+" কেজি"]);
 cards.push(["এখন মজুত",fb(f.stock)+" কেজি ("+fb(f.stock/bagKg(),1)+" বস্তা)"]);
 cards.push(["গড় দৈনিক খাবার (শেষ ৩ দিন)",f.avg?fb(f.avg)+" কেজি":"—"]);
 cards.push(["আর কত দিন চলবে",f.left!==null?"প্রায় "+fb(f.left,1)+" দিন":"—"]);
 let al="";
 if(f.stock<0)al='<div class="an-alert bad">মজুত ঋণাত্মক এসেছে। ফিড কেনার এন্ট্রি বাদ পড়েছে কিনা বা প্রতি বস্তার কেজি ঠিক আছে কিনা দেখুন।</div>';
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
 let rows=[],extra=0,maxN=Math.min(7,Math.max(0,42-age));
 for(let n=0;n<=maxN;n++){
  if(n>0)extra+=fi.avg*intakeAt(age+n)/intakeAt(Math.max(1,age-1))*frate;
  let w=w0+(stdAt(age+n)-stdAt(age))/1000;
  let rev=live*w*rate;
  rows.push({n:n,age:age+n,w:w,rev:rev,extra:extra,profit:net+rev-extra});
 }
 let best=rows.reduce((a,b)=>b.profit>a.profit?b:a,rows[0]);
 let msg=best.n===0?"আজ বিক্রি করাই সবচেয়ে ভালো মনে হচ্ছে।":"আরও "+bn(best.n)+" দিন রাখলে আজকের চেয়ে প্রায় ৳"+fb(best.profit-rows[0].profit,0)+" বেশি লাভ হতে পারে।";
 let h='<div class="an-alert '+(best.n===0?"info":"good")+'"><b>'+msg+'</b></div>';
 h+='<div class="an-proj" style="margin-top:8px"><table><thead><tr><th>কবে</th><th>বয়স</th><th>গড় ওজন</th><th>মুরগি বিক্রি</th><th>বাড়তি ফিড খরচ</th><th>মোট নিট লাভ</th></tr></thead><tbody>';
 rows.forEach(r=>{h+='<tr class="'+(r===best?"best":"")+(r.profit<0?" neg":"")+'"><td>'+(r.n?"+"+bn(r.n)+" দিন":"আজ")+'</td><td>'+bn(r.age)+'</td><td>'+fb(r.w*1000,0)+' গ্রাম</td><td>'+tk(r.rev)+'</td><td>'+(r.extra?tk(r.extra):"—")+'</td><td>'+(r.profit<0?"−":"")+tk(Math.abs(r.profit))+'</td></tr>'});
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
  if(need<=0)h+='<div class="an-alert good"><b>✅ খরচ উঠে গেছে।</b> বাকি '+bn(live)+' টি মুরগি যে দামেই বিক্রি হোক সেটা লাভ।</div>';
  else{let be=need/estKg;h+='<div class="an-alert info"><b>⚖️ ব্রেক-ইভেন দর: কেজিতে ৳'+fb(be,1)+'</b><br>বাকি '+bn(live)+' টি মুরগির আনুমানিক ওজন প্রায় '+fb(estKg,0)+' কেজি ('+w0.src+')। খরচ তুলতে আরও ৳'+fb(need,0)+' লাগবে, তাই এর বেশি দরে বেচলে লাভ।'+(lastSaleRate()?'<br>শেষ বিক্রির দর ৳'+fb(lastSaleRate(),0)+(lastSaleRate()>=be?' — এই দরে বেচলে লাভ হবে।':' — এই দরে বেচলে এখনও ক্ষতি।'):'')+'</div>'}
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
 // দর কমলে-বাড়লে বাকি মুরগি বিক্রির পর শেষ লাভ
 if(live>0&&estKg>0&&state.startDate){
  let ref=Math.round(avgRate>0?avgRate:(Math.max(0,-net)/estKg)+10),rows=[];
  [-20,-10,0,10,20].forEach(dv=>{let r=ref+dv;if(r>0)rows.push([r,net+estKg*r,dv===0])});
  h+='<div class="pa-sub">🔮 বাকি '+bn(live)+' টি মুরগি এই দরে বিক্রি হলে শেষ লাভ</div><div class="pa-row" style="font-weight:700;color:#8fb1a0"><span>কেজি দর</span><span>মোট নিট লাভ/ক্ষতি</span></div>'+
   rows.map(x=>'<div class="pa-row"'+(x[2]?' style="background:#ffffff0d;font-weight:700"':'')+'><span>৳'+bn(x[0])+(x[2]?' (ভিত্তি দর)':'')+'</span><span style="color:'+(x[1]>=0?'#3ddc84':'#ff7070')+'">'+(x[1]<0?'−':'+')+tk(Math.abs(x[1]))+'</span></div>').join("")+
   '<div class="an-note" style="margin-top:6px">বাকি মুরগির আনুমানিক ওজন '+fb(estKg,0)+' কেজি ধরা ('+w0.src+')।</div>';
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
function renderAnTop(){
 let el=$a("anTop");if(!el)return;
 let s=window._anSum;
 if(!s){el.innerHTML="";return}
 const tk2=n=>(n<0?"−":"")+"৳"+fb(Math.abs(n),0);
 let c1='<div class="tc"><small>'+(s.net>=0?"এখন পর্যন্ত নিট লাভ":"এখনও ক্ষতিতে")+'</small><b style="color:'+(s.net>=0?"#3ddc84":"#ff7070")+'">'+tk2(s.net)+'</b><em>আয় '+tk2(s.inc)+' − খরচ '+tk2(s.cost)+'</em></div>';
 let c2=s.pp!==null?'<div class="tc"><small>'+(s.pp>=0?"কেজিতে লাভ":"কেজিতে ক্ষতি")+'</small><b style="color:'+(s.pp>=0?"#3ddc84":"#ff7070")+'">'+tk2(s.pp)+'</b><em>দর ৳'+fb(s.avgRate,0)+' − খরচ ৳'+fb(s.pk,0)+'</em></div>':'<div class="tc"><small>কেজিতে লাভ</small><b>—</b><em>বিক্রি বা দর দিলে আসবে</em></div>';
 let c3=s.be===null?'<div class="tc"><small>ব্রেক-ইভেন দর</small><b>—</b><em>বাকি মুরগি নেই</em></div>':(s.be<=0?'<div class="tc"><small>ব্রেক-ইভেন দর</small><b style="color:#3ddc84">✅ উঠে গেছে</b><em>খরচ উঠে গেছে</em></div>':'<div class="tc"><small>ব্রেক-ইভেন দর</small><b style="color:#ffd070">৳'+fb(s.be,0)+'/কেজি</b><em>এর বেশিতে বেচলে লাভ</em></div>');
 el.innerHTML='<div class="an-top">'+c1+c2+c3+'</div>';
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
 let s=$a("kPerBirdS");try{renderLcTiles()}catch(e){}if(s)s.textContent=c.chicks>0?("ফিড ৳"+fe(c.price)+((+state.feedKgPrice>0)?"":" (গড়)")+" • চাপুন"):"বাচ্চার তথ্য দিন";
}
window.openGraphs=function(){let m=$a("grModal");if(!m)return;try{renderDashRings()}catch(e){console.error(e)}m.classList.add("show");let b=$a("grBody");if(b)b.scrollTop=0};
window.closeGraphs=function(){let m=$a("grModal");if(m)m.classList.remove("show")};
window.openFeedPrice=function(){let m=$a("fpModal"),i=$a("fpInput");if(!m)return;i.value=+state.feedKgPrice||"";m.classList.add("show");setTimeout(()=>i.focus(),80)};
window.closeFeedPrice=function(){let m=$a("fpModal");if(m)m.classList.remove("show")};
window.saveFeedPrice=function(){let v=+$a("fpInput").value;state.feedKgPrice=v>0?v:0;state.projFeedRate=state.feedKgPrice;save();closeFeedPrice();try{renderDashPerBird();renderAnalysis()}catch(e){console.error(e)};showToast("✅ ফিডের দাম সেভ হয়েছে")};

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
 let nm=(need)=>{let d=cur-need;return "এখন "+fe(cur)+" • "+(d>=0?"যথেষ্ট ✅":"আরও "+fe(-d)+" লাগবে")};
 set(6,c.price>0?fe(pb.all/c.price)+" কেজি":"—",c.price>0?nm(pb.all/c.price):dp);
 set(1,c.price>0?fe(c.need)+" কেজি":"—",c.price>0?nm(c.need):dp);
 {let rows=[[7,pb.alive>0?pb.all/pb.alive:null],[8,c.alive>0?c.cost/c.alive:null]];
  rows.forEach(([n,cp])=>{let t=$a("lcT"+n),ok=c.price>0&&cp!==null&&cp>0;
   if(ok){let need=cp/c.price;set(n,fe(need,2)+" কেজি","৳"+fe(cp,2)+" ÷ ৳"+fe(c.price)+" • এখন গড় "+fe(c.w0,2));if(t){t.classList.remove("m-red","m-green");t.classList.add(c.w0>=need?"m-green":"m-red")}}
   else set(n,"—",c.price>0?"বাচ্চার তথ্য দিন":"দর দিতে চাপুন")})}
 let tk=cur,be=tk>0?c.cost/tk:0;
 set(4,be>0?"৳"+fe(be)+"/কেজি":"—",be>0?"এর নিচে বেচলে ক্ষতি":"ওজনের তথ্য নেই");
 let r5=lcP5(c),t5=$a("lcT5");
 set(5,r5?(r5.net>=0?"লাভ ৳":"ক্ষতি ৳")+fe(Math.abs(r5.net)):"—",r5?"দর ৳"+fe(c.price)+"/কেজি ধরে":"দর দিতে চাপুন");
 if(t5){t5.classList.remove("m-red","m-green");if(r5)t5.classList.add(r5.net>=0?"m-green":"m-red")}
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
 if(k===1){
  let diff=cur-c.need;
  h=ex("মুরগি বেচে মোট খরচ ফেরত পেতে সব মিলিয়ে কত কেজি মুরগি বেচতে হবে। ফিড ধরা হয়েছে <b>যত কিনেছেন</b> তত।")+inP+'<label class="lc-in">খামারের মুরগির গড় ওজন (কেজি)<input id="lcAw" type="number" min="0" step=".01" inputmode="decimal" value="'+(Math.round(c.w0*100)/100)+'" oninput="lcSet()"></label>'+'<div id="lcRes">'+(c.price>0?
   lcRow("এ পর্যন্ত মোট খরচ",lcM(c.cost))+lcRow("বিক্রির দর","৳"+fe(c.price,2)+" প্রতি কেজি")+
   '<div class="lc-big"><span>খরচ ফেরত পেতে মোট বেচতে হবে</span><b>'+fe(c.need)+' কেজি</b></div>'+
   lcRow("প্রতি জীবিত মুরগি ("+fe(c.alive)+" টি)",c.alive>0?fe(c.need/c.alive,2)+" কেজি":"—")+lcRow("এখন মোট ওজন (বিক্রি হয়েছে + খামারে আছে)",fe(cur)+" কেজি")+
   '<div class="lc-v '+(diff>=0?'ok':'no')+'">'+(diff>=0?'✅ ওজন যথেষ্ট, এখনই খরচ উঠে যাবে। বাড়তি '+fe(diff)+' কেজি':'⏳ খরচ উঠতে আরও '+fe(-diff)+' কেজি ওজন লাগবে')+'</div>'+
   '<div class="lc-n">এখনকার ওজন = বিক্রি হয়েছে '+fe(c.harv)+' কেজি + খামারের '+fe(c.live)+' টি × '+fe(c.w0,2)+' কেজি (গড় ওজন উপরের ঘরের)</div>'
   :'<div class="hint">উপরে বিক্রির দর লিখুন</div>')+'</div>';
 }else if(k===4){
  let tk=cur,be=tk>0?c.cost/tk:0;
  h=ex("মুরগির যত ওজন আছে সব এই দরে বেচলে ঠিক খরচ উঠবে — এর কম দরে বেচলে ক্ষতি, বেশি দরে বেচলে লাভ।")+'<div id="lcRes">'+(be>0?
   lcRow("এ পর্যন্ত মোট খরচ",lcM(c.cost))+lcRow("বিক্রি হয়েছে",fe(c.harv)+" কেজি")+
   lcRow("খামারে আছে ("+fe(c.live)+" টি × "+fe(c.w0,2)+" কেজি)",fe(c.live*c.w0)+" কেজি")+lcRow("মোট ওজন",fe(tk)+" কেজি")+
   '<div class="lc-big"><span>ক্ষতি ঠেকাতে ন্যূনতম দর</span><b>৳'+fe(be,2)+' প্রতি কেজি</b></div>'+
   (c.price>0?'<div class="lc-v '+(c.price>=be?'ok':'no')+'">'+(c.price>=be?'✅ আপনার দর ৳'+fe(c.price)+' এর চেয়ে বেশি, লাভ থাকবে':'⚠️ আপনার দর ৳'+fe(c.price)+' এর চেয়ে কম, ক্ষতি হবে')+'</div>':'')+
   '<div class="lc-n">ওজন সর্বশেষ মাপা গড় থেকে ধরা: '+W+'</div>'
   :'<div class="hint">ওজনের তথ্য নেই — বিক্রি বা ওজন নমুনা দিন</div>')+'</div>';
 }else if(k===5){
  let aw=c.aw>0?c.aw:c.w0,r=lcP5(c);
  h=ex("খামারের বাকি মুরগি এই দরে বেচলে সব মিলিয়ে কত লাভ বা ক্ষতি হবে।")+inP+'<label class="lc-in">খামারের মুরগির গড় ওজন (কেজি)<input id="lcAw" type="number" min="0" step=".01" inputmode="decimal" value="'+(Math.round(aw*100)/100)+'" oninput="lcSet()"></label><div id="lcRes">'+(r?
   lcRow("এ পর্যন্ত বিক্রি থেকে পেয়েছেন",lcM(c.inc))+lcRow("বাকি "+fe(c.live)+" টি বেচলে পাবেন",lcM(r.rev))+lcRow("মোট আয় হবে",lcM(r.tot))+lcRow("মোট খরচ",lcM(c.cost))+
   '<div class="lc-big'+(r.net>=0?'':' bad')+'"><span>'+(r.net>=0?'মোট লাভ':'মোট ক্ষতি')+'</span><b>৳'+fe(Math.abs(r.net))+'</b></div>'+
   lcRow("প্রতি জীবিত মুরগিতে",(r.per>=0?"লাভ ৳":"ক্ষতি ৳")+fe(Math.abs(r.per),2))
   :'<div class="hint">উপরে বিক্রির দর লিখুন</div>')+'</div>';
 }else if(k===7||k===8){
  let pb=perBirdCalc(),cp=k===7?(pb.alive>0?pb.all/pb.alive:null):(c.alive>0?c.cost/c.alive:null),
   lbl=k===7?"খাওয়ানো ফিডে":"কেনা ফিডে",need=(c.price>0&&cp>0)?cp/c.price:0,d=c.w0-need;
  h=ex("উপরের “প্রতি মুরগির খরচ ("+lbl+")”-কে বিক্রির দর দিয়ে ভাগ করলে বোঝা যায় প্রতিটা মুরগি কত কেজি হলে খরচ উঠে আসবে। ফিড ধরা হয়েছে <b>"+(k===7?"শুধু যত খাইয়েছেন":"যত কিনেছেন")+"</b> তত।")+inP+'<div id="lcRes">'+
   (need>0?
   lcRow("প্রতি মুরগির খরচ ("+lbl+")","৳"+fe(cp,2))+lcRow("বিক্রির দর","৳"+fe(c.price,2)+" প্রতি কেজি")+
   '<div class="lc-big'+(d>=0?'':' bad')+'"><span>প্রতি মুরগি এত কেজি হতে হবে</span><b>'+fe(need,2)+' কেজি</b></div>'+
   lcRow("এখন গড় ওজন",fe(c.w0,2)+" কেজি")+
   '<div class="lc-v '+(d>=0?'ok':'no')+'">'+(d>=0?'✅ গড় ওজন পৌঁছে গেছে, বাড়তি '+fe(d,2)+' কেজি':'⏳ প্রতি মুরগি আরও '+fe(-d,2)+' কেজি বাড়তে হবে')+'</div>'+
   '<div class="lc-n">ভাগ: ৳'+fe(cp,2)+' ÷ ৳'+fe(c.price,2)+' = '+fe(need,2)+' কেজি। দর বদলালে সাথে সাথে বদলে যায়।</div>'
   :'<div class="hint">'+(c.price>0?'আগে বাচ্চার তথ্য দিন':'উপরে বিক্রির দর লিখুন')+'</div>')+'</div>';
 }else if(k===6){
  let pb=perBirdCalc(),fpv=Math.round(pb.price*100)/100,need=c.price>0?pb.all/c.price:0,diff=cur-need;
  h=ex("মুরগি বেচে খরচ ফেরত পেতে কত কেজি বেচতে হবে ও এখন কত আছে। ফিড ধরা হয়েছে <b>শুধু যত কেজি খাইয়েছেন</b> তার দাম, গোডাউনে বাকি ফিড ধরা হয়নি।")+inP+'<label class="lc-in">ফিডের দাম (৳ প্রতি কেজি)'+(pb.auto?' <small>(কেনা থেকে হিসাব)</small>':'')+'<input id="lcFp" type="number" min="0" step=".01" inputmode="decimal" value="'+(fpv||"")+'" oninput="lcSet()"></label><label class="lc-in">খামারের মুরগির গড় ওজন (কেজি)<input id="lcAw" type="number" min="0" step=".01" inputmode="decimal" value="'+(Math.round(c.w0*100)/100)+'" oninput="lcSet()"></label><div id="lcRes">'+
   lcRow("বাচ্চা কেনা",lcM(pb.chickCost))+lcRow("ফিড বাদে অন্য সব খরচ",lcM(pb.other))+
   lcRow("ফিড: "+fe(pb.kg)+" কেজি খাইয়েছেন × ৳"+fe(pb.price,2),lcM(pb.feedCost))+lcRow("মোট খরচ",lcM(pb.all))+
   (c.price>0?'<div class="lc-big"><span>খরচ ফেরত পেতে মোট বেচতে হবে</span><b>'+fe(need)+' কেজি</b></div>'+
   lcRow("প্রতি জীবিত মুরগি ("+fe(pb.alive)+" টি)",pb.alive>0?fe(need/pb.alive,2)+" কেজি":"—")+
   lcRow("এখন মোট ওজন (বিক্রি হয়েছে + খামারে আছে)",fe(cur)+" কেজি")+
   '<div class="lc-v '+(diff>=0?'ok':'no')+'">'+(diff>=0?'✅ ওজন যথেষ্ট, বাড়তি '+fe(diff)+' কেজি':'⏳ আরও '+fe(-diff)+' কেজি ওজন লাগবে')+'</div>'
   :'<div class="hint">উপরে বিক্রির দর লিখুন</div>')+'</div>';
 }else h='';
 return h;
}
window.openLc=function(k){
 window._lcK=k;let m=$a("lcModal");if(!m)return;
 $a("lcTitle").textContent=({1:"⚖️ ওজন: দরকার বনাম এখন — কেনা ফিডে",6:"⚖️ ওজন: দরকার বনাম এখন — খাওয়ানো ফিডে",4:"🏷️ ক্ষতি ঠেকাতে ন্যূনতম দর",5:"📊 এই দরে বেচলে লাভ/ক্ষতি",7:"🐔 প্রতি মুরগি কত কেজি লাগবে — খাওয়ানো ফিডে",8:"🐔 প্রতি মুরগি কত কেজি লাগবে — কেনা ফিডে"})[k];
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
  '<div class="rg-card"><div class="rg-t">🌾 ফিড মজুত</div>'+ringSvg(stP,stP<.15?"#ff7070":"#3ddc84",fb(Math.max(0,fi.stock),0),"কেজি")+'<div class="rg-n">'+(fi.left!==null&&fi.left!==undefined?"আরও প্রায় "+bn(Math.floor(fi.left))+" দিন চলবে":"খাবারের হিসাব দিন")+'</div></div></div>';
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
 let end=closed&&b.closedAt?b.closedAt:todayISO(),dur=null;
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
window.APP_VERSION="v46";
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
 const SUB={farm:"বাচ্চা আসা, দাম আর মৃত্যুর হিসাব",feed:"ফিড কেনা ও খরচ",medicine:"মেডিসিনের খরচ",workers:"দৈনিক হাজিরা, প্রাপ্য ও নেওয়া টাকা",other:"বিভিন্ন খরচ, কাঠের গুড়া ও পরিবহন ভাড়া",litter:"কাঠের গুড়ার খরচ",rent:"পরিবহন ভাড়া",sales:"মুরগি বিক্রি ও বাকি",othersales:"লিটার, খুচরা, বস্তা ও ফিড বিক্রি",customers:"ক্রেতাভিত্তিক হিসাব",medschedule:"রোজকার ওষুধের সময়সূচি",dailyfeed:"প্রতিদিন কত খাবার",notes:"দরকারি নোট",vaccine:"টিকার সময়সূচি",analysis:"ওজন, ফিড মজুত ও লাভের হিসাব",batchcmp:"পুরনো ব্যাচের সাথে তুলনা",fcr:"স্বয়ংক্রিয় হিসাব + নিজের মতো করে হিসাব",report:"PDF ও Excel রিপোর্ট",batches:"সব ব্যাচ একনজরে"};
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
 function verdict(fcr,tg){return fcr<=tg?'<div class="fcr-verdict good">✅ FCR টার্গেটের মধ্যে আছে ('+f1(fcr,2)+' ≤ '+f1(tg,2)+')</div>':'<div class="fcr-verdict bad">⚠️ FCR টার্গেটের চেয়ে বেশি ('+f1(fcr,2)+' > '+f1(tg,2)+') — ফিড বেশি লাগছে বা ওজন কম</div>'}
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
  if(f.live>0&&!f.la)h+='<div class="warnbox">ℹ️ খামারে '+bnx(f.live)+' টি মুরগি আছে কিন্তু তাদের গড় ওজন দেওয়া নেই, তাই FCR বেশি দেখাচ্ছে। উপরের ঘরে আনুমানিক গড় ওজন দিন।</div>';
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
  {let sg=await loadSign();if(sg){let sw=118,sh=sw*sg.height/sg.width;x.imageSmoothingQuality="high";x.drawImage(sg,W-175-sw/2,H-136-sh,sw,sh)}}
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
const DIS_DATA=[{"n": "বার্ড ফ্লু (অ্যাভিয়ান ইনফ্লুয়েঞ্জা)", "e": "🚨", "t": ["হঠাৎ", "শ্বাস", "ফোলা", "চোখ-মাথা", "চামড়া-পালক", "পা/হাঁটা"], "urgent": 1, "s": "হঠাৎ একসাথে অনেক মুরগি মরা, ঝুঁটি ও মুখ ফোলা বা নীলচে, পায়ে লালচে দাগ, শ্বাসকষ্ট, খাবার একদম বন্ধ।", "r": "নিজে চিকিৎসা করার চেষ্টা করবেন না। সাথে সাথে স্থানীয় প্রাণিসম্পদ অফিস বা ডাক্তারকে জানান। অসুস্থ ও মরা মুরগি আলাদা রাখুন, বাইরের মানুষ ও গাড়ি ঢুকতে দেবেন না। মরা মুরগি খালি হাতে ধরবেন না।", "p": "খামারে বাইরের লোক ও পাখি ঢুকতে না দেওয়া, ঢোকার মুখে জুতা ডুবানোর জীবাণুনাশক রাখা, হাঁস-মুরগি বা অন্য পাখির সাথে মেশাবেন না।", "m": "কোনো ওষুধ নেই। চিকিৎসার চেষ্টা না করে প্রাণিসম্পদ অফিসকে জানান।", "c": "ভাইরাস। সাধারণত যেকোনো বয়সে হয়। বন্য পাখি/হাঁস, মরা পাখি, গাড়ি, খাঁচা, জুতা ও পানির মাধ্যমে ছড়ায়। অতি-তীব্র রূপে ২৪–৪৮ ঘণ্টায় প্রায় সব মুরগি মারা যেতে পারে।", "l": [["হঠাৎ ও মৃত্যু", ["কোনো আগের লক্ষণ ছাড়াই হঠাৎ অনেক মুরগি মরা", "২–৩ দিনে মৃত্যুহার ৯০–১০০% পর্যন্ত যেতে পারে", "ভোরে গিয়ে একসাথে অনেক মরা পাওয়া"]], ["মাথা ও মুখ", ["ঝুঁটি ও গলার লতি ফুলে যাওয়া, নীলচে-বেগুনি রং", "মুখ-মাথা-চোখের চারপাশ ফোলা", "চোখ দিয়ে পানি বা আঠালো স্রাব", "ঝুঁটির মাথায় কালচে রক্ত জমা দাগ"]], ["পা ও চামড়া", ["পায়ের শঙ্কে (হকের নিচে) লালচে রক্তের দাগ", "চামড়ার নিচে রক্তক্ষরণ", "পা ফুলে যাওয়া"]], ["শ্বাস ও ডাক", ["কাশি, হাঁচি, ঘড়ঘড় শব্দ, হাঁ করে শ্বাস", "নাক-মুখ দিয়ে সর্দি/পানি"]], ["খাওয়া ও পায়খানা", ["খাবার-পানি হঠাৎ প্রায় বন্ধ", "সবুজ-সাদা পাতলা পায়খানা", "ঝিমিয়ে বসে থাকা, পালক খাড়া"]], ["স্নায়ু", ["কাঁপুনি, ঘাড় বাঁকা, হাঁটতে না পারা বা চক্কর দেওয়া (কিছু ক্ষেত্রে)"]]], "pm": [["চামড়া ও চর্বি", "চামড়ার নিচে ও পায়ের শঙ্কে রক্তক্ষরণ"], ["ট্রাকিয়া (শ্বাসনালী)", "রক্তে ভরা, লালচে প্রদাহ, শ্লেষ্মা"], ["প্রোভেন্ট্রিকুলাস (গ্রন্থিল পাকস্থলী)", "গ্রন্থির মাথায় পিনপয়েন্ট রক্তবিন্দু (খুব গুরুত্বপূর্ণ)"], ["জিজার্ড (পেষণ থলি)", "খোসার নিচে রক্তক্ষরণ, উঠে আসা খোসা"], ["অন্ত্র", "ডিউডেনাম ও সিকাল টনসিলে রক্তক্ষরণ"], ["হৃদপিণ্ড", "হৃদপিণ্ডের চর্বিতে ও পেশিতে রক্তবিন্দু"], ["ফুসফুস", "জমাট, রক্তে ভরা, পানি জমা"], ["ডিমের কুসুম/ডিম্বাশয় (লেয়ারে)", "ফেটে যাওয়া বা রক্তাক্ত কুসুম"], ["মগজ", "কখনো রক্ত জমা ও ফোলা"]], "df": "রানিক্ষেত, ফাউল কলেরা, গরমে হঠাৎ মৃত্যু। পার্থক্য: ঝুঁটি-মুখ ফোলা আর পায়ে লালচে রক্তক্ষরণ একসাথে দেখলে সন্দেহ বেশি। ল্যাবে নমুনা ছাড়া নিশ্চিত হওয়া যায় না।"}, {"n": "রানিক্ষেত (Newcastle)", "e": "🦠", "t": ["পায়খানা", "শ্বাস", "স্নায়ু", "হঠাৎ", "চোখ-মাথা"], "s": "সবুজ-সাদা পাতলা পায়খানা, কাশি ও শ্বাসকষ্ট, ঘাড় বাঁকা বা মাথা ঘুরিয়ে পড়ে যাওয়া, খাবার কমে যাওয়া, হঠাৎ বেশি মৃত্যু।", "r": "ভাইরাস রোগ, সরাসরি ওষুধ নেই। পানিতে ভিটামিন ও ইলেক্ট্রোলাইট দিন, ঘর গরম-ঠান্ডা সামলান। দ্বিতীয় ব্যাকটেরিয়া সংক্রমণ আটকাতে ডাক্তারের পরামর্শে ওষুধ দিন। অসুস্থগুলো আলাদা করুন।", "p": "সময়মতো টিকা দেওয়া (অ্যাপের ভ্যাকসিন শিডিউল দেখুন), জীবনিরাপত্তা মানা, নতুন বাচ্চা আর পুরোনো মুরগি আলাদা রাখা।", "m": "ভাইরাসের ওষুধ নেই। সহায়ক: ইলেক্ট্রোলাইট/ওআরএস, গ্লুকোজ, ভিটামিন-সি, মাল্টিভিটামিন (এ, ডি৩, ই, বি-কমপ্লেক্স), লিভার টনিক। দ্বিতীয় সংক্রমণ ঠেকাতে ডাক্তারের দেওয়া অ্যান্টিবায়োটিক (যেমন ডক্সিসাইক্লিন বা অ্যামোক্সিসিলিন)।", "c": "ভাইরাস (প্যারামিক্সো)। বাতাস, ধূলা, মল, মানুষ-গাড়ির মাধ্যমে খুব দ্রুত ছড়ায়। টিকা না থাকলে বা টিকা ব্যর্থ হলে সব বয়সে হয়; বাচ্চায় মৃত্যু বেশি। ৩–৬ দিনের মধ্যে লক্ষণ আসে।", "l": [["শ্বাস", ["হাঁচি, কাশি, নাকে ঘড়ঘড় শব্দ", "হাঁ করে শ্বাস নেওয়া, গলা লম্বা করে শ্বাস", "নাক-মুখ দিয়ে পিচ্ছিল স্রাব", "শ্বাসের সাথে 'ক্যাক' শব্দ"]], ["পায়খানা", ["সবুজ বা হলদে-সবুজ পানির মতো পায়খানা", "কখনো রক্ত মেশানো"]], ["স্নায়ু", ["ঘাড় বাঁকা বা মোচড় (টর্টিকোলিস)", "মাথা পেছনে বাঁকানো", "চক্কর দিয়ে ঘোরা", "ডানা ঝুলে পড়া", "এক পা বা দুই পা অবশ হওয়া", "কাঁপুনি, উল্টে পড়া"]], ["খাওয়া ও আচরণ", ["খাবার ও পানি কমে যাওয়া", "ঝিমানো, চোখ বন্ধ করে বসে থাকা", "পালক এলোমেলো"]], ["মাথা-মুখ", ["চোখের চারপাশ ও মাথা ফোলা (ফুলে যাওয়া)", "ঝুঁটি ফ্যাকাশে বা নীলচে"]], ["ডিম/বাড়ন", ["বাড়ন থেমে যাওয়া", "লেয়ারে ডিম হঠাৎ কমা, নরম খোসার বা বিবর্ণ ডিম"]]], "pm": [["ট্রাকিয়া", "ভেতরে প্রদাহ ও রক্তক্ষরণ, শ্লেষ্মা"], ["প্রোভেন্ট্রিকুলাস", "গ্রন্থির মাথায় রক্তের বিন্দু বা রক্তক্ষরণ (সাধারণ চিহ্ন)"], ["অন্ত্র", "অন্ত্রের দেয়ালে আলসার, বোতামের মতো উঁচু রক্তাক্ত/কালচে ক্ষত"], ["সিকাল টনসিল", "ফোলা, রক্তক্ষরণ বা আলসার"], ["পেয়ার্স প্যাচ", "ফোলা ও ক্ষতযুক্ত"], ["এয়ারস্যাক", "ঘোলাটে, ঘন হয়ে যাওয়া"], ["ফুসফুস", "জমাট ও লালচে"], ["মগজ", "বাইরে থেকে বোঝা না গেলেও স্নায়ু লক্ষণ থাকে"]], "df": "ইনফেকশাস ব্রঙ্কাইটিস, বার্ড ফ্লু, সিআরডি। পার্থক্য: স্নায়ু লক্ষণ (ঘাড় বাঁকা) + সবুজ পায়খানা + প্রোভেন্ট্রিকুলাসে রক্তবিন্দু একসাথে থাকলে রানিক্ষেত বেশি সন্দেহ।"}, {"n": "গামবোরো (IBD)", "e": "💧", "t": ["পায়খানা", "ফোলা", "স্নায়ু", "চামড়া-পালক"], "s": "সাধারণত ৩–৬ সপ্তাহে। সাদা পানির মতো পায়খানা, পালক ফুলিয়ে ঝিমানো, পায়ুদ্বার ঠোকরানো, কাঁপুনি, হঠাৎ মৃত্যু বাড়া।", "r": "ভাইরাস রোগ। পানিতে গ্লুকোজ-ইলেক্ট্রোলাইট ও ভিটামিন দিন, প্রচুর পরিষ্কার পানি নিশ্চিত করুন, ঘরে চাপ ও ভিড় কমান। ডাক্তারকে দেখান।", "p": "গামবোরো টিকা সময়মতো দেওয়া (অ্যাপের শিডিউলে ১ম ও ২য় ডোজ), ঘর পরিষ্কার ও শুকনো রাখা।", "m": "ভাইরাসের ওষুধ নেই। সহায়ক: ইলেক্ট্রোলাইট, গ্লুকোজ, ভিটামিন-সি, ভিটামিন-কে ও বি-কমপ্লেক্স, লিভার-কিডনি টনিক। অ্যান্টিবায়োটিক গামবোরোতে কাজ করে না, ডাক্তার চাইলে শুধু দ্বিতীয় সংক্রমণের জন্য দেবেন।", "c": "ভাইরাস (IBD)। ৩–৬ সপ্তাহ বয়সে বেশি হয়। বার্সা অফ ফ্যাব্রিসিয়াস নষ্ট করে রোগ প্রতিরোধ ক্ষমতা কমিয়ে দেয়। লিটার, খাবার, মানুষ, জিনিসপত্রের মাধ্যমে ছড়ায়। হঠাৎ শুরু, ৩–৪ দিনে চূড়ান্ত।", "l": [["পায়খানা", ["সাদা চুনের মতো পানির মতো পাতলা পায়খানা", "পায়ুপথ ও পালক ময়লায় ভেজা", "পায়ু ঠোকরানো"]], ["আচরণ", ["হঠাৎ ঝিমিয়ে পড়া, কুঁজো হয়ে বসে থাকা", "পালক খাড়া, শরীর কাঁপা", "নিজের পায়ুতে ঠোকর মারা", "খাবার একদম বন্ধ", "বেশি পানি খাওয়া শুরু, পরে পানিও বন্ধ"]], ["শরীর", ["ডিহাইড্রেশন, চোখ বসে যাওয়া", "পা ঠান্ডা", "হাঁটতে কষ্ট"]], ["মৃত্যু ধরন", ["হঠাৎ মৃত্যু বাড়ে, ২–৩ দিনে চূড়ান্ত, তারপর কমে", "বেঁচে যাওয়ার পরেও বাড়ন কম ও অন্য রোগ বেশি হয়"]]], "pm": [["বার্সা অফ ফ্যাব্রিসিয়াস", "শুরুতে ফোলা, হলদে জেলির মতো আবরণ, পরে রক্তক্ষরণ; শেষে সঙ্কুচিত ও ধূসর (সবচেয়ে নির্ভরযোগ্য চিহ্ন)"], ["পেশি", "বুক ও উরুর পেশিতে রক্তক্ষরণ"], ["প্রোভেন্ট্রিকুলাস-জিজার্ড সংযোগ", "রক্তক্ষরণ"], ["কিডনি", "ফ্যাকাশে, ইউরেট জমে ফোলা"], ["অন্ত্র", "শ্লেষ্মা ও পানি"], ["স্প্লিন", "ফোলা, ছোট সাদা দাগ কখনো"]], "df": "কক্সিডিওসিস, ই-কোলাই, রানিক্ষেত। পার্থক্য: ৩ সপ্তাহের পর হঠাৎ সাদা পাতলা পায়খানা আর বার্সা ফোলা/রক্তাক্ত হলে গামবোরো।"}, {"n": "কক্সিডিওসিস", "e": "🩸", "t": ["পায়খানা"], "s": "রক্ত বা রক্তমাখা পায়খানা, ঝিমানো, পালক এলোমেলো, খাবার কমে যাওয়া, গা গুটিয়ে বসে থাকা। ভেজা লিটারে বেশি হয়।", "r": "ডাক্তারের পরামর্শে কক্সিডিয়া-নাশক ওষুধ দিন, সাথে ভিটামিন ও পর্যাপ্ত পানি। লিটার শুকনো রাখুন, ভেজা অংশ তুলে ফেলুন।", "p": "লিটার শুকনো রাখা, পানির নিপল বা পাত্র লিক না করা, ঘরে ভিড় না করা, ফিডে ডাক্তারের পরামর্শে প্রতিরোধক ব্যবস্থা।", "m": "অ্যামপ্রোলিয়াম, টলট্রাজুরিল, সালফাকুইনক্সালিন বা সালফাডিমিথক্সিন (সালফা গ্রুপ)। সাথে ভিটামিন-কে ও ভিটামিন-এ। প্রতিরোধে ডিক্লাজুরিল বা কক্সিডিওস্ট্যাট ফিডে।", "c": "প্রোটোজোয়া (আইমেরিয়া)। আর্দ্র ও ভেজা লিটার, বেশি ঘনত্বে বেশি হয়। ২–৬ সপ্তাহে বেশি। জীবাণুযুক্ত মল থেকে ডিম-গুটি (ওওসিস্ট) খেয়ে ছড়ায়। ৪–৭ দিনে লক্ষণ।", "l": [["পায়খানা", ["রক্ত মেশানো পায়খানা (লাল/চকলেটি) — সিকাল ধরন", "বাদামি-কমলা শ্লেষ্মা মেশানো পায়খানা — ক্ষুদ্রান্ত্র ধরন", "পায়ু ও পালক রক্তে/ময়লায় মাখামাখি", "পেট খারাপ ও অপরিপাক খাবার বের হওয়া"]], ["আচরণ", ["ঝিমিয়ে কুঁজো হয়ে বসে থাকা", "পালক এলোমেলো, ডানা ঝুলানো", "খাবার কমে যাওয়া, পানি বেশি", "একসাথে জড়ো হয়ে থাকা"]], ["শরীর", ["ঝুঁটি ও চামড়া ফ্যাকাশে (রক্তশূন্যতা)", "দুর্বল ও রোগা হওয়া", "বাড়ন থেমে যাওয়া", "ওজন একসাথে সমান থাকে না (অসম বাড়ন)"]], ["মৃত্যু", ["কয়েক দিনে হঠাৎ মৃত্যু", "বেঁচে যাওয়া মুরগিতে FCR খারাপ"]]], "pm": [["সিকা (অন্ধান্ত্র)", "ফোলা, রক্ত ও জমাট রক্তে ভরা, পনিরের মতো ঝিল্লি"], ["ক্ষুদ্রান্ত্র", "ফোলা, দেয়াল পুরু, ছোট সাদা-ধূসর দাগ, রক্ত ও শ্লেষ্মা"], ["অন্ত্রের বাইরের দেয়াল", "সাদা ছোপ বা সিঁড়ির মতো দাগ"], ["অন্ত্রের ভেতরের বিষয়বস্তু", "বাদামি-কমলা বা রক্তাক্ত পানি, গ্যাস"], ["লিভার", "ফ্যাকাশে কখনো"], ["অন্যান্য", "রক্তশূন্যতা, শরীর ফ্যাকাশে"]], "df": "নেক্রোটিক এন্টেরাইটিস, গামবোরো, ই-কোলাই। পার্থক্য: রক্ত মেশানো পায়খানা + সিকা রক্তে ভরা হলে কক্সিডিওসিস প্রায় নিশ্চিত।"}, {"n": "ই-কোলাই / কোলিব্যাসিলোসিস", "e": "🫁", "t": ["শ্বাস", "ফোলা", "পায়খানা", "নাভি/বাচ্চা"], "s": "শ্বাসকষ্ট, পেট ফোলা, ঝিমানো, হলদেটে বা সবজেটে পায়খানা। ছোট বাচ্চায় নাভি ফোলা বা পচা, বাচ্চা দুর্বল।", "r": "ব্যাকটেরিয়া রোগ। ডাক্তারের পরামর্শে উপযুক্ত অ্যান্টিবায়োটিক দিন এবং কোর্স শেষ করুন। ওষুধের উইথড্রয়াল সময় মেনে তবেই মুরগি বেচুন।", "p": "ঘর, পানি ও লিটার পরিষ্কার রাখা, ধুলা ও অ্যামোনিয়া কমানো, বাতাস চলাচল ভালো রাখা, পানির ট্যাংক নিয়মিত ধোয়া।", "m": "ডাক্তার সংবেদনশীলতা বুঝে ঠিক করবেন। সাধারণত ব্যবহৃত: অ্যামোক্সিসিলিন, ডক্সিসাইক্লিন, ফ্লরফেনিকল, এনরোফ্লক্সাসিন। সাথে প্রোবায়োটিক ও ইলেক্ট্রোলাইট।", "c": "ব্যাকটেরিয়া (E. coli)। নোংরা পানি-লিটার-ধূলা, অতিরিক্ত অ্যামোনিয়া, ভাইরাস বা সিআরডির পর দ্বিতীয় সংক্রমণ হিসেবে বেশি আসে। ২–৬ সপ্তাহে বেশি; ডিমের খোসায় ফাটা থাকলে হ্যাচারি থেকেও আসে।", "l": [["শ্বাস", ["শ্বাসকষ্ট, ঘড়ঘড়, হাঁ করে শ্বাস", "শ্বাসে 'শিস' শব্দ"]], ["পেট ও পায়খানা", ["সবুজ-হলদে বা সাদা পাতলা পায়খানা", "পেট ফোলা, ঝুলে থাকা"]], ["আচরণ", ["ঝিমানো, ঝিমিয়ে চোখ বন্ধ", "পালক এলোমেলো", "খাবার কমে যাওয়া"]], ["শরীর", ["বাড়ন কম, রোগা", "পা বা সন্ধি ফোলা (কখনো)", "মাথা ফুলে যাওয়া (সোয়েলেড হেড, কখনো)"]], ["মৃত্যু", ["বিচ্ছিন্ন মৃত্যু, কয়েকদিনে বাড়ে", "সুস্থ হয়েও FCR খারাপ"]]], "pm": [["পেরিহেপাটাইটিস", "লিভারের উপর সাদা-হলুদ পনিরের মতো আবরণ"], ["পেরিকার্ডাইটিস", "হৃদপিণ্ডের ঝিল্লিতে সাদা-হলুদ ঘন আবরণ ও পানি"], ["এয়ারস্যাকুলাইটিস", "এয়ারস্যাকে ঘোলাটে পনিরের মতো আবরণ"], ["পেরিটোনাইটিস", "পেটের ভেতরে পুঁজ, দুর্গন্ধ"], ["লিভার", "ফোলা, গাঢ় বা সবুজ-কালচে ছোপ"], ["কখনো", "সন্ধি ও মাথায় পুঁজ"]], "df": "সিআরডি (সাথে ই-কোলাই থাকে), গামবোরো, ফাউল কলেরা। পার্থক্য: লিভার ও হৃদপিণ্ডের উপর সাদা-হলুদ 'ঢাকনা' ই-কোলাইয়ের বিশেষ চিহ্ন।"}, {"n": "সিআরডি (শ্বাসনালীর দীর্ঘস্থায়ী রোগ)", "e": "🤧", "t": ["শ্বাস"], "s": "নাক-চোখ দিয়ে পানি পড়া, হাঁচি-কাশি, শ্বাসের ঘড়ঘড় শব্দ, চোখ ফোলা, বৃদ্ধি কমে যাওয়া।", "r": "ডাক্তারের পরামর্শে মাইকোপ্লাজমা ও ব্যাকটেরিয়ার ওষুধ দিন। ঘরের বাতাস চলাচল ও তাপমাত্রা ঠিক রাখুন, অ্যামোনিয়া কমান।", "p": "ঠান্ডা ও আর্দ্রতা সামলানো, ঘরে ধুলা ও অ্যামোনিয়া কম রাখা, সুস্থ বাচ্চা সংগ্রহ।", "m": "টাইলোসিন, ডক্সিসাইক্লিন, টিয়ামুলিন, এরিথ্রোমাইসিন বা এনরোফ্লক্সাসিন (ডাক্তারের পরামর্শে)। সাথে ভিটামিন-এ ও সি।", "c": "মাইকোপ্লাজমা (MG) + তার সাথে ই-কোলাই ও অ্যামোনিয়া। ধীরে ধীরে বাড়ে। ঠান্ডা, ধূলা, অতিরিক্ত ভিড়, ভেজা ঘরে বেশি। ডিমের মাধ্যমেও ছড়ায়।", "l": [["শ্বাস", ["নাক দিয়ে সর্দি, নাক বন্ধ", "হাঁচি, ঘড়ঘড় শব্দ (বিশেষ করে রাতে ও ভোরে)", "কাশি", "শ্বাস নেওয়ার সময় 'টক টক' বা ঘরঘর শব্দ"]], ["চোখ-মুখ", ["চোখে পানি, ফেনা, চোখ ফুলে যাওয়া", "সাইনাস ফোলা (চোখের নিচে)", "চোখ বন্ধ থাকা"]], ["আচরণ", ["খাবার কিছু কমে, বাড়ন কম", "মাঝেমাঝে মাথা ঝাঁকানো"]], ["শরীর", ["রোগা, FCR খারাপ", "কখনো পা ফোলা"]]], "pm": [["ট্রাকিয়া", "ফেনা বা পনিরের মতো আবরণ"], ["এয়ারস্যাক", "ঘোলাটে, ফেনাযুক্ত, পরে পনিরের মতো ঘন"], ["নাকের সাইনাস", "শ্লেষ্মা-পুঁজ"], ["ফুসফুস", "জমাট ও কিছু ক্ষত"], ["অন্যান্য", "ই-কোলাই যুক্ত হলে লিভার-হৃদপিণ্ডে আবরণ"]], "df": "রানিক্ষেত (হালকা), আইবি, করাইজা। পার্থক্য: ধীরে ধীরে বাড়ে, মৃত্যু কম কিন্তু বাড়ন ও FCR নষ্ট, এয়ারস্যাকে ফেনা।"}, {"n": "সাদা পাতলা পায়খানা (সালমোনেলা / পুলোরাম) — ছোট বাচ্চা", "e": "🐣", "t": ["পায়খানা", "হঠাৎ", "নাভি/বাচ্চা"], "s": "প্রথম ১–২ সপ্তাহে। সাদা চুনের মতো পায়খানা, পায়ুদ্বারে লেগে থাকা, ঝিমানো, বাচ্চা জড়ো হয়ে থাকা, মৃত্যু বাড়া।", "r": "ডাক্তারের পরামর্শে উপযুক্ত ওষুধ দিন। উষ্ণ ও পরিষ্কার পরিবেশ দিন, পানিতে গ্লুকোজ-ভিটামিন দিন।", "p": "ভালো মানের সুস্থ বাচ্চা কেনা, ঘর আগে থেকে জীবাণুমুক্ত ও গরম রাখা, ব্রুডিংয়ে সঠিক তাপ।", "m": "অ্যামোক্সিসিলিন, ফ্লরফেনিকল বা এনরোফ্লক্সাসিন (ডাক্তারের পরামর্শে)। সাথে গ্লুকোজ, ভিটামিন ও প্রোবায়োটিক।", "c": "ব্যাকটেরিয়া (সালমোনেলা পুলোরাম/গ্যালিনারাম)। ডিমের ভেতর থেকে বা হ্যাচারি থেকে আসে। ১–১৪ দিন বয়সী বাচ্চায় বেশি মৃত্যু।", "l": [["পায়খানা", ["সাদা চুনের মতো পাতলা পায়খানা", "পায়ুর চারপাশে সাদা চুন লেগে শুকিয়ে যাওয়া (পেস্টি ভেন্ট)"]], ["আচরণ", ["একসাথে জড়ো হয়ে গরমের উৎসের কাছে বসে থাকা", "ঝিমানো, চোখ বন্ধ", "পালক এলোমেলো", "খাবার না খাওয়া"]], ["শরীর", ["পেট ফোলা", "ডানা ঝুলে যাওয়া", "কিছু বাচ্চায় শ্বাসকষ্ট", "কিছুতে সন্ধি ফোলা/খুঁড়িয়ে হাঁটা"]], ["মৃত্যু", ["১ম–২য় সপ্তাহে ৫–৩০% বা বেশি মৃত্যু", "সুস্থরা দুর্বল ও কম বাড়ন"]]], "pm": [["কুসুম থলি", "না শোষা, সবুজ-হলুদ/ছানাকাটা"], ["লিভার", "ফোলা, ফ্যাকাশে বা সাদা ছোট দাগ"], ["ফুসফুস", "সাদা-ধূসর গুটি (নোডিউল)"], ["হৃদপিণ্ড", "সাদা গুটি"], ["অন্ত্র", "প্রদাহ, সিকায় পনিরের মতো জমাট"], ["জিজার্ড", "সাদা গুটি"]], "df": "কুসুম থলির সংক্রমণ, ই-কোলাই, অ্যাসপারজিলোসিস। পার্থক্য: ১ম সপ্তাহে সাদা চুনের মতো পায়খানা আর লিভার-হৃদপিণ্ডে গুটি হলে সালমোনেলা।"}, {"n": "গরমে হাঁসফাঁস (হিট স্ট্রেস)", "e": "🌡️", "t": ["শ্বাস", "হঠাৎ"], "s": "হা করে হাঁপানো, ডানা ঝুলিয়ে মাটিতে বসা, খুব বেশি পানি খাওয়া, খাবার কম খাওয়া, দুপুরে হঠাৎ মৃত্যু।", "r": "এখনই ঘরে বাতাস বাড়ান, ফ্যান বা জানালা খুলুন, ঠান্ডা পরিষ্কার পানি দিন, পানিতে ইলেক্ট্রোলাইট ও ভিটামিন-সি দিন। দুপুরে ঘরে ঢোকা ও ধরাধরি কমান, ভোরে বা রাতে ফিড দিন।", "p": "ঘরে ভিড় কম রাখা, ছাদে পানি বা ছায়া, বাতাস চলাচল, পর্যাপ্ত ঠান্ডা পানির ব্যবস্থা।", "m": "ইলেক্ট্রোলাইট, ভিটামিন-সি, বেটেইন বা ওআরএস পানিতে। ওষুধের চেয়ে ঘর ঠান্ডা করা ও পানি বেশি জরুরি।", "c": "পরিবেশ। তাপমাত্রা ৩২°সে এর ওপর, আর্দ্রতা বেশি, ভিড়, বাতাস বন্ধ ঘর। ৩ সপ্তাহের পর বড় বাড়ন্ত মুরগি বেশি আক্রান্ত।", "l": [["শ্বাস", ["মুখ হাঁ করে হাঁপানো (পেন্টিং)", "শ্বাস দ্রুত ও গভীর", "গলা ফুলে ওঠানামা"]], ["শরীর", ["ডানা শরীর থেকে আলগা করে রাখা", "মাটিতে শুয়ে থাকা, ছড়িয়ে পড়া", "ঝুঁটি লাল থেকে বেগুনি/ফ্যাকাশে", "পা ফ্যাকাশে"]], ["পানি-খাবার", ["খাবার কমে যাওয়া", "পানি অনেক বেশি খাওয়া", "পাতলা পায়খানা (বেশি পানির কারণে)"]], ["মৃত্যু", ["দুপুরে বা বিকেলে হঠাৎ মৃত্যু", "মোটা, বড় মুরগি আগে মরে", "ডিমের লেয়ারে ডিম কমে ও পাতলা খোসা"]]], "pm": [["সাধারণ", "ঝুঁটি নীল, শরীর ফ্যাকাশে, বুকের পেশি লালচে"], ["ফুসফুস", "রক্তে ভরা, লালচে"], ["হৃদপিণ্ড", "ফ্যাকাশে বা ডান দিক ফোলা"], ["পেশি", "রক্তশূন্য, শুষ্ক"], ["পাকস্থলী", "খাবার কম বা শুকনো"]], "df": "বার্ড ফ্লু, রানিক্ষেত। পার্থক্য: গরম দিনে ঘরের ভেতর বাতাস বন্ধ থাকলে ও ঠান্ডা করার পর মুরগি স্বাভাবিক হলে হিট স্ট্রেস।"}, {"n": "ঠান্ডা লাগা / ব্রুডিংয়ে ভুল", "e": "🥶", "t": ["হঠাৎ", "নাভি/বাচ্চা", "পা/হাঁটা"], "s": "বাচ্চা এক জায়গায় জড়ো হয়ে গাদাগাদি করা, কাঁপা, ডাকাডাকি, খাবার কম, নাভি না শুকানো।", "r": "ব্রুডারে তাপ ঠিক করুন, ঘরের কোণা গোল করে ঘিরে দিন, ঠান্ডা বাতাস আটকান, গরম পানি ও ভিটামিন দিন।", "p": "বাচ্চা আসার আগেই ঘর গরম করা, বাচ্চার ছড়িয়ে থাকা দেখে তাপ বোঝা (জড়ো = ঠান্ডা, দূরে সরে = গরম)।", "m": "গ্লুকোজ, মাল্টিভিটামিন ও ইলেক্ট্রোলাইট। আগে ঘরের তাপ ঠিক করুন। সংক্রমণ হলে ডাক্তারের দেওয়া অ্যান্টিবায়োটিক।", "c": "পরিবেশ ও ব্যবস্থাপনা। ব্রুডিং তাপমাত্রা কম, বাতাসের ঝাপটা, রাতে তাপ কমে যাওয়া। ১–১০ দিনের বাচ্চা বেশি আক্রান্ত।", "l": [["আচরণ", ["বাচ্চা একসাথে জড়ো হয়ে স্তূপ করে বসে থাকা (পাইলিং)", "কিচিরমিচির আওয়াজ বেশি, শ্বাস দ্রুত", "ব্রুডারের নিচে ঘেঁষে থাকা", "খাবার-পানি খেতে না যাওয়া"]], ["শরীর", ["পা ও গা ঠান্ডা", "কাঁপা, পালক খাড়া", "বাড়ন কম ও অসম", "পায়ে ফোলা (সুপ্ত)"]], ["মৃত্যু", ["চাপা পড়ে মৃত্যু (স্মাদারিং)", "কয়েক দিনে মৃত্যুহার বেড়ে যায়", "সাদা পায়খানা/ওমফালাইটিস দ্বিতীয় সংক্রমণ হিসেবে যোগ হয়"]]], "pm": [["সাধারণ", "কুসুম থলি না শোষা, পেট ফোলা"], ["ফুসফুস", "রক্ত জমা, ফুলে ওঠা"], ["অন্ত্র", "পানি জমা বা খালি"], ["পা", "ঠান্ডা, নীলচে"]], "df": "সাদা পাতলা পায়খানা, ওমফালাইটিস। পার্থক্য: ব্রুডারের তাপ ঠিক করলে মুরগি ছড়িয়ে স্বাভাবিক হয়।"}, {"n": "পেটে পানি জমা (অ্যাসাইটিস)", "e": "🫧", "t": ["ফোলা", "শ্বাস", "হঠাৎ"], "s": "পেট ফুলে নরম, হাঁটতে কষ্ট, ঝুঁটি নীলচে, শ্বাসকষ্ট। দ্রুত বাড়া ব্রয়লারে বেশি হয়।", "r": "নির্দিষ্ট ওষুধ নেই। ঘরে অক্সিজেন বাড়াতে বাতাস চলাচল ঠিক করুন, ঠান্ডা সামলান, ফিড সীমিত করে বৃদ্ধির গতি কমানো যায়। ডাক্তারকে দেখান।", "p": "বাতাস চলাচল ভালো রাখা, ঠান্ডা ও ধুলা কমানো, ফিডে লবণ ও পুষ্টি ঠিক রাখা।", "m": "নির্দিষ্ট ওষুধ নেই। ভিটামিন-ই ও সি সহায়ক। কোনো মূত্রবর্ধক বা অন্য ওষুধ ডাক্তারের পরামর্শ ছাড়া নয়।", "c": "বিপাকীয় রোগ। দ্রুত বাড়ন, উচ্চ প্রোটিন ফিড, কম অক্সিজেন, ঠান্ডা, ধূলা, উঁচু এলাকা, ফুসফুস-হৃদযন্ত্রের উপর চাপ। ৩ সপ্তাহের পর বেশি।", "l": [["পেট", ["পেট ফুলে ঝুলে যাওয়া, নরম পানির বেলুনের মতো", "চাপ দিলে 'ছলাৎ' শব্দ", "হাঁটতে কষ্ট, পেট মাটিতে ঠেকে যায়"]], ["শ্বাস", ["হাঁপানো, হাঁ করে শ্বাস", "দৌড়ালে বা ধরলে বেশি কষ্ট"]], ["রং ও আচরণ", ["ঝুঁটি নীলচে/বেগুনি", "পা ও মুখ নীলচে", "অলস, বসে থাকা", "ভিড়ের মধ্যে শ্বাস কষ্টে মৃত্যু"]], ["মৃত্যু", ["দ্রুত বাড়া মুরগি হঠাৎ মরে", "ঠান্ডা বা ভিড়ে বেশি মরে"]]], "pm": [["পেট", "হলুদ-স্বচ্ছ পানি জমা (লিটারে)"], ["হৃদপিণ্ড", "ডান দিক ফোলা, পেরিকার্ডিয়ামে পানি"], ["লিভার", "ফোলা, কখনো সঙ্কুচিত, ফাইব্রিন"], ["ফুসফুস", "ভিড় ও পানি জমা"], ["কিডনি", "ফোলা"]], "df": "ই-কোলাই, হার্ট ফেইলিউর। পার্থক্য: পেটে হলুদ স্বচ্ছ পানি জমা এবং হৃদপিণ্ড ফোলা।"}, {"n": "পা বাঁকা / হাঁটতে না পারা", "e": "🦵", "t": ["স্নায়ু", "পা/হাঁটা"], "s": "পা বেঁকে যাওয়া, খুঁড়িয়ে হাঁটা, বসে থাকা, নড়তে না চাওয়া। দ্রুত বাড়ায় বা ফিডে ঘাটতি থেকে হতে পারে।", "r": "ফিডের মান ও ক্যালসিয়াম-ফসফরাস-ভিটামিন ডি ঠিক আছে কিনা দেখুন। ডাক্তারের পরামর্শে ভিটামিন-মিনারেল দিন। দুর্বলগুলো আলাদা করে পানি-খাবার সামনে দিন।", "p": "ভালো মানের ফিড, লিটার শুকনো রাখা, পর্যাপ্ত আলো ও হাঁটার জায়গা।", "m": "ক্যালসিয়াম, ফসফরাস, ভিটামিন-ডি৩ ও ভিটামিন-ই (সেলেনিয়ামসহ), বি-কমপ্লেক্স (বিশেষ করে কোলিন, বায়োটিন)।", "c": "পুষ্টি ও ব্যবস্থাপনা। দ্রুত বাড়ন, ক্যালসিয়াম-ফসফরাস-ভিটামিন D এর অভাব বা অনুপাত ভুল, পিছলা মেঝে, ভারী ওজন। বা কখনো সংক্রমণ (স্ট্যাফিলোকক্কাস)।", "l": [["হাঁটা", ["পা বাইরের দিকে বাঁকা (ভ্যালগাস/ভারাস)", "হাঁটতে খুঁড়িয়ে চলা বা একদম না হাঁটা", "বসে থাকা, হাঁটুতে ভর দিয়ে (হক) চলা", "হাঁটুর জয়েন্ট ফোলা"]], ["পা-হাড়", ["হাড় নরম বা বাঁকা", "পায়ে হাড় সহজে ভেঙে যাওয়া", "পা ফুলে ও গরম হওয়া (সংক্রমণ হলে)"]], ["আচরণ", ["খাবার-পানি পর্যন্ত যেতে না পারা", "দুর্বল হয়ে মরে যাওয়া বা বাকিদের কাছে পায়ে মাড়ানো"]]], "pm": [["হাড়", "নরম, রাবারের মতো বাঁকা, হাড়ের মাথা ফোলা"], ["সন্ধি", "ফোলা, পুঁজ বা তরল (সংক্রমণে)"], ["টিবিয়া (পায়ের হাড়)", "ডিসকন্ড্রোপ্লাসিয়া — হাড়ের মাথায় সাদা অস্বাভাবিক তরুণাস্থি"], ["অন্যান্য", "কিডনি ইউরেট, দুর্বল শরীর"]], "df": "ভিটামিন বি২ অভাব, কেঁচো/অন্য রোগ। পার্থক্য: দ্রুত বাড়া ভারী মুরগিতে বাঁকা পা হলে পুষ্টি/ব্যবস্থাপনা কারণ।"}, {"n": "ছত্রাকের বিষ (আফলাটক্সিন) — নষ্ট ফিড", "e": "🌾", "t": ["হঠাৎ", "পায়খানা", "চামড়া-পালক"], "s": "খাবার কমে যাওয়া, বৃদ্ধি কমে যাওয়া, রক্তশূন্যতা, হঠাৎ মৃত্যু। ফিড স্যাঁতসেঁতে বা গন্ধযুক্ত থাকলে সন্দেহ করুন।", "r": "নষ্ট বা ছত্রাকপড়া ফিড তখনই বন্ধ করুন, নতুন ভালো ফিড দিন, পানিতে ভিটামিন ও লিভার-সহায়ক দিন। ডাক্তারকে জানান।", "p": "ফিড শুকনো ও বাতাস চলাচলের জায়গায় রাখা, মেঝেতে না রেখে পাটাতনের উপর রাখা, পুরোনো ফিড আগে খাওয়ানো।", "m": "মাইকোটক্সিন বাইন্ডার (বেন্টোনাইট বা তৈরি বাইন্ডার), লিভার টনিক (কোলিন, সরবিটল, সিলিমারিন), ভিটামিন-কে, ই ও বি-কমপ্লেক্স।", "c": "বিষ। ভেজা, ছত্রাক পড়া ফিড বা কাঁচামাল (ভুট্টা, সয়াবিন), গরম ও আর্দ্র আবহাওয়া। কম মাত্রায় ধীরে, বেশি মাত্রায় হঠাৎ বিপদ।", "l": [["খাওয়া ও বাড়ন", ["খাবার কম খাওয়া", "বাড়ন থেমে যাওয়া", "FCR খারাপ", "ডিম কমে (লেয়ার)"]], ["শরীর", ["ঝিমানো, পালক এলোমেলো", "রক্তশূন্যতা, ফ্যাকাশে ঝুঁটি", "চামড়ার নিচে রক্তক্ষরণ, ঠোঁট-পায়ে কালচে দাগ", "পা ও পায়ের রং ফ্যাকাশে"]], ["পায়খানা", ["পাতলা বা সবুজ-হলুদ পায়খানা"]], ["স্নায়ু", ["কাঁপুনি, ডানা ঝুলে পড়া (তীব্র)"]], ["মৃত্যু", ["ধীরে ধীরে মৃত্যু বাড়ে", "ইমিউনিটি কমে টিকা ব্যর্থ ও অন্য রোগ বেশি"]]], "pm": [["লিভার", "ফ্যাকাশে বা হলুদ, ফোলা, চর্বিযুক্ত, কখনো শক্ত ও ছোট"], ["কিডনি", "ফ্যাকাশে, ফোলা"], ["পেশি", "রক্তক্ষরণ, বুক ও উরুতে"], ["বার্সা", "ছোট ও সঙ্কুচিত (ইমিউন কমে)"], ["অন্ত্র", "পানি, প্রদাহ"], ["সাধারণ", "চামড়ার নিচে রক্ত দাগ, ফ্যাকাশে শরীর"]], "df": "গামবোরো, কক্সিডিওসিস। পার্থক্য: ফিড বদলের পর শুরু, লিভার হলুদ/ফ্যাকাশে।"}, {"n": "ইনফেকশাস ব্রঙ্কাইটিস (IB)", "e": "🌬️", "t": ["শ্বাস", "ফোলা"], "s": "হাঁচি, কাশি, ঘড়ঘড়, নাক-চোখে পানি, ছোট বাচ্চায় শ্বাসকষ্ট; কিডনিতেও ক্ষতি হতে পারে।", "c": "করোনাভাইরাস। বাতাস ও সংস্পর্শে খুব দ্রুত ছড়ায়। ১–৪ সপ্তাহের বাচ্চায় বেশি; কিছু ধরনে কিডনি আক্রান্ত হয়ে ইউরেট জমে।", "l": [["শ্বাস", ["হাঁচি, কাশি, ঘড়ঘড়", "নাক-চোখে পানি ও ফেনা", "ঘুমে ছোট শ্বাসকষ্ট, রাতে বেশি"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার কম", "পালক এলোমেলো"]], ["কিডনি ধরন", ["পানি বেশি খাওয়া", "পাতলা সাদা পায়খানা (ইউরেট)", "পা শুকনো, মাংসপেশি শুকিয়ে যাওয়া", "হঠাৎ মৃত্যু"]], ["ডিম (লেয়ার)", ["ডিম কমে যাওয়া", "বাঁকা, পাতলা বা ঘোলা খোসা, কুসুম নরম"]]], "pm": [["ট্রাকিয়া", "ফেনা, শ্লেষ্মা, প্রদাহ"], ["এয়ারস্যাক", "ঘোলাটে"], ["কিডনি", "ফোলা, ফ্যাকাশে, ইউরেট জমে (সাদা চুন)"], ["ইউরেটার", "সাদা ইউরেট ভরা"], ["ডিম্বাশয়", "ক্ষতি, কুসুম ছড়ানো (লেয়ারে)"]], "df": "রানিক্ষেত, সিআরডি। পার্থক্য: কিডনিতে ইউরেট আর ডিমের খোসায় সমস্যা আইবির বিশেষ চিহ্ন।", "r": "আলাদা ওষুধ নেই। ভাইরাস রোগে ঘর গরম ও শুকনো রাখুন, ভিটামিন-ইলেক্ট্রোলাইট দিন, ব্যাকটেরিয়ার দ্বিতীয় সংক্রমণ হলে ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক।", "m": "ভিটামিন সি, ইলেক্ট্রোলাইট/গ্লুকোজ; দ্বিতীয় সংক্রমণে (ডাক্তারের পরামর্শে) ডক্সিসাইক্লিন বা এনরোফ্লক্সাসিন জাতীয়; কিডনির জন্য কিডনি টনিক/পটাশিয়াম সাইট্রেট জাতীয়।", "p": "আইবি টিকা সময়মতো দেওয়া, ঘরে ঠান্ডা বাতাস ও ধূলা কম রাখা, ভেন্টিলেশন ঠিক রাখা।"}, {"n": "ফাউল কলেরা", "e": "🦠", "t": ["হঠাৎ", "শ্বাস", "পায়খানা"], "s": "হঠাৎ মৃত্যু, সবুজ-হলুদ পায়খানা, ঝুঁটি ফোলা ও নীলচে, জ্বর, জয়েন্ট ফোলা।", "c": "ব্যাকটেরিয়া (পাস্তুরেলা)। ইঁদুর, বন্য পাখি, নোংরা পানি, অন্য আক্রান্ত খামার থেকে আসে। বড় মুরগি ও লেয়ারে বেশি।", "l": [["হঠাৎ", ["কোনো লক্ষণ ছাড়াই হঠাৎ মৃত্যু", "ভালো মুরগি রাতে মরা পাওয়া"]], ["জ্বর ও আচরণ", ["উচ্চ জ্বর", "ঝিমানো, বসে থাকা", "খাবার বন্ধ", "গলা লম্বা করে শ্বাস"]], ["পায়খানা", ["সবুজ বা হলদে-সবুজ পাতলা পায়খানা, কখনো রক্ত"]], ["মাথা ও গলা", ["ঝুঁটি ও গলার লতি ফুলে নীলচে বা কালচে", "মুখে ও নাকে সর্দি, শ্লেষ্মা", "মাথা ফোলা (দীর্ঘস্থায়ী ধরনে)"]], ["জয়েন্ট ও পা", ["জয়েন্ট বা পায়ের গোড়ালি ফোলা", "খোঁড়ানো", "ডানার জয়েন্ট ফোলা"]], ["শ্বাস", ["শ্বাসকষ্ট, ঘড়ঘড় (ফুসফুস আক্রান্ত হলে)"]]], "pm": [["হৃদপিণ্ড", "চর্বি ও পেশিতে রক্তের বিন্দু ও দাগ (পিনপয়েন্ট)"], ["লিভার", "ছোট সাদা-ধূসর দাগ, পিনের মাথার মতো ছড়ানো (সবচেয়ে চেনা চিহ্ন)"], ["ডিম্বাশয় (লেয়ার)", "রক্তাক্ত ও নষ্ট কুসুম"], ["অন্ত্র", "ডিউডেনাম প্রদাহ ও রক্তক্ষরণ"], ["ফুসফুস", "জমাট ও প্রদাহ"], ["জয়েন্ট", "পুঁজ বা ঘোলা পনিরের মতো তরল"]], "df": "বার্ড ফ্লু, রানিক্ষেত, ই-কোলাই। পার্থক্য: লিভারে ছোট সাদা বিন্দু আর হৃদপিণ্ডে রক্তবিন্দু একসাথে হলে ফাউল কলেরা সন্দেহ।", "r": "সাথে সাথে ডাক্তারকে দেখান। সালফা ও অ্যান্টিবায়োটিক জাতীয় ওষুধ ডাক্তারের পরামর্শে। মরা মুরগি মাটিচাপা দিন। পানি ও ফিডার জীবাণুমুক্ত করুন।", "m": "সালফাডিমিডিন/সালফাকুইনক্সালিন, অক্সিটেট্রাসাইক্লিন, এনরোফ্লক্সাসিন, অ্যামোক্সিসিলিন জাতীয় (ডাক্তারের পরামর্শে)।", "p": "ইঁদুর ও বন্য পাখি ঠেকান, জীবাণুনাশক ব্যবহার, ফাউল কলেরা টিকা (এলাকায় থাকলে), খামারে নতুন মুরগি আনার আগে আলাদা রাখা।"}, {"n": "নেক্রোটিক এন্টেরাইটিস (NE)", "e": "🩸", "t": ["পায়খানা", "হঠাৎ"], "s": "হঠাৎ মৃত্যু, কালচে বা রক্তমাখা পাতলা পায়খানা, ঝিমানো, ফোলা অন্ত্র।", "c": "ব্যাকটেরিয়া (ক্লোস্ট্রিডিয়াম)। কক্সিডিওসিসের পরে, খাবারে প্রোটিন বেশি, ফিড হঠাৎ বদলালে বেশি হয়। ২–৬ সপ্তাহে।", "l": [["হঠাৎ", ["হঠাৎ মৃত্যু, আগের লক্ষণ প্রায় নেই", "একদিনে বেশি মরা", "মরা মুরগি পেট ফুলে থাকে"]], ["পায়খানা", ["কালচে, রক্তমাখা বা বাদামি পাতলা পায়খানা", "ফেনাযুক্ত দুর্গন্ধযুক্ত পায়খানা"]], ["আচরণ", ["ঝিমিয়ে থাকা", "পালক এলোমেলো", "খাবার কমে যাওয়া", "বসে থাকা, ডানা ঝুলানো"]], ["কম আক্রান্ত", ["ক্রনিক ক্ষেত্রে বাড়ন কম ও FCR খারাপ", "দুর্বল ও ফ্যাকাশে"]]], "pm": [["ক্ষুদ্রান্ত্র", "ফোলা, গ্যাসে ভরা, দেয়াল পাতলা, 'টার্কিশ তোয়ালে' মতো পুরু ও ভাঁজযুক্ত পর্দা"], ["অন্ত্রের ভেতর", "কালচে-বাদামি, দুর্গন্ধযুক্ত তরল ও গ্যাস"], ["অন্ত্রের দেয়াল", "ধূসর-হলুদ ঝিল্লি, মৃত কোষ"], ["লিভার", "ফ্যাকাশে বা হলুদ ছোপ"], ["সাধারণ", "দ্রুত পচে যাওয়া শরীর"]], "df": "কক্সিডিওসিস, গামবোরো। পার্থক্য: ক্ষুদ্রান্ত্র গ্যাসে ফোলা, 'তোয়ালে' মতো পর্দা, দুর্গন্ধ।", "r": "ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক। ফিড বদল হলে পুরনো ফিডে ফিরুন বা ধীরে ধীরে বদলান। কক্সিডিওসিস থাকলে একসাথে চিকিৎসা করুন।", "m": "অ্যামোক্সিসিলিন, ব্যাসিট্রাসিন, লিনকোমাইসিন-স্পেকটিনোমাইসিন, টাইলোসিন জাতীয়; সাথে প্রোবায়োটিক ও লিভার টনিক।", "p": "কক্সিডিওসিস নিয়ন্ত্রণে রাখা, ফিড হঠাৎ না বদলানো, লিটার শুকনো রাখা, প্রোবায়োটিক/এসিডিফায়ার ব্যবহার।"}, {"n": "ইনফেকশাস করাইজা (ঠান্ডা)", "e": "🤧", "t": ["শ্বাস", "ফোলা", "চোখ-মাথা"], "s": "মুখ-চোখ ফোলা, নাক দিয়ে দুর্গন্ধযুক্ত সর্দি, চোখে আঠা।", "c": "ব্যাকটেরিয়া (এভিব্যাকটেরিয়াম)। বিভিন্ন বয়সের মুরগি একসাথে থাকলে, ঠান্ডা, ভিড়, ঠান্ডা বাতাসে বেশি। ছড়ায় পানি, নাকের স্রাব, বাতাসে।", "l": [["মুখ-চোখ", ["চোখের নিচে (সাইনাস) ফোলা", "মুখ ফোলা, মাথা বড় দেখায়", "চোখ আঠায় আটকে বন্ধ হয়ে যাওয়া", "চোখ থেকে ফেনা বা পানি"]], ["নাক-শ্বাস", ["দুর্গন্ধযুক্ত সর্দি, নাক দিয়ে ঘন স্রাব", "হাঁচি, শ্বাসকষ্ট, ঘড়ঘড়", "মুখ হাঁ করে শ্বাস"]], ["গলা", ["গলার লতি ফোলা", "গিলতে কষ্ট"]], ["আচরণ", ["খাবার-পানি কম", "ঝিমানো", "ডিম কমে (লেয়ার)"]]], "pm": [["নাক ও সাইনাস", "ঘন, পনিরের মতো হলুদ স্রাব"], ["ট্রাকিয়া", "প্রদাহ ও শ্লেষ্মা"], ["চোখ", "ঘোলা পুঁজ, চোখের পাতার নিচে পনিরের মতো গুটি"], ["এয়ারস্যাক", "ঘোলা"]], "df": "সিআরডি, ফাউল পক্স (ভেজা ধরন), ভিটামিন এ অভাব। পার্থক্য: দুর্গন্ধযুক্ত সর্দি আর সাইনাস ফোলা করাইজার বিশেষ চিহ্ন।", "r": "ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক/সালফা জাতীয়। ঘর গরম ও শুকনো রাখুন। অসুস্থ মুরগি আলাদা করুন।", "m": "সালফাডিমিডিন/সালফাক্লোরোপাইরিজিন, এরিথ্রোমাইসিন, টাইলোসিন, অক্সিটেট্রাসাইক্লিন জাতীয় (ডাক্তারের পরামর্শে)।", "p": "ঠান্ডা বাতাস ঠেকানো, বিভিন্ন বয়সের মুরগি একসাথে না রাখা (অল-ইন অল-আউট), করাইজা টিকা।"}, {"n": "ফাউল পক্স (বসন্ত)", "e": "🔴", "t": ["চামড়া-পালক", "শ্বাস"], "s": "ঝুঁটি-মুখে ফুসকুড়ি/কালচে খোসা, মুখের ভেতর হলুদ ঘা (ভেজা ধরন)।", "c": "ভাইরাস। মশা, আহত ঠোকরানি, নোংরা পানি ও লিটারের মাধ্যমে ছড়ায়। বর্ষা ও গরম আর্দ্র আবহাওয়ায় বেশি।", "l": [["শুকনো ধরন (চামড়া)", ["ঝুঁটি, গলার লতি, চোখের পাতা ও পায়ে ছোট ফুসকুড়ি", "ফুসকুড়ি বড় হয়ে কালচে খোসা", "খোসা ঝরে গেলে দাগ"]], ["ভেজা ধরন (মুখে)", ["মুখের ভেতর, জিভে ও গলায় হলদে-সাদা পনিরের মতো ঘা", "শ্বাসকষ্ট, গিলতে কষ্ট", "মুখ থেকে দুর্গন্ধ"]], ["সাধারণ", ["খাবার কম", "ঝিমানো", "বাড়ন কম"]], ["চোখ", ["চোখের পাতা ফুলে যাওয়া ও আটকে যাওয়া"]]], "pm": [["চামড়া", "ফুসকুড়ি বা কালচে খোসা (ঝুঁটি, মুখ, চোখের পাতা)"], ["মুখ-গলা", "হলদে ঝিল্লি, ক্ষত"], ["ট্রাকিয়া", "ঝিল্লি ও আটকে থাকা পনির"], ["চোখ", "পুঁজ ও ফোলা"]], "df": "ইনফেকশাস করাইজা, ভিটামিন এ অভাব। পার্থক্য: ঝুঁটি-মুখে খোসাযুক্ত উঁচু ফুসকুড়ি পক্সের চিহ্ন।", "r": "ভাইরাসের ওষুধ নেই। দ্বিতীয় সংক্রমণ ঠেকাতে ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক ও ভিটামিন এ দিন। আক্রান্ত মুরগি আলাদা করুন।", "m": "ভিটামিন এ, ভিটামিন সি, অ্যান্টিবায়োটিক (দ্বিতীয় সংক্রমণে), পোভিডন আয়োডিন (বাইরে লাগাতে)।", "p": "মশা ও পোকা নিয়ন্ত্রণ, ফাউল পক্স টিকা, ঠোকরানি কমাতে ঘনত্ব ঠিক রাখা।"}, {"n": "ইনক্লুশন বডি হেপাটাইটিস (IBH)", "e": "🫀", "t": ["হঠাৎ", "ফোলা"], "s": "হঠাৎ মৃত্যু, ফ্যাকাশে ঝুঁটি, ঝিমানো, হৃদপিণ্ডের চারপাশে পানি।", "c": "অ্যাডেনোভাইরাস। ডিম ও লিটারের মাধ্যমে ছড়ায়, প্রায়ই গামবোরো, CIA বা মাইকোটক্সিনের সাথে মিলে বাড়ে। ৩–৭ সপ্তাহে বেশি।", "l": [["হঠাৎ", ["কয়েক দিনে হঠাৎ মৃত্যু বাড়া", "৩–৪ দিনের পর কমে যায়"]], ["আচরণ", ["ঝিমানো, পালক এলোমেলো", "ঝুঁটি ফ্যাকাশে", "খাবার কম"]], ["শরীর", ["রক্তশূন্যতা, পা ফ্যাকাশে", "হৃদযন্ত্র দুর্বল, শ্বাসকষ্ট"]]], "pm": [["লিভার", "ফোলা, ফ্যাকাশে বা হলদে, ছোট রক্তক্ষরণ বিন্দু"], ["পেরিকার্ডিয়াম", "হৃদপিণ্ডের চারপাশে হলুদ স্বচ্ছ পানি (হাইড্রোপেরিকার্ডিয়াম)"], ["কিডনি", "ফোলা"], ["হাড়ের মজ্জা", "হলদে ও ফ্যাকাশে"], ["পেশি", "রক্তক্ষরণ"]], "df": "CIA, গামবোরো, আফলাটক্সিন। পার্থক্য: লিভার ফ্যাকাশে/হলদে ও হৃদপিণ্ডে পানি জমা।", "r": "নির্দিষ্ট ওষুধ নেই। সহায়ক চিকিৎসা: লিভার টনিক, ভিটামিন ই-সেলেনিয়াম, ভিটামিন সি। অন্য রোগ ও বিষ কমান।", "m": "লিভার টনিক (সরবিটল/কোলিন), ভিটামিন ই + সেলেনিয়াম, ভিটামিন সি, ইলেক্ট্রোলাইট।", "p": "স্বাস্থ্যকর বাচ্চা, জীবাণুমুক্ত লিটার, মাইকোটক্সিন কম, গামবোরো ও অন্য টিকা ঠিকমতো।"}, {"n": "চিকেন ইনফেকশাস অ্যানিমিয়া (CIA)", "e": "🩸", "t": ["চামড়া-পালক", "ফোলা"], "s": "ফ্যাকাশে শরীর, ঝিমানো, চামড়ায় পচা ঘা, বাড়ন কম।", "c": "ভাইরাস। ডিমের মাধ্যমে (বাবা-মা মুরগি থেকে) বা সংস্পর্শে ছড়ায়। ১–৩ সপ্তাহের বাচ্চায় বেশি; রোগ প্রতিরোধ ক্ষমতা ভেঙে অন্য রোগ বাড়ায়।", "l": [["রক্তশূন্যতা", ["ঝুঁটি ও পায়ের চামড়া ফ্যাকাশে", "দুর্বল, ঝিমানো", "খাবার কম", "বাড়ন কম"]], ["চামড়া", ["ডানা-পা-শরীরে কালচে, ভেজা, পচা ঘা", "পালক ঝরে যাওয়া"]], ["মৃত্যু", ["১৪–২৮ দিনে মৃত্যু বাড়া", "টিকা ব্যর্থ ও অন্য সংক্রমণ বেড়ে যাওয়া"]]], "pm": [["থাইমাস", "ছোট ও সঙ্কুচিত"], ["বার্সা", "ছোট ও সঙ্কুচিত"], ["হাড়ের মজ্জা", "ফ্যাকাশে বা হলদে (লাল নয়)"], ["পেশি", "ফ্যাকাশে ও রক্তক্ষরণ"], ["চামড়া", "ক্ষত ও পচা"]], "df": "IBH, গামবোরো, আফলাটক্সিন। পার্থক্য: থাইমাস ও বার্সা সঙ্কুচিত এবং হাড়ের মজ্জা ফ্যাকাশে।", "r": "ভাইরাসের কোনো সরাসরি ওষুধ নেই। দ্বিতীয় সংক্রমণে অ্যান্টিবায়োটিক ডাক্তারের পরামর্শে, সাথে ভিটামিন ও আয়রন-টনিক।", "m": "আয়রন-ভিটামিন বি১২ টনিক, ভিটামিন সি, ভিটামিন কে, ডাক্তারের পরামর্শে অ্যামোক্সিসিলিন জাতীয়।", "p": "ভালো ফার্ম থেকে বাচ্চা, বাবা-মা মুরগির টিকা, ঘর জীবাণুমুক্ত।"}, {"n": "অ্যাসপারজিলোসিস (ছত্রাক নিউমোনিয়া)", "e": "🍄", "t": ["শ্বাস", "নাভি/বাচ্চা"], "s": "বাচ্চার শ্বাসকষ্ট, হাঁ করে শ্বাস, ঝিমানো, ফুসফুসে হলদে-সাদা গুটি।", "c": "ছত্রাক (Aspergillus)। ভেজা লিটার, ছত্রাকপড়া খড়-তুষ, নষ্ট ফিড, নোংরা হ্যাচারি ট্রে। ১–২ সপ্তাহের বাচ্চা বেশি। ছত্রাকের ধূলা মানুষের জন্যও ক্ষতিকর, তাই মাস্ক পরুন।", "l": [["শ্বাস", ["হাঁ করে শ্বাস, গলা লম্বা করে হাঁপানো", "ঘড়ঘড়, হাঁচি", "শ্বাস দ্রুত"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার না খাওয়া", "পালক এলোমেলো"]], ["শরীর", ["চোখ ঘোলা বা পুঁজ", "স্নায়ু লক্ষণ (কখনো): ঘাড় বাঁকা, চক্কর"]], ["মৃত্যু", ["প্রথম ২ সপ্তাহে হঠাৎ মৃত্যু বাড়া", "একসাথে অনেক মরে"]]], "pm": [["ফুসফুস", "হলদে-সাদা বা ধূসর ছোট গুটি, শক্ত"], ["এয়ারস্যাক", "সবুজ-ধূসর মখমলের মতো ছত্রাকের আবরণ"], ["ট্রাকিয়া", "গুটি বা পনিরের মতো আবরণ"], ["চোখ", "ঘোলা পুঁজ ও পনির"], ["মগজ", "কখনো ফোড়া"]], "df": "সালমোনেলা, ই-কোলাই। পার্থক্য: ফুসফুসে শক্ত হলদে গুটি ও এয়ারস্যাকে সবুজ ছত্রাক।", "r": "ছত্রাকের ওষুধ (অ্যান্টিফাঙ্গাল) ডাক্তারের পরামর্শে। ভেজা লিটার সরান, নতুন শুকনো লিটার দিন, ঘরে ভালো বাতাস রাখুন।", "m": "নিস্ট্যাটিন, কপার সালফেট (ডাক্তারের পরামর্শে নিয়ম মেনে), অ্যান্টিফাঙ্গাল ফিড অ্যাডিটিভ।", "p": "শুকনো পরিষ্কার লিটার, নতুন ও শুকনো খড়-তুষ, হ্যাচারি ও ট্রে পরিষ্কার, নষ্ট ফিড না খাওয়ানো।"}, {"n": "নাভি পচা / কুসুম থলির সংক্রমণ (ওমফালাইটিস)", "e": "🐣", "t": ["নাভি/বাচ্চা", "পায়খানা"], "s": "প্রথম সপ্তাহে বাচ্চা মরা, নাভি ভেজা/লাল/কালচে, পেট ফোলা।", "c": "ব্যাকটেরিয়া (ই-কোলাই, স্ট্যাফ, প্রোটিয়াস)। নোংরা ডিম, হ্যাচারি দুর্বলতা, তাপ কম-বেশি, নাভি বন্ধ না হওয়া। জন্মের প্রথম ১–৫ দিনে বেশি।", "l": [["নাভি", ["নাভি ভেজা, লাল বা কালচে ফোলা", "দুর্গন্ধ", "নাভি সম্পূর্ণ বন্ধ হয়নি"]], ["পেট", ["পেট ফোলা, ভারী", "কুসুম থলি শরীরে ঝুলে থাকা"]], ["আচরণ", ["ঝিমানো, জড়ো হয়ে বসে থাকা", "খাবার-পানি না খাওয়া", "কিচিরমিচির কমে যাওয়া"]], ["শরীর", ["ছোট ও দুর্বল বাচ্চা", "সাদা-সবুজ পায়খানা"]]], "pm": [["কুসুম থলি", "না শোষা, সবুজ-হলুদ বা কালচে, ছানাকাটা বা পচা"], ["নাভির চারপাশ", "ফোলা, লাল, ভেজা, পুঁজ"], ["লিভার", "ফ্যাকাশে বা সবুজ ছোপ"], ["হৃদপিণ্ড", "কখনো আবরণ"], ["পেট", "তরল জমা"]], "df": "সালমোনেলা, ব্রুডিংয়ে ভুল, অ্যাসপারজিলোসিস। পার্থক্য: কুসুম থলি পচা ও নাভি ভেজা/কালচে।", "r": "ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক। ব্রুডিং তাপমাত্রা ঠিক রাখুন, পরিষ্কার পানি-ফিড দিন, মরা বাচ্চা সরিয়ে ফেলুন।", "m": "এনরোফ্লক্সাসিন/অ্যামোক্সিসিলিন জাতীয়, ভিটামিন-ইলেক্ট্রোলাইট, প্রোবায়োটিক।", "p": "ভালো বাচ্চার উৎস, ডিম ও ট্রে জীবাণুমুক্ত, ব্রুডার আগে গরম করা, প্রথম থেকে পরিষ্কার পানি ও ফিড।"}, {"n": "হঠাৎ মৃত্যু সিন্ড্রোম (SDS / ফ্লিপ-ওভার)", "e": "💔", "t": ["হঠাৎ"], "s": "দ্রুত বাড়া, সুস্থ দেখতে মোটা মুরগি হঠাৎ চিৎ হয়ে মরা।", "c": "বিপাকীয়/ব্যবস্থাপনাজনিত। দ্রুত বাড়ন, উচ্চ শক্তির ফিড, আলো বেশি, হঠাৎ শব্দ বা ভয়। ২–৪ সপ্তাহে, মোরগে বেশি।", "l": [["মৃত্যু ধরন", ["সুস্থ দেখতে মোটা মুরগি হঠাৎ চিৎকার করে পড়ে যাওয়া", "ডানা ঝাপটানো, পিঠ বাঁকা করে মরে যাওয়া", "বেশিরভাগ চিৎ হয়ে মরা"]], ["আচরণ", ["আগে কোনো অসুস্থতার লক্ষণ নেই", "খাবার-পানি স্বাভাবিক"]], ["কখন", ["বেশি আলোতে, হঠাৎ শব্দে বা ভয়ে বেশি", "রাতে কম"]]], "pm": [["হৃদপিণ্ড", "বড়, ফোলা, কখনো রক্তে ভরা"], ["ফুসফুস", "রক্ত জমা ও পানি"], ["লিভার", "ফোলা, নরম"], ["পেট", "খাবারে ভরা"], ["অন্ত্র", "স্বাভাবিক"]], "df": "অ্যাসাইটিস, হিট স্ট্রেস, বিষক্রিয়া। পার্থক্য: সুস্থ মোটা মুরগি হঠাৎ চিৎ হয়ে মরা, অন্য রোগের চিহ্ন নেই।", "r": "নির্দিষ্ট চিকিৎসা নেই। ব্যবস্থাপনা ঠিক করুন, ফিড নিয়ন্ত্রণ করুন।", "m": "নির্দিষ্ট ওষুধ নেই। সহায়ক: ভিটামিন ই, সেলেনিয়াম, ইলেক্ট্রোলাইট।", "p": "ফিড নিয়ন্ত্রিত দিন (প্রথম সপ্তাহের পর), আলোর মাত্রা কম রাখা, হঠাৎ শব্দ ও ভয় কমানো, ঘনত্ব ঠিক রাখা।"}, {"n": "ভিটামিন ই–সেলেনিয়াম অভাব (এনকেফালোমালাসিয়া)", "e": "🧠", "t": ["স্নায়ু", "চামড়া-পালক"], "s": "মাথা পেছনে বাঁকানো, চলতে না পারা, চামড়ার নিচে সবুজ-নীল ফোলা।", "c": "পুষ্টি অভাব। ফিডে ভিটামিন ই/সেলেনিয়াম কম, চর্বি নষ্ট (রেন্সিড)। ১–৪ সপ্তাহে।", "l": [["স্নায়ু", ["মাথা পেছনে বা পাশে বাঁকানো", "চক্কর দিয়ে হাঁটা বা পড়ে যাওয়া", "পা সামনে-পেছনে ছুড়া", "ভারসাম্য হারানো", "কাঁপুনি"]], ["চামড়া (এক্সুডেটিভ ডায়াথেসিস)", ["পেট ও বুকে সবুজ-নীলচে ফোলা", "চামড়ার নিচে রক্ত-তরল জমা", "পা ও ডানার নিচে ফোলা"]], ["মাংসপেশি", ["শরীর শুকিয়ে যাওয়া", "ডানা-পা দুর্বল"]]], "pm": [["সেরিবেলাম (মগজ)", "নরম, ফোলা, কখনো সবুজ-হলুদ ছোপ"], ["চামড়ার নিচে", "সবুজ-নীল তরল ও ফোলা"], ["পেশি", "সাদা-ধূসর ফ্যাকাশে রেখা"], ["জিজার্ড", "ফ্যাকাশে পেশি"]], "df": "রানিক্ষেত, মেরেক্স, ভিটামিন বি১ অভাব। পার্থক্য: জ্বর বা পায়খানা সমস্যা নেই, ভিটামিন ই দিলে উন্নতি হয়।", "r": "ভিটামিন ই ও সেলেনিয়াম পানিতে বা ফিডে দিন (ডাক্তারের পরামর্শে মাত্রায়)। নষ্ট ফিড বদলান।", "m": "ভিটামিন ই + সেলেনিয়াম, মাল্টিভিটামিন প্রিমিক্স।", "p": "ভালো ফিড, ফিড ঠান্ডা ও শুকনো জায়গায় সংরক্ষণ, এন্টিঅক্সিডেন্ট যুক্ত ফিড।"}, {"n": "ভিটামিন বি২ অভাব (কার্লড-টো)", "e": "🦶", "t": ["পা/হাঁটা"], "s": "পায়ের আঙুল ভেতরে কুঁকড়ে যাওয়া, হকের উপর বসে হাঁটা।", "c": "পুষ্টি অভাব। ফিডে রাইবোফ্লাভিন (বি২) কম। ১–২ সপ্তাহের বাচ্চায় বেশি।", "l": [["পা", ["পায়ের আঙুল কুঁকড়ে ভেতরের দিকে বাঁকা", "পায়ের আঙুলে হাঁটা যায় না", "হক জয়েন্টে ভর দিয়ে বসে থাকা", "পা ফুলে ও শুকিয়ে যাওয়া"]], ["আচরণ", ["উঠে দাঁড়াতে কষ্ট", "খাবার-পানি পর্যন্ত যেতে না পারা", "দুর্বল হয়ে মরে যাওয়া"]], ["শরীর", ["বাড়ন কম, রোগা", "পালক ঝরে যাওয়া"]]], "pm": [["পেরিফেরাল স্নায়ু", "সায়াটিক ও ব্র্যাকিয়াল স্নায়ু ফোলা ও মোটা"], ["পেশি", "ক্ষয় ও শুকিয়ে যাওয়া"], ["অন্ত্র", "কখনো পাতলা তরল"]], "df": "মেরেক্স (স্নায়ু ফোলা), ভিটামিন ই অভাব, পা বাঁকা। পার্থক্য: আঙুল কুঁকড়ে যাওয়া আর রাইবোফ্লাভিন দিলে উন্নতি।", "r": "রাইবোফ্লাভিন (বি২) সহ ভিটামিন বি-কমপ্লেক্স দিন। সাথে উন্নত ফিড।", "m": "ভিটামিন বি২ (রাইবোফ্লাভিন), ভিটামিন বি-কমপ্লেক্স, মাল্টিভিটামিন।", "p": "মান ভালো ফিড, ভিটামিন-প্রিমিক্স ঠিকমতো মেশানো।"}, {"n": "কৃমি (গোলকৃমি / ফিতাকৃমি)", "e": "🪱", "t": ["পরজীবী", "পায়খানা"], "s": "রোগা হওয়া, ফ্যাকাশে, পাতলা পায়খানায় কৃমি দেখা, বাড়ন কম।", "c": "পরজীবী। মাটি, লিটার, পোকা থেকে ডিম খেয়ে ছড়ায়। ডিপ-লিটারে বা মাটিতে ছাড়া মুরগিতে বেশি।", "l": [["পায়খানা", ["পাতলা বা বাদামি পায়খানা", "পায়খানায় ছোট সাদা কৃমি দেখা", "কখনো রক্তমাখা"]], ["শরীর", ["রোগা হয়ে যাওয়া", "ঝুঁটি ফ্যাকাশে", "বাড়ন কম, FCR খারাপ", "পালক এলোমেলো"]], ["আচরণ", ["ঝিমানো", "খাবার বেশি খেয়েও রোগা", "ডিম কমে যাওয়া (লেয়ার)"]], ["মৃত্যু", ["বেশি আক্রমণে অন্ত্র বন্ধ হয়ে মরে"]]], "pm": [["ক্ষুদ্রান্ত্র", "সাদা বা হলদে সুতার মতো লম্বা গোলকৃমি, ফিতাকৃমি (চ্যাপ্টা, ফিতার মতো)"], ["অন্ত্রের দেয়াল", "প্রদাহ ও ক্ষত, কৃমির গুটি"], ["অন্ত্রের ভেতর", "শ্লেষ্মা, কৃমির জট"], ["লিভার", "ফ্যাকাশে (দীর্ঘ আক্রান্তে)"]], "df": "কক্সিডিওসিস, অন্য ডায়রিয়া। পার্থক্য: মলে/অন্ত্রে কৃমি স্পষ্ট দেখা যায়।", "r": "কৃমিনাশক খাওয়ান (ডাক্তার/ডিলারের পরামর্শে)। লিটার বদলান, ঘর পরিষ্কার করুন।", "m": "পিপারাজিন, লেভামিসোল, অ্যালবেন্ডাজল, ফেনবেন্ডাজল জাতীয় কৃমিনাশক।", "p": "শুকনো পরিষ্কার লিটার, সময়মতো কৃমিনাশক, মুরগি মাটিতে না রাখা।"}, {"n": "উকুন ও মাইট (বাহ্যিক পরজীবী)", "e": "🕷️", "t": ["পরজীবী", "চামড়া-পালক"], "s": "চুলকানি, পালক ঝরা, ঝিমানো, রাতে অস্থির, ডিম কম।", "c": "বাহ্যিক পরজীবী। পুরনো খাঁচা, ফাটলে থাকা মাইট, বন্য পাখি ও ইঁদুর থেকে। রাতে রক্ত চুষে খায়।", "l": [["চুলকানি", ["পালক ঠোকরানো, চুলকানো", "পালক ঝরে যাওয়া বা ভাঙা", "চামড়ায় লাল দাগ ও ঘা"]], ["শরীর", ["রক্তশূন্যতা ও ফ্যাকাশে ঝুঁটি", "পায়ের শল্কের নিচে ধুলোর মতো (স্কেলি লেগ মাইট)", "পায়ের আঙুল ফোলা"]], ["আচরণ", ["রাতে অস্থির, ঘুম কম", "ঝিমানো", "খাবার কমে যাওয়া", "ডিম কমা (লেয়ার)"]], ["দেখা", ["পালকের গোড়ায় ছোট লাল-কালো পোকা", "রাতে খাঁচার ফাটলে লাল মাইট"]]], "pm": [["চামড়া", "লাল ক্ষত, খোসা"], ["পালক", "ভাঙা ও আঠালো"], ["শরীর", "ফ্যাকাশে, রক্তশূন্য"]], "df": "ভিটামিন অভাব, ছত্রাক। পার্থক্য: পালকের গোড়ায় বা রাতে পোকা বের হয়।", "r": "পোকা মারার স্প্রে বা ডাস্ট (পোল্ট্রির জন্য নিরাপদ) ব্যবহার করুন। ঘর-খাঁচা পরিষ্কার করে স্প্রে করুন।", "m": "পারমেথ্রিন/সাইপারমেথ্রিন স্প্রে, আইভারমেকটিন (ডাক্তারের পরামর্শে), সালফার ডাস্ট।", "p": "ঘর ও খাঁচা সময়মতো পরিষ্কার, ফাটল বন্ধ করা, ইঁদুর-বন্য পাখি আটকানো, নিয়মিত স্প্রে।"}, {"n": "অ্যামোনিয়া পোড়া (লিটারের গ্যাস)", "e": "🧪", "t": ["শ্বাস", "চোখ-মাথা"], "s": "চোখ লাল, পানি, চোখ বন্ধ, শ্বাসকষ্ট, ঘরে ঝাঁঝালো গন্ধ।", "c": "পরিবেশ। ভেজা লিটার, বাতাস চলাচল কম, বেশি ঘনত্ব, বেশি তাপ।", "l": [["চোখ", ["চোখ লাল, পানি পড়া", "চোখ বন্ধ করে বসে থাকা", "চোখ ফোলা ও আঠালো, অন্ধ হয়ে যেতে পারে"]], ["শ্বাস", ["শ্বাসকষ্ট, কাশি", "নাক দিয়ে সর্দি"]], ["পা ও বুক", ["পায়ের পাতা পোড়া/ফোলা (ফুট প্যাড ডার্মাটাইটিস)", "বুকে ফোসকা বা কালচে দাগ"]], ["আচরণ", ["খাবার কম, বাড়ন কম", "ঝিমানো, ঘরের এক কোণে জড়ো হওয়া", "সিআরডি-ই-কোলাই দ্বিতীয় সংক্রমণ"]]], "pm": [["চোখ", "লাল, ঘোলা, কর্নিয়ায় ক্ষত"], ["ট্রাকিয়া", "লাল ও প্রদাহ"], ["ফুসফুস", "জমাট"], ["এয়ারস্যাক", "ঘোলা"], ["পায়ের তলা", "পোড়া ঘা"]], "df": "সিআরডি, আইবি, করাইজা। পার্থক্য: ঘরে ঝাঁঝালো গন্ধ আর চোখ লাল, বাতাস ঠিক করলে উন্নতি।", "r": "ঘরের বাতাস চলাচল বাড়ান, ভেজা লিটার সরান, নতুন শুকনো লিটার দিন। ভিটামিন এ ও সি দিন।", "m": "ভিটামিন এ, ভিটামিন সি, চোখের জন্য ডাক্তারের পরামর্শে অ্যান্টিবায়োটিক চোখের ড্রপ।", "p": "লিটার শুকনো রাখা, পানির পাত্র ফুটো/উপচে না পড়া, লিটার ট্রিটমেন্ট, ভেন্টিলেশন ঠিক।"}, {"n": "গাউট ও কিডনি সমস্যা (ইউরেট জমা)", "e": "🧂", "t": ["ফোলা", "পা/হাঁটা"], "s": "পা ও জয়েন্ট ফোলা, খোঁড়ানো, কিডনি ফ্যাকাশে, সাদা চুন জমা।", "c": "বিপাকীয়/পানির অভাব। পানি কম খাওয়া, প্রোটিন ও ক্যালসিয়াম বেশি, আইবি-ভাইরাসে কিডনি আক্রান্ত, ওষুধ বা বিষ।", "l": [["জয়েন্ট (আর্টিকুলার গাউট)", ["পায়ের জয়েন্ট ফোলা ও শক্ত", "খুঁড়িয়ে হাঁটা", "হাঁটতে কষ্ট"]], ["পেটের (ভিসেরাল গাউট)", ["ঝিমানো, খাবার কম", "পানি বেশি বা কম খাওয়া", "হঠাৎ মৃত্যু", "সাদা পাতলা মল (ইউরেট)"]], ["শরীর", ["ডিহাইড্রেশন", "পা শুকনো", "রোগা"]]], "pm": [["কিডনি", "ফ্যাকাশে, ফোলা, ইউরেট জমে সাদা চুনের মতো"], ["ইউরেটার", "সাদা চুন জমে নল ভরে যাওয়া"], ["হৃদপিণ্ড-লিভার", "উপরে সাদা চুনের আবরণ (ভিসেরাল গাউট)"], ["জয়েন্ট", "সাদা চকের মতো ইউরেট জমা"]], "df": "ই-কোলাই (লিভারে সাদা আবরণ), আইবি। পার্থক্য: কিডনি ও জয়েন্টে সাদা চুনের মতো শক্ত জমাট।", "r": "পরিষ্কার ঠান্ডা পানি পর্যাপ্ত দিন, প্রোটিন কিছুটা কমান, কিডনি টনিক ও ইলেক্ট্রোলাইট দিন (ডাক্তারের পরামর্শে)।", "m": "কিডনি টনিক (পটাশিয়াম সাইট্রেট), ইলেক্ট্রোলাইট; ডাক্তারের পরামর্শে অন্য ওষুধ।", "p": "পানির পাত্র সবসময় ভরা, ফিডে ক্যালসিয়াম-ফসফরাস অনুপাত ঠিক, আইবি টিকা, গরমে পানি ঠান্ডা রাখা।"}, {"n": "ঠোকরানো / ক্যানিবালিজম", "e": "🪶", "t": ["চামড়া-পালক"], "s": "একজন অন্যকে ঠোকরে রক্ত বের করা, পালক টেনে ফেলা, পায়ু ঠোকরানো।", "c": "ব্যবস্থাপনা। ঘনত্ব বেশি, আলো বেশি, লবণ-প্রোটিন কম, বিরক্তি, গরম। একবার রক্ত দেখলে সবাই ঠোকরায়।", "l": [["আচরণ", ["অন্যের পালক টানা ও খাওয়া", "পায়ু ও ক্লোয়াকা ঠোকরানো", "পায়ে-পিঠে ঠোকর মেরে ঘা করা", "রক্ত দেখলে দল বেঁধে ঠোকরানো"]], ["শরীর", ["পিঠ ও লেজে লাল ঘা", "পায়ু বেরিয়ে আসা", "মৃত্যু (গুরুতর ঘা থেকে)"]], ["কারণের চিহ্ন", ["ঘর খুব উজ্জ্বল", "ভিড় বেশি", "খাবার-পানির জায়গা কম", "লবণ বা প্রোটিন কম খাওয়ানো"]]], "pm": [["চামড়া", "ক্ষত, ঘা, রক্ত জমা"], ["পায়ু", "ফোলা, ছেঁড়া"], ["পেশি", "মাংস খাওয়া ক্ষত"]], "df": "উকুন-মাইট, চুলকানি। পার্থক্য: ঘা অন্য মুরগির ঠোকরের।", "r": "আহত মুরগি আলাদা করুন, ক্ষতে ডাক্তারের পরামর্শে ওষুধ ও পোভিডন আয়োডিন লাগান। আলো কমান।", "m": "পোভিডন আয়োডিন, জেন্টিয়ান ভায়োলেট স্প্রে, মাল্টিভিটামিন-মিনারেল।", "p": "ঘনত্ব ঠিক রাখা, আলো কম (বিশেষ করে সন্ধ্যা), খাবার-পানির জায়গা বেশি, ফিডে লবণ ও প্রোটিন ঠিক, ঠোঁট ছাঁটা (প্রয়োজনে)।"}, {"n": "মেরেক্স রোগ", "e": "🧬", "t": ["স্নায়ু", "চোখ-মাথা"], "s": "পা অবশ (এক পা সামনে এক পা পেছনে), চোখ ধূসর, ত্বকে টিউমার।", "c": "হার্পিসভাইরাস। হ্যাচারি বা প্রথম সপ্তাহে সংক্রমণ, ৬–২০ সপ্তাহে লক্ষণ আসে (ব্রয়লারে কম, লেয়ারে বেশি)। পালকের খুশকি দিয়ে ছড়ায়।", "l": [["স্নায়ু", ["এক পা সামনে এক পা পেছনে (স্প্লিটস)", "পা বা ডানা অবশ", "ঘাড় বাঁকা"]], ["চোখ", ["চোখের মণি ধূসর ও অনিয়মিত (গ্রে আই)", "দৃষ্টি হারানো"]], ["টিউমার", ["চামড়ায় পালকের গোড়ায় ফোলা/টিউমার", "পেটে ফোলা", "রোগা হয়ে যাওয়া"]], ["মৃত্যু", ["ধীরে ধীরে মৃত্যু", "ডিম কমে (লেয়ার)"]]], "pm": [["পেরিফেরাল স্নায়ু", "মোটা, ফোলা, ডোরাকাটা, একপাশ অন্যপাশের থেকে মোটা"], ["লিভার, স্প্লিন, কিডনি", "সাদা টিউমার"], ["চামড়া", "পালকের গোড়ায় গুটি"], ["চোখ", "ধূসর আইরিস"], ["ডিম্বাশয়", "টিউমার (লেয়ারে)"]], "df": "ভিটামিন বি২ অভাব, রানিক্ষেত (স্নায়ু), লিম্ফয়েড লিউকোসিস। পার্থক্য: এক পা সামনে এক পা পেছনে ও স্নায়ু মোটা।", "r": "কোনো চিকিৎসা নেই। আক্রান্ত মুরগি সরিয়ে ফেলুন। প্রতিরোধই একমাত্র উপায়।", "m": "কোনো ওষুধ নেই। সহায়ক শুধু মাল্টিভিটামিন।", "p": "হ্যাচারিতে ১ দিনে মেরেক্স টিকা, ঘর ও ব্রুডার জীবাণুমুক্ত, বিভিন্ন বয়সের মুরগি একসাথে না রাখা।"}, {"n": "পানিশূন্যতা (ডিহাইড্রেশন) ও পানির সমস্যা", "e": "💧", "t": ["ফোলা"], "s": "চোখ বসে যাওয়া, পা শুকনো, ঝিমানো, পানির পাত্র খালি বা নোংরা।", "c": "ব্যবস্থাপনা। পানির লাইন বন্ধ, নিপল কম, গরম, নোংরা বা ঘোলা পানি, ওষুধ/টিকার কারণে পানি কম খাওয়া।", "l": [["শরীর", ["চোখ বসে যাওয়া", "পা ও চামড়া শুকনো, ভাঁজ পড়া", "ঝুঁটি ফ্যাকাশে ও শুকনো", "রোগা, ওজন কমে"]], ["আচরণ", ["ঝিমানো, পানির কাছে বারবার যাওয়া", "হাঁপানো", "খাবার কমে যাওয়া"]], ["পায়খানা", ["শুকনো, কঠিন পায়খানা বা অতিরিক্ত ইউরেট"]], ["মৃত্যু", ["শুকিয়ে মৃত্যু, বিশেষ করে ছোট বাচ্চায়", "গরমে বেশি"]]], "pm": [["শরীর", "শুকনো, মাংস কালচে"], ["কিডনি", "ফ্যাকাশে, ইউরেট জমা"], ["অন্ত্র", "শুকনো"], ["ক্রপ", "খালি"]], "df": "হিট স্ট্রেস, গাউট, IB। পার্থক্য: পানির পাত্র খালি/নষ্ট, পানি দিলে দ্রুত ভালো হয়।", "r": "পরিষ্কার, ঠান্ডা পানি সাথে সাথে দিন। ইলেক্ট্রোলাইট ও গ্লুকোজ দিন। পানির লাইন ও নিপল পরীক্ষা করুন।", "m": "ইলেক্ট্রোলাইট, গ্লুকোজ, ওরাল স্যালাইন (পোল্ট্রির জন্য), ভিটামিন সি।", "p": "পানির লাইন নিয়মিত পরীক্ষা, পর্যাপ্ত নিপল/পাত্র, গরমে ঠান্ডা পানি, ট্যাংক পরিষ্কার, ওষুধ/টিকার পর পানি কম খায় কিনা দেখা।"}];
const DIS_CHIPS=["পায়খানা", "শ্বাস", "স্নায়ু", "হঠাৎ", "ফোলা", "পা/হাঁটা", "চোখ-মাথা", "চামড়া-পালক", "নাভি/বাচ্চা", "পরজীবী"];


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
 let pg=document.getElementById(pageId);if(!pg||pg.querySelector(".jump-row"))return;
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
  let an=document.getElementById("analysis");
  if(an){let it=[...an.querySelectorAll(".an-box")].map(el=>{let t=el.querySelector(".an-title");if(!t)return null;let l=t.textContent.replace(/\s+/g," ").trim().split(/[(—]/)[0].trim();
    l=l.replace("আগের ব্যাচের সঙ্গে তুলনা","ব্যাচ তুলনা").replace("FCR পূর্বাভাস","FCR পূর্বাভাস").replace("কবে বিক্রি করলে বেশি লাভ","কবে বিক্রি").replace("দৈনিক ফিড বনাম স্ট্যান্ডার্ড","ফিড বনাম স্ট্যান্ডার্ড").replace("ফিড মজুত ও কত দিন চলবে","ফিড মজুত").replace("লাভ-লোকসান বিশ্লেষণ","লাভ-লোকসান").replace("ওজন নমুনা","ওজন নমুনা");
    return {el,label:l}}).filter(Boolean);buildJumps("analysis",it)}
 }catch(e){console.error(e)}
}
initJumps();
