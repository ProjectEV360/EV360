/**
 * Master catalog of electric cars officially on sale in India.
 * Last updated: October 2026
 *
 * Sourced and verified against official manufacturer websites, ARAI/MIDC certifications,
 * and reliable automotive registries (CarWale, CarDekho, Autocar India).
 *
 * Excludes:
 * - Discontinued models (e.g. Hyundai Kona Electric, Jaguar I-Pace)
 * - Concept cars & unannounced future releases (e.g. Lamborghini Lanzador, Tata Sierra EV)
 * - Plug-in hybrids (PHEVs)
 */

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  name: string;
  connector_types: string[];
  max_charge_kw: number;
  make: string; // Alias for backward compatibility with Vehicle type
}

export const LAST_UPDATED = "2026-10-16";

export const VEHICLES: VehicleModel[] = [
  // --- Tata Motors ---
  {
    id: "tata-tiago-ev",
    brand: "Tata",
    model: "Tiago EV",
    name: "Tata Tiago EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 24,
  },
  {
    id: "tata-tigor-ev",
    brand: "Tata",
    model: "Tigor EV",
    name: "Tata Tigor EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 25,
  },
  {
    id: "tata-punch-ev",
    brand: "Tata",
    model: "Punch EV",
    name: "Tata Punch EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 50,
  },
  {
    id: "tata-nexon-ev",
    brand: "Tata",
    model: "Nexon EV",
    name: "Tata Nexon EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 50,
  },
  {
    id: "tata-curvv-ev",
    brand: "Tata",
    model: "Curvv EV",
    name: "Tata Curvv EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 70,
  },
  {
    id: "tata-harrier-ev",
    brand: "Tata",
    model: "Harrier EV",
    name: "Tata Harrier EV",
    make: "Tata",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 100,
  },

  // --- Mahindra ---
  {
    id: "mahindra-xuv-3xo-ev",
    brand: "Mahindra",
    model: "XUV 3XO EV",
    name: "Mahindra XUV 3XO EV",
    make: "Mahindra",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 50,
  },
  {
    id: "mahindra-xuv400",
    brand: "Mahindra",
    model: "XUV400",
    name: "Mahindra XUV400",
    make: "Mahindra",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 50,
  },
  {
    id: "mahindra-be-6",
    brand: "Mahindra",
    model: "BE 6",
    name: "Mahindra BE 6",
    make: "Mahindra",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 175,
  },
  {
    id: "mahindra-xev-9e",
    brand: "Mahindra",
    model: "XEV 9e",
    name: "Mahindra XEV 9e",
    make: "Mahindra",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 175,
  },

  // --- MG Motor ---
  {
    id: "mg-comet-ev",
    brand: "MG",
    model: "Comet EV",
    name: "MG Comet EV",
    make: "MG",
    connector_types: ["Type 2"],
    max_charge_kw: 7.4,
  },
  {
    id: "mg-windsor-ev",
    brand: "MG",
    model: "Windsor EV",
    name: "MG Windsor EV",
    make: "MG",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 45,
  },
  {
    id: "mg-zs-ev",
    brand: "MG",
    model: "ZS EV",
    name: "MG ZS EV",
    make: "MG",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 76,
  },
  {
    id: "mg-m9-ev",
    brand: "MG",
    model: "M9 EV",
    name: "MG M9 EV",
    make: "MG",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 120,
  },
  {
    id: "mg-cyberster",
    brand: "MG",
    model: "Cyberster",
    name: "MG Cyberster",
    make: "MG",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 140,
  },

  // --- Hyundai ---
  {
    id: "hyundai-creta-electric",
    brand: "Hyundai",
    model: "Creta Electric",
    name: "Hyundai Creta Electric",
    make: "Hyundai",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 100,
  },
  {
    id: "hyundai-ioniq-5",
    brand: "Hyundai",
    model: "Ioniq 5",
    name: "Hyundai Ioniq 5",
    make: "Hyundai",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 220,
  },

  // --- Kia ---
  {
    id: "kia-ev6",
    brand: "Kia",
    model: "EV6",
    name: "Kia EV6",
    make: "Kia",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 240,
  },
  {
    id: "kia-ev9",
    brand: "Kia",
    model: "EV9",
    name: "Kia EV9",
    make: "Kia",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 350,
  },

  // --- BYD ---
  {
    id: "byd-atto-3",
    brand: "BYD",
    model: "Atto 3",
    name: "BYD Atto 3",
    make: "BYD",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 88,
  },
  {
    id: "byd-seal",
    brand: "BYD",
    model: "Seal",
    name: "BYD Seal",
    make: "BYD",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },
  {
    id: "byd-emax-7",
    brand: "BYD",
    model: "eMAX 7",
    name: "BYD eMAX 7",
    make: "BYD",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 115,
  },
  {
    id: "byd-sealion-7",
    brand: "BYD",
    model: "Sealion 7",
    name: "BYD Sealion 7",
    make: "BYD",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },

  // --- Maruti Suzuki ---
  {
    id: "maruti-suzuki-e-vitara",
    brand: "Maruti Suzuki",
    model: "e Vitara",
    name: "Maruti Suzuki e Vitara",
    make: "Maruti Suzuki",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },

  // --- Citroën ---
  {
    id: "citroen-e-c3",
    brand: "Citroën",
    model: "ë-C3",
    name: "Citroën ë-C3",
    make: "Citroën",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 30,
  },

  // --- PMV Electric ---
  {
    id: "pmv-eas-e",
    brand: "PMV",
    model: "EaS-E",
    name: "PMV EaS-E",
    make: "PMV",
    connector_types: ["Type 2"],
    max_charge_kw: 3.3,
  },

  // --- Tesla ---
  {
    id: "tesla-model-y",
    brand: "Tesla",
    model: "Model Y",
    name: "Tesla Model Y",
    make: "Tesla",
    connector_types: ["Tesla/NACS", "CCS2", "Type 2"],
    max_charge_kw: 250,
  },

  // --- BMW ---
  {
    id: "bmw-ix1",
    brand: "BMW",
    model: "iX1",
    name: "BMW iX1",
    make: "BMW",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 130,
  },
  {
    id: "bmw-i4",
    brand: "BMW",
    model: "i4",
    name: "BMW i4",
    make: "BMW",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 205,
  },
  {
    id: "bmw-i5",
    brand: "BMW",
    model: "i5",
    name: "BMW i5",
    make: "BMW",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 205,
  },
  {
    id: "bmw-i7",
    brand: "BMW",
    model: "i7",
    name: "BMW i7",
    make: "BMW",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 195,
  },
  {
    id: "bmw-ix",
    brand: "BMW",
    model: "iX",
    name: "BMW iX",
    make: "BMW",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 195,
  },

  // --- Mercedes-Benz ---
  {
    id: "mercedes-benz-eqa",
    brand: "Mercedes-Benz",
    model: "EQA",
    name: "Mercedes-Benz EQA",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 100,
  },
  {
    id: "mercedes-benz-eqb",
    brand: "Mercedes-Benz",
    model: "EQB",
    name: "Mercedes-Benz EQB",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 100,
  },
  {
    id: "mercedes-benz-eqe-suv",
    brand: "Mercedes-Benz",
    model: "EQE SUV",
    name: "Mercedes-Benz EQE SUV",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 170,
  },
  {
    id: "mercedes-benz-eqs",
    brand: "Mercedes-Benz",
    model: "EQS",
    name: "Mercedes-Benz EQS",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 200,
  },
  {
    id: "mercedes-benz-eqs-suv",
    brand: "Mercedes-Benz",
    model: "EQS SUV",
    name: "Mercedes-Benz EQS SUV",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 200,
  },
  {
    id: "mercedes-maybach-eqs-suv",
    brand: "Mercedes-Benz",
    model: "Maybach EQS SUV",
    name: "Mercedes-Maybach EQS SUV",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 200,
  },
  {
    id: "mercedes-benz-g-580",
    brand: "Mercedes-Benz",
    model: "G 580 with EQ Technology",
    name: "Mercedes-Benz G 580 with EQ Technology",
    make: "Mercedes-Benz",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 200,
  },

  // --- Audi ---
  {
    id: "audi-q8-e-tron",
    brand: "Audi",
    model: "Q8 e-tron",
    name: "Audi Q8 e-tron",
    make: "Audi",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 170,
  },
  {
    id: "audi-q8-sportback-e-tron",
    brand: "Audi",
    model: "Q8 Sportback e-tron",
    name: "Audi Q8 Sportback e-tron",
    make: "Audi",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 170,
  },
  {
    id: "audi-e-tron-gt",
    brand: "Audi",
    model: "e-tron GT",
    name: "Audi e-tron GT",
    make: "Audi",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 270,
  },
  {
    id: "audi-rs-e-tron-gt",
    brand: "Audi",
    model: "RS e-tron GT",
    name: "Audi RS e-tron GT",
    make: "Audi",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 270,
  },

  // --- Porsche ---
  {
    id: "porsche-macan-ev",
    brand: "Porsche",
    model: "Macan EV",
    name: "Porsche Macan EV",
    make: "Porsche",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 270,
  },
  {
    id: "porsche-taycan",
    brand: "Porsche",
    model: "Taycan",
    name: "Porsche Taycan",
    make: "Porsche",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 270,
  },

  // --- Volvo ---
  {
    id: "volvo-ex30",
    brand: "Volvo",
    model: "EX30",
    name: "Volvo EX30",
    make: "Volvo",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 153,
  },
  {
    id: "volvo-ec40",
    brand: "Volvo",
    model: "EC40",
    name: "Volvo EC40",
    make: "Volvo",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },
  {
    id: "volvo-ex40",
    brand: "Volvo",
    model: "EX40",
    name: "Volvo EX40",
    make: "Volvo",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },
  {
    id: "volvo-ex90",
    brand: "Volvo",
    model: "EX90",
    name: "Volvo EX90",
    make: "Volvo",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 250,
  },

  // --- MINI ---
  {
    id: "mini-cooper-se",
    brand: "MINI",
    model: "Cooper SE",
    name: "MINI Cooper SE",
    make: "MINI",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 95,
  },
  {
    id: "mini-countryman-electric",
    brand: "MINI",
    model: "Countryman Electric",
    name: "MINI Countryman Electric",
    make: "MINI",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 130,
  },

  // --- Lotus ---
  {
    id: "lotus-eletre",
    brand: "Lotus",
    model: "Eletre",
    name: "Lotus Eletre",
    make: "Lotus",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 350,
  },
  {
    id: "lotus-emeya",
    brand: "Lotus",
    model: "Emeya",
    name: "Lotus Emeya",
    make: "Lotus",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 350,
  },

  // --- Maserati ---
  {
    id: "maserati-grecale-folgore",
    brand: "Maserati",
    model: "Grecale Folgore",
    name: "Maserati Grecale Folgore",
    make: "Maserati",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 150,
  },

  // --- Rolls-Royce ---
  {
    id: "rolls-royce-spectre",
    brand: "Rolls-Royce",
    model: "Spectre",
    name: "Rolls-Royce Spectre",
    make: "Rolls-Royce",
    connector_types: ["CCS2", "Type 2"],
    max_charge_kw: 195,
  },
];

/**
 * Filter vehicles by brand or model name, case-insensitively, ignoring extra whitespace.
 */
export function searchVehicles(query: string, list: VehicleModel[] = VEHICLES): VehicleModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((v) => {
    const brandMatch = v.brand.toLowerCase().includes(q);
    const modelMatch = v.model.toLowerCase().includes(q);
    const nameMatch = v.name.toLowerCase().includes(q);
    return brandMatch || modelMatch || nameMatch;
  });
}

/**
 * Group vehicles by brand for structured display.
 */
export function groupVehiclesByBrand(
  list: VehicleModel[] = VEHICLES,
): { brand: string; vehicles: VehicleModel[] }[] {
  const groups: Record<string, VehicleModel[]> = {};
  const brandOrder: string[] = [];

  for (const v of list) {
    if (!groups[v.brand]) {
      groups[v.brand] = [];
      brandOrder.push(v.brand);
    }
    groups[v.brand]!.push(v);
  }

  return brandOrder.map((brand) => ({
    brand,
    vehicles: groups[brand] ?? [],
  }));
}
