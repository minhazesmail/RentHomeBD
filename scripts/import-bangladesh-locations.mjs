// Rebuild the vendored catalog. Network is needed only when updating the data.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const revision = '1731ee8585a32ad62f5c898f8e8e3f7659b1aa5a';
const base = `https://raw.githubusercontent.com/open-admin-data/bangladesh-administrative-divisions/${revision}`;
const [districts, upazilas] = await Promise.all(['district', 'upazila'].map(async level => {
  const response = await fetch(`${base}/data/all-${level}.json`);
  if (!response.ok) throw new Error(`Catalog download failed: ${response.status}`);
  return response.json();
}));
assert.equal(districts.length, 64);
assert.equal(upazilas.length, 495);

// Common historical spellings remain searchable, including in qualified upazila names.
const alternatives = {
  Chattogram: ['Chittagong'], Cumilla: ['Comilla'], Jashore: ['Jessore'],
  Bogura: ['Bogra'], Barishal: ['Barisal'], Chapainababganj: ['Chapainawabganj', 'Chapai Nawabganj'],
  Moulvibazar: ['Moulvibazaar', 'Maulvibazar'], Netrakona: ['Netrokona'],
  "Cox's Bazar": ['Coxs Bazar', 'Cox Bazar'],
};
const records = [...districts, ...upazilas].map(record => {
  const district = record.level === 2 ? record : districts.find(item => item.id === record.parent.id);
  assert.ok(district, `Missing district: ${record.id}`);
  const label = record.level === 2 ? record.name.en : `${record.name.en}, ${district.name.en}`;
  const labelBn = record.level === 2 ? record.name.local : `${record.name.local}, ${district.name.local}`;
  const aliases = record.level === 2 ? [...(alternatives[label] ?? []), `${label} district`, `${labelBn} জেলা`] :
    [record.name.en, record.name.local, `${record.name.en} upazila`, `${record.name.local} উপজেলা`,
      ...(alternatives[district.name.en] ?? []).map(name => `${record.name.en}, ${name}`)];
  if (record.name.en === 'Indurkani') aliases.push('Zianagar', 'জিয়ানগর');
  if (record.name.en === 'Nababganj') aliases.push('Nawabganj', `Nawabganj, ${district.name.en}`);
  if (record.name.en === 'Nawabganj') aliases.push('Nababganj', `Nababganj, ${district.name.en}`);
  return { id: record.id, kind: record.level === 2 ? 'district' : 'upazila', label, labelBn,
    district: district.name.en, division: district.parent.name.en,
    latitude: Number(record.geo.lat), longitude: Number(record.geo.lon), aliases };
});

// Newly approved units missing from the pinned baseline. IDs below are internal,
// not invented government codes. Coordinates are nearby settlement search centers.
// Source/coordinate references and limitations: docs/location-coverage.md.
const additions = [
  ['Mokamtala', 'মোকামতলা', 'Bogura', 25.01379, 89.35595, ['Mokamtola']],
  ['Matamuhuri', 'মাতামুহুরী', "Cox's Bazar", 21.77472, 91.99361, []],
  ['Ruhea', 'রুহিয়া', 'Thakurgaon', 26.169, 88.40812, ['Ruhia']],
  ['Bhully', 'ভুল্লী', 'Thakurgaon', 26.13041, 88.53665, ['Bhulli', 'ভুল্লি']],
  ['Chandraganj', 'চন্দ্রগঞ্জ', 'Lakshmipur', 22.95134, 90.98054, ['Chandrogonj']],
  ['Fatikchhari Uttar', 'ফটিকছড়ি উত্তর', 'Chattogram', 22.74861, 91.74389, ['North Fatikchhari', 'উত্তর ফটিকছড়ি']],
  ['Bangara', 'বাঙ্গরা', 'Cumilla', 23.78333, 90.98333, ['Bangora']],
  ['Dakshin Gafargaon', 'দক্ষিণ গফরগাঁও', 'Mymensingh', 24.33102, 90.57711, ['South Gafargaon']],
];
for (const [name, bn, districtName, latitude, longitude, aliases] of additions) {
  const district = districts.find(item => item.name.en === districtName);
  assert.ok(district);
  records.push({ id: `approved-2026-${name.toLowerCase().replaceAll(' ', '-')}`, kind: 'upazila',
    label: `${name}, ${districtName}`, labelBn: `${bn}, ${district.name.local}`,
    district: districtName, division: district.parent.name.en, latitude, longitude,
    aliases: [name, bn, ...aliases, `${name} upazila`, `${bn} উপজেলা`,
      ...(alternatives[districtName] ?? []).map(value => `${name}, ${value}`)] });
}
assert.equal(new Set(records.map(record => record.id)).size, records.length);
for (const record of records) {
  assert.ok(record.latitude >= 20.5 && record.latitude <= 26.7 && record.longitude >= 88 && record.longitude <= 92.7, record.label);
}
await writeFile(new URL('../src/lib/bangladesh-locations.json', import.meta.url),
  '[\n' + records.map(record => '  ' + JSON.stringify(record)).join(',\n') + '\n]\n');
console.log(`Imported ${districts.length} districts and ${upazilas.length + additions.length} upazila search centers.`);
