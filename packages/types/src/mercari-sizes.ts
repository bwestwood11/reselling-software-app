// Mercari size option — id is the integer Mercari expects in createListing.sizeId
export interface MercariSizeOption {
  id: number;
  label: string;
}

export interface MercariSizeSchema {
  label: string;
  sizes: MercariSizeOption[];
}

// ── Conditions ─────────────────────────────────────────────────────────────────
// Mercari's 5 condition IDs as returned by the master data API

export interface MercariCondition {
  id: number;
  name: string;
}

export const MERCARI_CONDITIONS: MercariCondition[] = [
  { id: 1, name: "New"      },
  { id: 2, name: "Like new" },
  { id: 3, name: "Good"     },
  { id: 4, name: "Fair"     },
  { id: 5, name: "Poor"     },
];

// Maps our internal Condition enum to Mercari's conditionId
export const MERCARI_CONDITION_MAP: Record<string, number> = {
  NEW_WITH_TAGS:    1,
  NEW_WITHOUT_TAGS: 2,
  VERY_GOOD:        3,
  GOOD:             4,
  SATISFACTORY:     5,
};

// ── Size schema definitions ────────────────────────────────────────────────────
// Keys are Mercari's itemSizeGroupId (from the master data JSON).
// Sizes from multiple sub-groups are merged; sub-group name is prefixed where
// the same alpha label appears in more than one sub-group (e.g. Women's XS exists
// in Standard, Petite, Maternity, Tall, and Juniors cuts).

