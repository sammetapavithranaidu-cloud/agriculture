// Crop and Disease Risk Database for AI FarmGuard
export const CROP_DATABASE = {
  wheat: {
    id: "wheat",
    name: "Wheat",
    icon: "🌾",
    category: "Cereal Grain",
    tempOptimal: { min: 15, max: 24 },
    tempCritical: { max: 32, min: 2 },
    humidityOptimal: { min: 45, max: 70 },
    humidityHighThreshold: 80,
    windMaxSpraying: 15, // km/h
    waterNeedPerWeek: 25, // mm
    stages: ["Sowing", "Vegetative", "Tillering", "Flowering", "Grain Filling", "Harvesting"],
    diseases: [
      {
        id: "rust",
        name: "Stripe & Leaf Rust (Puccinia spp.)",
        symptoms: "Yellow-orange powdery pustules on leaves.",
        triggerConditions: {
          tempRange: [12, 22],
          minHumidity: 75,
          leafWetnessHours: 4,
          description: "Cool, moist weather with high morning humidity favor rust spore germination."
        },
        mitigation: "Apply triazole fungicide during early infection window. Avoid high nitrogen late fertilizing."
      },
      {
        id: "powdery_mildew_wheat",
        name: "Powdery Mildew",
        symptoms: "White fluffy mycelial spots on stems and leaves.",
        triggerConditions: {
          tempRange: [15, 22],
          minHumidity: 80,
          description: "High relative humidity combined with dense foliage creates prime infection conditions."
        },
        mitigation: "Spray systemic sulfur/tebuconazole. Ensure row spacing for canopy aeration."
      },
      {
        id: "fusarium_head_blight",
        name: "Fusarium Head Blight",
        symptoms: "Bleached spikelets, pinkish fungal mass.",
        triggerConditions: {
          tempRange: [20, 28],
          minHumidity: 85,
          minRainfallChance: 60,
          description: "Warm, rainy periods during flowering (anthesis) lead to severe head rot."
        },
        mitigation: "Apply protective fungicide 2-4 days prior to rain event during flowering."
      }
    ]
  },

  rice: {
    id: "rice",
    name: "Paddy Rice",
    icon: "🌾",
    category: "Cereal Grain",
    tempOptimal: { min: 22, max: 32 },
    tempCritical: { max: 38, min: 12 },
    humidityOptimal: { min: 65, max: 85 },
    humidityHighThreshold: 88,
    windMaxSpraying: 14,
    waterNeedPerWeek: 50, // mm
    stages: ["Nursery", "Tillering", "Panicle Initiation", "Flowering", "Milking", "Harvesting"],
    diseases: [
      {
        id: "blast",
        name: "Rice Blast (Magnaporthe oryzae)",
        symptoms: "Spindle-shaped leaf lesions, neck rot causing whiteheads.",
        triggerConditions: {
          tempRange: [20, 28],
          minHumidity: 85,
          leafWetnessHours: 8,
          description: "Overcast skies, high relative humidity (>85%), and night temperatures around 20-24°C."
        },
        mitigation: "Maintain standing water depth. Spray Tricyclazole 75% WP before panicle emergence."
      },
      {
        id: "sheath_blight",
        name: "Sheath Blight (Rhizoctonia solani)",
        symptoms: "Oval greenish-gray spots on leaf sheaths near water line.",
        triggerConditions: {
          tempRange: [28, 33],
          minHumidity: 85,
          description: "Hot, humid microclimate inside dense tillers."
        },
        mitigation: "Drain field periodically to reduce humidity around canopy base. Apply Azoxystrobin."
      },
      {
        id: "bacterial_blight",
        name: "Bacterial Leaf Blight",
        symptoms: "Water-soaked streaks turning yellow-white from leaf tips.",
        triggerConditions: {
          tempRange: [25, 34],
          minHumidity: 80,
          minWindSpeed: 20,
          description: "Strong winds and heavy rain cause leaf abrasions that let bacteria enter."
        },
        mitigation: "Avoid excess nitrogen fertilizer. Spray Copper hydroxide mixed with Streptocycline."
      }
    ]
  },

  cotton: {
    id: "cotton",
    name: "Cotton",
    icon: "☁️",
    category: "Fiber Crop",
    tempOptimal: { min: 21, max: 33 },
    tempCritical: { max: 40, min: 15 },
    humidityOptimal: { min: 50, max: 70 },
    humidityHighThreshold: 80,
    windMaxSpraying: 15,
    waterNeedPerWeek: 35,
    stages: ["Emergence", "Squaring", "Flowering", "Boll Development", "Boll Opening", "Harvesting"],
    diseases: [
      {
        id: "pink_bollworm",
        name: "Pink Bollworm / Aphids",
        symptoms: "Flower rosette formation, premature boll shedding, honeydew stickiness.",
        triggerConditions: {
          tempRange: [24, 34],
          minHumidity: 60,
          maxHumidity: 85,
          description: "Warm humid dry spells encourage rapid pest population buildup."
        },
        mitigation: "Deploy pheromone traps. Apply Emamectin benzoate early morning when wind speed is low."
      },
      {
        id: "cotton_wilt",
        name: "Fusarium / Verticillium Wilt",
        symptoms: "Yellowing leaf margins, vascular browning, wilting plant.",
        triggerConditions: {
          tempRange: [20, 28],
          minHumidity: 80,
          description: "Cool wet soils in early season followed by sudden warm dry conditions."
        },
        mitigation: "Ensure proper field drainage and apply Trichoderma soil drench."
      }
    ]
  },

  tomato: {
    id: "tomato",
    name: "Tomato",
    icon: "🍅",
    category: "Vegetable",
    tempOptimal: { min: 18, max: 27 },
    tempCritical: { max: 35, min: 8 },
    humidityOptimal: { min: 50, max: 75 },
    humidityHighThreshold: 80,
    windMaxSpraying: 12,
    waterNeedPerWeek: 30,
    stages: ["Seedling", "Vegetative", "Flowering", "Fruit Set", "Ripening", "Harvesting"],
    diseases: [
      {
        id: "late_blight_tomato",
        name: "Late Blight (Phytophthora infestans)",
        symptoms: "Large dark brown water-soaked leaf spots, white fungal mold underneath.",
        triggerConditions: {
          tempRange: [13, 24],
          minHumidity: 80,
          minRainfallChance: 50,
          description: "Cool, rainy, or highly humid weather triggers extremely fast epidemic spread."
        },
        mitigation: "Apply Mancozeb or Chlorothalonil preventatively before rain. Avoid overhead sprinkler irrigation."
      },
      {
        id: "early_blight_tomato",
        name: "Early Blight (Alternaria solani)",
        symptoms: "Concentric target-board spots on lower mature leaves.",
        triggerConditions: {
          tempRange: [24, 30],
          minHumidity: 75,
          description: "Alternating wet and dry periods with warm ambient temperatures."
        },
        mitigation: "Mulch around plant base to prevent soil splash back. Spray Copper Oxychloride."
      }
    ]
  },

  potato: {
    id: "potato",
    name: "Potato",
    icon: "🥔",
    category: "Tuber Crop",
    tempOptimal: { min: 15, max: 22 },
    tempCritical: { max: 30, min: 4 },
    humidityOptimal: { min: 60, max: 80 },
    humidityHighThreshold: 82,
    windMaxSpraying: 14,
    waterNeedPerWeek: 28,
    stages: ["Sprout", "Vegetative", "Tuber Initiation", "Tuber Bulking", "Maturation"],
    diseases: [
      {
        id: "potato_late_blight",
        name: "Potato Late Blight",
        symptoms: "Blackened foliage, rotting tubers with reddish-brown dry rot.",
        triggerConditions: {
          tempRange: [12, 23],
          minHumidity: 85,
          minRainfallChance: 60,
          description: "Extended leaf wetness (>10 hrs) and temperatures around 15-20°C."
        },
        mitigation: "Spray Cymoxanil + Mancozeb combination immediately. Kill vines 10 days before harvest."
      }
    ]
  },

  corn: {
    id: "corn",
    name: "Corn / Maize",
    icon: "🌽",
    category: "Cereal Grain",
    tempOptimal: { min: 18, max: 30 },
    tempCritical: { max: 38, min: 10 },
    humidityOptimal: { min: 50, max: 75 },
    humidityHighThreshold: 85,
    windMaxSpraying: 15,
    waterNeedPerWeek: 35,
    stages: ["V3-V6 Leaf", "Tasseling", "Silking", "Blister/Milk", "Dough/Dent", "Mature"],
    diseases: [
      {
        id: "northern_corn_blight",
        name: "Northern Corn Leaf Blight",
        symptoms: "Long elliptical grayish-green lesions on leaves.",
        triggerConditions: {
          tempRange: [18, 27],
          minHumidity: 80,
          description: "Moderate temperatures with frequent dew and high humidity."
        },
        mitigation: "Use resistant hybrids or apply strobilurin fungicide if lesions appear before silking."
      },
      {
        id: "fall_armyworm",
        name: "Fall Armyworm (Pest)",
        symptoms: "Ragged holes in whorl leaves, sawdust-like frass.",
        triggerConditions: {
          tempRange: [22, 34],
          minHumidity: 45,
          description: "Warm weather accelerates egg hatching and caterpillar feeding activity."
        },
        mitigation: "Apply Chlorantraniliprole into whorls early morning."
      }
    ]
  },

  grapes: {
    id: "grapes",
    name: "Grapes",
    icon: "🍇",
    category: "Fruit Orchard",
    tempOptimal: { min: 15, max: 28 },
    tempCritical: { max: 38, min: 2 },
    humidityOptimal: { min: 50, max: 70 },
    humidityHighThreshold: 78,
    windMaxSpraying: 12,
    waterNeedPerWeek: 20,
    stages: ["Bud Burst", "Flowering", "Fruit Set", "Veraison (Color)", "Ripening", "Harvest"],
    diseases: [
      {
        id: "grape_downy_mildew",
        name: "Downy Mildew (Plasmopara viticola)",
        symptoms: "Oil-spot yellow leaf lesions, white downy mold underneath.",
        triggerConditions: {
          tempRange: [15, 26],
          minHumidity: 85,
          minRainfallChance: 40,
          description: "The 10-10-10 rule: 10mm rain, 10°C temp, 10cm shoots trigger primary infection."
        },
        mitigation: "Apply systemic Phosphonate or Copper sprays prior to rain events."
      },
      {
        id: "grape_powdery_mildew",
        name: "Powdery Mildew (Uncinula necator)",
        symptoms: "Ash-gray powdery coating on leaves and young berries, skin splitting.",
        triggerConditions: {
          tempRange: [20, 30],
          minHumidity: 60,
          maxHumidity: 90,
          description: "Thrives in shaded, warm, moderately humid weather without requiring liquid water."
        },
        mitigation: "Ensure canopy trimming and leaf pulling for sun exposure. Apply wettable sulfur."
      }
    ]
  },

  apple: {
    id: "apple",
    name: "Apple",
    icon: "🍎",
    category: "Fruit Tree",
    tempOptimal: { min: 12, max: 25 },
    tempCritical: { max: 34, min: -2 },
    humidityOptimal: { min: 55, max: 75 },
    humidityHighThreshold: 80,
    windMaxSpraying: 12,
    waterNeedPerWeek: 30,
    stages: ["Dormant", "Green Tip", "Pink Bud", "Bloom", "Petal Fall", "Fruit Sizing", "Harvest"],
    diseases: [
      {
        id: "apple_scab",
        name: "Apple Scab (Venturia inaequalis)",
        symptoms: "Olive-green velvet leaf spots, corky scabs on fruit.",
        triggerConditions: {
          tempRange: [10, 24],
          minHumidity: 80,
          leafWetnessHours: 6,
          description: "Spring rains accompanied by moderate temperatures create high infection risk."
        },
        mitigation: "Apply Captan or Difenoconazole spray immediately after wet periods (Mills Period)."
      }
    ]
  }
};
