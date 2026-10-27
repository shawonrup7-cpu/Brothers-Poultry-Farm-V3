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
function migrateWorkers(b){
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
kCostPerKg.textContent=liveChicks?money(c.cost/liveChicks)+"  প্রতি মুরগি":"৳০";
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
 deathTable.innerHTML=a.length?a.map((r,i)=>`<tr><td>${r.date||""}</td><td>${r.qty}</td><td>${r.reason||""}</td><td>${r.action||""}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('deaths',${i})">✏️</button><button class="del" onclick="del('deaths',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">এখনও মৃত বাচ্চার কোনো তথ্য যোগ করা হয়নি</td></tr>`;
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
<div class="section" style="margin:12px 0 6px;font-size:14px">⚖️ পাল্লা যোগ করুন (প্রতি পাল্লায় মুরগি সংখ্যা ও ওজন)</div>
<div class="fields"><label>মুরগি সংখ্যা<input id="pallaQty" type="number" min="0"></label><label>ওজন (কেজি)<input id="pallaWeight" type="number" min="0" step=".01"></label></div>
<button class="add" onclick="addPalla()">➕ পাল্লা যোগ করুন</button>
<div class="wrap" style="margin-top:8px"><table><thead><tr><th>পাল্লা</th><th>মুরগি</th><th>ওজন</th><th>গড়/মুরগি</th><th></th></tr></thead><tbody id="pallaTempTable"></tbody></table></div>
<div class="hint" id="pallaTotals" style="margin-top:8px"></div>
<div class="section" style="margin:14px 0 6px;font-size:14px">💵 মোট হিসাব অনুযায়ী দাম</div>
<div class="fields"><label>দর/কেজি<input id="salesRate" type="number" step=".01" oninput="renderTempPallas()"></label><label>পরিশোধ কত<input id="salesPaid" type="number" min="0" step=".01" placeholder="যত টাকা পেয়েছেন"></label></div>
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
function addPalla(){
 let q=+pallaQty.value||0,w=+pallaWeight.value||0;
 if(q<=0||w<=0){showToast("❌ মুরগির সংখ্যা ও ওজন (কেজি) দুটোই লিখুন");return}
 tempPallas.push({qty:q,weight:w});
 pallaQty.value="";pallaWeight.value="";pallaQty.focus();
 renderTempPallas();
}
function removePalla(i){tempPallas.splice(i,1);renderTempPallas()}
function renderTempPallas(){
 pallaTempTable.innerHTML=tempPallas.length?tempPallas.map((p,i)=>`<tr><td>${i+1}</td><td>${p.qty} টি</td><td>${p.weight} কেজি</td><td>${(p.weight/p.qty||0).toFixed(2)} কেজি</td><td><button class="del" onclick="removePalla(${i})">✕</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">এখনও কোনো পাল্লা যোগ করা হয়নি</td></tr>`;
 let totQty=tempPallas.reduce((s,p)=>s+p.qty,0),totWeight=tempPallas.reduce((s,p)=>s+p.weight,0);
 let rate=+salesRate.value||0,totMoney=totWeight*rate;
 pallaTotals.innerHTML=tempPallas.length?`মোট পাল্লা: ${tempPallas.length} • মোট মুরগি: ${totQty} টি • মোট ওজন: ${totWeight.toFixed(2)} কেজি • গড় ওজন/মুরগি: ${(totWeight/totQty||0).toFixed(2)} কেজি${rate?`<br><b style="color:#0a7a4f">💰 মোট টাকা: ${money(totMoney)}</b>`:""}`:"";
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
el.innerHTML=a.length?a.map((r,i)=>`<tr><td>${r.date||""}</td><td>${r.name||""}</td><td>${r.qty||0}</td><td>${money(r.rate)}</td><td>${money((r.qty||0)*(r.rate||0))}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('${k}',${i})">✏️</button><button class="del" onclick="del('${k}',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো হিসাব যোগ করা হয়নি</td></tr>`;
}
function renderSales(){if(!salesDate.value)salesDate.value=todayISO();salesTable.innerHTML=state.sales.length?state.sales.map((r,i)=>{let tot=r.weight*r.rate;let paid=+r.paid||0;let due=tot-paid;let pallas=r.pallas||[];let pc=pallas.length;let detail=pallas.map((p,pi)=>`<tr><td style="padding:4px 8px">পাল্লা ${pi+1}</td><td style="padding:4px 8px">${p.qty} টি</td><td style="padding:4px 8px">${p.weight} কেজি</td><td style="padding:4px 8px">গড়: ${(p.weight/p.qty||0).toFixed(2)} কেজি/মুরগি</td></tr>`).join("");let mainRow=`<tr><td>${r.date||""}</td><td>${r.customer||"—"}</td><td>${r.qty}${pc?` <span style="opacity:.6;font-size:11px">(${pc} পাল্লা)</span>`:""}</td><td>${r.weight}</td><td>${money(r.rate)}</td><td>${money(tot)}</td><td>${money(paid)}</td><td>${due>0?money(due):"—"}</td><td>${(r.weight/r.qty||0).toFixed(2)} কেজি</td><td>${pc?`<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="toggleDetails(${i})">বিস্তারিত</button>`:""}<button class="tbtn-light" style="padding:5px 8px;font-size:11px;margin-right:4px" onclick="memoOpen(${i})">🧾 মেমো</button><button class="edt" onclick="openEdit('sales',${i})">✏️</button><button class="del" onclick="del('sales',${i})">মুছুন</button></td></tr>`;let detailRow=pc?`<tr id="pallaDetail${i}" style="display:none"><td colspan="10" style="padding:0;background:#f7f9fa"><table style="width:100%;font-size:12px">${detail}</table></td></tr>`:"";return mainRow+detailRow}).join(""):`<tr><td colspan="10" class="empty">এখনও কোনো বিক্রি যোগ করা হয়নি</td></tr>`;
let names=[...new Set(state.sales.map(r=>r.customer).filter(Boolean))];
customerList.innerHTML=names.map(n=>`<option value="${n}">`).join("");
{let a=allWeightStats(),h=document.getElementById("avgAllHint");if(h)h.innerHTML=a.q?`⚖️ <b>মোট গড় ওজন (পাইকারি + খুচরা + গিফট/নিজের): ${a.avg.toFixed(2)} কেজি/মুরগি</b><br>মোট ${fmt(a.q,0)} টি • মোট ওজন ${fmt(a.w)} কেজি`:""}
}
function renderRent(){let a=state.rent||[];rentTable.innerHTML=a.length?a.map((r,i)=>`<tr><td>${r.date||""}</td><td>${r.desc||""}</td><td>${money(r.amt)}</td><td>${money(r.paid)}</td><td>${money((r.amt||0)-(r.paid||0))}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('rent',${i})">✏️</button><button class="del" onclick="del('rent',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো ভাড়ার হিসাব যোগ করা হয়নি</td></tr>`}

function renderLitterSales(){
  let ls=state.litterSales||[];
  let lt=ls.reduce((s,r)=>s+(+r.qty||0)*(+r.rate||0),0);
  let ltEl=document.getElementById("lsaleTotal");
  if(ltEl)ltEl.textContent=money(lt);
  let ltTbl=document.getElementById("lsaleTable");
  if(ltTbl)ltTbl.innerHTML=ls.length?ls.map((r,i)=>`<tr><td>${r.date||""}</td><td>${r.qty} কেজি</td><td>${money(r.rate)}</td><td>${money((+r.qty||0)*(+r.rate||0))}</td><td>${r.buyer||"—"}</td><td><button class="del" onclick="delLitter(${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">এখনও কোনো লিটার বিক্রি যোগ করা হয়নি</td></tr>`;
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
function exportReportExcel(){
 let d=reportData(),h=t=>String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 let bd="border:1px solid #999;padding:4px 8px;";
 let html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12pt">';
 html+='<tr><td colspan="3" style="font-size:20pt;font-weight:bold;text-align:center;color:#0a4a2f">ব্রাদার্স পোল্ট্রি ফার্ম</td></tr>';
 html+='<tr><td colspan="3" style="font-size:12pt;text-align:center;font-weight:bold">'+h(d.sub)+'</td></tr><tr><td colspan="3"></td></tr>';
 d.info.forEach(x=>{html+='<tr><td style="'+bd+'background:#e6f2ec;font-weight:bold">'+h(x[0])+'</td><td colspan="2" style="'+bd+'">'+h(x[1])+'</td></tr>'});
 html+='<tr><td colspan="3"></td></tr><tr><th style="'+bd+'background:#0a4a2f;color:#fff;text-align:left">খাত</th><th style="'+bd+'background:#0a4a2f;color:#fff;text-align:left">পরিমাণ</th><th style="'+bd+'background:#0a4a2f;color:#fff;text-align:right">টাকা (৳)</th></tr>';
 d.rows.forEach(r=>{
  if(r.t==="sec"){html+='<tr><td colspan="3" style="'+bd+'background:#e6f2ec;font-weight:bold;color:#0a4a2f">'+h(r.l.replace(/^[^\wঀ-৿]+\s*/,""))+'</td></tr>';return}
  let st=bd+(r.t==="tot"?"font-weight:bold;background:#f0f0f0;":r.t==="profit"?"font-weight:bold;background:#d9f2e3;color:#0a7a4f;":r.t==="loss"?"font-weight:bold;background:#fbe0e0;color:#b91c1c;":"");
  html+='<tr><td style="'+st+'">'+h(r.l)+'</td><td style="'+st+'">'+h(r.q||"")+'</td><td style="'+st+'text-align:right;mso-number-format:\'#,##0.00\'">'+(r.v!==undefined?h(r.v):(r.a==null?"":(+r.a).toFixed(2)))+'</td></tr>';
 });
 if(d.note)html+='<tr><td colspan="3" style="font-size:10pt;color:#555">'+h(d.note)+'</td></tr>';
 html+='<tr><td colspan="3" style="font-size:10pt;color:#555">রিপোর্ট তৈরির তারিখ: '+h(new Date().toLocaleDateString("bn-BD",{day:"numeric",month:"long",year:"numeric"}))+'</td></tr></table></body></html>';
 let blob=new Blob(["﻿"+html],{type:"application/vnd.ms-excel;charset=utf-8"});
 let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=reportFileBase()+".xls";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 showToast("✅ Excel ফাইল ডাউনলোড হয়েছে");
}
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
 absTable.innerHTML=ab.length?ab.map((r,i)=>`<tr><td>${r.date}</td><td>${esc(r.note||"")}</td><td><button class="del" onclick="del('absences',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="3" class="empty">এখনও কোনো দিনের হাজিরা কাটা হয়নি</td></tr>`;
 let a=state.workers||[];
 workersTable.innerHTML=a.length?a.map((r,i)=>`<tr><td>${r.date||""}</td><td>${money(r.amount)}</td><td>${esc(r.note||"")}</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('workers',${i})">✏️</button><button class="del" onclick="del('workers',${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="4" class="empty">এখনও কোনো টাকা নেওয়ার হিসাব নেই</td></tr>`;
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
  tb.innerHTML=a.length?a.map((r,i)=>`<tr><td>${r.date||"—"}</td><td>${esc(r.kind||"গিফট")}</td><td>${esc(r.name)||"—"}</td><td>${fmt(r.qty,0)} টি</td><td>${fmt(r.weight)} কেজি</td><td>${(+r.qty)?(r.weight/r.qty).toFixed(2):"—"} কেজি</td><td style="white-space:nowrap"><button class="edt" onclick="openEdit('gift',${i})">✏️</button><button class="del" onclick="delGift(${i})">মুছুন</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">এখনও কোনো গিফট / নিজের খাওয়ার হিসাব নেই</td></tr>`;
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
    tbl.innerHTML=rows.length?rows.map((r,i)=>{
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
 let _anc=null;if(id==="litter"){id="other";_anc="expLitter"}else if(id==="rent"){id="other";_anc="expRent"}else if(id==="power"){id="other";_anc="expPower"}
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
const navItems=[["dashboard","🏠 ড্যাশবোর্ড"],["medschedule","💊 মেডিসিন শিডিউল"],["dailyfeed","🍽️ দৈনিক খাবার"],["notes","📝 নোট"],["vaccine","💉 ভ্যাকসিন"],["analysis","📈 বিশ্লেষণ"],["fcr","🎯 FCR"],["farm","🐣 বাচ্চা ও মৃত"],["feed","🌾 ফিড"],["medicine","💊 মেডিসিন"],["workers","👷 কর্মচারী"],["other","🧾 বিভিন্ন খরচ"],["sales","💰 বিক্রি"],["othersales","🛒 অন্যান্য বিক্রি"],["customers","👥 ক্রেতা"],["report","📑 রিপোর্ট"],["batchcmp","📊 ব্যাচ তুলনা"],["batches","🗂️ সব ব্যাচ"]];
const navColors={fcr:"linear-gradient(135deg,#3d8bff,#1a5fff)",batchcmp:"linear-gradient(135deg,#8b5cf6,#6d28d9)",analysis:"linear-gradient(135deg,#0ea5e9,#0369a1)",dashboard:"linear-gradient(135deg,#6366f1,#4f46e5)",farm:"linear-gradient(135deg,#f59e0b,#d97706)",deaths:"linear-gradient(135deg,#ef4444,#b91c1c)",feed:"linear-gradient(135deg,#84cc16,#4d7c0f)",medicine:"linear-gradient(135deg,#a855f7,#7e22ce)",workers:"linear-gradient(135deg,#06b6d4,#0e7490)",other:"linear-gradient(135deg,#f97316,#c2410c)",litter:"linear-gradient(135deg,#a78bfa,#6d28d9)",rent:"linear-gradient(135deg,#14b8a6,#0f766e)",sales:"linear-gradient(135deg,#22c55e,#15803d)",othersales:"linear-gradient(135deg,#f43f5e,#be123c)",customers:"linear-gradient(135deg,#3b82f6,#1d4ed8)",medschedule:"linear-gradient(135deg,#ec4899,#9d174d)",dailyfeed:"linear-gradient(135deg,#f59e0b,#b45309)",vaccine:"linear-gradient(135deg,#22d3ee,#0891b2)",notes:"linear-gradient(135deg,#eab308,#a16207)",report:"linear-gradient(135deg,#0ea5e9,#0369a1)",batches:"linear-gradient(135deg,#8b5cf6,#6d28d9)"};
const navBtn=(x,i)=>{
  const grad=navColors[x[0]]||"linear-gradient(135deg,#1aad6e,#0d8050)";
  const isActive=i===0?"active":"";
  const style=isActive?`style="background:${grad}"`:`style="background:#ffffff0e"`;
  const badge=x[0]==="vaccine"?'<span id="vacBadge"></span>':"";
  return `<button class="nav ${i===0?"nav-dash ":""}${isActive}" data-grad="${grad}" ${style} onclick="go('${x[0]}',this)">${x[1]}${badge}</button>`;
};
nav.innerHTML=navBtn(navItems[0],0)+'<div class="nav-row">'+navItems.slice(1).map((x,i)=>navBtn(x,i+1)).join("")+'</div>';
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
 state.projRate=+$a("anRate").value||0;state.projFeedRate=+$a("anFeedRate").value||0;
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
 if(!(+state.chicks>0)){el.innerHTML='<div class="an-alert info">আগে "🐣 বাচ্চা ও মৃত" পেজে বাচ্চার সংখ্যা দিন।</div>';return}
 let chicks=+state.chicks||0,cp=chicks*(+state.chickPrice||0);
 let parts=[["🐣 বাচ্চা",cp,"#7fd1ff"],["🌾 ফিড",total("feed"),"#fbbf24"],["💊 মেডিসিন",total("medicine"),"#e0775a"],["👷 কর্মচারী",workersTotal(),"#b69cff"],["🧾 বিভিন্ন (লিটার, ভাড়া, বিদ্যুৎসহ)",total("other")+total("litter")+total("power")+rentTotal(),"#3ddc84"]];
 let cost=parts.reduce((a,b)=>a+b[1],0),inc=salesTotal()+otherSalesGrand(),net=inc-cost;
 let live=livePcs(),dead=deathTotal()||(+state.dead||0),out=Math.max(0,chicks-dead-live);
 let harv=(state.sales||[]).reduce((a,r)=>a+(+r.weight||0),0);
 let w0=anW0(),estKg=live>0&&state.startDate?live*w0.w:0,allKg=harv+estKg;
 let f=fcrStats(),ag=days();
 let card=(t,v,c,sub)=>'<div class="pa-card"><div class="pa-t">'+t+'</div><div class="pa-v"'+(c?' style="color:'+c+'"':'')+'>'+v+'</div>'+(sub?'<div class="pa-s">'+sub+'</div>':'')+'</div>';
 let h='<div class="pa-grid">'+
  card("মোট খরচ",tk(cost),"#fbbf24")+card("মোট আয়",tk(inc),"#3ddc84")+
  card(net>=0?"এখন পর্যন্ত নিট লাভ":"এখনও ক্ষতিতে",(net<0?"−":"")+tk(Math.abs(net)),net>=0?"#3ddc84":"#ff7070")+
  card("প্রতি বাচ্চায় খরচ",tk(cost/chicks),"","বাচ্চা ধরে মোট খরচ ÷ "+bn(chicks))+'</div>';
 // ব্রেক-ইভেন
 if(live>0&&state.startDate){
  let need=Math.max(0,-net);
  if(need<=0)h+='<div class="an-alert good"><b>✅ খরচ উঠে গেছে।</b> বাকি '+bn(live)+' টি মুরগি যে দামেই বিক্রি হোক সেটা লাভ।</div>';
  else{let be=need/estKg;h+='<div class="an-alert info"><b>⚖️ ব্রেক-ইভেন দর: কেজিতে ৳'+fb(be,1)+'</b><br>বাকি '+bn(live)+' টি মুরগির আনুমানিক ওজন প্রায় '+fb(estKg,0)+' কেজি ('+w0.src+')। খরচ তুলতে আরও ৳'+fb(need,0)+' লাগবে, তাই এর বেশি দরে বেচলে লাভ।'+(lastSaleRate()?'<br>শেষ বিক্রির দর ৳'+fb(lastSaleRate(),0)+(lastSaleRate()>=be?' — এই দরে বেচলে লাভ হবে।':' — এই দরে বেচলে এখনও ক্ষতি।'):'')+'</div>'}
 }
 // প্রতি কেজি খরচ
 if(allKg>0){let pk=cost/allKg;h+='<div class="an-note" style="margin:8px 0">📦 <b>প্রতি কেজি মুরগির উৎপাদন খরচ: ৳'+fb(pk,1)+'</b> (মোট ওজন '+fb(allKg,0)+' কেজি'+(estKg?', এর মধ্যে '+fb(estKg,0)+' কেজি আনুমানিক':'')+'). বাজারদর এর চেয়ে বেশি হলে লাভ।</div>'}
 // খরচের ভাগ
 if(cost>0){
  h+='<div class="pa-bar">'+parts.filter(x=>x[1]>0).map(x=>'<i style="width:'+(x[1]/cost*100)+'%;background:'+x[2]+'" title="'+x[0]+'"></i>').join("")+'</div>';
  h+=parts.map(x=>'<div class="pa-row"><span><b class="pa-dot" style="background:'+x[2]+'"></b>'+x[0]+'</span><span>'+tk(x[1])+' <em>'+bn(Math.round(x[1]/cost*100))+'%</em></span></div>').join("");
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
function renderAnalysis(){
 if(!$a("anStock"))return;
 try{renderProfit();renderGoals();renderFeedCmp();renderMort();renderFcrProj()}catch(e){console.error(e)}
 let b=$a("anBagKg");if(b&&document.activeElement!==b)b.value=bagKg();
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
 o+='<line x1="0" x2="'+W+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="#ffffff22"/>';
 let mo="";
 vals.forEach((v,i)=>{
  let h=Math.max(0,(H-B-T)*v/max),x=i*(BW+gap),a=days[i].split("-"),last=i===n-1;
  if(v>0){
   o+='<rect x="'+x+'" y="'+(H-B-h)+'" width="'+BW+'" height="'+h+'" rx="3" style="fill:'+(last?"var(--dz3)":color)+';fill-opacity:.28;stroke:'+(last?"var(--dz3)":color)+';stroke-width:1"><title>'+a[2]+'/'+a[1]+': '+fmtv(v)+'</title></rect>';
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
{const _r=window.render;window.render=function(){let r=_r.apply(this,arguments);try{renderAnalysis();renderCharts()}catch(e){console.error(e)}return r}}
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
  f.push({lv:0,t:"আজ/গতকালের খাবারের এন্ট্রি নেই",d:"\"দৈনিক খাবার\" পেজে লিখলে খাবার বিশ্লেষণ হবে।",a:""});
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
 window.fcManual=function(){
  const out=el("fmOut");if(!out)return;
  const g=id=>+el(id).value||0;
  const feed=g("fmFeed"),birds=Math.round(g("fmBirds")),avg=g("fmAvg"),tg=g("fmTarget");
  let tw=g("fmWeight"),src="";
  if(tw>0)src="আপনার দেওয়া মোট ওজন";else if(birds>0&&avg>0){tw=birds*avg;src=bnx(birds)+" টি × "+f1(avg,3)+" কেজি"}
  if(!(feed>0)||!(tw>0)){out.innerHTML='<div class="an-note">মোট ফিড আর (মোট ওজন, অথবা মুরগির সংখ্যা ও গড় ওজন) বসান।</div>';return}
  const fcr=feed/tw;
  let h='<div class="pgsum">'+card("🍽️","মোট ফিড",f1(feed)+" কেজি","#fbbf24")+card("📦","মোট ওজন",f1(tw)+" কেজি")+card("📊","FCR",f1(fcr,2),tg>0?(fcr<=tg?"#3ddc84":"#ff7070"):"");
  if(tg>0){const need=feed/tg;h+=card("🎯","টার্গেট FCR",f1(tg,2))+card("⚖️","ফিড অনুযায়ী দরকারি ওজন",f1(need)+" কেজি","#70b8ff")+card("🧮","এই ওজনে ফিড লাগত",f1(tw*tg)+" কেজি");if(birds>0)h+=card("🐔","দরকারি গড়/মুরগি",f1(need/birds,2)+" কেজি","#70b8ff")}
  h+='</div><div style="font-size:11.5px;color:#7a9aaa;margin-top:8px;line-height:1.7">হিসাব: '+f1(feed)+' ÷ '+f1(tw)+(src?' ('+src+')':'')+' = <b style="color:#e8edf2">'+f1(fcr,2)+'</b></div>';
  if(tg>0)h+=verdict(fcr,tg);
  out.innerHTML=h;
 };
 window.fcFill=function(){
  const f=fcrStats();
  el("fmFeed").value=f.feed?Math.round(f.feed*100)/100:"";
  el("fmWeight").value=f.tw?Math.round(f.tw*100)/100:"";
  el("fmBirds").value=f.birds||"";el("fmAvg").value="";
  el("fmTarget").value=f.tg||1.6;fcManual();
 };
 window.fcClear=function(){["fmFeed","fmWeight","fmBirds","fmAvg"].forEach(i=>el(i).value="");el("fmTarget").value=1.6;fcManual()};
 function renderFcrPage(){
  if(!el("fcTarget"))return;
  const a=document.activeElement;
  if(a!==el("fcTarget"))el("fcTarget").value=+state.targetFCR||1.6;
  if(a!==el("fcLive"))el("fcLive").value=+state.liveAvgWt||"";
  fcAuto();fcManual();
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
  x.fillStyle="#ffe08a";x.font="600 26px "+F;x.fillText("বিক্রয় মেমো / রসিদ",224,146);
  x.fillStyle="#bfe9d3";x.font="500 20px "+F;x.fillText("মেমো নং: "+bn(idx+1)+" • "+(r.date||""),224,184);
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
  {let sg=await loadSign();if(sg){let sw=175,sh=sw*sg.height/sg.width;x.drawImage(sg,W-175-sw/2,H-134-sh,sw,sh)}}
  x.strokeStyle="#999";x.lineWidth=1.5;x.beginPath();x.moveTo(W-300,H-130);x.lineTo(W-50,H-130);x.stroke();
  x.fillStyle="#667";x.font="500 20px "+F;x.textAlign="center";x.fillText("কর্তৃপক্ষের স্বাক্ষর",W-175,H-100);
  x.textAlign="left";x.fillStyle="#0a4a2f";x.font="700 26px "+F;x.fillText("ধন্যবাদ, আবার আসবেন 🙏",50,H-100);
  x.fillStyle="#aab";x.font="500 16px "+F;x.fillText("ব্রাদার্স পোল্ট্রি ফার্ম",50,H-60);
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
