import assert from 'node:assert/strict';
import { LOCATION_PRESETS, resolveLocationPreset, searchLocationPresets, describeMapCenter } from '../src/lib/location-presets.ts';

for (const preset of LOCATION_PRESETS) {
  assert.equal(resolveLocationPreset(preset.label), preset, `Canonical round trip: ${preset.label}`);
  assert.equal(searchLocationPresets(preset.label)[0], preset);
  assert.ok(Number.isFinite(preset.latitude) && Number.isFinite(preset.longitude));
  for (const alias of preset.aliases ?? []) assert.equal(resolveLocationPreset(alias), preset, alias);
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
assert.equal(describeMapCenter(24.08, 90.9), 'Custom map area');
console.log(`PASS ${LOCATION_PRESETS.length} locations: canonical/alias round trips, city ranking, addresses, Bangla and unsupported queries`);
