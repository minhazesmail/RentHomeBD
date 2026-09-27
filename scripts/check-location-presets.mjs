import assert from 'node:assert/strict';
import { LOCATION_PRESETS, resolveLocationPreset, resolveExactLocationPreset, normalizeLocationQuery, searchLocationPresets, describeMapCenter } from '../src/lib/location-presets.ts';
import administrative from '../src/lib/bangladesh-locations.json' with { type: 'json' };

const aliasOwners = new Map();
for (const preset of LOCATION_PRESETS) for (const value of [preset.label, preset.labelBn, ...(preset.aliases ?? [])].filter(Boolean)) {
  const key = normalizeLocationQuery(value);
  if (!aliasOwners.has(key)) aliasOwners.set(key, new Set());
  aliasOwners.get(key).add(preset);
}

for (const preset of LOCATION_PRESETS) {
  assert.equal(resolveLocationPreset(preset.label), preset, `Canonical round trip: ${preset.label}`);
  assert.equal(searchLocationPresets(preset.label)[0], preset);
  assert.ok(Number.isFinite(preset.latitude) && Number.isFinite(preset.longitude));
  if (preset.labelBn) assert.equal(resolveExactLocationPreset(preset.labelBn), preset, preset.labelBn);
  for (const alias of preset.aliases ?? []) {
    const canonical = LOCATION_PRESETS.find(item => [item.label, item.labelBn].filter(Boolean).some(label => normalizeLocationQuery(label) === normalizeLocationQuery(alias)));
    const expected = canonical ?? (aliasOwners.get(normalizeLocationQuery(alias)).size === 1 ? preset : undefined);
    assert.equal(resolveLocationPreset(alias), expected, alias);
  }
}
assert.equal(new Set(LOCATION_PRESETS.map(p => p.label)).size, LOCATION_PRESETS.length);
for (const city of ['Dhaka', 'Narayanganj', 'Narsingdi', 'Gazipur']) {
  assert.equal(searchLocationPresets(city)[0].label, city, 'City exact match precedes its neighborhoods');
}
for (const [query, label] of [
  ['Gazipur Chowrasta', 'Gazipur Chowrasta'],
  ['House 12, Board Bazar, Gazipur', 'Board Bazar, Gazipur'],
  ['Road 4, Dhanmondi, Dhaka', 'Dhanmondi, Dhaka'],
  ['নারায়ণগঞ্জ', 'Narayanganj'],
  ['নরসিংদী', 'Narsingdi'],
  ['গাজীপুর', 'Gazipur'],
  ['board baz', 'Board Bazar, Gazipur'],
  ['gazipur board', 'Board Bazar, Gazipur'],
  ['Chittagong Road', 'Shimrail, Narayanganj'],
  ['DU', 'Dhaka University'],
]) assert.equal(resolveLocationPreset(query)?.label, label, query);
for (const query of ['', '   ', '!!!', 'Dubai', 'DUET', 'unsupported neighborhood']) {
  assert.equal(resolveLocationPreset(query), undefined, `No false match: ${query}`);
}
assert.equal(describeMapCenter(0, 0), 'Custom map area');
const districts = administrative.filter(record => record.kind === 'district');
const upazilas = administrative.filter(record => record.kind === 'upazila');
assert.equal(districts.length, 64);
assert.equal(upazilas.length, 503); // 495 baseline plus eight approved in 2026; see coverage notes.
assert.equal(new Set(districts.map(record => record.division)).size, 8);
assert.equal(new Set(administrative.map(record => record.id)).size, administrative.length);
for (const district of districts) assert.ok(upazilas.some(record => record.district === district.label), district.label);
for (const record of administrative) {
  assert.ok(districts.some(district => district.label === record.district && district.division === record.division), record.label);
  assert.ok(record.latitude >= 20.5 && record.latitude <= 26.7 && record.longitude >= 88 && record.longitude <= 92.7, record.label);
  assert.equal(resolveExactLocationPreset(record.label)?.id, record.id);
}
for (const name of ['Kaliganj', 'Nawabganj', 'Mirpur', 'কালীগঞ্জ']) {
  assert.ok(searchLocationPresets(name).length > 1, name);
  assert.equal(resolveLocationPreset(name), undefined, `Ambiguous: ${name}`);
}
for (const query of ['Kaliganj, Gazipur', 'Kaliganj, Satkhira', 'Mirpur, Kushtia', 'Teknaf, Cox’s Bazar', 'Bogra', 'Comilla', 'Jessore']) {
  assert.ok(resolveLocationPreset(query), query);
}
assert.equal(resolveLocationPreset('House 5, Kaliganj'), undefined);
assert.equal(resolveLocationPreset('House 5, Kaliganj, Satkhira')?.label, 'Kaliganj, Satkhira');
console.log(`PASS ${LOCATION_PRESETS.length} places: 64 districts, 503 upazila centers, hierarchy, bilingual aliases, ambiguity, addresses and legacy ranking`);
