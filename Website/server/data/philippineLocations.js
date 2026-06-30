const regions = [
  { code: '010000000', name: 'Region I (Ilocos Region)' },
  { code: '020000000', name: 'Region II (Cagayan Valley)' },
  { code: '030000000', name: 'Region III (Central Luzon)' },
  { code: '040000000', name: 'Region IV-A (CALABARZON)' },
  { code: '170000000', name: 'MIMAROPA Region' },
  { code: '050000000', name: 'Region V (Bicol Region)' },
  { code: '060000000', name: 'Region VI (Western Visayas)' },
  { code: '070000000', name: 'Region VII (Central Visayas)' },
  { code: '080000000', name: 'Region VIII (Eastern Visayas)' },
  { code: '090000000', name: 'Region IX (Zamboanga Peninsula)' },
  { code: '100000000', name: 'Region X (Northern Mindanao)' },
  { code: '110000000', name: 'Region XI (Davao Region)' },
  { code: '120000000', name: 'Region XII (SOCCSKSARGEN)' },
  { code: '130000000', name: 'NCR (National Capital Region)' },
  { code: '140000000', name: 'CAR (Cordillera Administrative Region)' },
  { code: '160000000', name: 'Region XIII (Caraga)' },
  { code: '190000000', name: 'BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)' },
];

const citiesByRegion = {
  '130000000': [
    { code: '133900000', name: 'City of Manila' },
    { code: '137401000', name: 'Caloocan City' },
    { code: '137402000', name: 'City of Las Pinas' },
    { code: '137602000', name: 'City of Makati' },
    { code: '137502000', name: 'City of Malabon' },
    { code: '137401100', name: 'City of Mandaluyong' },
    { code: '137401200', name: 'City of Marikina' },
    { code: '137603000', name: 'City of Muntinlupa' },
    { code: '137503000', name: 'City of Navotas' },
    { code: '137604000', name: 'City of Paranaque' },
    { code: '137605000', name: 'Pasay City' },
    { code: '137606000', name: 'Pasig City' },
    { code: '137404000', name: 'Quezon City' },
    { code: '137405000', name: 'City of San Juan' },
    { code: '137607000', name: 'Taguig City' },
    { code: '137504000', name: 'City of Valenzuela' },
    { code: '137601000', name: 'Pateros' },
  ],
};

const barangaysByCity = {
  '137607000': [
    { code: '137607001', name: 'Bagumbayan' }, { code: '137607002', name: 'Bambang' },
    { code: '137607003', name: 'Calzada' }, { code: '137607004', name: 'Central Bicutan' },
    { code: '137607005', name: 'Central Signal Village' }, { code: '137607006', name: 'Fort Bonifacio' },
    { code: '137607007', name: 'Hagonoy' }, { code: '137607008', name: 'Ibayo-Tipas' },
    { code: '137607009', name: 'Katuparan' }, { code: '137607010', name: 'Ligid-Tipas' },
    { code: '137607011', name: 'Lower Bicutan' }, { code: '137607012', name: 'Maharlika Village' },
    { code: '137607013', name: 'Napindan' }, { code: '137607014', name: 'New Lower Bicutan' },
    { code: '137607015', name: 'North Daang Hari' }, { code: '137607016', name: 'North Signal Village' },
    { code: '137607017', name: 'Palingon' }, { code: '137607018', name: 'Pinagsama' },
    { code: '137607019', name: 'San Miguel' }, { code: '137607020', name: 'Santa Ana' },
    { code: '137607021', name: 'South Daang Hari' }, { code: '137607022', name: 'South Signal Village' },
    { code: '137607023', name: 'Tanyag' }, { code: '137607024', name: 'Tuktukan' },
    { code: '137607025', name: 'Upper Bicutan' }, { code: '137607026', name: 'Ususan' },
    { code: '137607027', name: 'Wawa' }, { code: '137607028', name: 'Western Bicutan' },
  ],
};

function isValidRegion(code, name) {
  return regions.some((item) => item.code === code && item.name === name);
}

function isValidCity(regionCode, cityCode, name) {
  const cities = citiesByRegion[regionCode] || [];
  if (!cities.length) return Boolean(cityCode && name);
  return cities.some((item) => item.code === cityCode && item.name === name);
}

function isValidBarangay(cityCode, barangayCode, name) {
  const barangays = barangaysByCity[cityCode] || [];
  if (!barangays.length) return Boolean(barangayCode && name);
  return barangays.some((item) => item.code === barangayCode && item.name === name);
}

module.exports = { regions, citiesByRegion, barangaysByCity, isValidRegion, isValidCity, isValidBarangay };
