import { memo, useMemo, useState } from 'react';
import type { BordersCountryIndexRecord } from '../lib/bordersData';
import {
  buildGeographyCatalog,
  countryDestination,
  GEOGRAPHIC_SCOPES,
  scopeDestination,
  searchCountries,
  type GeographicScopeId,
  type GeographyDestination,
} from '../lib/geography';
import { useGeographyStore } from '../state/geographyStore';

export const CountryExplorer = memo(function CountryExplorer({
  countryIndex,
  onNavigate,
  disabled = false,
}: {
  countryIndex: BordersCountryIndexRecord[] | null;
  onNavigate: (destination: GeographyDestination) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const { scope, selectedIso, notice, setScope, selectCountry } =
    useGeographyStore();
  const countries = useMemo(
    () => buildGeographyCatalog(countryIndex ?? []),
    [countryIndex],
  );
  const results = searchCountries(countries, scope, query);
  const selected = countries.find((country) => country.iso3 === selectedIso);

  return (
    <section
      className="hud-card country-explorer"
      aria-label="Geography explorer"
    >
      <div className="hud-card__header">
        <span className="panel-kicker">Explore geography</span>
      </div>
      <label className="field">
        <span>Geographic scope</span>
        <select
          value={scope}
          disabled={disabled}
          onChange={(event) => {
            const nextScope = event.target.value as GeographicScopeId;
            setScope(nextScope);
            setQuery('');
            onNavigate(scopeDestination(nextScope));
          }}
        >
          {Object.entries(GEOGRAPHIC_SCOPES).map(([id, definition]) => (
            <option key={id} value={id}>
              {definition.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Find a country</span>
        <input
          type="search"
          value={query}
          placeholder="Name or country code"
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="telemetry-note" aria-live="polite">
        {results.length} countries in results.{notice ? ` ${notice}` : ''}
      </p>
      {!countryIndex ? (
        <p className="telemetry-note">
          Boundary catalog unavailable or loading. Regional names remain
          searchable; administrative coverage is unverified.
        </p>
      ) : null}
      {results.length === 0 ? (
        <p className="telemetry-note">No matching countries in this scope.</p>
      ) : null}
      <ul className="country-explorer__results" aria-label="Country results">
        {results.map((country) => (
          <li key={country.iso3}>
            <button
              className="secondary-button"
              type="button"
              disabled={disabled}
              aria-pressed={selectedIso === country.iso3}
              onClick={() => {
                selectCountry(country.iso3);
                const destination = countryDestination(country);
                if (destination) onNavigate(destination);
              }}
            >
              {country.name} <small>{country.iso3}</small>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="country-explorer__coverage" role="status">
          <strong>{selected.name}</strong>
          <p>
            {selected.geometry
              ? 'Globe outline available.'
              : 'No bundled globe outline; camera unchanged.'}
          </p>
          <p>
            {selected.sourceIds.borders
              ? `Regional boundaries: ${selected.hasAdm1 ? 'available' : 'unavailable'}. District boundaries: ${selected.hasAdm2 ? 'available' : 'unavailable'}.`
              : 'Administrative coverage unverified.'}
          </p>
          <p>Data availability varies by indicator.</p>
        </div>
      ) : null}
      <p className="telemetry-note">
        Scopes filter this catalog, not map boundaries. Whole-country records;
        coverage varies.
      </p>
    </section>
  );
});
