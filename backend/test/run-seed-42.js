const { resolve } = require('path');
const rootPath = resolve(__dirname, '..', '..', 'node_modules', '@prisma', 'client');
const { PrismaClient, UserType } = require(rootPath);
const bcrypt = require('bcrypt');

async function run() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('Provider123!', 10);
  const regionMU = await prisma.region.findFirst({ where: { countryCode: 'MU' } });

  const providers = [
    { id: 'DENT-MU-001', fn: 'Anil', ln: 'Doorgakant', email: 'anil.doorgakant@mediwyz.com', type: 'DENTIST' },
    { id: 'DENT-MU-002', fn: 'Marie', ln: 'Collet', email: 'marie.collet@mediwyz.com', type: 'DENTIST' },
    { id: 'DENT-MU-003', fn: 'Raj', ln: 'Seetaram', email: 'raj.seetaram@mediwyz.com', type: 'DENTIST' },
    { id: 'OPT-MU-001', fn: 'Leena', ln: 'Dorasami', email: 'leena.dorasami@mediwyz.com', type: 'OPTOMETRIST' },
    { id: 'OPT-MU-002', fn: 'Nicolas', ln: 'Begue', email: 'nicolas.begue@mediwyz.com', type: 'OPTOMETRIST' },
    { id: 'NUT-MU-001', fn: 'Kavita', ln: 'Guddhoo', email: 'kavita.guddhoo@mediwyz.com', type: 'NUTRITIONIST' },
    { id: 'NUT-MU-002', fn: 'Fabien', ln: 'Laval', email: 'fabien.laval@mediwyz.com', type: 'NUTRITIONIST' },
    { id: 'PHY-MU-001', fn: 'Ashvin', ln: 'Doobary', email: 'ashvin.doobary@mediwyz.com', type: 'PHYSIOTHERAPIST' },
    { id: 'PHY-MU-002', fn: 'Nathalie', ln: 'Figaro', email: 'nathalie.figaro@mediwyz.com', type: 'PHYSIOTHERAPIST' },
    { id: 'CARE-MU-001', fn: 'Deepa', ln: 'Ramnauth', email: 'deepa.ramnauth@mediwyz.com', type: 'CAREGIVER' },
    { id: 'CARE-MU-002', fn: 'Thierry', ln: 'Cure', email: 'thierry.cure@mediwyz.com', type: 'CAREGIVER' },
  ];

  let pc = 0;
  for (const p of providers) {
    const ex = await prisma.user.findUnique({ where: { email: p.email } });
    if (ex) { continue; }
    await prisma.user.create({ data: { id: p.id, firstName: p.fn, lastName: p.ln, email: p.email, password: hash, phone: '+230-5' + Math.floor(Math.random()*9000000+1000000), userType: p.type, accountStatus: 'active', verified: true, address: 'Mauritius', gender: 'Male', regionId: regionMU?.id } });
    const pd = { userId: p.id, experience: 5+Math.floor(Math.random()*10), specializations: ['General'] };
    if (p.type==='DENTIST') await prisma.dentistProfile.create({data:{...pd,licenseNumber:'DN-'+p.id,clinicName:'Dental Clinic'}});
    else if (p.type==='OPTOMETRIST') await prisma.optometristProfile.create({data:{...pd,licenseNumber:'OP-'+p.id,clinicName:'Eye Clinic'}});
    else if (p.type==='NUTRITIONIST') await prisma.nutritionistProfile.create({data:{...pd,certifications:['Certified']}});
    else if (p.type==='PHYSIOTHERAPIST') await prisma.physiotherapistProfile.create({data:{...pd,licenseNumber:'PT-'+p.id,clinicName:'Physio Center'}});
    else if (p.type==='CAREGIVER') await prisma.caregiverProfile.create({data:{...pd,certifications:['First Aid']}});
    await prisma.userWallet.create({data:{userId:p.id,balance:5000,currency:'MUR',initialCredit:5000}}).catch(()=>{});
    pc++; console.log('  +', p.type, p.fn, p.ln);
  }
  console.log('Providers created:', pc);

  const items = [
    {uid:'DENT-MU-001',type:'DENTIST',name:'Teeth Whitening Kit',cat:'Dental Care',price:1500,qty:25},
    {uid:'DENT-MU-001',type:'DENTIST',name:'Dental Night Guard',cat:'Dental Appliances',price:2500,qty:15},
    {uid:'DENT-MU-001',type:'DENTIST',name:'Antibacterial Mouthwash',cat:'Dental Care',price:350,qty:60},
    {uid:'DENT-MU-002',type:'DENTIST',name:'Kids Fluoride Treatment',cat:'Pediatric Dental',price:800,qty:40},
    {uid:'OPT-MU-001',type:'OPTOMETRIST',name:'Blue Light Blocking Glasses',cat:'Eyewear',price:2000,qty:30},
    {uid:'OPT-MU-001',type:'OPTOMETRIST',name:'Eye Drops (Dry Eye)',cat:'Eye Care',price:350,qty:80},
    {uid:'OPT-MU-001',type:'OPTOMETRIST',name:'Prescription Sunglasses',cat:'Eyewear',price:3500,qty:20,rx:true},
    {uid:'OPT-MU-001',type:'OPTOMETRIST',name:'Daily Contact Lenses (30pk)',cat:'Contact Lenses',price:1200,qty:50,rx:true},
    {uid:'OPT-MU-002',type:'OPTOMETRIST',name:'Progressive Reading Glasses',cat:'Eyewear',price:4500,qty:15,rx:true},
    {uid:'NUT-MU-001',type:'NUTRITIONIST',name:'Protein Supplement (Whey)',cat:'Supplements',price:1500,qty:30},
    {uid:'NUT-MU-001',type:'NUTRITIONIST',name:'Multivitamin Complex',cat:'Supplements',price:600,qty:80},
    {uid:'NUT-MU-001',type:'NUTRITIONIST',name:'Omega-3 Fish Oil',cat:'Supplements',price:700,qty:60},
    {uid:'NUT-MU-001',type:'NUTRITIONIST',name:'Probiotic Capsules',cat:'Supplements',price:550,qty:45},
    {uid:'NUT-MU-002',type:'NUTRITIONIST',name:'Collagen Powder',cat:'Supplements',price:900,qty:35},
    {uid:'NUT-MU-002',type:'NUTRITIONIST',name:'Vitamin D3 Drops',cat:'Supplements',price:400,qty:70},
    {uid:'NUT-MU-002',type:'NUTRITIONIST',name:'Weight Management Shake',cat:'Supplements',price:1200,qty:40},
    {uid:'PHY-MU-001',type:'PHYSIOTHERAPIST',name:'Resistance Band Set',cat:'Rehab Equipment',price:600,qty:40},
    {uid:'PHY-MU-001',type:'PHYSIOTHERAPIST',name:'Foam Roller',cat:'Rehab Equipment',price:800,qty:30},
    {uid:'PHY-MU-001',type:'PHYSIOTHERAPIST',name:'TENS Unit',cat:'Medical Devices',price:3500,qty:10,rx:true},
    {uid:'PHY-MU-001',type:'PHYSIOTHERAPIST',name:'Knee Support Brace',cat:'Orthopedic Supports',price:1200,qty:25},
    {uid:'PHY-MU-001',type:'PHYSIOTHERAPIST',name:'Ice/Heat Pack',cat:'Rehab Equipment',price:300,qty:50},
    {uid:'PHY-MU-002',type:'PHYSIOTHERAPIST',name:'Posture Corrector',cat:'Orthopedic Supports',price:900,qty:25},
    {uid:'PHY-MU-002',type:'PHYSIOTHERAPIST',name:'Wrist Splint',cat:'Orthopedic Supports',price:700,qty:20},
    {uid:'CARE-MU-001',type:'CAREGIVER',name:'Blood Pressure Monitor',cat:'Home Medical',price:2000,qty:15},
    {uid:'CARE-MU-001',type:'CAREGIVER',name:'Pulse Oximeter',cat:'Home Medical',price:800,qty:30},
    {uid:'CARE-MU-001',type:'CAREGIVER',name:'Walking Aid (Foldable)',cat:'Mobility Aids',price:1500,qty:10},
    {uid:'CARE-MU-001',type:'CAREGIVER',name:'Pill Organizer (Weekly)',cat:'Personal Care',price:200,qty:50},
    {uid:'CARE-MU-002',type:'CAREGIVER',name:'Adult Incontinence Pads',cat:'Personal Care',price:450,qty:60},
  ];

  let ic = 0;
  for (const i of items) {
    const ex = await prisma.providerInventoryItem.findFirst({where:{providerUserId:i.uid,name:i.name}});
    if (ex) continue;
    await prisma.providerInventoryItem.create({data:{providerUserId:i.uid,providerType:i.type,name:i.name,category:i.cat,price:i.price,currency:'MUR',quantity:i.qty,unitOfMeasure:'unit',minStockAlert:5,requiresPrescription:!!i.rx,inStock:true,isActive:true,isFeatured:Math.random()>0.6}});
    ic++;
  }
  console.log('Inventory items created:', ic);

  // Check final counts
  const [users, inv] = await Promise.all([
    prisma.user.count({where:{accountStatus:'active'}}),
    prisma.providerInventoryItem.count({where:{isActive:true,inStock:true}}),
  ]);
  console.log('Total active users:', users);
  console.log('Total inventory items:', inv);

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