export const MERCARI_SIZE_SCHEMAS: Record<string, MercariSizeSchema> = {
  // ── Group 1: Women's Clothing ──────────────────────────────────────────────
  "1": {
    label: "Women's Clothing",
    sizes: [
      // Standard (sub-group 11)
      { id: 1,   label: "Standard · XXS (00)"     },
      { id: 2,   label: "Standard · XS (0-2)"     },
      { id: 3,   label: "Standard · S (4-6)"      },
      { id: 4,   label: "Standard · M (8-10)"     },
      { id: 5,   label: "Standard · L (12-14)"    },
      { id: 6,   label: "Standard · XL (16-18)"   },
      { id: 289, label: "Standard · 1X (16-18)"   },
      { id: 7,   label: "Standard · 2XL (20-22)"  },
      { id: 160, label: "Standard · 3XL (24-26)"  },
      { id: 161, label: "Standard · 4XL (28-30)"  },
      { id: 162, label: "Standard · 5XL (32-34)"  },
      { id: 163, label: "Standard · One Size"      },
      // Petite (sub-group 12)
      { id: 290, label: "Petite · XXS (00)"        },
      { id: 291, label: "Petite · XS (0-2)"        },
      { id: 292, label: "Petite · S (4-6)"         },
      { id: 293, label: "Petite · M (8-10)"        },
      { id: 294, label: "Petite · L (12-14)"       },
      { id: 295, label: "Petite · XL (16-18)"      },
      { id: 296, label: "Petite · 1X (16-18)"      },
      { id: 297, label: "Petite · 2XL (20-22)"     },
      { id: 298, label: "Petite · 3XL (24-26)"     },
      { id: 299, label: "Petite · 4XL (28-30)"     },
      { id: 300, label: "Petite · 5XL (32-34)"     },
      // Maternity (sub-group 13)
      { id: 301, label: "Maternity · XXS (00)"     },
      { id: 302, label: "Maternity · XS (0-2)"     },
      { id: 303, label: "Maternity · S (4-6)"      },
      { id: 304, label: "Maternity · M (8-10)"     },
      { id: 305, label: "Maternity · L (12-14)"    },
      { id: 306, label: "Maternity · XL (16-18)"   },
      { id: 307, label: "Maternity · 1X (16-18)"   },
      { id: 308, label: "Maternity · 2XL (20-22)"  },
      { id: 309, label: "Maternity · 3XL (24-26)"  },
      { id: 310, label: "Maternity · 4XL (28-30)"  },
      { id: 311, label: "Maternity · 5XL (32-34)"  },
      // Tall (sub-group 14)
      { id: 312, label: "Tall · XXS (00)"          },
      { id: 313, label: "Tall · XS (0-2)"          },
      { id: 314, label: "Tall · S (4-6)"           },
      { id: 315, label: "Tall · M (8-10)"          },
      { id: 316, label: "Tall · L (12-14)"         },
      { id: 317, label: "Tall · XL (16-18)"        },
      { id: 318, label: "Tall · 1X (16-18)"        },
      { id: 319, label: "Tall · 2XL (20-22)"       },
      { id: 320, label: "Tall · 3XL (24-26)"       },
      { id: 321, label: "Tall · 4XL (28-30)"       },
      { id: 322, label: "Tall · 5XL (32-34)"       },
      // Juniors (sub-group 15)
      { id: 351, label: "Juniors · XS (0-1)"       },
      { id: 352, label: "Juniors · S (3-5)"        },
      { id: 353, label: "Juniors · M (7-9)"        },
      { id: 354, label: "Juniors · L (11-13)"      },
      { id: 355, label: "Juniors · XL (15-17)"     },
    ],
  },

  // ── Group 2: Men's Clothing ────────────────────────────────────────────────
  "2": {
    label: "Men's Clothing",
    sizes: [
      // Regular (sub-group 20)
      { id: 8,   label: "Regular · XS (30-32)"    },
      { id: 9,   label: "Regular · S (34-36)"     },
      { id: 10,  label: "Regular · M (38-40)"     },
      { id: 11,  label: "Regular · L (42-44)"     },
      { id: 12,  label: "Regular · XL (46-48)"    },
      { id: 13,  label: "Regular · XXL (50-52)"   },
      { id: 164, label: "Regular · 3XL (54-56)"   },
      { id: 165, label: "Regular · 4XL (58-60)"   },
      { id: 166, label: "Regular · 5XL (62-64)"   },
      { id: 167, label: "Regular · One Size"       },
      // Tall (sub-group 21)
      { id: 340, label: "Tall · M"                 },
      { id: 341, label: "Tall · L"                 },
      { id: 342, label: "Tall · XL"                },
      { id: 343, label: "Tall · XXL"               },
      { id: 344, label: "Tall · XXXL+"             },
      { id: 332, label: "Tall · 4XL (58-60)"       },
      { id: 333, label: "Tall · 5XL (62-64)"       },
      // Big (sub-group 22)
      { id: 345, label: "Big · 1X"                 },
      { id: 346, label: "Big · 2X"                 },
      { id: 347, label: "Big · 3X"                 },
      { id: 348, label: "Big · 4X+"                },
    ],
  },

  // ── Group 3: Adult Pants ───────────────────────────────────────────────────
  "3": {
    label: "Adult Pants / Jeans (Waist)",
    sizes: [
      // Inch (sub-group 30)
      { id: 14,  label: "23 in." },
      { id: 15,  label: "24 in." },
      { id: 16,  label: "25 in." },
      { id: 17,  label: "26 in." },
      { id: 18,  label: "27 in." },
      { id: 19,  label: "28 in." },
      { id: 20,  label: "29 in." },
      { id: 21,  label: "30 in." },
      { id: 22,  label: "31 in." },
      { id: 23,  label: "32 in." },
      { id: 24,  label: "33 in." },
      { id: 25,  label: "34 in." },
      { id: 26,  label: "36 in." },
      { id: 27,  label: "38 in." },
      { id: 28,  label: "40 in." },
      { id: 29,  label: "42 in." },
      { id: 30,  label: "44 in." },
      { id: 31,  label: "46 in." },
      { id: 32,  label: "48 in." },
      { id: 33,  label: "50 in." },
      { id: 34,  label: "52 in." },
      { id: 327, label: "54 in." },
      { id: 328, label: "56 in." },
      { id: 329, label: "58+ in." },
      // Alpha (sub-group 31)
      { id: 393, label: "Alpha · XXS and Below" },
      { id: 394, label: "Alpha · XS"            },
      { id: 395, label: "Alpha · S"             },
      { id: 396, label: "Alpha · M"             },
      { id: 397, label: "Alpha · L"             },
      { id: 398, label: "Alpha · XL"            },
      { id: 399, label: "Alpha · 2X"            },
      { id: 400, label: "Alpha · 3XL"           },
      { id: 401, label: "Alpha · 4XL+"          },
      { id: 402, label: "Alpha · One Size"      },
    ],
  },

  // ── Group 4: Suits & Blazers (Men) ─────────────────────────────────────────
  "4": {
    label: "Suits & Blazers",
    sizes: [
      // Numeric chest+cut (sub-group 40)
      { id: 330, label: "34R"  },
      { id: 331, label: "35R"  },
      { id: 226, label: "36S"  },
      { id: 227, label: "36R"  },
      { id: 35,  label: "38S"  },
      { id: 44,  label: "38R"  },
      { id: 53,  label: "38L"  },
      { id: 36,  label: "40S"  },
      { id: 45,  label: "40R"  },
      { id: 54,  label: "40L"  },
      { id: 37,  label: "42S"  },
      { id: 46,  label: "42R"  },
      { id: 55,  label: "42L"  },
      { id: 38,  label: "44S"  },
      { id: 47,  label: "44R"  },
      { id: 56,  label: "44L"  },
      { id: 228, label: "46S"  },
      { id: 229, label: "46R"  },
      { id: 230, label: "46L"  },
      { id: 39,  label: "48S"  },
      { id: 48,  label: "48R"  },
      { id: 57,  label: "48L"  },
      { id: 40,  label: "50S"  },
      { id: 49,  label: "50R"  },
      { id: 58,  label: "50L"  },
      { id: 41,  label: "52S"  },
      { id: 50,  label: "52R"  },
      { id: 59,  label: "52L"  },
      { id: 42,  label: "54S"  },
      { id: 51,  label: "54R"  },
      { id: 60,  label: "54L"  },
      { id: 43,  label: "56S"  },
      { id: 52,  label: "56R"  },
      { id: 61,  label: "56L"  },
      // Alpha sizing (sub-group 41)
      { id: 383, label: "Alpha · XXS and Below" },
      { id: 384, label: "Alpha · XS"            },
      { id: 385, label: "Alpha · S"             },
      { id: 386, label: "Alpha · M"             },
      { id: 387, label: "Alpha · L"             },
      { id: 388, label: "Alpha · XL"            },
      { id: 389, label: "Alpha · 2X"            },
      { id: 390, label: "Alpha · 3XL"           },
      { id: 391, label: "Alpha · 4XL+"          },
      { id: 392, label: "Alpha · One Size"      },
    ],
  },

  // ── Group 5: Women's Shoes ─────────────────────────────────────────────────
  "5": {
    label: "Women's Shoes (US)",
    sizes: [
      { id: 415, label: "3.5 and below" },
      { id: 145, label: "4 (EU 35)"     },
      { id: 146, label: "4.5 (EU 35)"   },
      { id: 62,  label: "5 (EU 35.5)"   },
      { id: 63,  label: "5.5 (EU 36)"   },
      { id: 64,  label: "6 (EU 36.5)"   },
      { id: 65,  label: "6.5 (EU 37)"   },
      { id: 66,  label: "7 (EU 37.5)"   },
      { id: 67,  label: "7.5 (EU 38)"   },
      { id: 68,  label: "8 (EU 38.5)"   },
      { id: 69,  label: "8.5 (EU 39)"   },
      { id: 70,  label: "9 (EU 39.5)"   },
      { id: 71,  label: "9.5 (EU 40)"   },
      { id: 72,  label: "10 (EU 40.5)"  },
      { id: 73,  label: "10.5 (EU 41)"  },
      { id: 74,  label: "11 (EU 41.5)"  },
      { id: 75,  label: "11.5 (EU 42)"  },
      { id: 76,  label: "12 (EU 42.5)"  },
      { id: 323, label: "12.5 (EU 43)"  },
      { id: 324, label: "13 (EU 43.5)"  },
      { id: 325, label: "13.5 (EU 44)"  },
      { id: 326, label: "14 & Up"       },
    ],
  },

  // ── Group 8: Kids Clothing ─────────────────────────────────────────────────
  "8": {
    label: "Kids Clothing",
    sizes: [
      // 0-24 months (sub-group 81)
      { id: 88,  label: "Newborn"       },
      { id: 90,  label: "0-3 Months"    },
      { id: 85,  label: "3-6 Months"    },
      { id: 86,  label: "6-9 Months"    },
      { id: 87,  label: "9-12 Months"   },
      { id: 89,  label: "12-18 Months"  },
      { id: 92,  label: "24 Months"     },
      { id: 93,  label: "One Size"      },
      { id: 94,  label: "Not Specified" },
      // Toddler (sub-group 82)
      { id: 95,  label: "2T"            },
      { id: 96,  label: "3T"            },
      { id: 97,  label: "4T"            },
      { id: 98,  label: "5T"            },
      { id: 99,  label: "One Size (T)"  },
      { id: 100, label: "Not Specified (T)" },
      // 4Y+ (sub-group 83)
      { id: 101, label: "XS (4-5)"      },
      { id: 102, label: "S (6-7)"       },
      { id: 103, label: "M (8)"         },
      { id: 104, label: "L (10-12)"     },
      { id: 105, label: "XL (14-16)"    },
      { id: 168, label: "2XL (18)"      },
      { id: 169, label: "One Size (4Y+)" },
    ],
  },

  // ── Group 10: Kids Shoes ───────────────────────────────────────────────────
  "10": {
    label: "Kids Shoes (US)",
    sizes: [
      // Little Kids (sub-group 102)
      { id: 106, label: "Little Kids · 0"    },
      { id: 349, label: "Little Kids · 0.5"  },
      { id: 107, label: "Little Kids · 1"    },
      { id: 108, label: "Little Kids · 1.5"  },
      { id: 109, label: "Little Kids · 2"    },
      { id: 110, label: "Little Kids · 2.5"  },
      { id: 111, label: "Little Kids · 3"    },
      { id: 112, label: "Little Kids · 3.5"  },
      { id: 113, label: "Little Kids · 4"    },
      { id: 114, label: "Little Kids · 4.5"  },
      { id: 115, label: "Little Kids · 5"    },
      { id: 116, label: "Little Kids · 5.5"  },
      { id: 117, label: "Little Kids · 6"    },
      { id: 118, label: "Little Kids · 6.5"  },
      { id: 119, label: "Little Kids · 7"    },
      { id: 120, label: "Little Kids · 7.5"  },
      { id: 121, label: "Little Kids · 8"    },
      { id: 122, label: "Little Kids · 8.5"  },
      { id: 123, label: "Little Kids · 9"    },
      { id: 124, label: "Little Kids · 9.5"  },
      { id: 125, label: "Little Kids · 10"   },
      { id: 126, label: "Little Kids · 10.5" },
      { id: 127, label: "Little Kids · 11"   },
      { id: 128, label: "Little Kids · 11.5" },
      { id: 129, label: "Little Kids · 12"   },
      { id: 130, label: "Little Kids · 12.5" },
      { id: 131, label: "Little Kids · 13"   },
      { id: 350, label: "Little Kids · 13.5" },
      // Big Kids (sub-group 101)
      { id: 132, label: "Big Kids · 1"    },
      { id: 133, label: "Big Kids · 1.5"  },
      { id: 134, label: "Big Kids · 2"    },
      { id: 135, label: "Big Kids · 2.5"  },
      { id: 136, label: "Big Kids · 3"    },
      { id: 137, label: "Big Kids · 3.5"  },
      { id: 138, label: "Big Kids · 4"    },
      { id: 139, label: "Big Kids · 4.5"  },
      { id: 140, label: "Big Kids · 5"    },
      { id: 141, label: "Big Kids · 5.5"  },
      { id: 142, label: "Big Kids · 6"    },
      { id: 143, label: "Big Kids · 6.5"  },
      { id: 144, label: "Big Kids · 7"    },
    ],
  },

  // ── Group 11: Men's Shoes ──────────────────────────────────────────────────
  "11": {
    label: "Men's Shoes (US)",
    sizes: [
      { id: 413, label: "5.5 and below" },
      { id: 334, label: "5 (EU 38)"     },
      { id: 335, label: "5.5 (EU 38.5)" },
      { id: 147, label: "6 (EU 39)"     },
      { id: 148, label: "6.5 (EU 39.5)" },
      { id: 149, label: "7 (EU 40)"     },
      { id: 150, label: "7.5 (EU 40.5)" },
      { id: 151, label: "8 (EU 41)"     },
      { id: 152, label: "8.5 (EU 41.5)" },
      { id: 153, label: "9 (EU 42)"     },
      { id: 154, label: "9.5 (EU 42.5)" },
      { id: 155, label: "10 (EU 43)"    },
      { id: 156, label: "10.5 (EU 43.5)"},
      { id: 157, label: "11 (EU 44)"    },
      { id: 158, label: "11.5 (EU 44.5)"},
      { id: 159, label: "12 (EU 45)"    },
      { id: 77,  label: "12.5 (EU 45.5)"},
      { id: 78,  label: "13 (EU 46)"    },
      { id: 79,  label: "13.5 (EU 46.5)"},
      { id: 80,  label: "14 (EU 47)"    },
      { id: 81,  label: "14.5 (EU 47.5)"},
      { id: 82,  label: "15 (EU 48)"    },
      { id: 83,  label: "15.5 (EU 48.5)"},
      { id: 84,  label: "16 (EU 49)"    },
      { id: 336, label: "17 (EU 49.5)"  },
      { id: 337, label: "18 (EU 50)"    },
      { id: 338, label: "19 (EU 50.5)"  },
      { id: 339, label: "20 (EU 51)"    },
      { id: 414, label: "13+ (EU 50)"   },
    ],
  },

  // ── Group 12: Bras (Women) ─────────────────────────────────────────────────
  "12": {
    label: "Bras",
    sizes: [
      // Band / cup sizing (sub-group 120)
      { id: 231, label: "28A"              },
      { id: 232, label: "28B"              },
      { id: 233, label: "28C"              },
      { id: 234, label: "28D"              },
      { id: 235, label: "28E (DD)"         },
      { id: 236, label: "28F (DDD)"        },
      { id: 237, label: "28G"              },
      { id: 238, label: "28H"              },
      { id: 239, label: "28I"              },
      { id: 240, label: "28J"              },
      { id: 241, label: "28K+"             },
      { id: 242, label: "30A"              },
      { id: 243, label: "30B"              },
      { id: 244, label: "30C"              },
      { id: 245, label: "30D"              },
      { id: 246, label: "30E (DD)"         },
      { id: 247, label: "30F (DDD)"        },
      { id: 248, label: "30G"              },
      { id: 249, label: "30H"              },
      { id: 250, label: "30I"              },
      { id: 251, label: "30J"              },
      { id: 252, label: "30K+"             },
      { id: 253, label: "32AA"             },
      { id: 170, label: "32A"              },
      { id: 177, label: "32B"              },
      { id: 184, label: "32C"              },
      { id: 191, label: "32D"              },
      { id: 198, label: "32E (DD)"         },
      { id: 205, label: "32F (DDD)"        },
      { id: 212, label: "32G (4D)"         },
      { id: 219, label: "32H (5D)"         },
      { id: 254, label: "32I"              },
      { id: 255, label: "32J"              },
      { id: 256, label: "32K+"             },
      { id: 171, label: "34A"              },
      { id: 178, label: "34B"              },
      { id: 185, label: "34C"              },
      { id: 192, label: "34D"              },
      { id: 199, label: "34E (DD)"         },
      { id: 206, label: "34F (DDD)"        },
      { id: 213, label: "34G (4D)"         },
      { id: 220, label: "34H (5D)"         },
      { id: 257, label: "34I"              },
      { id: 258, label: "34J"              },
      { id: 259, label: "34K+"             },
      { id: 172, label: "36A"              },
      { id: 179, label: "36B"              },
      { id: 186, label: "36C"              },
      { id: 193, label: "36D"              },
      { id: 200, label: "36E (DD)"         },
      { id: 207, label: "36F (DDD)"        },
      { id: 214, label: "36G (4D)"         },
      { id: 221, label: "36H (5D)"         },
      { id: 260, label: "36I"              },
      { id: 261, label: "36J"              },
      { id: 262, label: "36K+"             },
      { id: 173, label: "38A"              },
      { id: 180, label: "38B"              },
      { id: 187, label: "38C"              },
      { id: 194, label: "38D"              },
      { id: 201, label: "38E (DD)"         },
      { id: 208, label: "38F (DDD)"        },
      { id: 215, label: "38G (4D)"         },
      { id: 222, label: "38H (5D)"         },
      { id: 263, label: "38I"              },
      { id: 264, label: "38J"              },
      { id: 265, label: "38K+"             },
      { id: 174, label: "40A"              },
      { id: 181, label: "40B"              },
      { id: 188, label: "40C"              },
      { id: 195, label: "40D"              },
      { id: 202, label: "40E (DD)"         },
      { id: 209, label: "40F (DDD)"        },
      { id: 216, label: "40G (4D)"         },
      { id: 223, label: "40H (5D)"         },
      { id: 266, label: "40I"              },
      { id: 267, label: "40J"              },
      { id: 268, label: "40K+"             },
      { id: 175, label: "42A"              },
      { id: 182, label: "42B"              },
      { id: 189, label: "42C"              },
      { id: 196, label: "42D"              },
      { id: 203, label: "42E (DD)"         },
      { id: 210, label: "42F (DDD)"        },
      { id: 217, label: "42G (4D)"         },
      { id: 224, label: "42H (5D)"         },
      { id: 269, label: "42I"              },
      { id: 270, label: "42J"              },
      { id: 271, label: "42K+"             },
      { id: 176, label: "44A"              },
      { id: 183, label: "44B"              },
      { id: 190, label: "44C"              },
      { id: 197, label: "44D"              },
      { id: 204, label: "44E (DD)"         },
      { id: 211, label: "44F (DDD)"        },
      { id: 218, label: "44G (4D)"         },
      { id: 225, label: "44H (5D)"         },
      { id: 275, label: "46B"              },
      { id: 276, label: "46C"              },
      { id: 277, label: "46D"              },
      { id: 278, label: "46E (DD)"         },
      { id: 279, label: "46F (DDD)"        },
      { id: 280, label: "46G"              },
      { id: 281, label: "46H"              },
      { id: 282, label: "46I"              },
      { id: 283, label: "46J"              },
      { id: 284, label: "46K+"             },
      { id: 285, label: "48C"              },
      { id: 286, label: "48D"              },
      { id: 287, label: "48E (DD)"         },
      { id: 288, label: "48F (DDD)"        },
      // Alpha sizing (sub-group 121)
      { id: 403, label: "Alpha · XXS and Below" },
      { id: 404, label: "Alpha · XS"            },
      { id: 405, label: "Alpha · S"             },
      { id: 406, label: "Alpha · M"             },
      { id: 407, label: "Alpha · L"             },
      { id: 408, label: "Alpha · XL"            },
      { id: 409, label: "Alpha · 2X"            },
      { id: 410, label: "Alpha · 3XL"           },
      { id: 411, label: "Alpha · 4XL+"          },
      { id: 412, label: "Alpha · One Size"      },
    ],
  },
};

