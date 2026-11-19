import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldBankRecordMap } from './_shared.mjs';

test('selects latest valid year, keeps zero, excludes aggregates and invalid observations', () => {
  const records = [
    { countryiso3code: 'HRV', date: '2022', value: 20 },
    { countryiso3code: 'HRV', date: '2024', value: 0 },
    { countryiso3code: 'HRV', date: '2025', value: null },
    { countryiso3code: 'HRV', date: 'not-a-year', value: 50 },
    { countryiso3code: 'BIH', date: '2024', value: Infinity },
    { countryiso3code: 'BIH', date: '2023', value: -1 },
    { countryiso3code: 'WLD', date: '2024', value: 1000 },
  ];
  const result = buildWorldBankRecordMap(records, new Set(['HRV', 'BIH']));
  assert.deepEqual([...result], [['HRV', { date: 2024, value: 0 }]]);
});
