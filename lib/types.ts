export interface Vessel {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;       // knots
  course: number;      // degrees
  heading: number;     // degrees
  shipType: number;    // AIS ship type code
  flag: string;        // ISO country code
  length?: number;
  width?: number;
  destination?: string;
  eta?: string;
  lastUpdate: number;  // unix ms
  vesselType?: number;
  vesselTypeLabel?: string;
  isTanker?: boolean;
  imo?: number;
  draught?: number;
  direction?: string;
}

export interface AISData {
  connected: boolean;
  count: number;
  vessels: Vessel[];
  error?: string;
}

export interface TransitDay {
  date: string;
  total: number;
  tanker: number;
  container: number;
  dry_bulk: number;
  cargo: number;
  capacity_tanker: number;
  capacity_total: number;
}

export interface PricePoint {
  date: string;
  brent: number | null;
  wti: number | null;
}

export interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
}

export interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  windMax: number;
  gustMax: number;
  precip: number;
  windWarning: boolean;
}

// Map highlight filter — which vessels to flash on the map
export type VesselFilter = "inStrait" | "approaching" | "anchored" | "darkShips" | null;

// Derived metrics computed from raw data
export interface DashboardMetrics {
  daysSinceClosure: number;
  shipsInStrait: number;
  shipsApproaching: number;
  vesselsAtAnchor: number;
  brentPrice: number | null;
  brentChange: number | null;
  wtiPrice: number | null;
  wtiChange: number | null;
  oilSpikePct: number | null;
  economicCostBillions: number;
  straitStatus: "CLOSED" | "RESTRICTED" | "OPEN";
  transitToday: number | null;
  transit90dAvg: number | null;
}

// Carrier Strike Group types
export type CarrierStatus = "deployed" | "en_route" | "in_port";

export interface Carrier {
  hull: string;
  name: string;
  lat: number;
  lng: number;
  status: CarrierStatus;
  desc: string;
  mission?: string;
  wiki?: string;
  source: string;
  sourceUrl?: string;
  lastUpdate: string;
  estimated: boolean;
}

export interface CarrierData {
  carriers: Carrier[];
  cached: boolean;
  stale?: boolean;
  fallbackOnly?: boolean;
  lastGdeltFetch?: string;
  error?: string;
}