// ── Per-category size requirements ─────────────────────────────────────────────
// Maps Mercari category IDs (string) → { sizeSchemaId, isSizeRequired }.
// sizeSchemaId is the itemSizeGroupId from Mercari's master data (as a string).
// Categories not listed here have no size requirement (non-clothing / accessories).

export interface MercariCategoryRequirements {
  sizeSchemaId: string | null;
  isSizeRequired: boolean;
}

export const MERCARI_CATEGORY_REQUIREMENTS: Record<string, MercariCategoryRequirements> = {
  // ── Women (parent: 1) ──────────────────────────────────────────────────────
  "11":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Dresses
  "12":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Tops & blouses
  "13":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Sweaters
  "14":   { sizeSchemaId: "3",  isSizeRequired: true  }, // Jeans
  "15":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Pants
  "16":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Skirts
  "17":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Coats & jackets
  "18":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Suits & blazers
  "19":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Athletic apparel
  "20":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Swimwear
  "21":   { sizeSchemaId: null, isSizeRequired: false }, // Handbags
  "22":   { sizeSchemaId: null, isSizeRequired: false }, // Women's accessories
  "23":   { sizeSchemaId: null, isSizeRequired: false }, // Jewelry
  "24":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Maternity
  "25":   { sizeSchemaId: "5",  isSizeRequired: true  }, // Women's shoes
  "26":   { sizeSchemaId: null, isSizeRequired: false }, // Women's other
  "1561": { sizeSchemaId: "12", isSizeRequired: true  }, // Underwear (bras sub-tree)
  "1565": { sizeSchemaId: "12", isSizeRequired: true  }, // Bras
  "1562": { sizeSchemaId: "1",  isSizeRequired: true  }, // G-strings & thongs
  "1563": { sizeSchemaId: "1",  isSizeRequired: true  }, // Panties
  "1564": { sizeSchemaId: "1",  isSizeRequired: true  }, // Thermal underwear
  "1936": { sizeSchemaId: "1",  isSizeRequired: true  }, // Shorts
  "1947": { sizeSchemaId: "1",  isSizeRequired: true  }, // Sleepwear & robes

  // ── Men (parent: 2) ────────────────────────────────────────────────────────
  "27":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Tops
  "28":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Sweats & hoodies
  "29":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Sweaters
  "30":   { sizeSchemaId: "3",  isSizeRequired: true  }, // Jeans
  "31":   { sizeSchemaId: "3",  isSizeRequired: true  }, // Pants
  "32":   { sizeSchemaId: "3",  isSizeRequired: true  }, // Shorts
  "33":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Coats & jackets
  "34":   { sizeSchemaId: "4",  isSizeRequired: true  }, // Blazers & sport coats
  "35":   { sizeSchemaId: "4",  isSizeRequired: true  }, // Suits
  "36":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Athletic apparel
  "37":   { sizeSchemaId: "2",  isSizeRequired: true  }, // Swimwear
  "38":   { sizeSchemaId: null, isSizeRequired: false }, // Men's accessories
  "39":   { sizeSchemaId: "11", isSizeRequired: true  }, // Men's shoes
  "40":   { sizeSchemaId: null, isSizeRequired: false }, // Men's other
  "2874": { sizeSchemaId: null, isSizeRequired: false }, // Men's jewelry

  // ── Kids (parent: 3) ───────────────────────────────────────────────────────
  // Girls apparel
  "1870": { sizeSchemaId: null, isSizeRequired: false }, // Girls accessories
  "1871": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls bottoms
  "1872": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls coats & jackets
  "1873": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls dresses
  "1874": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls one-pieces
  "1875": { sizeSchemaId: "10", isSizeRequired: true  }, // Girls shoes
  "1876": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls swimwear
  "1877": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls tops & t-shirts
  "1878": { sizeSchemaId: "8",  isSizeRequired: true  }, // Girls other
  // Boys apparel
  "1879": { sizeSchemaId: null, isSizeRequired: false }, // Boys accessories
  "1880": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys bottoms
  "1881": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys coats & jackets
  "1882": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys one-pieces
  "1883": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys swimwear
  "1884": { sizeSchemaId: "10", isSizeRequired: true  }, // Boys shoes
  "1885": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys tops & t-shirts
  "1886": { sizeSchemaId: "8",  isSizeRequired: true  }, // Boys other
  // Baby / toddler gear (no clothing sizes)
  "48":   { sizeSchemaId: null, isSizeRequired: false }, // Bathing & skin care
  "49":   { sizeSchemaId: null, isSizeRequired: false }, // Car seats & accessories
  "50":   { sizeSchemaId: null, isSizeRequired: false }, // Diapering
  "51":   { sizeSchemaId: null, isSizeRequired: false }, // Feeding
  "52":   { sizeSchemaId: null, isSizeRequired: false }, // Gear
  "53":   { sizeSchemaId: null, isSizeRequired: false }, // Health & baby care
  "54":   { sizeSchemaId: null, isSizeRequired: false }, // Nursery
  "55":   { sizeSchemaId: null, isSizeRequired: false }, // Potty training
  "56":   { sizeSchemaId: null, isSizeRequired: false }, // Pregnancy & maternity
  "57":   { sizeSchemaId: null, isSizeRequired: false }, // Safety
  "58":   { sizeSchemaId: null, isSizeRequired: false }, // Strollers
  "59":   { sizeSchemaId: null, isSizeRequired: false }, // Kids other

  // ── Sports & Outdoors — footwear sub-categories ────────────────────────────
  "74":   { sizeSchemaId: "5",  isSizeRequired: true  }, // Footwear (Sports)
  "723":  { sizeSchemaId: "5",  isSizeRequired: true  }, // Cleats
  "724":  { sizeSchemaId: "11", isSizeRequired: true  }, // Footwear Men (Sports)
  "725":  { sizeSchemaId: "5",  isSizeRequired: true  }, // Footwear Women (Sports)
  "726":  { sizeSchemaId: "10", isSizeRequired: true  }, // Footwear Kids (Sports)
  "75":   { sizeSchemaId: "1",  isSizeRequired: true  }, // Apparel (Sports)
  "728":  { sizeSchemaId: "2",  isSizeRequired: true  }, // Apparel Men (Sports)
  "729":  { sizeSchemaId: "1",  isSizeRequired: true  }, // Apparel Women (Sports)
  "730":  { sizeSchemaId: "8",  isSizeRequired: true  }, // Apparel Boys (Sports)
  "731":  { sizeSchemaId: "8",  isSizeRequired: true  }, // Apparel Girls (Sports)
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the flat size options for a given schema ID, or [] if none. */
export function getMercariSizes(sizeSchemaId: string | null | undefined): MercariSizeOption[] {
  if (!sizeSchemaId) return [];
  return MERCARI_SIZE_SCHEMAS[sizeSchemaId]?.sizes ?? [];
}

/** Returns requirements for a category, falling back to a no-size default. */
export function getMercariCategoryRequirements(categoryId: string): MercariCategoryRequirements {
  return (
    MERCARI_CATEGORY_REQUIREMENTS[categoryId] ?? {
      sizeSchemaId: null,
      isSizeRequired: false,
    }
  );
}

/** Maps our internal Condition enum value to Mercari's numeric conditionId. */
export function getMercariConditionId(internalCondition: string): number {
  return MERCARI_CONDITION_MAP[internalCondition] ?? 4;
}
