/*
 End-to-end API smoke test.
 Usage (PowerShell):
   $env:API_BASE="http://localhost:3001"; $env:CUSTOMER_EMAIL="user@example.com"; $env:CUSTOMER_PASSWORD="secret"; node scripts/test_all.js
 Optional: set JWT directly via JWT token (skip login) -> $env:JWT
*/
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const base = process.env.API_BASE || 'http://localhost:3001';
const email = process.env.CUSTOMER_EMAIL;
const password = process.env.CUSTOMER_PASSWORD;
let token = process.env.JWT;

async function loginIfNeeded(){
  if(token) return;
  if(!email||!password){
    throw new Error('Provide CUSTOMER_EMAIL and CUSTOMER_PASSWORD or JWT');
  }
  const res = await fetch(`${base}/api/auth/customer/login`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ email_address:email, password })
  });
  const data = await res.json();
  if(!res.ok){
    throw new Error('Login failed: '+JSON.stringify(data));
  }
  token = data.token;
  console.log('[LOGIN] OK');
}

async function createOrder(){
  const payload = {
    account_name:'acctest',
    name:'Smoke Tester',
    order_date:new Date().toISOString().slice(0,10),
    expected_delivery:new Date(Date.now()+86400000).toISOString().slice(0,10),
    status:'Pending',
    package_name:'standard',
    payment_method:'COD',
    payment_type:'Full',
    shipped_to:'Smoke Tester',
    email_address: email || 'smoke@example.com',
    products:[
      { sku:'SKU123', quantity:1, profit_margin:0.1 },
      { sku:'SKU123', quantity:2, profit_margin:0.15 },
      { sku:'SKU789', quantity:3 }
    ]
  };
  const res = await fetch(`${base}/api/orders`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify(payload)});
  const data = await res.json();
  if(res.status!==201) throw new Error('Create failed '+res.status+': '+JSON.stringify(data));
  console.log('[CREATE] order_id', data.order_id, 'lines', data.products.length);
  return data.order_id;
}

async function updateOrder(orderId){
  const payload = {
    status:'To Be Pack',
    products:[
      { sku:'SKU123', quantity:1, profit_margin:0.12 },
      { sku:'SKU123', quantity:1, profit_margin:0.18 },
      { sku:'SKU789', quantity:2 }
    ]
  };
  const res = await fetch(`${base}/api/orders/${encodeURIComponent(orderId)}`, {method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify(payload)});
  const data = await res.json();
  if(res.status!==200) throw new Error('Update failed '+res.status+': '+JSON.stringify(data));
  console.log('[UPDATE] lines', data.products.length, 'status', data.status);
}

async function fetchProducts(orderId){
  const res = await fetch(`${base}/api/orders/${encodeURIComponent(orderId)}/products`, {headers:{'Authorization':`Bearer ${token}`}});
  const data = await res.json();
  if(!res.ok) throw new Error('Fetch products failed '+res.status+': '+JSON.stringify(data));
  console.log('[FETCH PRODUCTS] count', data.products.length);
}

(async ()=>{
  try {
    console.log('[TEST ALL] Base:', base);
    await loginIfNeeded();
    const orderId = await createOrder();
    await updateOrder(orderId);
    await fetchProducts(orderId);
    console.log('\n[RESULT] SUCCESS');
  } catch(e){
    console.error('\n[RESULT] FAILURE:', e.message);
    process.exit(1);
  }
})();
