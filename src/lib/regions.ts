// Approximate centre coordinates for each region, keyed by slug. Listings have
// no per-record lat/lng, so the map clusters them at their region's centroid.
export const REGION_CENTROIDS: Record<string, [number, number]> = {
  colombo: [6.9271, 79.8612],
  kandy: [7.2906, 80.6337],
  galle: [6.0535, 80.221],
  ella: [6.8667, 81.0466],
  sigiriya: [7.957, 80.7603],
  "arugam-bay": [6.84, 81.835],
  "nuwara-eliya": [6.9497, 80.7891],
  mirissa: [5.9483, 80.4716],
  anuradhapura: [8.3114, 80.4037],
  jaffna: [9.6615, 80.0255],
  trincomalee: [8.5874, 81.2152],
};

// Centre of the island + a zoom that frames the whole country.
export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const SRI_LANKA_ZOOM = 7;
