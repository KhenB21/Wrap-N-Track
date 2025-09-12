/*
 Simple integration script to test POST and PUT order flows allowing duplicate SKUs.
 Usage (PowerShell):
   node scripts/order_integration_test.js "<JWT_TOKEN>" "http://localhost:3001"
*/
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const [,, token, baseUrl = 'http://localhost:3001'] = process.argv;
if(!token){
  console.error('Provide JWT token as first arg.');
  process.exit(1);
}

async function run(){
  const headers = { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` };

  // 1. Create order with duplicate SKU lines
  const createPayload = {
    account_name:'acc_test',
    name:'Integration User',
    order_date:new Date().toISOString().slice(0,10),
    expected_delivery:new Date(Date.now()+3*86400000).toISOString().slice(0,10),
    status:'Pending',
    package_name:'standard',
    payment_method:'COD',
    payment_type:'Full',
    shipped_to:'Integration User',
    email_address:'integration@example.com',
    products:[
      { sku:'SKU123', quantity:2, profit_margin:0.1 },
      { sku:'SKU123', quantity:1, profit_margin:0.05 },
      { sku:'SKU789', quantity:4 }
    ],
    remarks:'Initial create'
  };

  console.log('\n[CREATE] Sending POST /api/orders');
  let resp = await fetch(`${baseUrl}/api/orders`, {method:'POST', headers, body:JSON.stringify(createPayload)});
  let data = await resp.json();
  console.log('[CREATE] Status:', resp.status, 'Order ID:', data.order_id, 'Lines:', data.products?.length);
  if(resp.status!==201){
    console.error('[CREATE] Failed payload:', data);
    return;
  }
  const orderId = data.order_id;

  // 2. Update order: modify quantities and add another duplicate line
  const updatePayload = {
    status:'To Be Pack',
    remarks:'After update',
    products:[
      { sku:'SKU123', quantity:1, profit_margin:0.12 },
      { sku:'SKU123', quantity:3, profit_margin:0.15 },
      { sku:'SKU789', quantity:2 },
      { sku:'SKU789', quantity:1 }
    ]
  };

  console.log(`\n[UPDATE] Sending PUT /api/orders/${orderId}`);
  resp = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(orderId)}`, {method:'PUT', headers, body:JSON.stringify(updatePayload)});
  data = await resp.json();
  console.log('[UPDATE] Status:', resp.status, 'Order ID:', data.order_id, 'Lines:', data.products?.length);
  if(resp.status!==200){
    console.error('[UPDATE] Failed payload:', data);
    return;
  }

  // 3. Fetch products to verify
  console.log(`\n[VERIFY] GET /api/orders/${orderId}/products`);
  resp = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(orderId)}/products`, {headers});
  data = await resp.json();
  console.log('[VERIFY] Status:', resp.status, 'Lines returned:', data.products?.length);
  console.log('[VERIFY] Lines detail:', data.products);
}

run().catch(e=>{ console.error('Integration test error:', e); process.exit(1); });
