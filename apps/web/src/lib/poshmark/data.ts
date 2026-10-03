// Auto-generated from Poshmark SSR data. Do not edit manually.

export interface PoshmarkColor {
  name: string;
  display: string;
  rgb: string;
  message_id: string;
}

export interface PoshmarkSubcategory { id: string; display: string; }
export interface PoshmarkCategory {
  id: string;
  display: string;
  subcategories: PoshmarkSubcategory[];
}
export interface PoshmarkDepartment {
  id: string;
  display: string;
  categories: PoshmarkCategory[];
}

export interface PoshmarkSize { id: string; display: string; }
// Maps category_id (or subcategory_id) -> available US sizes
export type PoshmarkSizeMap = Record<string, PoshmarkSize[]>;

export const POSHMARK_COLORS: PoshmarkColor[] = [
  {
    "name": "Red",
    "display": "Red",
    "rgb": "#ea2e2e",
    "message_id": "red"
  },
  {
    "name": "Pink",
    "display": "Pink",
    "rgb": "#fb1680",
    "message_id": "pink"
  },
  {
    "name": "Orange",
    "display": "Orange",
    "rgb": "#fca628",
    "message_id": "orange"
  },
  {
    "name": "Yellow",
    "display": "Yellow",
    "rgb": "#ffee37",
    "message_id": "yellow"
  },
  {
    "name": "Green",
    "display": "Green",
    "rgb": "#3c9c44",
    "message_id": "green"
  },
  {
    "name": "Blue",
    "display": "Blue",
    "rgb": "#137fc1",
    "message_id": "blue"
  },
  {
    "name": "Purple",
    "display": "Purple",
    "rgb": "#7f0f81",
    "message_id": "purple"
  },
  {
    "name": "Gold",
    "display": "Gold",
    "rgb": "#ffd72e",
    "message_id": "gold"
  },
  {
    "name": "Silver",
    "display": "Silver",
    "rgb": "#e9ebec",
    "message_id": "silver"
  },
  {
    "name": "Black",
    "display": "Black",
    "rgb": "#000000",
    "message_id": "black"
  },
  {
    "name": "Gray",
    "display": "Gray",
    "rgb": "#929292",
    "message_id": "gray"
  },
  {
    "name": "White",
    "display": "White",
    "rgb": "#FFFFFF",
    "message_id": "white"
  },
  {
    "name": "Cream",
    "display": "Cream",
    "rgb": "#f4e0ca",
    "message_id": "cream"
  },
  {
    "name": "Brown",
    "display": "Brown",
    "rgb": "#663509",
    "message_id": "brown"
  },
  {
    "name": "Tan",
    "display": "Tan",
    "rgb": "#d1b48e",
    "message_id": "tan"
  }
];

export const POSHMARK_DEPARTMENTS: PoshmarkDepartment[] = [
  {
    "id": "000e8975d97b4e80ef00a955",
    "display": "Women",
    "categories": [
      {
        "id": "002a8975d97b4e80ef00a955",
        "display": "Accessories",
        "subcategories": [
          {
            "id": "011e9287d97b4e80ef00a955",
            "display": "Belts"
          },
          {
            "id": "877df9aaaabb083120f45ec2",
            "display": "Face Masks"
          },
          {
            "id": "01209287d97b4e80ef00a955",
            "display": "Glasses"
          },
          {
            "id": "01229287d97b4e80ef00a955",
            "display": "Gloves & Mittens"
          },
          {
            "id": "01249287d97b4e80ef00a955",
            "display": "Hair Accessories"
          },
          {
            "id": "01269287d97b4e80ef00a955",
            "display": "Hats"
          },
          {
            "id": "01289287d97b4e80ef00a955",
            "display": "Hosiery & Socks"
          },
          {
            "id": "012a9287d97b4e80ef00a955",
            "display": "Key & Card Holders"
          },
          {
            "id": "012c9287d97b4e80ef00a955",
            "display": "Laptop Cases"
          },
          {
            "id": "012e9287d97b4e80ef00a955",
            "display": "Phone Cases"
          },
          {
            "id": "01309287d97b4e80ef00a955",
            "display": "Scarves & Wraps"
          },
          {
            "id": "01329287d97b4e80ef00a955",
            "display": "Sunglasses"
          },
          {
            "id": "01349287d97b4e80ef00a955",
            "display": "Tablet Cases"
          },
          {
            "id": "01369287d97b4e80ef00a955",
            "display": "Umbrellas"
          },
          {
            "id": "01389287d97b4e80ef00a955",
            "display": "Watches"
          }
        ]
      },
      {
        "id": "00248975d97b4e80ef00a955",
        "display": "Bags",
        "subcategories": [
          {
            "id": "00d89287d97b4e80ef00a955",
            "display": "Baby Bags"
          },
          {
            "id": "00da9287d97b4e80ef00a955",
            "display": "Backpacks"
          },
          {
            "id": "00ee9287d97b4e80ef00a955",
            "display": "Clutches & Wristlets"
          },
          {
            "id": "00dc9287d97b4e80ef00a955",
            "display": "Cosmetic Bags & Cases"
          },
          {
            "id": "00de9287d97b4e80ef00a955",
            "display": "Crossbody Bags"
          },
          {
            "id": "00e09287d97b4e80ef00a955",
            "display": "Hobos"
          },
          {
            "id": "00e29287d97b4e80ef00a955",
            "display": "Laptop Bags"
          },
          {
            "id": "00e49287d97b4e80ef00a955",
            "display": "Mini Bags"
          },
          {
            "id": "00e69287d97b4e80ef00a955",
            "display": "Satchels"
          },
          {
            "id": "00e89287d97b4e80ef00a955",
            "display": "Shoulder Bags"
          },
          {
            "id": "00ea9287d97b4e80ef00a955",
            "display": "Totes"
          },
          {
            "id": "00ec9287d97b4e80ef00a955",
            "display": "Travel Bags"
          },
          {
            "id": "00f09287d97b4e80ef00a955",
            "display": "Wallets"
          }
        ]
      },
      {
        "id": "00108975d97b4e80ef00a955",
        "display": "Dresses",
        "subcategories": [
          {
            "id": "00449287d97b4e80ef00a955",
            "display": "Asymmetrical"
          },
          {
            "id": "004c9287d97b4e80ef00a955",
            "display": "Backless"
          },
          {
            "id": "00429287d97b4e80ef00a955",
            "display": "High Low"
          },
          {
            "id": "00469287d97b4e80ef00a955",
            "display": "Long Sleeve"
          },
          {
            "id": "00409287d97b4e80ef00a955",
            "display": "Maxi"
          },
          {
            "id": "003e9287d97b4e80ef00a955",
            "display": "Midi"
          },
          {
            "id": "003c9287d97b4e80ef00a955",
            "display": "Mini"
          },
          {
            "id": "00489287d97b4e80ef00a955",
            "display": "One Shoulder"
          },
          {
            "id": "010082cfd97b4ecc3f0056aa",
            "display": "Prom"
          },
          {
            "id": "004a9287d97b4e80ef00a955",
            "display": "Strapless"
          },
          {
            "id": "020082d1d97b4ecc3f0056aa",
            "display": "Wedding"
          }
        ]
      },
      {
        "id": "00208975d97b4e80ef00a955",
        "display": "Intimates & Sleepwear",
        "subcategories": [
          {
            "id": "00c49287d97b4e80ef00a955",
            "display": "Bandeaus"
          },
          {
            "id": "00c29287d97b4e80ef00a955",
            "display": "Bras"
          },
          {
            "id": "00ce9287d97b4e80ef00a955",
            "display": "Chemises & Slips"
          },
          {
            "id": "00ca9287d97b4e80ef00a955",
            "display": "Pajamas"
          },
          {
            "id": "00c69287d97b4e80ef00a955",
            "display": "Panties"
          },
          {
            "id": "00cc9287d97b4e80ef00a955",
            "display": "Robes"
          },
          {
            "id": "00c89287d97b4e80ef00a955",
            "display": "Shapewear"
          },
          {
            "id": "867df9aaaabb083120f45ec2",
            "display": "Sports Bras"
          }
        ]
      },
      {
        "id": "00148975d97b4e80ef00a955",
        "display": "Jackets & Coats",
        "subcategories": [
          {
            "id": "00609287d97b4e80ef00a955",
            "display": "Blazers & Suit Jackets"
          },
          {
            "id": "797df9aaaabb083120f45ec2",
            "display": "Bomber Jackets"
          },
          {
            "id": "00629287d97b4e80ef00a955",
            "display": "Capes"
          },
          {
            "id": "00649287d97b4e80ef00a955",
            "display": "Jean Jackets"
          },
          {
            "id": "787df9aaaabb083120f45ec2",
            "display": "Leather Jackets"
          },
          {
            "id": "00669287d97b4e80ef00a955",
            "display": "Pea Coats"
          },
          {
            "id": "00689287d97b4e80ef00a955",
            "display": "Puffers"
          },
          {
            "id": "7b7df9aaaabb083120f45ec2",
            "display": "Ski & Snow Jackets"
          },
          {
            "id": "7a7df9aaaabb083120f45ec2",
            "display": "Teddy Jackets"
          },
          {
            "id": "006a9287d97b4e80ef00a955",
            "display": "Trench Coats"
          },
          {
            "id": "006c9287d97b4e80ef00a955",
            "display": "Utility Jackets"
          },
          {
            "id": "7c7df9aaaabb083120f45ec2",
            "display": "Varsity Jackets"
          },
          {
            "id": "006e9287d97b4e80ef00a955",
            "display": "Vests"
          }
        ]
      },
      {
        "id": "001a8975d97b4e80ef00a955",
        "display": "Jeans",
        "subcategories": [
          {
            "id": "008e9287d97b4e80ef00a955",
            "display": "Ankle & Cropped"
          },
          {
            "id": "00909287d97b4e80ef00a955",
            "display": "Boot Cut"
          },
          {
            "id": "00929287d97b4e80ef00a955",
            "display": "Boyfriend"
          },
          {
            "id": "00949287d97b4e80ef00a955",
            "display": "Flare & Wide Leg"
          },
          {
            "id": "807df9aaaabb083120f45ec2",
            "display": "High Rise"
          },
          {
            "id": "817df9aaaabb083120f45ec2",
            "display": "Jeggings"
          },
          {
            "id": "00969287d97b4e80ef00a955",
            "display": "Overalls"
          },
          {
            "id": "00989287d97b4e80ef00a955",
            "display": "Skinny"
          },
          {
            "id": "009a9287d97b4e80ef00a955",
            "display": "Straight Leg"
          }
        ]
      },
      {
        "id": "00288975d97b4e80ef00a955",
        "display": "Jewelry",
        "subcategories": [
          {
            "id": "01149287d97b4e80ef00a955",
            "display": "Bracelets"
          },
          {
            "id": "011c9287d97b4e80ef00a955",
            "display": "Brooches"
          },
          {
            "id": "01169287d97b4e80ef00a955",
            "display": "Earrings"
          },
          {
            "id": "01189287d97b4e80ef00a955",
            "display": "Necklaces"
          },
          {
            "id": "011a9287d97b4e80ef00a955",
            "display": "Rings"
          }
        ]
      },
      {
        "id": "002c8975d97b4e80ef00a955",
        "display": "Makeup",
        "subcategories": [
          {
            "id": "013a9287d97b4e80ef00a955",
            "display": "Blush"
          },
          {
            "id": "013c9287d97b4e80ef00a955",
            "display": "Bronzer & Contour"
          },
          {
            "id": "01429287d97b4e80ef00a955",
            "display": "Brows"
          },
          {
            "id": "015a9287d97b4e80ef00a955",
            "display": "Brushes & Tools"
          },
          {
            "id": "013e9287d97b4e80ef00a955",
            "display": "Concealer"
          },
          {
            "id": "01409287d97b4e80ef00a955",
            "display": "Eye Primer"
          },
          {
            "id": "01449287d97b4e80ef00a955",
            "display": "Eyeliner"
          },
          {
            "id": "01469287d97b4e80ef00a955",
            "display": "Eyeshadow"
          },
          {
            "id": "014e9287d97b4e80ef00a955",
            "display": "Foundation"
          },
          {
            "id": "01569287d97b4e80ef00a955",
            "display": "Highlighter"
          },
          {
            "id": "014c9287d97b4e80ef00a955",
            "display": "Lashes"
          },
          {
            "id": "01509287d97b4e80ef00a955",
            "display": "Lip Balm & Gloss"
          },
          {
            "id": "01529287d97b4e80ef00a955",
            "display": "Lip Liner"
          },
          {
            "id": "01549287d97b4e80ef00a955",
            "display": "Lipstick"
          },
          {
            "id": "01589287d97b4e80ef00a955",
            "display": "Mascara"
          },
          {
            "id": "897df9aaaabb083120f45ec2",
            "display": "Nail Tools"
          },
          {
            "id": "887df9aaaabb083120f45ec2",
            "display": "Press-On Nails"
          },
          {
            "id": "014a9287d97b4e80ef00a955",
            "display": "Primer"
          },
          {
            "id": "01489287d97b4e80ef00a955",
            "display": "Setting Powder & Spray"
          }
        ]
      },
      {
        "id": "001c8975d97b4e80ef00a955",
        "display": "Pants & Jumpsuits",
        "subcategories": [
          {
            "id": "00a69287d97b4e80ef00a955",
            "display": "Ankle & Cropped"
          },
          {
            "id": "00a89287d97b4e80ef00a955",
            "display": "Boot Cut & Flare"
          },
          {
            "id": "00aa9287d97b4e80ef00a955",
            "display": "Capris"
          },
          {
            "id": "00ae9287d97b4e80ef00a955",
            "display": "Jumpsuits & Rompers"
          },
          {
            "id": "00b09287d97b4e80ef00a955",
            "display": "Leggings"
          },
          {
            "id": "827df9aaaabb083120f45ec2",
            "display": "Pantsuits"
          },
          {
            "id": "00b29287d97b4e80ef00a955",
            "display": "Skinny"
          },
          {
            "id": "00b49287d97b4e80ef00a955",
            "display": "Straight Leg"
          },
          {
            "id": "00ac9287d97b4e80ef00a955",
            "display": "Track Pants & Joggers"
          },
          {
            "id": "00b69287d97b4e80ef00a955",
            "display": "Trousers"
          },
          {
            "id": "00b89287d97b4e80ef00a955",
            "display": "Wide Leg"
          }
        ]
      },
      {
        "id": "00268975d97b4e80ef00a955",
        "display": "Shoes",
        "subcategories": [
          {
            "id": "00f29287d97b4e80ef00a955",
            "display": "Ankle Boots & Booties"
          },
          {
            "id": "00fe9287d97b4e80ef00a955",
            "display": "Athletic Shoes"
          },
          {
            "id": "00f69287d97b4e80ef00a955",
            "display": "Combat & Moto Boots"
          },
          {
            "id": "01009287d97b4e80ef00a955",
            "display": "Espadrilles"
          },
          {
            "id": "01029287d97b4e80ef00a955",
            "display": "Flats & Loafers"
          },
          {
            "id": "00fa9287d97b4e80ef00a955",
            "display": "Heeled Boots"
          },
          {
            "id": "010a9287d97b4e80ef00a955",
            "display": "Heels"
          },
          {
            "id": "00fc9287d97b4e80ef00a955",
            "display": "Lace Up Boots"
          },
          {
            "id": "01049287d97b4e80ef00a955",
            "display": "Moccasins"
          },
          {
            "id": "01069287d97b4e80ef00a955",
            "display": "Mules & Clogs"
          },
          {
            "id": "00f89287d97b4e80ef00a955",
            "display": "Over the Knee Boots"
          },
          {
            "id": "01089287d97b4e80ef00a955",
            "display": "Platforms"
          },
          {
            "id": "010c9287d97b4e80ef00a955",
            "display": "Sandals"
          },
          {
            "id": "010e9287d97b4e80ef00a955",
            "display": "Slippers"
          },
          {
            "id": "01109287d97b4e80ef00a955",
            "display": "Sneakers"
          },
          {
            "id": "01129287d97b4e80ef00a955",
            "display": "Wedges"
          },
          {
            "id": "00f49287d97b4e80ef00a955",
            "display": "Winter & Rain Boots"
          }
        ]
      },
      {
        "id": "001e8975d97b4e80ef00a955",
        "display": "Shorts",
        "subcategories": [
          {
            "id": "837df9aaaabb083120f45ec2",
            "display": "Athletic Shorts"
          },
          {
            "id": "00be9287d97b4e80ef00a955",
            "display": "Bermudas"
          },
          {
            "id": "847df9aaaabb083120f45ec2",
            "display": "Bike Shorts"
          },
          {
            "id": "00c09287d97b4e80ef00a955",
            "display": "Cargos"
          },
          {
            "id": "857df9aaaabb083120f45ec2",
            "display": "High Waist"
          },
          {
            "id": "00bc9287d97b4e80ef00a955",
            "display": "Jean Shorts"
          },
          {
            "id": "00ba9287d97b4e80ef00a955",
            "display": "Skorts"
          }
        ]
      },
      {
        "id": "00128975d97b4e80ef00a955",
        "display": "Skirts",
        "subcategories": [
          {
            "id": "00589287d97b4e80ef00a955",
            "display": "A-Line or Full"
          },
          {
            "id": "00569287d97b4e80ef00a955",
            "display": "Asymmetrical"
          },
          {
            "id": "005a9287d97b4e80ef00a955",
            "display": "Circle & Skater"
          },
          {
            "id": "00549287d97b4e80ef00a955",
            "display": "High Low"
          },
          {
            "id": "00529287d97b4e80ef00a955",
            "display": "Maxi"
          },
          {
            "id": "00509287d97b4e80ef00a955",
            "display": "Midi"
          },
          {
            "id": "004e9287d97b4e80ef00a955",
            "display": "Mini"
          },
          {
            "id": "005c9287d97b4e80ef00a955",
            "display": "Pencil"
          },
          {
            "id": "005e9287d97b4e80ef00a955",
            "display": "Skirt Sets"
          }
        ]
      },
      {
        "id": "00168975d97b4e80ef00a955",
        "display": "Sweaters",
        "subcategories": [
          {
            "id": "00709287d97b4e80ef00a955",
            "display": "Cardigans"
          },
          {
            "id": "00769287d97b4e80ef00a955",
            "display": "Cowl & Turtlenecks"
          },
          {
            "id": "00729287d97b4e80ef00a955",
            "display": "Crew & Scoop Necks"
          },
          {
            "id": "7d7df9aaaabb083120f45ec2",
            "display": "Off-the-Shoulder Sweaters"
          },
          {
            "id": "00749287d97b4e80ef00a955",
            "display": "Shrugs & Ponchos"
          },
          {
            "id": "00789287d97b4e80ef00a955",
            "display": "V-Necks"
          }
        ]
      },
      {
        "id": "00228975d97b4e80ef00a955",
        "display": "Swim",
        "subcategories": [
          {
            "id": "00d09287d97b4e80ef00a955",
            "display": "Bikinis"
          },
          {
            "id": "00d49287d97b4e80ef00a955",
            "display": "Coverups"
          },
          {
            "id": "00d29287d97b4e80ef00a955",
            "display": "One Pieces"
          },
          {
            "id": "00d69287d97b4e80ef00a955",
            "display": "Sarongs"
          }
        ]
      },
      {
        "id": "00188975d97b4e80ef00a955",
        "display": "Tops",
        "subcategories": [
          {
            "id": "007a9287d97b4e80ef00a955",
            "display": "Blouses"
          },
          {
            "id": "7e7df9aaaabb083120f45ec2",
            "display": "Bodysuits"
          },
          {
            "id": "007c9287d97b4e80ef00a955",
            "display": "Button Down Shirts"
          },
          {
            "id": "007e9287d97b4e80ef00a955",
            "display": "Camisoles"
          },
          {
            "id": "00809287d97b4e80ef00a955",
            "display": "Crop Tops"
          },
          {
            "id": "7f7df9aaaabb083120f45ec2",
            "display": "Jerseys"
          },
          {
            "id": "00829287d97b4e80ef00a955",
            "display": "Muscle Tees"
          },
          {
            "id": "00849287d97b4e80ef00a955",
            "display": "Sweatshirts & Hoodies"
          },
          {
            "id": "00869287d97b4e80ef00a955",
            "display": "Tank Tops"
          },
          {
            "id": "00889287d97b4e80ef00a955",
            "display": "Tees - Long Sleeve"
          },
          {
            "id": "008a9287d97b4e80ef00a955",
            "display": "Tees - Short Sleeve"
          },
          {
            "id": "008c9287d97b4e80ef00a955",
            "display": "Tunics"
          }
        ]
      },
      {
        "id": "6e7df9aaaabb083120f45ec2",
        "display": "Skincare",
        "subcategories": [
          {
            "id": "8a7df9aaaabb083120f45ec2",
            "display": "Acne & Blemish"
          },
          {
            "id": "8b7df9aaaabb083120f45ec2",
            "display": "Cleanser & Exfoliant"
          },
          {
            "id": "8c7df9aaaabb083120f45ec2",
            "display": "Eye Cream"
          },
          {
            "id": "957df9aaaabb083120f45ec2",
            "display": "Makeup Remover"
          },
          {
            "id": "8d7df9aaaabb083120f45ec2",
            "display": "Mask"
          },
          {
            "id": "8e7df9aaaabb083120f45ec2",
            "display": "Moisturizer"
          },
          {
            "id": "8f7df9aaaabb083120f45ec2",
            "display": "Peel"
          },
          {
            "id": "907df9aaaabb083120f45ec2",
            "display": "Serum & Face Oil"
          },
          {
            "id": "927df9aaaabb083120f45ec2",
            "display": "Suncare"
          },
          {
            "id": "937df9aaaabb083120f45ec2",
            "display": "Toner"
          },
          {
            "id": "947df9aaaabb083120f45ec2",
            "display": "Tools"
          }
        ]
      },
      {
        "id": "6f7df9aaaabb083120f45ec2",
        "display": "Hair",
        "subcategories": [
          {
            "id": "967df9aaaabb083120f45ec2",
            "display": "Color"
          },
          {
            "id": "977df9aaaabb083120f45ec2",
            "display": "Conditioner"
          },
          {
            "id": "987df9aaaabb083120f45ec2",
            "display": "Hairspray"
          },
          {
            "id": "997df9aaaabb083120f45ec2",
            "display": "Heat Protectant"
          },
          {
            "id": "9a7df9aaaabb083120f45ec2",
            "display": "Shampoo"
          },
          {
            "id": "9d7df9aaaabb083120f45ec2",
            "display": "Styling"
          },
          {
            "id": "9b7df9aaaabb083120f45ec2",
            "display": "Tools"
          },
          {
            "id": "9c7df9aaaabb083120f45ec2",
            "display": "Treatment & Mask"
          },
          {
            "id": "9e7df9aaaabb083120f45ec2",
            "display": "Wigs & Extensions"
          }
        ]
      },
      {
        "id": "707df9aaaabb083120f45ec2",
        "display": "Bath & Body",
        "subcategories": [
          {
            "id": "9f7df9aaaabb083120f45ec2",
            "display": "Bath Soak & Bubbles"
          },
          {
            "id": "a17df9aaaabb083120f45ec2",
            "display": "Body Wash"
          },
          {
            "id": "a27df9aaaabb083120f45ec2",
            "display": "Exfoliant & Scrub"
          },
          {
            "id": "a37df9aaaabb083120f45ec2",
            "display": "Hair Removal"
          },
          {
            "id": "a47df9aaaabb083120f45ec2",
            "display": "Hand & Foot Care"
          },
          {
            "id": "a77df9aaaabb083120f45ec2",
            "display": "Hand Soap"
          },
          {
            "id": "a07df9aaaabb083120f45ec2",
            "display": "Moisturizer & Body Oil"
          },
          {
            "id": "a57df9aaaabb083120f45ec2",
            "display": "Suncare & Tanning"
          },
          {
            "id": "a67df9aaaabb083120f45ec2",
            "display": "Tools"
          }
        ]
      },
      {
        "id": "Global & Traditional Wear000e8975d97b4e80ef00a955",
        "display": "Global & Traditional Wear",
        "subcategories": []
      },
      {
        "id": "9ab476dc402403bf28a2606b",
        "display": "Ao Dais",
        "subcategories": []
      },
      {
        "id": "9bb476dc402403bf28a2606b",
        "display": "Cheongsams & Qipaos",
        "subcategories": []
      },
      {
        "id": "9db476dc402403bf28a2606b",
        "display": "Dirndls",
        "subcategories": []
      },
      {
        "id": "a2b476dd402403bf28a2606b",
        "display": "Dupattas & Stoles",
        "subcategories": []
      },
      {
        "id": "9cb476dc402403bf28a2606b",
        "display": "Hanboks",
        "subcategories": []
      },
      {
        "id": "a3b476dd402403bf28a2606b",
        "display": "Harem Pants",
        "subcategories": []
      },
      {
        "id": "9eb476dc402403bf28a2606b",
        "display": "Hijabs",
        "subcategories": []
      },
      {
        "id": "9fb476dd402403bf28a2606b",
        "display": "Huipils",
        "subcategories": []
      },
      {
        "id": "a0b476dd402403bf28a2606b",
        "display": "Kaftans",
        "subcategories": []
      },
      {
        "id": "a1b476dd402403bf28a2606b",
        "display": "Kimonos & Yukatas",
        "subcategories": []
      },
      {
        "id": "a4b476dd402403bf28a2606b",
        "display": "Kurta Bottoms",
        "subcategories": []
      },
      {
        "id": "a5b476dd402403bf28a2606b",
        "display": "Kurtas",
        "subcategories": []
      },
      {
        "id": "a6b476dd402403bf28a2606b",
        "display": "Lehengas",
        "subcategories": []
      },
      {
        "id": "a7b476dd402403bf28a2606b",
        "display": "Palazzo Pants",
        "subcategories": []
      },
      {
        "id": "a8b476dd402403bf28a2606b",
        "display": "Patiala Pants",
        "subcategories": []
      },
      {
        "id": "a9b476dd402403bf28a2606b",
        "display": "Salwars",
        "subcategories": []
      },
      {
        "id": "aab476dd402403bf28a2606b",
        "display": "Saree Blouses",
        "subcategories": []
      },
      {
        "id": "abb476dd402403bf28a2606b",
        "display": "Sarees",
        "subcategories": []
      },
      {
        "id": "acb476dd402403bf28a2606b",
        "display": "Treggings",
        "subcategories": []
      },
      {
        "id": "002e8975d97b4e80ef00a955",
        "display": "Other",
        "subcategories": []
      }
    ]
  },
  {
    "id": "01008c10d97b4e1245005764",
    "display": "Men",
    "categories": [
      {
        "id": "02008c10d97b4e1245005764",
        "display": "Accessories",
        "subcategories": [
          {
            "id": "01009813d97b4e3995005764",
            "display": "Belts"
          },
          {
            "id": "03009813d97b4e3995005764",
            "display": "Cuff Links"
          },
          {
            "id": "a87df9aaaabb083120f45ec2",
            "display": "Face Masks"
          },
          {
            "id": "01002f3cd97b4edf70005784",
            "display": "Glasses"
          },
          {
            "id": "04009813d97b4e3995005764",
            "display": "Gloves"
          },
          {
            "id": "05009813d97b4e3995005764",
            "display": "Hats"
          },
          {
            "id": "06009813d97b4e3995005764",
            "display": "Jewelry"
          },
          {
            "id": "0f00d070d97b4eaedd005776",
            "display": "Key & Card Holders"
          },
          {
            "id": "1100d070d97b4eaedd005776",
            "display": "Money Clips"
          },
          {
            "id": "08009813d97b4e3995005764",
            "display": "Phone Cases"
          },
          {
            "id": "09009813d97b4e3995005764",
            "display": "Pocket Squares"
          },
          {
            "id": "0a009813d97b4e3995005764",
            "display": "Scarves"
          },
          {
            "id": "0b009813d97b4e3995005764",
            "display": "Sunglasses"
          },
          {
            "id": "0c009813d97b4e3995005764",
            "display": "Suspenders"
          },
          {
            "id": "0d009813d97b4e3995005764",
            "display": "Ties"
          },
          {
            "id": "0e009813d97b4e3995005764",
            "display": "Watches"
          }
        ]
      },
      {
        "id": "03008c10d97b4e1245005764",
        "display": "Bags",
        "subcategories": [
          {
            "id": "0f009813d97b4e3995005764",
            "display": "Backpacks"
          },
          {
            "id": "a97df9aaaabb083120f45ec2",
            "display": "Belt Bags"
          },
          {
            "id": "10009813d97b4e3995005764",
            "display": "Briefcases"
          },
          {
            "id": "11009813d97b4e3995005764",
            "display": "Duffel Bags"
          },
          {
            "id": "12009813d97b4e3995005764",
            "display": "Laptop Bags"
          },
          {
            "id": "13009813d97b4e3995005764",
            "display": "Luggage & Travel Bags"
          },
          {
            "id": "14009813d97b4e3995005764",
            "display": "Messenger Bags"
          },
          {
            "id": "ab7df9aaaabb083120f45ec2",
            "display": "Toiletry Bags"
          },
          {
            "id": "16009813d97b4e3995005764",
            "display": "Wallets"
          }
        ]
      },
      {
        "id": "04008c10d97b4e1245005764",
        "display": "Jackets & Coats",
        "subcategories": [
          {
            "id": "18009813d97b4e3995005764",
            "display": "Bomber & Varsity"
          },
          {
            "id": "19009813d97b4e3995005764",
            "display": "Lightweight & Shirt Jackets"
          },
          {
            "id": "1a009813d97b4e3995005764",
            "display": "Military & Field"
          },
          {
            "id": "1c009813d97b4e3995005764",
            "display": "Pea Coats"
          },
          {
            "id": "1d009813d97b4e3995005764",
            "display": "Performance Jackets"
          },
          {
            "id": "1e009813d97b4e3995005764",
            "display": "Puffers"
          },
          {
            "id": "1f009813d97b4e3995005764",
            "display": "Raincoats"
          },
          {
            "id": "20009813d97b4e3995005764",
            "display": "Ski & Snowboard"
          },
          {
            "id": "21009813d97b4e3995005764",
            "display": "Trench Coats"
          },
          {
            "id": "23009813d97b4e3995005764",
            "display": "Vests"
          },
          {
            "id": "22009813d97b4e3995005764",
            "display": "Windbreakers"
          }
        ]
      },
      {
        "id": "05008c10d97b4e1245005764",
        "display": "Jeans",
        "subcategories": [
          {
            "id": "24009813d97b4e3995005764",
            "display": "Bootcut"
          },
          {
            "id": "25009813d97b4e3995005764",
            "display": "Relaxed"
          },
          {
            "id": "29009813d97b4e3995005764",
            "display": "Skinny"
          },
          {
            "id": "28009813d97b4e3995005764",
            "display": "Slim"
          },
          {
            "id": "27009813d97b4e3995005764",
            "display": "Slim Straight"
          },
          {
            "id": "26009813d97b4e3995005764",
            "display": "Straight"
          }
        ]
      },
      {
        "id": "06008c10d97b4e1245005764",
        "display": "Pants",
        "subcategories": [
          {
            "id": "2b009813d97b4e3995005764",
            "display": "Cargo"
          },
          {
            "id": "2a009813d97b4e3995005764",
            "display": "Chinos & Khakis"
          },
          {
            "id": "2c009813d97b4e3995005764",
            "display": "Corduroy"
          },
          {
            "id": "2d009813d97b4e3995005764",
            "display": "Dress"
          },
          {
            "id": "2f009813d97b4e3995005764",
            "display": "Sweatpants & Joggers"
          }
        ]
      },
      {
        "id": "07008c10d97b4e1245005764",
        "display": "Shirts",
        "subcategories": [
          {
            "id": "30009813d97b4e3995005764",
            "display": "Casual Button Down Shirts"
          },
          {
            "id": "31009813d97b4e3995005764",
            "display": "Dress Shirts"
          },
          {
            "id": "ac7df9aaaabb083120f45ec2",
            "display": "Jerseys"
          },
          {
            "id": "32009813d97b4e3995005764",
            "display": "Polos"
          },
          {
            "id": "02002f3cd97b4edf70005784",
            "display": "Sweatshirts & Hoodies"
          },
          {
            "id": "3400d070d97b4eaedd005776",
            "display": "Tank Tops"
          },
          {
            "id": "03002f3cd97b4edf70005784",
            "display": "Tees - Long Sleeve"
          },
          {
            "id": "33009813d97b4e3995005764",
            "display": "Tees - Short Sleeve"
          }
        ]
      },
      {
        "id": "08008c10d97b4e1245005764",
        "display": "Shoes",
        "subcategories": [
          {
            "id": "38009813d97b4e3995005764",
            "display": "Athletic Shoes"
          },
          {
            "id": "39009813d97b4e3995005764",
            "display": "Boat Shoes"
          },
          {
            "id": "04002f3cd97b4edf70005784",
            "display": "Boots"
          },
          {
            "id": "34009813d97b4e3995005764",
            "display": "Chukka Boots"
          },
          {
            "id": "36009813d97b4e3995005764",
            "display": "Cowboy & Western Boots"
          },
          {
            "id": "3a009813d97b4e3995005764",
            "display": "Loafers & Slip-Ons"
          },
          {
            "id": "3b009813d97b4e3995005764",
            "display": "Oxfords & Derbys"
          },
          {
            "id": "37009813d97b4e3995005764",
            "display": "Rain & Snow Boots"
          },
          {
            "id": "3c009813d97b4e3995005764",
            "display": "Sandals & Flip-Flops"
          },
          {
            "id": "3d009813d97b4e3995005764",
            "display": "Sneakers"
          }
        ]
      },
      {
        "id": "09008c10d97b4e1245005764",
        "display": "Shorts",
        "subcategories": [
          {
            "id": "3e009813d97b4e3995005764",
            "display": "Athletic"
          },
          {
            "id": "3f009813d97b4e3995005764",
            "display": "Cargo"
          },
          {
            "id": "40009813d97b4e3995005764",
            "display": "Flat Front"
          },
          {
            "id": "41009813d97b4e3995005764",
            "display": "Hybrids"
          },
          {
            "id": "05002f3cd97b4edf70005784",
            "display": "Jean Shorts"
          }
        ]
      },
      {
        "id": "0a008c10d97b4e1245005764",
        "display": "Suits & Blazers",
        "subcategories": [
          {
            "id": "44009813d97b4e3995005764",
            "display": "Sport Coats & Blazers"
          },
          {
            "id": "43009813d97b4e3995005764",
            "display": "Suits"
          },
          {
            "id": "45009813d97b4e3995005764",
            "display": "Tuxedos"
          },
          {
            "id": "46009813d97b4e3995005764",
            "display": "Vests"
          }
        ]
      },
      {
        "id": "0b008c10d97b4e1245005764",
        "display": "Sweaters",
        "subcategories": [
          {
            "id": "49009813d97b4e3995005764",
            "display": "Cardigan"
          },
          {
            "id": "4a009813d97b4e3995005764",
            "display": "Crewneck"
          },
          {
            "id": "4c009813d97b4e3995005764",
            "display": "Turtleneck"
          },
          {
            "id": "4d009813d97b4e3995005764",
            "display": "V-Neck"
          },
          {
            "id": "4f009813d97b4e3995005764",
            "display": "Zip Up"
          }
        ]
      },
      {
        "id": "0d008c10d97b4e1245005764",
        "display": "Swim",
        "subcategories": [
          {
            "id": "54009813d97b4e3995005764",
            "display": "Board Shorts"
          },
          {
            "id": "56009813d97b4e3995005764",
            "display": "Hybrids"
          },
          {
            "id": "57009813d97b4e3995005764",
            "display": "Rash Guards"
          },
          {
            "id": "55009813d97b4e3995005764",
            "display": "Swim Trunks"
          }
        ]
      },
      {
        "id": "0e008c10d97b4e1245005764",
        "display": "Underwear & Socks",
        "subcategories": [
          {
            "id": "62009813d97b4e3995005764",
            "display": "Athletic Socks"
          },
          {
            "id": "59009813d97b4e3995005764",
            "display": "Boxer Briefs"
          },
          {
            "id": "5a009813d97b4e3995005764",
            "display": "Boxers"
          },
          {
            "id": "5b009813d97b4e3995005764",
            "display": "Briefs"
          },
          {
            "id": "61009813d97b4e3995005764",
            "display": "Casual Socks"
          },
          {
            "id": "60009813d97b4e3995005764",
            "display": "Dress Socks"
          },
          {
            "id": "5e009813d97b4e3995005764",
            "display": "Undershirts"
          }
        ]
      },
      {
        "id": "717df9aaaabb083120f45ec2",
        "display": "Grooming",
        "subcategories": [
          {
            "id": "ad7df9aaaabb083120f45ec2",
            "display": "Cleanser"
          },
          {
            "id": "b17df9aaaabb083120f45ec2",
            "display": "Grooming Tools"
          },
          {
            "id": "ae7df9aaaabb083120f45ec2",
            "display": "Hair Care"
          },
          {
            "id": "af7df9aaaabb083120f45ec2",
            "display": "Moisturizer"
          },
          {
            "id": "b07df9aaaabb083120f45ec2",
            "display": "Shaving"
          },
          {
            "id": "b37df9aaaabb083120f45ec2",
            "display": "Suncare"
          },
          {
            "id": "b27df9aaaabb083120f45ec2",
            "display": "Treatments"
          }
        ]
      },
      {
        "id": "Global & Traditional Wear01008c10d97b4e1245005764",
        "display": "Global & Traditional Wear",
        "subcategories": []
      },
      {
        "id": "b2b476dd402403bf28a2606b",
        "display": "Agbadas & Dashikis",
        "subcategories": []
      },
      {
        "id": "b3b476dd402403bf28a2606b",
        "display": "Ao Dais",
        "subcategories": []
      },
      {
        "id": "b4b476dd402403bf28a2606b",
        "display": "Changshans",
        "subcategories": []
      },
      {
        "id": "b5b476dd402403bf28a2606b",
        "display": "Hanboks",
        "subcategories": []
      },
      {
        "id": "b6b476dd402403bf28a2606b",
        "display": "Kaftans",
        "subcategories": []
      },
      {
        "id": "b7b476dd402403bf28a2606b",
        "display": "Keffiyehs",
        "subcategories": []
      },
      {
        "id": "b8b476dd402403bf28a2606b",
        "display": "Kilts",
        "subcategories": []
      },
      {
        "id": "b9b476dd402403bf28a2606b",
        "display": "Kimonos & Yukatas",
        "subcategories": []
      },
      {
        "id": "aeb476dd402403bf28a2606b",
        "display": "Kurta Bottoms",
        "subcategories": []
      },
      {
        "id": "afb476dd402403bf28a2606b",
        "display": "Kurtas",
        "subcategories": []
      },
      {
        "id": "bab476dd402403bf28a2606b",
        "display": "Lederhosen",
        "subcategories": []
      },
      {
        "id": "b0b476dd402403bf28a2606b",
        "display": "Nehru Jackets",
        "subcategories": []
      },
      {
        "id": "bbb476dd402403bf28a2606b",
        "display": "Ponchos & Serapes",
        "subcategories": []
      },
      {
        "id": "b1b476dd402403bf28a2606b",
        "display": "Sherwanis",
        "subcategories": []
      },
      {
        "id": "10008c10d97b4e1245005764",
        "display": "Other",
        "subcategories": []
      }
    ]
  },
  {
    "id": "20008c10d97b4e1245005764",
    "display": "Kids",
    "categories": [
      {
        "id": "21008c10d97b4e1245005764",
        "display": "Accessories",
        "subcategories": [
          {
            "id": "6b009813d97b4e3995005764",
            "display": "Bags"
          },
          {
            "id": "06002f3cd97b4edf70005784",
            "display": "Belts"
          },
          {
            "id": "07002f3cd97b4edf70005784",
            "display": "Bibs"
          },
          {
            "id": "08002f3cd97b4edf70005784",
            "display": "Diaper Covers"
          },
          {
            "id": "b67df9aaaabb083120f45ec2",
            "display": "Face Masks"
          },
          {
            "id": "6e009813d97b4e3995005764",
            "display": "Hair Accessories"
          },
          {
            "id": "09002f3cd97b4edf70005784",
            "display": "Hats"
          },
          {
            "id": "6d009813d97b4e3995005764",
            "display": "Jewelry"
          },
          {
            "id": "0a002f3cd97b4edf70005784",
            "display": "Mittens"
          },
          {
            "id": "0b002f3cd97b4edf70005784",
            "display": "Socks & Tights"
          },
          {
            "id": "0c002f3cd97b4edf70005784",
            "display": "Sunglasses"
          },
          {
            "id": "0d002f3cd97b4edf70005784",
            "display": "Suspenders"
          },
          {
            "id": "0e002f3cd97b4edf70005784",
            "display": "Ties"
          },
          {
            "id": "0f002f3cd97b4edf70005784",
            "display": "Underwear"
          },
          {
            "id": "6c009813d97b4e3995005764",
            "display": "Watches"
          }
        ]
      },
      {
        "id": "24002b34d97b4efb71005784",
        "display": "Bottoms",
        "subcategories": [
          {
            "id": "10002f3cd97b4edf70005784",
            "display": "Casual"
          },
          {
            "id": "11002f3cd97b4edf70005784",
            "display": "Formal"
          },
          {
            "id": "12002f3cd97b4edf70005784",
            "display": "Jeans"
          },
          {
            "id": "84009813d97b4e3995005764",
            "display": "Jumpsuits & Rompers"
          },
          {
            "id": "85009813d97b4e3995005764",
            "display": "Leggings"
          },
          {
            "id": "13002f3cd97b4edf70005784",
            "display": "Overalls"
          },
          {
            "id": "14002f3cd97b4edf70005784",
            "display": "Shorts"
          },
          {
            "id": "93009813d97b4e3995005764",
            "display": "Skirts"
          },
          {
            "id": "94009813d97b4e3995005764",
            "display": "Skorts"
          },
          {
            "id": "86009813d97b4e3995005764",
            "display": "Sweatpants & Joggers"
          }
        ]
      },
      {
        "id": "22008c10d97b4e1245005764",
        "display": "Dresses",
        "subcategories": [
          {
            "id": "70009813d97b4e3995005764",
            "display": "Casual"
          },
          {
            "id": "6f009813d97b4e3995005764",
            "display": "Formal"
          }
        ]
      },
      {
        "id": "23008c10d97b4e1245005764",
        "display": "Jackets & Coats",
        "subcategories": [
          {
            "id": "71009813d97b4e3995005764",
            "display": "Blazers"
          },
          {
            "id": "72009813d97b4e3995005764",
            "display": "Capes"
          },
          {
            "id": "73009813d97b4e3995005764",
            "display": "Jean Jackets"
          },
          {
            "id": "75009813d97b4e3995005764",
            "display": "Pea Coats"
          },
          {
            "id": "76009813d97b4e3995005764",
            "display": "Puffers"
          },
          {
            "id": "77009813d97b4e3995005764",
            "display": "Raincoats"
          },
          {
            "id": "78009813d97b4e3995005764",
            "display": "Vests"
          }
        ]
      },
      {
        "id": "26008c10d97b4e1245005764",
        "display": "Matching Sets",
        "subcategories": []
      },
      {
        "id": "25008c10d97b4e1245005764",
        "display": "One Pieces",
        "subcategories": [
          {
            "id": "15002f3cd97b4edf70005784",
            "display": "Bodysuits"
          },
          {
            "id": "16002f3cd97b4edf70005784",
            "display": "Footies"
          }
        ]
      },
      {
        "id": "27008c10d97b4e1245005764",
        "display": "Pajamas",
        "subcategories": [
          {
            "id": "7d009813d97b4e3995005764",
            "display": "Nightgowns"
          },
          {
            "id": "80009813d97b4e3995005764",
            "display": "Pajama Bottoms"
          },
          {
            "id": "18002f3cd97b4edf70005784",
            "display": "Pajama Sets"
          },
          {
            "id": "7f009813d97b4e3995005764",
            "display": "Pajama Tops"
          },
          {
            "id": "81009813d97b4e3995005764",
            "display": "Robes"
          },
          {
            "id": "82009813d97b4e3995005764",
            "display": "Sleep Sacks"
          }
        ]
      },
      {
        "id": "2e008c10d97b4e1245005764",
        "display": "Shirts & Tops",
        "subcategories": [
          {
            "id": "9f009813d97b4e3995005764",
            "display": "Blouses"
          },
          {
            "id": "a0009813d97b4e3995005764",
            "display": "Button Down Shirts"
          },
          {
            "id": "a1009813d97b4e3995005764",
            "display": "Camisoles"
          },
          {
            "id": "b77df9aaaabb083120f45ec2",
            "display": "Jerseys"
          },
          {
            "id": "a2009813d97b4e3995005764",
            "display": "Polos"
          },
          {
            "id": "19002f3cd97b4edf70005784",
            "display": "Sweaters"
          },
          {
            "id": "a3009813d97b4e3995005764",
            "display": "Sweatshirts & Hoodies"
          },
          {
            "id": "a4009813d97b4e3995005764",
            "display": "Tank Tops"
          },
          {
            "id": "a5009813d97b4e3995005764",
            "display": "Tees - Long Sleeve"
          },
          {
            "id": "a6009813d97b4e3995005764",
            "display": "Tees - Short Sleeve"
          }
        ]
      },
      {
        "id": "29008c10d97b4e1245005764",
        "display": "Shoes",
        "subcategories": [
          {
            "id": "1a002f3cd97b4edf70005784",
            "display": "Baby & Walker"
          },
          {
            "id": "8e009813d97b4e3995005764",
            "display": "Boots"
          },
          {
            "id": "8d009813d97b4e3995005764",
            "display": "Dress Shoes"
          },
          {
            "id": "1b002f3cd97b4edf70005784",
            "display": "Moccasins"
          },
          {
            "id": "8f009813d97b4e3995005764",
            "display": "Rain & Snow Boots"
          },
          {
            "id": "1c002f3cd97b4edf70005784",
            "display": "Sandals & Flip Flops"
          },
          {
            "id": "89009813d97b4e3995005764",
            "display": "Slippers"
          },
          {
            "id": "8b009813d97b4e3995005764",
            "display": "Sneakers"
          },
          {
            "id": "8a009813d97b4e3995005764",
            "display": "Water Shoes"
          }
        ]
      },
      {
        "id": "2d008c10d97b4e1245005764",
        "display": "Swim",
        "subcategories": [
          {
            "id": "9b009813d97b4e3995005764",
            "display": "Bikinis"
          },
          {
            "id": "9c009813d97b4e3995005764",
            "display": "Coverups"
          },
          {
            "id": "9a009813d97b4e3995005764",
            "display": "One Piece"
          },
          {
            "id": "9d009813d97b4e3995005764",
            "display": "Rashguards"
          },
          {
            "id": "9e009813d97b4e3995005764",
            "display": "Swim Trunks"
          }
        ]
      },
      {
        "id": "30008c10d97b4e1245005764",
        "display": "Costumes",
        "subcategories": [
          {
            "id": "1d002f3cd97b4edf70005784",
            "display": "Dance"
          },
          {
            "id": "1e002f3cd97b4edf70005784",
            "display": "Halloween"
          },
          {
            "id": "21002f3cd97b4edf70005784",
            "display": "Seasonal"
          },
          {
            "id": "20002f3cd97b4edf70005784",
            "display": "Superhero"
          },
          {
            "id": "1f002f3cd97b4edf70005784",
            "display": "Theater"
          }
        ]
      },
      {
        "id": "727df9aaaabb083120f45ec2",
        "display": "Bath, Skin & Hair",
        "subcategories": [
          {
            "id": "b87df9aaaabb083120f45ec2",
            "display": "Bath & Body"
          },
          {
            "id": "b97df9aaaabb083120f45ec2",
            "display": "Hair Care"
          },
          {
            "id": "ba7df9aaaabb083120f45ec2",
            "display": "Moisturizer"
          },
          {
            "id": "bb7df9aaaabb083120f45ec2",
            "display": "Suncare"
          },
          {
            "id": "bc7df9aaaabb083120f45ec2",
            "display": "Tools"
          }
        ]
      },
      {
        "id": "737df9aaaabb083120f45ec2",
        "display": "Toys",
        "subcategories": [
          {
            "id": "bd7df9aaaabb083120f45ec2",
            "display": "Action Figures & Playsets"
          },
          {
            "id": "be7df9aaaabb083120f45ec2",
            "display": "Building Sets & Blocks"
          },
          {
            "id": "c37df9aaaabb083120f45ec2",
            "display": "Cars & Vehicles"
          },
          {
            "id": "bf7df9aaaabb083120f45ec2",
            "display": "Dolls & Accessories"
          },
          {
            "id": "c07df9aaaabb083120f45ec2",
            "display": "Learning Toys"
          },
          {
            "id": "c47df9aaaabb083120f45ec2",
            "display": "Puzzles & Games"
          },
          {
            "id": "c17df9aaaabb083120f45ec2",
            "display": "Stuffed Animals"
          },
          {
            "id": "c27df9aaaabb083120f45ec2",
            "display": "Trading Cards"
          }
        ]
      },
      {
        "id": "31008c10d97b4e1245005764",
        "display": "Other",
        "subcategories": []
      }
    ]
  },
  {
    "id": "5b3b13d30640fd0aeb9c5cb6",
    "display": "Home",
    "categories": [
      {
        "id": "5c3b13d30640fd0aeb9c5cb6",
        "display": "Accents",
        "subcategories": [
          {
            "id": "643b13d30640fd0aeb9c5cb6",
            "display": "Accent Pillows"
          },
          {
            "id": "653b13d30640fd0aeb9c5cb6",
            "display": "Baskets & Bins"
          },
          {
            "id": "663b13d30640fd0aeb9c5cb6",
            "display": "Candles & Holders"
          },
          {
            "id": "673b13d30640fd0aeb9c5cb6",
            "display": "Coffee Table Books"
          },
          {
            "id": "683b13d30640fd0aeb9c5cb6",
            "display": "Curtains & Drapes"
          },
          {
            "id": "693b13d30640fd0aeb9c5cb6",
            "display": "Decor"
          },
          {
            "id": "6a3b13d30640fd0aeb9c5cb6",
            "display": "Door Mats"
          },
          {
            "id": "6b3b13d30640fd0aeb9c5cb6",
            "display": "Faux Florals"
          },
          {
            "id": "6c3b13d30640fd0aeb9c5cb6",
            "display": "Furniture Covers"
          },
          {
            "id": "b65eb22d0640fd1ab51c5d0b",
            "display": "Lanterns"
          },
          {
            "id": "6d3b13d30640fd0aeb9c5cb6",
            "display": "Picture Frames"
          },
          {
            "id": "b55eb22d0640fd1ab51c5d0b",
            "display": "Vases"
          }
        ]
      },
      {
        "id": "c66f798f402403a7f0016033",
        "display": "Art",
        "subcategories": [
          {
            "id": "c86f798f402403a7f0016033",
            "display": "Ceramics"
          },
          {
            "id": "c96f798f402403a7f0016033",
            "display": "Drawing & Illustrations"
          },
          {
            "id": "ca6f798f402403a7f0016033",
            "display": "Fiber Arts"
          },
          {
            "id": "cb6f7990402403a7f0016033",
            "display": "Glass Art"
          },
          {
            "id": "cc6f7990402403a7f0016033",
            "display": "Mixed Media"
          },
          {
            "id": "cd6f7990402403a7f0016033",
            "display": "Painting"
          },
          {
            "id": "ce6f7990402403a7f0016033",
            "display": "Photography"
          },
          {
            "id": "cf6f7990402403a7f0016033",
            "display": "Posters"
          },
          {
            "id": "d06f7990402403a7f0016033",
            "display": "Prints"
          },
          {
            "id": "d16f7990402403a7f0016033",
            "display": "Sculpture"
          }
        ]
      },
      {
        "id": "5d3b13d30640fd0aeb9c5cb6",
        "display": "Bath",
        "subcategories": [
          {
            "id": "b95eb22d0640fd1ab51c5d0b",
            "display": "Bath Accessories"
          },
          {
            "id": "6e3b13d30640fd0aeb9c5cb6",
            "display": "Bath Storage"
          },
          {
            "id": "6f3b13d30640fd0aeb9c5cb6",
            "display": "Bath Towels"
          },
          {
            "id": "703b13d30640fd0aeb9c5cb6",
            "display": "Beach Towels"
          },
          {
            "id": "713b13d30640fd0aeb9c5cb6",
            "display": "Hand Towels"
          },
          {
            "id": "723b13d30640fd0aeb9c5cb6",
            "display": "Mats"
          },
          {
            "id": "733b13d30640fd0aeb9c5cb6",
            "display": "Shower Curtains"
          },
          {
            "id": "ba5eb22d0640fd1ab51c5d0b",
            "display": "Vanity Mirrors"
          },
          {
            "id": "743b13d30640fd0aeb9c5cb6",
            "display": "Vanity Trays"
          },
          {
            "id": "753b13d30640fd0aeb9c5cb6",
            "display": "Wash Cloths"
          }
        ]
      },
      {
        "id": "5e3b13d30640fd0aeb9c5cb6",
        "display": "Bedding",
        "subcategories": [
          {
            "id": "763b13d30640fd0aeb9c5cb6",
            "display": "Blankets & Throws"
          },
          {
            "id": "773b13d30640fd0aeb9c5cb6",
            "display": "Comforters"
          },
          {
            "id": "783b13d30640fd0aeb9c5cb6",
            "display": "Duvet Covers"
          },
          {
            "id": "793b13d30640fd0aeb9c5cb6",
            "display": "Mattress Covers"
          },
          {
            "id": "7a3b13d30640fd0aeb9c5cb6",
            "display": "Pillows"
          },
          {
            "id": "7b3b13d30640fd0aeb9c5cb6",
            "display": "Quilts"
          },
          {
            "id": "7c3b13d30640fd0aeb9c5cb6",
            "display": "Sheets"
          }
        ]
      },
      {
        "id": "c76f798f402403a7f0016033",
        "display": "Design",
        "subcategories": [
          {
            "id": "d26f7990402403a7f0016033",
            "display": "Birthday Cards"
          },
          {
            "id": "d36f7990402403a7f0016033",
            "display": "Business Cards"
          },
          {
            "id": "d46f7990402403a7f0016033",
            "display": "Planners"
          },
          {
            "id": "d56f7990402403a7f0016033",
            "display": "Stamps"
          },
          {
            "id": "d66f7990402403a7f0016033",
            "display": "Stickers"
          },
          {
            "id": "d76f7990402403a7f0016033",
            "display": "Thank You Cards"
          }
        ]
      },
      {
        "id": "bc5eb22d0640fd1ab51c5d0b",
        "display": "Dining",
        "subcategories": [
          {
            "id": "bd5eb22d0640fd1ab51c5d0b",
            "display": "Bar Accessories"
          },
          {
            "id": "be5eb22d0640fd1ab51c5d0b",
            "display": "Dinnerware"
          },
          {
            "id": "bf5eb22d0640fd1ab51c5d0b",
            "display": "Drinkware"
          },
          {
            "id": "c05eb22d0640fd1ab51c5d0b",
            "display": "Flatware"
          },
          {
            "id": "c67df9aaaabb083120f45ec2",
            "display": "Mugs"
          },
          {
            "id": "c15eb22d0640fd1ab51c5d0b",
            "display": "Serveware"
          },
          {
            "id": "c25eb22d0640fd1ab51c5d0b",
            "display": "Serving Utensils"
          },
          {
            "id": "c35eb22d0640fd1ab51c5d0b",
            "display": "Table Linens"
          },
          {
            "id": "c77df9aaaabb083120f45ec2",
            "display": "Water Bottles & Thermoses"
          }
        ]
      },
      {
        "id": "747df9aaaabb083120f45ec2",
        "display": "Games",
        "subcategories": [
          {
            "id": "c87df9aaaabb083120f45ec2",
            "display": "Board Games"
          },
          {
            "id": "c97df9aaaabb083120f45ec2",
            "display": "Card Games"
          },
          {
            "id": "cb7df9aaaabb083120f45ec2",
            "display": "Outdoor Games"
          },
          {
            "id": "ca7df9aaaabb083120f45ec2",
            "display": "Puzzles"
          }
        ]
      },
      {
        "id": "5f3b13d30640fd0aeb9c5cb6",
        "display": "Holiday",
        "subcategories": [
          {
            "id": "7d3b13d30640fd0aeb9c5cb6",
            "display": "Garland"
          },
          {
            "id": "7e3b13d30640fd0aeb9c5cb6",
            "display": "Holiday Blankets & Throws"
          },
          {
            "id": "7f3b13d30640fd0aeb9c5cb6",
            "display": "Holiday Decor"
          },
          {
            "id": "803b13d30640fd0aeb9c5cb6",
            "display": "Holiday Pillows"
          },
          {
            "id": "813b13d30640fd0aeb9c5cb6",
            "display": "Ornaments"
          },
          {
            "id": "823b13d30640fd0aeb9c5cb6",
            "display": "String Lights"
          },
          {
            "id": "833b13d30640fd0aeb9c5cb6",
            "display": "Wreaths"
          }
        ]
      },
      {
        "id": "bb5eb22d0640fd1ab51c5d0b",
        "display": "Kitchen",
        "subcategories": [
          {
            "id": "cc7df9aaaabb083120f45ec2",
            "display": "BBQ & Grilling Tools"
          },
          {
            "id": "c45eb22d0640fd1ab51c5d0b",
            "display": "Bakeware"
          },
          {
            "id": "c65eb22d0640fd1ab51c5d0b",
            "display": "Coffee & Tea Accessories"
          },
          {
            "id": "c75eb22d0640fd1ab51c5d0b",
            "display": "Cookbooks"
          },
          {
            "id": "c85eb22d0640fd1ab51c5d0b",
            "display": "Cooking Utensils"
          },
          {
            "id": "c95eb22d0640fd1ab51c5d0b",
            "display": "Cookware"
          },
          {
            "id": "c55eb22d0640fd1ab51c5d0b",
            "display": "Food Storage"
          },
          {
            "id": "cb5eb22d0640fd1ab51c5d0b",
            "display": "Kitchen Linens"
          },
          {
            "id": "ca5eb22d0640fd1ab51c5d0b",
            "display": "Kitchen Tools"
          },
          {
            "id": "cc5eb22d0640fd1ab51c5d0b",
            "display": "Knives & Cutlery"
          }
        ]
      },
      {
        "id": "603b13d30640fd0aeb9c5cb6",
        "display": "Office",
        "subcategories": [
          {
            "id": "843b13d30640fd0aeb9c5cb6",
            "display": "Arts & Crafts"
          },
          {
            "id": "853b13d30640fd0aeb9c5cb6",
            "display": "Binders & Folders"
          },
          {
            "id": "863b13d30640fd0aeb9c5cb6",
            "display": "Calendars"
          },
          {
            "id": "873b13d30640fd0aeb9c5cb6",
            "display": "Labels & Label Makers"
          },
          {
            "id": "883b13d30640fd0aeb9c5cb6",
            "display": "Notebooks & Journals"
          },
          {
            "id": "893b13d30640fd0aeb9c5cb6",
            "display": "Pencil Cases"
          },
          {
            "id": "8a3b13d30640fd0aeb9c5cb6",
            "display": "Planners"
          },
          {
            "id": "8b3b13d30640fd0aeb9c5cb6",
            "display": "Shipping Supplies"
          },
          {
            "id": "8c3b13d30640fd0aeb9c5cb6",
            "display": "Stationery"
          }
        ]
      },
      {
        "id": "613b13d30640fd0aeb9c5cb6",
        "display": "Party Supplies",
        "subcategories": [
          {
            "id": "8d3b13d30640fd0aeb9c5cb6",
            "display": "Cake Candles"
          },
          {
            "id": "8e3b13d30640fd0aeb9c5cb6",
            "display": "Cake Toppers"
          },
          {
            "id": "8f3b13d30640fd0aeb9c5cb6",
            "display": "Cards & Invitations"
          },
          {
            "id": "903b13d30640fd0aeb9c5cb6",
            "display": "Decorations"
          },
          {
            "id": "953b13d30640fd0aeb9c5cb6",
            "display": "Disposable Tableware"
          },
          {
            "id": "913b13d30640fd0aeb9c5cb6",
            "display": "Favors"
          },
          {
            "id": "923b13d30640fd0aeb9c5cb6",
            "display": "Gift Wrap"
          },
          {
            "id": "933b13d30640fd0aeb9c5cb6",
            "display": "Hats"
          },
          {
            "id": "943b13d30640fd0aeb9c5cb6",
            "display": "Party Lights"
          }
        ]
      },
      {
        "id": "623b13d30640fd0aeb9c5cb6",
        "display": "Storage & Organization",
        "subcategories": [
          {
            "id": "963b13d30640fd0aeb9c5cb6",
            "display": "Closet Accessories"
          },
          {
            "id": "973b13d30640fd0aeb9c5cb6",
            "display": "Drawer Liners"
          },
          {
            "id": "983b13d30640fd0aeb9c5cb6",
            "display": "Garment Bags"
          },
          {
            "id": "993b13d30640fd0aeb9c5cb6",
            "display": "Jewelry Organizers"
          },
          {
            "id": "9a3b13d30640fd0aeb9c5cb6",
            "display": "Makeup Organizers"
          },
          {
            "id": "9b3b13d30640fd0aeb9c5cb6",
            "display": "Storage"
          }
        ]
      },
      {
        "id": "633b13d30640fd0aeb9c5cb6",
        "display": "Wall Decor",
        "subcategories": [
          {
            "id": "9c3b13d30640fd0aeb9c5cb6",
            "display": "Art & Decals"
          },
          {
            "id": "b75eb22d0640fd1ab51c5d0b",
            "display": "Clocks"
          },
          {
            "id": "9d3b13d30640fd0aeb9c5cb6",
            "display": "Display Shelves"
          },
          {
            "id": "9e3b13d30640fd0aeb9c5cb6",
            "display": "Hooks"
          },
          {
            "id": "b85eb22d0640fd1ab51c5d0b",
            "display": "Mirrors"
          },
          {
            "id": "9f3b13d30640fd0aeb9c5cb6",
            "display": "Tapestries"
          },
          {
            "id": "a03b13d30640fd0aeb9c5cb6",
            "display": "Wallpaper"
          }
        ]
      },
      {
        "id": "a93b13d30640fd0aeb9c5cb6",
        "display": "Other",
        "subcategories": []
      }
    ]
  },
  {
    "id": "af08bf904024037d7a7b5fad",
    "display": "Pets",
    "categories": [
      {
        "id": "b008bf914024037d7a7b5fad",
        "display": "Dog",
        "subcategories": [
          {
            "id": "b708bf914024037d7a7b5fad",
            "display": "Bedding & Blankets"
          },
          {
            "id": "b808bf914024037d7a7b5fad",
            "display": "Bowls & Feeders"
          },
          {
            "id": "b908bf914024037d7a7b5fad",
            "display": "Carriers & Travel"
          },
          {
            "id": "ba08bf914024037d7a7b5fad",
            "display": "Clothing & Accessories"
          },
          {
            "id": "bb08bf914024037d7a7b5fad",
            "display": "Collars, Leashes & Harnesses"
          },
          {
            "id": "bc08bf914024037d7a7b5fad",
            "display": "Grooming"
          },
          {
            "id": "bd08bf914024037d7a7b5fad",
            "display": "Housebreaking"
          },
          {
            "id": "be08bf914024037d7a7b5fad",
            "display": "Toys"
          }
        ]
      },
      {
        "id": "b108bf914024037d7a7b5fad",
        "display": "Cat",
        "subcategories": [
          {
            "id": "bf08bf914024037d7a7b5fad",
            "display": "Beds"
          },
          {
            "id": "c008bf914024037d7a7b5fad",
            "display": "Bowls & Feeders"
          },
          {
            "id": "c108bf914024037d7a7b5fad",
            "display": "Carriers & Travel"
          },
          {
            "id": "c208bf914024037d7a7b5fad",
            "display": "Clothing & Accessories"
          },
          {
            "id": "c308bf914024037d7a7b5fad",
            "display": "Collars, Leashes  & Harnesses"
          },
          {
            "id": "c408bf914024037d7a7b5fad",
            "display": "Grooming"
          },
          {
            "id": "c508bf914024037d7a7b5fad",
            "display": "Scratchers"
          },
          {
            "id": "c608bf914024037d7a7b5fad",
            "display": "Toys"
          }
        ]
      },
      {
        "id": "b208bf914024037d7a7b5fad",
        "display": "Bird",
        "subcategories": [
          {
            "id": "c708bf914024037d7a7b5fad",
            "display": "Cages & Covers"
          },
          {
            "id": "c808bf914024037d7a7b5fad",
            "display": "Feeders & Waterers"
          },
          {
            "id": "c908bf914024037d7a7b5fad",
            "display": "Perches & Swings"
          },
          {
            "id": "ca08bf914024037d7a7b5fad",
            "display": "Toys"
          }
        ]
      },
      {
        "id": "b308bf914024037d7a7b5fad",
        "display": "Fish",
        "subcategories": [
          {
            "id": "cb08bf914024037d7a7b5fad",
            "display": "Aquarium Kits"
          },
          {
            "id": "cc08bf914024037d7a7b5fad",
            "display": "Cleaning & Maintenance"
          },
          {
            "id": "cd08bf914024037d7a7b5fad",
            "display": "Decor & Accessories"
          }
        ]
      },
      {
        "id": "b408bf914024037d7a7b5fad",
        "display": "Reptile",
        "subcategories": [
          {
            "id": "ce08bf914024037d7a7b5fad",
            "display": "Cleaning & Maintenance"
          },
          {
            "id": "cf08bf914024037d7a7b5fad",
            "display": "Habitats"
          },
          {
            "id": "d008bf914024037d7a7b5fad",
            "display": "Habitat Accessories"
          },
          {
            "id": "d108bf914024037d7a7b5fad",
            "display": "Heating & Lights"
          }
        ]
      },
      {
        "id": "b508bf914024037d7a7b5fad",
        "display": "Small Pets",
        "subcategories": [
          {
            "id": "d208bf914024037d7a7b5fad",
            "display": "Bedding"
          },
          {
            "id": "d308bf914024037d7a7b5fad",
            "display": "Bowls & Feeders"
          },
          {
            "id": "d408bf914024037d7a7b5fad",
            "display": "Cages & Habitats"
          },
          {
            "id": "d508bf914024037d7a7b5fad",
            "display": "Carriers"
          },
          {
            "id": "d608bf914024037d7a7b5fad",
            "display": "Grooming"
          },
          {
            "id": "d708bf914024037d7a7b5fad",
            "display": "Habitat Accessories"
          },
          {
            "id": "d808bf914024037d7a7b5fad",
            "display": "Toys"
          }
        ]
      },
      {
        "id": "b608bf914024037d7a7b5fad",
        "display": "Other",
        "subcategories": []
      }
    ]
  },
  {
    "id": "583c7d134024035188906153",
    "display": "Electronics",
    "categories": [
      {
        "id": "428e4884402403bc7f6c6157",
        "display": "Cameras, Photo & Video",
        "subcategories": [
          {
            "id": "85c8296f402403e02d3d615b",
            "display": "Digital Cameras"
          },
          {
            "id": "86c8296f402403e02d3d615b",
            "display": "Bags & Cases"
          },
          {
            "id": "87c8296f402403e02d3d615b",
            "display": "Binoculars & Scopes"
          },
          {
            "id": "88c8296f402403e02d3d615b",
            "display": "Film Photography"
          },
          {
            "id": "89c8296f402403e02d3d615b",
            "display": "Flashes"
          },
          {
            "id": "8ac8296f402403e02d3d615b",
            "display": "Lenses"
          },
          {
            "id": "8cc8296f402403e02d3d615b",
            "display": "Memory Cards"
          },
          {
            "id": "8dc8296f402403e02d3d615b",
            "display": "Simulated Cameras"
          },
          {
            "id": "8ec8296f402403e02d3d615b",
            "display": "Tripods & Monopods"
          },
          {
            "id": "8fc8296f402403e02d3d615b",
            "display": "Underwater Photography"
          },
          {
            "id": "90c8296f402403e02d3d615b",
            "display": "Video"
          },
          {
            "id": "91c8296f402403e02d3d615b",
            "display": "Camera Straps"
          }
        ]
      },
      {
        "id": "438e4884402403bc7f6c6157",
        "display": "Computers, Laptops & Parts",
        "subcategories": [
          {
            "id": "92c8296f402403e02d3d615b",
            "display": "Laptops"
          },
          {
            "id": "93c8296f402403e02d3d615b",
            "display": "Cables & Interconnects"
          },
          {
            "id": "94c8296f402403e02d3d615b",
            "display": "Camera Privacy Covers"
          },
          {
            "id": "95c8296f402403e02d3d615b",
            "display": "Computer Cable Adapters"
          },
          {
            "id": "96c8296f402403e02d3d615b",
            "display": "Computer Headsets"
          },
          {
            "id": "97c8296f402403e02d3d615b",
            "display": "Computer Microphones"
          },
          {
            "id": "98c8296f402403e02d3d615b",
            "display": "External Components"
          },
          {
            "id": "99c8296f402403e02d3d615b",
            "display": "Graphics Cards"
          },
          {
            "id": "9ac8296f402403e02d3d615b",
            "display": "Internal Components"
          },
          {
            "id": "9bc8296f402403e02d3d615b",
            "display": "Keyboards"
          },
          {
            "id": "9cc8296f402403e02d3d615b",
            "display": "Memory Card Readers"
          },
          {
            "id": "9dc8296f402403e02d3d615b",
            "display": "Mice"
          },
          {
            "id": "9ec8296f402403e02d3d615b",
            "display": "Mounts & Stands"
          },
          {
            "id": "9fc8296f402403e02d3d615b",
            "display": "Surge Protectors"
          },
          {
            "id": "a0c8296f402403e02d3d615b",
            "display": "Single Board Computers"
          },
          {
            "id": "a1c8296f402403e02d3d615b",
            "display": "USB Hubs"
          },
          {
            "id": "a2c8296f402403e02d3d615b",
            "display": "Webcams"
          }
        ]
      },
      {
        "id": "448e4884402403bc7f6c6157",
        "display": "Cell Phones & Accessories",
        "subcategories": [
          {
            "id": "a3c8296f402403e02d3d615b",
            "display": "Cell Phones"
          },
          {
            "id": "a4c8296f402403e02d3d615b",
            "display": "Holsters & Clips"
          },
          {
            "id": "a5c8296f402403e02d3d615b",
            "display": "Headsets"
          },
          {
            "id": "a6c8296f402403e02d3d615b",
            "display": "Screen Protectors"
          },
          {
            "id": "a7c8296f402403e02d3d615b",
            "display": "Cases"
          },
          {
            "id": "a8c8296f402403e02d3d615b",
            "display": "Covers"
          },
          {
            "id": "a9c8296f402403e02d3d615b",
            "display": "Skins & Bumpers"
          },
          {
            "id": "aac8296f402403e02d3d615b",
            "display": "Chargers"
          },
          {
            "id": "abc8296f402403e02d3d615b",
            "display": "Adapters"
          },
          {
            "id": "acc8296f402403e02d3d615b",
            "display": "Cables"
          }
        ]
      },
      {
        "id": "478e4884402403bc7f6c6157",
        "display": "Car Audio, Video & GPS",
        "subcategories": [
          {
            "id": "e19ea6f24024034403ea6160",
            "display": "GPS & Navigation"
          },
          {
            "id": "e29ea6f24024034403ea6160",
            "display": "Amplifiers"
          },
          {
            "id": "e39ea6f24024034403ea6160",
            "display": "Car Stereo Receivers"
          },
          {
            "id": "e49ea6f24024034403ea6160",
            "display": "Changers"
          },
          {
            "id": "e59ea6f24024034403ea6160",
            "display": "Digital Media Receivers"
          },
          {
            "id": "e69ea6f24024034403ea6160",
            "display": "Equalizers"
          },
          {
            "id": "e79ea6f24024034403ea6160",
            "display": "Satellite Radio"
          },
          {
            "id": "e89ea6f24024034403ea6160",
            "display": "Car Headphones"
          },
          {
            "id": "e99ea6f24024034403ea6160",
            "display": "In-Mirror Video"
          },
          {
            "id": "ea9ea6f24024034403ea6160",
            "display": "In-Visor Video"
          },
          {
            "id": "eb9ea6f24024034403ea6160",
            "display": "On-Dash Cameras"
          },
          {
            "id": "ec9ea6f24024034403ea6160",
            "display": "Overhead Video"
          },
          {
            "id": "ed9ea6f24024034403ea6160",
            "display": "Surround Processors"
          },
          {
            "id": "ee9ea6f24024034403ea6160",
            "display": "TV Tuners"
          },
          {
            "id": "ef9ea6f24024034403ea6160",
            "display": "Vehicle Backup Cameras"
          }
        ]
      },
      {
        "id": "498e4884402403bc7f6c6157",
        "display": "Wearables",
        "subcategories": [
          {
            "id": "bcc8296f402403e02d3d615b",
            "display": "Smartwatches"
          },
          {
            "id": "b46d79e5402403fe0e5a615b",
            "display": "Body Mounted Cameras"
          },
          {
            "id": "bdc8296f402403e02d3d615b",
            "display": "Clips, Arm & Wristbands"
          },
          {
            "id": "bec8296f402403e02d3d615b",
            "display": "Glasses"
          },
          {
            "id": "bfc8296f402403e02d3d615b",
            "display": "Rings"
          },
          {
            "id": "c0c8296f402403e02d3d615b",
            "display": "Smartwatch Cases"
          },
          {
            "id": "c1c8296f402403e02d3d615b",
            "display": "Wearables Chargers"
          }
        ]
      },
      {
        "id": "4e8e4884402403bc7f6c6157",
        "display": "Tablets & Accessories",
        "subcategories": [
          {
            "id": "c2c8296f402403e02d3d615b",
            "display": "Tablets"
          },
          {
            "id": "c3c8296f402403e02d3d615b",
            "display": "eBook Readers"
          },
          {
            "id": "c4c8296f402403e02d3d615b",
            "display": "Cases"
          },
          {
            "id": "c5c8296f402403e02d3d615b",
            "display": "Chargers"
          },
          {
            "id": "c6c8296f402403e02d3d615b",
            "display": "Covers"
          },
          {
            "id": "c7c8296f402403e02d3d615b",
            "display": "Power Adapters"
          },
          {
            "id": "c8c8296f402403e02d3d615b",
            "display": "Power Cables"
          },
          {
            "id": "c9c8296f402403e02d3d615b",
            "display": "Reading Lights"
          },
          {
            "id": "cac8296f402403e02d3d615b",
            "display": "Screen Protectors"
          },
          {
            "id": "cbc8296f402403e02d3d615b",
            "display": "Skins"
          },
          {
            "id": "ccc8296f402403e02d3d615b",
            "display": "Sleeves"
          },
          {
            "id": "cdc8296f402403e02d3d615b",
            "display": "Stands"
          },
          {
            "id": "cec8296f402403e02d3d615b",
            "display": "Tablet Keyboards"
          }
        ]
      },
      {
        "id": "468e4884402403bc7f6c6157",
        "display": "Video Games & Consoles",
        "subcategories": [
          {
            "id": "cfc8296f402403e02d3d615b",
            "display": "Consoles"
          },
          {
            "id": "b56d79e5402403fe0e5a615b",
            "display": "Handheld Consoles"
          },
          {
            "id": "d0c8296f402403e02d3d615b",
            "display": "Batteries & Chargers"
          },
          {
            "id": "d1c8296f402403e02d3d615b",
            "display": "Cables"
          },
          {
            "id": "d2c8296f402403e02d3d615b",
            "display": "Controllers"
          },
          {
            "id": "d3c8296f402403e02d3d615b",
            "display": "Headsets"
          },
          {
            "id": "d4c8296f402403e02d3d615b",
            "display": "Gaming Guides"
          },
          {
            "id": "d5c8296f402403e02d3d615b",
            "display": "Keyboards"
          },
          {
            "id": "d6c8296f402403e02d3d615b",
            "display": "Digital Games"
          },
          {
            "id": "d7c8296f402403e02d3d615b",
            "display": "PC Games"
          },
          {
            "id": "d8c8296f402403e02d3d615b",
            "display": "Video Games"
          }
        ]
      },
      {
        "id": "508e4884402403bc7f6c6157",
        "display": "VR, AR & Accessories",
        "subcategories": [
          {
            "id": "d9c8296f402403e02d3d615b",
            "display": "PC & Console VR Headsets"
          },
          {
            "id": "dac8296f402403e02d3d615b",
            "display": "Smartphone VR Headsets"
          },
          {
            "id": "dbc8296f402403e02d3d615b",
            "display": "Standalone VR Headsets"
          },
          {
            "id": "dcc8296f402403e02d3d615b",
            "display": "Cases, Covers & Skins"
          },
          {
            "id": "ddc8296f402403e02d3d615b",
            "display": "Controllers & Sensors"
          },
          {
            "id": "dec8296f402403e02d3d615b",
            "display": "Parts"
          }
        ]
      },
      {
        "id": "488e4884402403bc7f6c6157",
        "display": "Media",
        "subcategories": [
          {
            "id": "dfc8296f402403e02d3d615b",
            "display": "Blank Media"
          },
          {
            "id": "e0c8296f402403e02d3d615b",
            "display": "CDs"
          },
          {
            "id": "e1c8296f402403e02d3d615b",
            "display": "DVDs & Blu-ray Discs"
          },
          {
            "id": "e2c8296f402403e02d3d615b",
            "display": "Media Streamers"
          },
          {
            "id": "e3c8296f402403e02d3d615b",
            "display": "Media Cases & Organization"
          },
          {
            "id": "e4c8296f402403e02d3d615b",
            "display": "Vinyl Records"
          }
        ]
      },
      {
        "id": "518e4884402403bc7f6c6157",
        "display": "Networking",
        "subcategories": [
          {
            "id": "e5c8296f402403e02d3d615b",
            "display": "Boosters & Antennas"
          },
          {
            "id": "e6c8296f402403e02d3d615b",
            "display": "Mobile Broadband Devices"
          },
          {
            "id": "e7c8296f402403e02d3d615b",
            "display": "Modems"
          },
          {
            "id": "e8c8296f402403e02d3d615b",
            "display": "Modem-Router Combos"
          },
          {
            "id": "1ac83694402403da5111615b",
            "display": "Powerline Networking"
          },
          {
            "id": "1bc83694402403da5111615b",
            "display": "USB Bluetooth Adapters"
          },
          {
            "id": "1cc83694402403da5111615b",
            "display": "USB Wi-Fi Adapters"
          },
          {
            "id": "1dc83694402403da5111615b",
            "display": "VoIP Home Phones"
          },
          {
            "id": "1ec83694402403da5111615b",
            "display": "VoIP Phone Adapters"
          },
          {
            "id": "1fc83694402403da5111615b",
            "display": "Wired Routers"
          },
          {
            "id": "20c83694402403da5111615b",
            "display": "Wireless Access Points"
          },
          {
            "id": "21c83694402403da5111615b",
            "display": "Wireless Routers"
          }
        ]
      },
      {
        "id": "4c8e4884402403bc7f6c6157",
        "display": "Headphones",
        "subcategories": [
          {
            "id": "22c83694402403da5111615b",
            "display": "Earbud Headphones"
          },
          {
            "id": "23c83694402403da5111615b",
            "display": "On-Ear Headphones"
          },
          {
            "id": "24c83694402403da5111615b",
            "display": "Over-Ear Headphones"
          }
        ]
      },
      {
        "id": "4d8e4884402403bc7f6c6157",
        "display": "Portable Audio & Video",
        "subcategories": [
          {
            "id": "30c83694402403da5111615b",
            "display": "Boomboxes"
          },
          {
            "id": "25c83694402403da5111615b",
            "display": "CB & Two-Way Radios"
          },
          {
            "id": "26c83694402403da5111615b",
            "display": "Cassette Players"
          },
          {
            "id": "27c83694402403da5111615b",
            "display": "Digital Voice Recorders"
          },
          {
            "id": "28c83694402403da5111615b",
            "display": "MP3 & MP4 Players"
          },
          {
            "id": "29c83694402403da5111615b",
            "display": "Microcassette Recorders"
          },
          {
            "id": "2ac83694402403da5111615b",
            "display": "Minidisc Players"
          },
          {
            "id": "2bc83694402403da5111615b",
            "display": "Portable & Handheld TVs"
          },
          {
            "id": "2cc83694402403da5111615b",
            "display": "Portable CD Players"
          },
          {
            "id": "2dc83694402403da5111615b",
            "display": "Portable DVD Players"
          },
          {
            "id": "2ec83694402403da5111615b",
            "display": "Portable Speakers"
          },
          {
            "id": "2fc83694402403da5111615b",
            "display": "Radios"
          }
        ]
      },
      {
        "id": "548e4884402403bc7f6c6157",
        "display": "Other",
        "subcategories": []
      }
    ]
  }
];

export const POSHMARK_SIZE_MAP: PoshmarkSizeMap = {
  "002a8975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "00248975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "00108975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00208975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "30A",
      "display": "30A"
    },
    {
      "id": "30B",
      "display": "30B"
    },
    {
      "id": "32AA",
      "display": "32AA"
    },
    {
      "id": "32A",
      "display": "32A"
    },
    {
      "id": "32B",
      "display": "32B"
    },
    {
      "id": "32C",
      "display": "32C"
    },
    {
      "id": "32D",
      "display": "32D"
    },
    {
      "id": "32E (DD)",
      "display": "32E (DD)"
    },
    {
      "id": "32F (3D)",
      "display": "32F (3D)"
    },
    {
      "id": "32G (4D)",
      "display": "32G (4D)"
    },
    {
      "id": "32H (5D)",
      "display": "32H (5D)"
    },
    {
      "id": "34AA",
      "display": "34AA"
    },
    {
      "id": "34A",
      "display": "34A"
    },
    {
      "id": "34B",
      "display": "34B"
    },
    {
      "id": "34C",
      "display": "34C"
    },
    {
      "id": "34D",
      "display": "34D"
    },
    {
      "id": "34E (DD)",
      "display": "34E (DD)"
    },
    {
      "id": "34F (3D)",
      "display": "34F (3D)"
    },
    {
      "id": "34G (4D)",
      "display": "34G (4D)"
    },
    {
      "id": "34H (5D)",
      "display": "34H (5D)"
    },
    {
      "id": "36AA",
      "display": "36AA"
    },
    {
      "id": "36A",
      "display": "36A"
    },
    {
      "id": "36B",
      "display": "36B"
    },
    {
      "id": "36C",
      "display": "36C"
    },
    {
      "id": "36D",
      "display": "36D"
    },
    {
      "id": "36E (DD)",
      "display": "36E (DD)"
    },
    {
      "id": "36F (3D)",
      "display": "36F (3D)"
    },
    {
      "id": "36G (4D)",
      "display": "36G (4D)"
    },
    {
      "id": "36H (5D)",
      "display": "36H (5D)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "38A",
      "display": "38A (Plus)"
    },
    {
      "id": "38B",
      "display": "38B (Plus)"
    },
    {
      "id": "38C",
      "display": "38C (Plus)"
    },
    {
      "id": "38D",
      "display": "38D (Plus)"
    },
    {
      "id": "38E (DD)",
      "display": "38E (DD) (Plus)"
    },
    {
      "id": "38F (3D)",
      "display": "38F (3D) (Plus)"
    },
    {
      "id": "38G (4D)",
      "display": "38G (4D) (Plus)"
    },
    {
      "id": "38H (5D)",
      "display": "38H (5D) (Plus)"
    },
    {
      "id": "40A",
      "display": "40A (Plus)"
    },
    {
      "id": "40B",
      "display": "40B (Plus)"
    },
    {
      "id": "40C",
      "display": "40C (Plus)"
    },
    {
      "id": "40D",
      "display": "40D (Plus)"
    },
    {
      "id": "40E (DD)",
      "display": "40E (DD) (Plus)"
    },
    {
      "id": "40F (3D)",
      "display": "40F (3D) (Plus)"
    },
    {
      "id": "40G (4D)",
      "display": "40G (4D) (Plus)"
    },
    {
      "id": "40H (5D)",
      "display": "40H (5D) (Plus)"
    },
    {
      "id": "42A",
      "display": "42A (Plus)"
    },
    {
      "id": "42B",
      "display": "42B (Plus)"
    },
    {
      "id": "42C",
      "display": "42C (Plus)"
    },
    {
      "id": "42D",
      "display": "42D (Plus)"
    },
    {
      "id": "42E (DD)",
      "display": "42E (DD) (Plus)"
    },
    {
      "id": "42F (3D)",
      "display": "42F (3D) (Plus)"
    },
    {
      "id": "42G (4D)",
      "display": "42G (4D) (Plus)"
    },
    {
      "id": "42H (5D)",
      "display": "42H (5D) (Plus)"
    },
    {
      "id": "44A",
      "display": "44A (Plus)"
    },
    {
      "id": "44B",
      "display": "44B (Plus)"
    },
    {
      "id": "44C",
      "display": "44C (Plus)"
    },
    {
      "id": "44D",
      "display": "44D (Plus)"
    },
    {
      "id": "44E (DD)",
      "display": "44E (DD) (Plus)"
    },
    {
      "id": "44F (3D)",
      "display": "44F (3D) (Plus)"
    },
    {
      "id": "44G (4D)",
      "display": "44G (4D) (Plus)"
    },
    {
      "id": "44H (5D)",
      "display": "44H (5D) (Plus)"
    },
    {
      "id": "46A",
      "display": "46A (Plus)"
    },
    {
      "id": "46B",
      "display": "46B (Plus)"
    },
    {
      "id": "46C",
      "display": "46C (Plus)"
    },
    {
      "id": "46D",
      "display": "46D (Plus)"
    },
    {
      "id": "46DD",
      "display": "46DD (Plus)"
    },
    {
      "id": "46F (3D)",
      "display": "46F (3D) (Plus)"
    },
    {
      "id": "46G (4D)",
      "display": "46G (4D) (Plus)"
    },
    {
      "id": "46H (5D)",
      "display": "46H (5D) (Plus)"
    },
    {
      "id": "48A",
      "display": "48A (Plus)"
    },
    {
      "id": "48B",
      "display": "48B (Plus)"
    },
    {
      "id": "48C",
      "display": "48C (Plus)"
    },
    {
      "id": "48D",
      "display": "48D (Plus)"
    },
    {
      "id": "48DD",
      "display": "48DD (Plus)"
    },
    {
      "id": "48F",
      "display": "48F (3D) (Plus)"
    },
    {
      "id": "48G",
      "display": "48G (4D) (Plus)"
    },
    {
      "id": "48H (5D)",
      "display": "48H (5D) (Plus)"
    },
    {
      "id": "OSM",
      "display": "One Size (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "30AM",
      "display": "30A (Maternity)"
    },
    {
      "id": "30BM",
      "display": "30B (Maternity)"
    },
    {
      "id": "32AAM",
      "display": "32AA (Maternity)"
    },
    {
      "id": "32AM",
      "display": "32A (Maternity)"
    },
    {
      "id": "32BM",
      "display": "32B (Maternity)"
    },
    {
      "id": "32CM",
      "display": "32C (Maternity)"
    },
    {
      "id": "32DM",
      "display": "32D (Maternity)"
    },
    {
      "id": "32E (DD)M",
      "display": "32E (DD) (Maternity)"
    },
    {
      "id": "32F (3D)M",
      "display": "32F (3D) (Maternity)"
    },
    {
      "id": "32G (4D)M",
      "display": "32G (4D) (Maternity)"
    },
    {
      "id": "32H (5D)M",
      "display": "32H (5D) (Maternity)"
    },
    {
      "id": "34AAM",
      "display": "34AA (Maternity)"
    },
    {
      "id": "34AM",
      "display": "34A (Maternity)"
    },
    {
      "id": "34BM",
      "display": "34B (Maternity)"
    },
    {
      "id": "34CM",
      "display": "34C (Maternity)"
    },
    {
      "id": "34DM",
      "display": "34D (Maternity)"
    },
    {
      "id": "34E (DD)M",
      "display": "34E (DD) (Maternity)"
    },
    {
      "id": "34F (3D)M",
      "display": "34F (3D) (Maternity)"
    },
    {
      "id": "34G (4D)M",
      "display": "34G (4D) (Maternity)"
    },
    {
      "id": "34H (5D)M",
      "display": "34H (5D) (Maternity)"
    },
    {
      "id": "36AAM",
      "display": "36AA (Maternity)"
    },
    {
      "id": "36AM",
      "display": "36A (Maternity)"
    },
    {
      "id": "36BM",
      "display": "36B (Maternity)"
    },
    {
      "id": "36CM",
      "display": "36C (Maternity)"
    },
    {
      "id": "36DM",
      "display": "36D (Maternity)"
    },
    {
      "id": "36E (DD)M",
      "display": "36E (DD) (Maternity)"
    },
    {
      "id": "36F (3D)M",
      "display": "36F (3D) (Maternity)"
    },
    {
      "id": "36G (4D)M",
      "display": "36G (4D) (Maternity)"
    },
    {
      "id": "36H (5D)M",
      "display": "36H (5D) (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    },
    {
      "id": "38AM",
      "display": "38A (Maternity)"
    },
    {
      "id": "38BM",
      "display": "38B (Maternity)"
    },
    {
      "id": "38CM",
      "display": "38C (Maternity)"
    },
    {
      "id": "38DM",
      "display": "38D (Maternity)"
    },
    {
      "id": "38E (DD)M",
      "display": "38E (DD) (Maternity)"
    },
    {
      "id": "38F (3D)M",
      "display": "38F (3D) (Maternity)"
    },
    {
      "id": "38G (4D)M",
      "display": "38G (4D) (Maternity)"
    },
    {
      "id": "38H (5D)M",
      "display": "38H (5D) (Maternity)"
    },
    {
      "id": "40AM",
      "display": "40A (Maternity)"
    },
    {
      "id": "40BM",
      "display": "40B (Maternity)"
    },
    {
      "id": "40CM",
      "display": "40C (Maternity)"
    },
    {
      "id": "40DM",
      "display": "40D (Maternity)"
    },
    {
      "id": "40E (DD)M",
      "display": "40E (DD) (Maternity)"
    },
    {
      "id": "40F (3D)M",
      "display": "40F (3D) (Maternity)"
    },
    {
      "id": "40G (4D)M",
      "display": "40G (4D) (Maternity)"
    },
    {
      "id": "40H (5D)M",
      "display": "40H (5D) (Maternity)"
    },
    {
      "id": "42AM",
      "display": "42A (Maternity)"
    },
    {
      "id": "42BM",
      "display": "42B (Maternity)"
    },
    {
      "id": "42CM",
      "display": "42C (Maternity)"
    },
    {
      "id": "42DM",
      "display": "42D (Maternity)"
    },
    {
      "id": "42E (DD)M",
      "display": "42E (DD) (Maternity)"
    },
    {
      "id": "42F (3D)M",
      "display": "42F (3D) (Maternity)"
    },
    {
      "id": "42G (4D)M",
      "display": "42G (4D) (Maternity)"
    },
    {
      "id": "42H (5D)M",
      "display": "42H (5D) (Maternity)"
    },
    {
      "id": "44AM",
      "display": "44A (Maternity)"
    },
    {
      "id": "44BM",
      "display": "44B (Maternity)"
    },
    {
      "id": "44CM",
      "display": "44C (Maternity)"
    },
    {
      "id": "44DM",
      "display": "44D (Maternity)"
    },
    {
      "id": "44E (DD)M",
      "display": "44E (DD) (Maternity)"
    },
    {
      "id": "44F (3D)M",
      "display": "44F (3D) (Maternity)"
    },
    {
      "id": "44G (4D)M",
      "display": "44G (4D) (Maternity)"
    },
    {
      "id": "44H (5D)M",
      "display": "44H (5D) (Maternity)"
    },
    {
      "id": "46AM",
      "display": "46A (Maternity)"
    },
    {
      "id": "46BM",
      "display": "46B (Maternity)"
    },
    {
      "id": "46CM",
      "display": "46C (Maternity)"
    },
    {
      "id": "46DM",
      "display": "46D (Maternity)"
    },
    {
      "id": "46DDM",
      "display": "46DD (Maternity)"
    },
    {
      "id": "46F (3D)M",
      "display": "46F (3D) (Maternity)"
    },
    {
      "id": "46G (4D)M",
      "display": "46G (4D) (Maternity)"
    },
    {
      "id": "46H (5D)M",
      "display": "46H (5D) (Maternity)"
    },
    {
      "id": "48AM",
      "display": "48A (Maternity)"
    },
    {
      "id": "48BM",
      "display": "48B (Maternity)"
    },
    {
      "id": "48CM",
      "display": "48C (Maternity)"
    },
    {
      "id": "48DM",
      "display": "48D (Maternity)"
    },
    {
      "id": "48DDM",
      "display": "48DD (Maternity)"
    },
    {
      "id": "48FM",
      "display": "48F (3D) (Maternity)"
    },
    {
      "id": "48GM",
      "display": "48G (4D) (Maternity)"
    },
    {
      "id": "48H (5D)M",
      "display": "48H (5D) (Maternity)"
    }
  ],
  "00148975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "001a8975d97b4e80ef00a955": [
    {
      "id": "23",
      "display": "23"
    },
    {
      "id": "24",
      "display": "24"
    },
    {
      "id": "25",
      "display": "25"
    },
    {
      "id": "26",
      "display": "26"
    },
    {
      "id": "27",
      "display": "27"
    },
    {
      "id": "28",
      "display": "28"
    },
    {
      "id": "29",
      "display": "29"
    },
    {
      "id": "30",
      "display": "30"
    },
    {
      "id": "31",
      "display": "31"
    },
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "33",
      "display": "33 (Plus)"
    },
    {
      "id": "34",
      "display": "34 (Plus)"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24Plus",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26Plus",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28Plus",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30Plus",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32Plus",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "23P",
      "display": "23P (Petite)"
    },
    {
      "id": "24P",
      "display": "24P (Petite)"
    },
    {
      "id": "25P",
      "display": "25P (Petite)"
    },
    {
      "id": "26P",
      "display": "26P (Petite)"
    },
    {
      "id": "27P",
      "display": "27P (Petite)"
    },
    {
      "id": "28P",
      "display": "28P (Petite)"
    },
    {
      "id": "29P",
      "display": "29P (Petite)"
    },
    {
      "id": "30P",
      "display": "30P (Petite)"
    },
    {
      "id": "31P",
      "display": "31P (Petite)"
    },
    {
      "id": "32P",
      "display": "32P (Petite)"
    },
    {
      "id": "33P",
      "display": "33P (Petite)"
    },
    {
      "id": "34P",
      "display": "34P (Petite)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "23M",
      "display": "23 (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "25M",
      "display": "25 (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "27M",
      "display": "27 (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "29M",
      "display": "29 (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "31M",
      "display": "31 (Maternity)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "33M",
      "display": "33 (Maternity)"
    },
    {
      "id": "34M",
      "display": "34 (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24PlusM",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26PlusM",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28PlusM",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30PlusM",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32PlusM",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    }
  ],
  "00288975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "002c8975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "001c8975d97b4e80ef00a955": [
    {
      "id": "23",
      "display": "23"
    },
    {
      "id": "24",
      "display": "24"
    },
    {
      "id": "25",
      "display": "25"
    },
    {
      "id": "26",
      "display": "26"
    },
    {
      "id": "27",
      "display": "27"
    },
    {
      "id": "28",
      "display": "28"
    },
    {
      "id": "29",
      "display": "29"
    },
    {
      "id": "30",
      "display": "30"
    },
    {
      "id": "31",
      "display": "31"
    },
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "33",
      "display": "33 (Plus)"
    },
    {
      "id": "34",
      "display": "34 (Plus)"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24Plus",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26Plus",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28Plus",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30Plus",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32Plus",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "23P",
      "display": "23P (Petite)"
    },
    {
      "id": "24P",
      "display": "24P (Petite)"
    },
    {
      "id": "25P",
      "display": "25P (Petite)"
    },
    {
      "id": "26P",
      "display": "26P (Petite)"
    },
    {
      "id": "27P",
      "display": "27P (Petite)"
    },
    {
      "id": "28P",
      "display": "28P (Petite)"
    },
    {
      "id": "29P",
      "display": "29P (Petite)"
    },
    {
      "id": "30P",
      "display": "30P (Petite)"
    },
    {
      "id": "31P",
      "display": "31P (Petite)"
    },
    {
      "id": "32P",
      "display": "32P (Petite)"
    },
    {
      "id": "33P",
      "display": "33P (Petite)"
    },
    {
      "id": "34P",
      "display": "34P (Petite)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "23M",
      "display": "23 (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "25M",
      "display": "25 (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "27M",
      "display": "27 (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "29M",
      "display": "29 (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "31M",
      "display": "31 (Maternity)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "33M",
      "display": "33 (Maternity)"
    },
    {
      "id": "34M",
      "display": "34 (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24PlusM",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26PlusM",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28PlusM",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30PlusM",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32PlusM",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00268975d97b4e80ef00a955": [
    {
      "id": "5",
      "display": "5"
    },
    {
      "id": "5.5",
      "display": "5.5"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "6.5",
      "display": "6.5"
    },
    {
      "id": "7",
      "display": "7"
    },
    {
      "id": "7.5",
      "display": "7.5"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "8.5",
      "display": "8.5"
    },
    {
      "id": "9",
      "display": "9"
    },
    {
      "id": "9.5",
      "display": "9.5"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "10.5",
      "display": "10.5"
    },
    {
      "id": "11",
      "display": "11"
    },
    {
      "id": "11.5",
      "display": "11.5"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "12.5",
      "display": "12.5"
    },
    {
      "id": "13",
      "display": "13"
    }
  ],
  "001e8975d97b4e80ef00a955": [
    {
      "id": "23",
      "display": "23"
    },
    {
      "id": "24",
      "display": "24"
    },
    {
      "id": "25",
      "display": "25"
    },
    {
      "id": "26",
      "display": "26"
    },
    {
      "id": "27",
      "display": "27"
    },
    {
      "id": "28",
      "display": "28"
    },
    {
      "id": "29",
      "display": "29"
    },
    {
      "id": "30",
      "display": "30"
    },
    {
      "id": "31",
      "display": "31"
    },
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "33",
      "display": "33 (Plus)"
    },
    {
      "id": "34",
      "display": "34 (Plus)"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24Plus",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26Plus",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28Plus",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30Plus",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32Plus",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "23P",
      "display": "23P (Petite)"
    },
    {
      "id": "24P",
      "display": "24P (Petite)"
    },
    {
      "id": "25P",
      "display": "25P (Petite)"
    },
    {
      "id": "26P",
      "display": "26P (Petite)"
    },
    {
      "id": "27P",
      "display": "27P (Petite)"
    },
    {
      "id": "28P",
      "display": "28P (Petite)"
    },
    {
      "id": "29P",
      "display": "29P (Petite)"
    },
    {
      "id": "30P",
      "display": "30P (Petite)"
    },
    {
      "id": "31P",
      "display": "31P (Petite)"
    },
    {
      "id": "32P",
      "display": "32P (Petite)"
    },
    {
      "id": "33P",
      "display": "33P (Petite)"
    },
    {
      "id": "34P",
      "display": "34P (Petite)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "23M",
      "display": "23 (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "25M",
      "display": "25 (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "27M",
      "display": "27 (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "29M",
      "display": "29 (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "31M",
      "display": "31 (Maternity)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "33M",
      "display": "33 (Maternity)"
    },
    {
      "id": "34M",
      "display": "34 (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24PlusM",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26PlusM",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28PlusM",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30PlusM",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32PlusM",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00128975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00168975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00228975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "00188975d97b4e80ef00a955": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "6e7df9aaaabb083120f45ec2": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "6f7df9aaaabb083120f45ec2": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "707df9aaaabb083120f45ec2": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "9ab476dc402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "9bb476dc402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    }
  ],
  "9db476dc402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a2b476dd402403bf28a2606b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "9cb476dc402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a3b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "9eb476dc402403bf28a2606b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "9fb476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "00 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    }
  ],
  "a0b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a1b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a4b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a5b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a6b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    }
  ],
  "a7b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a8b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "a9b476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "aab476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    }
  ],
  "abb476dd402403bf28a2606b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "acb476dd402403bf28a2606b": [
    {
      "id": "00",
      "display": "00"
    },
    {
      "id": "0",
      "display": "0"
    },
    {
      "id": "2",
      "display": "2"
    },
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "XXS",
      "display": "XXS"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14",
      "display": "14 (Plus)"
    },
    {
      "id": "14W",
      "display": "14W (Plus)"
    },
    {
      "id": "16",
      "display": "16 (Plus)"
    },
    {
      "id": "16W",
      "display": "16W (Plus)"
    },
    {
      "id": "18",
      "display": "18 (Plus)"
    },
    {
      "id": "18W",
      "display": "18W (Plus)"
    },
    {
      "id": "20",
      "display": "20 (Plus)"
    },
    {
      "id": "20W",
      "display": "20W (Plus)"
    },
    {
      "id": "22",
      "display": "22 (Plus)"
    },
    {
      "id": "22W",
      "display": "22W (Plus)"
    },
    {
      "id": "24",
      "display": "24 (Plus)"
    },
    {
      "id": "24W",
      "display": "24W (Plus)"
    },
    {
      "id": "26",
      "display": "26 (Plus)"
    },
    {
      "id": "26W",
      "display": "26W (Plus)"
    },
    {
      "id": "28",
      "display": "28 (Plus)"
    },
    {
      "id": "28W",
      "display": "28W (Plus)"
    },
    {
      "id": "30",
      "display": "30 (Plus)"
    },
    {
      "id": "30W",
      "display": "30W (Plus)"
    },
    {
      "id": "32",
      "display": "32 (Plus)"
    },
    {
      "id": "32W",
      "display": "32W (Plus)"
    },
    {
      "id": "XXL",
      "display": "XXL (Plus)"
    },
    {
      "id": "XXXL",
      "display": "XXXL (Plus)"
    },
    {
      "id": "0X",
      "display": "0X (Plus)"
    },
    {
      "id": "1X",
      "display": "1X (Plus)"
    },
    {
      "id": "2X",
      "display": "2X (Plus)"
    },
    {
      "id": "3X",
      "display": "3X (Plus)"
    },
    {
      "id": "4X",
      "display": "4X (Plus)"
    },
    {
      "id": "5X",
      "display": "5X (Plus)"
    },
    {
      "id": "00P",
      "display": "00P (Petite)"
    },
    {
      "id": "0P",
      "display": "0P (Petite)"
    },
    {
      "id": "2P",
      "display": "2P (Petite)"
    },
    {
      "id": "4P",
      "display": "4P (Petite)"
    },
    {
      "id": "6P",
      "display": "6P (Petite)"
    },
    {
      "id": "8P",
      "display": "8P (Petite)"
    },
    {
      "id": "10P",
      "display": "10P (Petite)"
    },
    {
      "id": "12P",
      "display": "12P (Petite)"
    },
    {
      "id": "14P",
      "display": "14P (Petite)"
    },
    {
      "id": "16P",
      "display": "16P (Petite)"
    },
    {
      "id": "18P",
      "display": "18P (Petite)"
    },
    {
      "id": "20P",
      "display": "20P (Petite)"
    },
    {
      "id": "XXSP",
      "display": "XXSP (Petite)"
    },
    {
      "id": "XSP",
      "display": "XSP (Petite)"
    },
    {
      "id": "SP",
      "display": "SP (Petite)"
    },
    {
      "id": "MP",
      "display": "MP (Petite)"
    },
    {
      "id": "LP",
      "display": "LP (Petite)"
    },
    {
      "id": "XLP",
      "display": "XLP (Petite)"
    },
    {
      "id": "XXLP",
      "display": "XXLP (Petite)"
    },
    {
      "id": "00J",
      "display": "0 (Juniors)"
    },
    {
      "id": "0J",
      "display": "0 (Juniors)"
    },
    {
      "id": "1J",
      "display": "1 (Juniors)"
    },
    {
      "id": "3J",
      "display": "3 (Juniors)"
    },
    {
      "id": "5J",
      "display": "5 (Juniors)"
    },
    {
      "id": "7J",
      "display": "7 (Juniors)"
    },
    {
      "id": "9J",
      "display": "9 (Juniors)"
    },
    {
      "id": "11J",
      "display": "11 (Juniors)"
    },
    {
      "id": "13J",
      "display": "13 (Juniors)"
    },
    {
      "id": "15J",
      "display": "15 (Juniors)"
    },
    {
      "id": "17J",
      "display": "17 (Juniors)"
    },
    {
      "id": "XXSJ",
      "display": "XXS (Juniors)"
    },
    {
      "id": "XSJ",
      "display": "XS (Juniors)"
    },
    {
      "id": "SJ",
      "display": "S (Juniors)"
    },
    {
      "id": "MJ",
      "display": "M (Juniors)"
    },
    {
      "id": "LJ",
      "display": "L (Juniors)"
    },
    {
      "id": "XLJ",
      "display": "XL (Juniors)"
    },
    {
      "id": "XXLJ",
      "display": "XXL (Juniors)"
    },
    {
      "id": "00M",
      "display": "00 (Maternity)"
    },
    {
      "id": "0M",
      "display": "0 (Maternity)"
    },
    {
      "id": "2M",
      "display": "2 (Maternity)"
    },
    {
      "id": "4M",
      "display": "4 (Maternity)"
    },
    {
      "id": "6M",
      "display": "6 (Maternity)"
    },
    {
      "id": "8M",
      "display": "8 (Maternity)"
    },
    {
      "id": "10M",
      "display": "10 (Maternity)"
    },
    {
      "id": "12M",
      "display": "12 (Maternity)"
    },
    {
      "id": "XXSM",
      "display": "XXS (Maternity)"
    },
    {
      "id": "XSM",
      "display": "XS (Maternity)"
    },
    {
      "id": "SM",
      "display": "S (Maternity)"
    },
    {
      "id": "MM",
      "display": "M (Maternity)"
    },
    {
      "id": "LM",
      "display": "L (Maternity)"
    },
    {
      "id": "XLM",
      "display": "XL (Maternity)"
    },
    {
      "id": "14M",
      "display": "14 (Maternity)"
    },
    {
      "id": "14WM",
      "display": "14W (Maternity)"
    },
    {
      "id": "16M",
      "display": "16 (Maternity)"
    },
    {
      "id": "16WM",
      "display": "16W (Maternity)"
    },
    {
      "id": "18M",
      "display": "18 (Maternity)"
    },
    {
      "id": "18WM",
      "display": "18W (Maternity)"
    },
    {
      "id": "20M",
      "display": "20 (Maternity)"
    },
    {
      "id": "20WM",
      "display": "20W (Maternity)"
    },
    {
      "id": "22M",
      "display": "22 (Maternity)"
    },
    {
      "id": "22WM",
      "display": "22W (Maternity)"
    },
    {
      "id": "24M",
      "display": "24 (Maternity)"
    },
    {
      "id": "24WM",
      "display": "24W (Maternity)"
    },
    {
      "id": "26M",
      "display": "26 (Maternity)"
    },
    {
      "id": "26WM",
      "display": "26W (Maternity)"
    },
    {
      "id": "28M",
      "display": "28 (Maternity)"
    },
    {
      "id": "28WM",
      "display": "28W (Maternity)"
    },
    {
      "id": "30M",
      "display": "30 (Maternity)"
    },
    {
      "id": "30WM",
      "display": "30W (Maternity)"
    },
    {
      "id": "32M",
      "display": "32 (Maternity)"
    },
    {
      "id": "32WM",
      "display": "32W (Maternity)"
    },
    {
      "id": "XXLM",
      "display": "XXL (Maternity)"
    },
    {
      "id": "XXXLM",
      "display": "XXXL (Maternity)"
    },
    {
      "id": "0XM",
      "display": "0X (Maternity)"
    },
    {
      "id": "1XM",
      "display": "1X (Maternity)"
    },
    {
      "id": "2XM",
      "display": "2X (Maternity)"
    },
    {
      "id": "3XM",
      "display": "3X (Maternity)"
    },
    {
      "id": "4XM",
      "display": "4X (Maternity)"
    },
    {
      "id": "5XM",
      "display": "5X (Maternity)"
    }
  ],
  "002e8975d97b4e80ef00a955": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "02008c10d97b4e1245005764": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "03008c10d97b4e1245005764": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "04008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "05008c10d97b4e1245005764": [
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "41",
      "display": "Waist 41"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "41BT",
      "display": "Waist 41 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    }
  ],
  "06008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "41",
      "display": "Waist 41"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "07008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "14.5",
      "display": "Neck 14.5"
    },
    {
      "id": "15",
      "display": "Neck 15"
    },
    {
      "id": "15.5",
      "display": "Neck 15.5"
    },
    {
      "id": "16",
      "display": "Neck 16"
    },
    {
      "id": "16.5",
      "display": "Neck 16.5"
    },
    {
      "id": "17",
      "display": "Neck 17"
    },
    {
      "id": "17.5",
      "display": "Neck 17.5"
    },
    {
      "id": "18",
      "display": "Neck 18"
    },
    {
      "id": "16.5BT",
      "display": "Neck 16.5 (Big & Tall)"
    },
    {
      "id": "17BT",
      "display": "Neck 17 (Big & Tall)"
    },
    {
      "id": "17.5BT",
      "display": "Neck 17.5 (Big & Tall)"
    },
    {
      "id": "18BT",
      "display": "Neck 18 (Big & Tall)"
    },
    {
      "id": "18.5",
      "display": "Neck 18.5 (Big & Tall)"
    },
    {
      "id": "19",
      "display": "Neck 19 (Big & Tall)"
    },
    {
      "id": "19.5",
      "display": "Neck 19.5 (Big & Tall)"
    },
    {
      "id": "20",
      "display": "Neck 20 (Big & Tall)"
    },
    {
      "id": "20.5",
      "display": "Neck 20.5 (Big & Tall)"
    },
    {
      "id": "21",
      "display": "Neck 21 (Big & Tall)"
    },
    {
      "id": "21.5",
      "display": "Neck 21.5 (Big & Tall)"
    },
    {
      "id": "22",
      "display": "Neck 22 (Big & Tall)"
    },
    {
      "id": "22.5",
      "display": "Neck 22.5 (Big & Tall)"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "08008c10d97b4e1245005764": [
    {
      "id": "4",
      "display": "4"
    },
    {
      "id": "4.5",
      "display": "4.5"
    },
    {
      "id": "5",
      "display": "5"
    },
    {
      "id": "5.5",
      "display": "5.5"
    },
    {
      "id": "6",
      "display": "6"
    },
    {
      "id": "6.5",
      "display": "6.5"
    },
    {
      "id": "7",
      "display": "7"
    },
    {
      "id": "7.5",
      "display": "7.5"
    },
    {
      "id": "8",
      "display": "8"
    },
    {
      "id": "8.5",
      "display": "8.5"
    },
    {
      "id": "9",
      "display": "9"
    },
    {
      "id": "9.5",
      "display": "9.5"
    },
    {
      "id": "10",
      "display": "10"
    },
    {
      "id": "10.5",
      "display": "10.5"
    },
    {
      "id": "11",
      "display": "11"
    },
    {
      "id": "11.5",
      "display": "11.5"
    },
    {
      "id": "12",
      "display": "12"
    },
    {
      "id": "12.5",
      "display": "12.5"
    },
    {
      "id": "13",
      "display": "13"
    },
    {
      "id": "13.5",
      "display": "13.5"
    },
    {
      "id": "14",
      "display": "14"
    },
    {
      "id": "14.5",
      "display": "14.5"
    },
    {
      "id": "15",
      "display": "15"
    },
    {
      "id": "15.5",
      "display": "15.5"
    },
    {
      "id": "16",
      "display": "16"
    }
  ],
  "09008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "41",
      "display": "Waist 41"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "0a008c10d97b4e1245005764": [
    {
      "id": "34S",
      "display": "34S"
    },
    {
      "id": "34R",
      "display": "34R"
    },
    {
      "id": "34L",
      "display": "34L"
    },
    {
      "id": "35S",
      "display": "35S"
    },
    {
      "id": "35R",
      "display": "35R"
    },
    {
      "id": "35L",
      "display": "35L"
    },
    {
      "id": "36S",
      "display": "36S"
    },
    {
      "id": "36R",
      "display": "36R"
    },
    {
      "id": "36L",
      "display": "36L"
    },
    {
      "id": "37S",
      "display": "37S"
    },
    {
      "id": "37R",
      "display": "37R"
    },
    {
      "id": "37L",
      "display": "37L"
    },
    {
      "id": "38S",
      "display": "38S"
    },
    {
      "id": "38R",
      "display": "38R"
    },
    {
      "id": "38L",
      "display": "38L"
    },
    {
      "id": "39S",
      "display": "39S"
    },
    {
      "id": "39R",
      "display": "39R"
    },
    {
      "id": "39L",
      "display": "39L"
    },
    {
      "id": "40S",
      "display": "40S"
    },
    {
      "id": "40R",
      "display": "40R"
    },
    {
      "id": "40L",
      "display": "40L"
    },
    {
      "id": "41S",
      "display": "41S"
    },
    {
      "id": "41R",
      "display": "41R"
    },
    {
      "id": "41L",
      "display": "41L"
    },
    {
      "id": "42S",
      "display": "42S"
    },
    {
      "id": "42R",
      "display": "42R"
    },
    {
      "id": "42L",
      "display": "42L"
    },
    {
      "id": "43S",
      "display": "43S"
    },
    {
      "id": "43R",
      "display": "43R"
    },
    {
      "id": "43L",
      "display": "43L"
    },
    {
      "id": "44S",
      "display": "44S"
    },
    {
      "id": "44R",
      "display": "44R"
    },
    {
      "id": "44L",
      "display": "44L"
    },
    {
      "id": "45S",
      "display": "45S"
    },
    {
      "id": "45R",
      "display": "45R"
    },
    {
      "id": "45L",
      "display": "45L"
    },
    {
      "id": "46S",
      "display": "46S"
    },
    {
      "id": "46R",
      "display": "46R"
    },
    {
      "id": "46L",
      "display": "46L"
    },
    {
      "id": "47S",
      "display": "47S"
    },
    {
      "id": "47R",
      "display": "47R"
    },
    {
      "id": "47L",
      "display": "47L"
    },
    {
      "id": "48S",
      "display": "48S"
    },
    {
      "id": "48R",
      "display": "48R"
    },
    {
      "id": "48L",
      "display": "48L"
    },
    {
      "id": "49S",
      "display": "49S"
    },
    {
      "id": "49R",
      "display": "49R"
    },
    {
      "id": "49L",
      "display": "49L"
    },
    {
      "id": "50S",
      "display": "50S"
    },
    {
      "id": "50R",
      "display": "50R"
    },
    {
      "id": "50L",
      "display": "50L"
    },
    {
      "id": "51S",
      "display": "51S"
    },
    {
      "id": "51R",
      "display": "51R"
    },
    {
      "id": "51L",
      "display": "51L"
    },
    {
      "id": "52S",
      "display": "52S"
    },
    {
      "id": "52R",
      "display": "52R"
    },
    {
      "id": "52L",
      "display": "52L"
    },
    {
      "id": "53S",
      "display": "53S"
    },
    {
      "id": "53R",
      "display": "53R"
    },
    {
      "id": "53L",
      "display": "53L"
    },
    {
      "id": "54S",
      "display": "54S"
    },
    {
      "id": "54R",
      "display": "54R"
    },
    {
      "id": "54L",
      "display": "54L"
    },
    {
      "id": "55S",
      "display": "55S"
    },
    {
      "id": "55R",
      "display": "55R"
    },
    {
      "id": "55L",
      "display": "55L"
    },
    {
      "id": "56S",
      "display": "56S"
    },
    {
      "id": "56R",
      "display": "56R"
    },
    {
      "id": "56L",
      "display": "56L"
    },
    {
      "id": "58S",
      "display": "58S (Big & Tall)"
    },
    {
      "id": "58R",
      "display": "58R (Big & Tall)"
    },
    {
      "id": "58L",
      "display": "58L (Big & Tall)"
    },
    {
      "id": "60S",
      "display": "60S (Big & Tall)"
    },
    {
      "id": "60R",
      "display": "60R (Big & Tall)"
    },
    {
      "id": "60L",
      "display": "60L (Big & Tall)"
    }
  ],
  "0b008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "0d008c10d97b4e1245005764": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "0e008c10d97b4e1245005764": [
    {
      "id": "OS",
      "display": "One Size"
    },
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "717df9aaaabb083120f45ec2": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b2b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b3b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b4b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b5b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b6b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b7b476dd402403bf28a2606b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b8b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "41",
      "display": "Waist 41 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    }
  ],
  "b9b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "aeb476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "41",
      "display": "Waist 41 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    }
  ],
  "afb476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "bab476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "28",
      "display": "Waist 28"
    },
    {
      "id": "29",
      "display": "Waist 29"
    },
    {
      "id": "30",
      "display": "Waist 30"
    },
    {
      "id": "31",
      "display": "Waist 31"
    },
    {
      "id": "32",
      "display": "Waist 32"
    },
    {
      "id": "33",
      "display": "Waist 33"
    },
    {
      "id": "34",
      "display": "Waist 34"
    },
    {
      "id": "35",
      "display": "Waist 35"
    },
    {
      "id": "36",
      "display": "Waist 36"
    },
    {
      "id": "37",
      "display": "Waist 37"
    },
    {
      "id": "38",
      "display": "Waist 38"
    },
    {
      "id": "39",
      "display": "Waist 39"
    },
    {
      "id": "40",
      "display": "Waist 40"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    },
    {
      "id": "36BT",
      "display": "Waist 36 (Big & Tall)"
    },
    {
      "id": "37BT",
      "display": "Waist 37 (Big & Tall)"
    },
    {
      "id": "38BT",
      "display": "Waist 38 (Big & Tall)"
    },
    {
      "id": "39BT",
      "display": "Waist 39 (Big & Tall)"
    },
    {
      "id": "40BT",
      "display": "Waist 40 (Big & Tall)"
    },
    {
      "id": "41",
      "display": "Waist 41 (Big & Tall)"
    },
    {
      "id": "42",
      "display": "Waist 42 (Big & Tall)"
    },
    {
      "id": "43",
      "display": "Waist 43 (Big & Tall)"
    },
    {
      "id": "44",
      "display": "Waist 44 (Big & Tall)"
    },
    {
      "id": "46",
      "display": "Waist 46 (Big & Tall)"
    },
    {
      "id": "48",
      "display": "Waist 48 (Big & Tall)"
    },
    {
      "id": "50",
      "display": "Waist 50 (Big & Tall)"
    },
    {
      "id": "52",
      "display": "Waist 52 (Big & Tall)"
    },
    {
      "id": "54",
      "display": "Waist 54 (Big & Tall)"
    },
    {
      "id": "56",
      "display": "Waist 56 (Big & Tall)"
    },
    {
      "id": "58",
      "display": "Waist 58 (Big & Tall)"
    },
    {
      "id": "60",
      "display": "Waist 60 (Big & Tall)"
    }
  ],
  "b0b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "bbb476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "b1b476dd402403bf28a2606b": [
    {
      "id": "XS",
      "display": "XS"
    },
    {
      "id": "S",
      "display": "S"
    },
    {
      "id": "M",
      "display": "M"
    },
    {
      "id": "L",
      "display": "L"
    },
    {
      "id": "XL",
      "display": "XL"
    },
    {
      "id": "XXL",
      "display": "XXL (Big & Tall)"
    },
    {
      "id": "3XL",
      "display": "3XL (Big & Tall)"
    },
    {
      "id": "4XL",
      "display": "4XL (Big & Tall)"
    },
    {
      "id": "5XL",
      "display": "5XL (Big & Tall)"
    },
    {
      "id": "6XL",
      "display": "6XL (Big & Tall)"
    },
    {
      "id": "LT",
      "display": "LT (Big & Tall)"
    },
    {
      "id": "XLT",
      "display": "XLT (Big & Tall)"
    },
    {
      "id": "2XLT",
      "display": "2XLT (Big & Tall)"
    },
    {
      "id": "3XLT",
      "display": "3XLT (Big & Tall)"
    },
    {
      "id": "4XLT",
      "display": "4XLT (Big & Tall)"
    },
    {
      "id": "5XLT",
      "display": "5XLT (Big & Tall)"
    },
    {
      "id": "6XLT",
      "display": "6XLT (Big & Tall)"
    }
  ],
  "10008c10d97b4e1245005764": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "21008c10d97b4e1245005764": [
    {
      "id": "OSBB",
      "display": "One Size (Baby)"
    },
    {
      "id": "OSB",
      "display": "One Size (Boys)"
    },
    {
      "id": "OSG",
      "display": "One Size (Girls)"
    }
  ],
  "24002b34d97b4efb71005784": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "22008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    }
  ],
  "23008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "26008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "25008c10d97b4e1245005764": [
    {
      "id": "OSBB",
      "display": "One Size (Baby)"
    },
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    }
  ],
  "27008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "2e008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "29008c10d97b4e1245005764": [
    {
      "id": "0BB",
      "display": "0 (Baby)"
    },
    {
      "id": "0.5BB",
      "display": "0.5 (Baby)"
    },
    {
      "id": "1BB",
      "display": "1 (Baby)"
    },
    {
      "id": "1.5BB",
      "display": "1.5 (Baby)"
    },
    {
      "id": "2BB",
      "display": "2 (Baby)"
    },
    {
      "id": "2.5BB",
      "display": "2.5 (Baby)"
    },
    {
      "id": "3BB",
      "display": "3 (Baby)"
    },
    {
      "id": "3.5BB",
      "display": "3.5 (Baby)"
    },
    {
      "id": "4BB",
      "display": "4 (Baby)"
    },
    {
      "id": "4.5BB",
      "display": "4.5 (Baby)"
    },
    {
      "id": "5BB",
      "display": "5 (Baby)"
    },
    {
      "id": "5.5BB",
      "display": "5.5 (Baby)"
    },
    {
      "id": "6BB",
      "display": "6 (Baby)"
    },
    {
      "id": "6.5BB",
      "display": "6.5 (Baby)"
    },
    {
      "id": "7BB",
      "display": "7 (Baby)"
    },
    {
      "id": "7.5G",
      "display": "7.5 (Toddler Girl) (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Toddler Girl) (Girls)"
    },
    {
      "id": "8.5G",
      "display": "8.5 (Toddler Girl) (Girls)"
    },
    {
      "id": "9G",
      "display": "9 (Toddler Girl) (Girls)"
    },
    {
      "id": "9.5G",
      "display": "9.5 (Toddler Girl) (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Toddler Girl) (Girls)"
    },
    {
      "id": "10.5G",
      "display": "10.5 (Toddler Girl) (Girls)"
    },
    {
      "id": "11G",
      "display": "11 (Toddler Girl) (Girls)"
    },
    {
      "id": "11.5G",
      "display": "11.5 (Toddler Girl) (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Toddler Girl) (Girls)"
    },
    {
      "id": "12.5G",
      "display": "12.5 (Little Girl) (Girls)"
    },
    {
      "id": "13G",
      "display": "13 (Little Girl) (Girls)"
    },
    {
      "id": "13.5G",
      "display": "13.5 (Little Girl) (Girls)"
    },
    {
      "id": "1G",
      "display": "1 (Little Girl) (Girls)"
    },
    {
      "id": "1.5G",
      "display": "1.5 (Little Girl) (Girls)"
    },
    {
      "id": "2G",
      "display": "2 (Little Girl) (Girls)"
    },
    {
      "id": "2.5G",
      "display": "2.5 (Little Girl) (Girls)"
    },
    {
      "id": "3G",
      "display": "3 (Little Girl) (Girls)"
    },
    {
      "id": "3.5G",
      "display": "3.5 (Big Girl) (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Big Girl) (Girls)"
    },
    {
      "id": "4.5G",
      "display": "4.5 (Big Girl) (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Big Girl) (Girls)"
    },
    {
      "id": "5.5G",
      "display": "5.5 (Big Girl) (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Big Girl) (Girls)"
    },
    {
      "id": "6.5G",
      "display": "6.5 (Big Girl) (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Big Girl) (Girls)"
    },
    {
      "id": "7.5B",
      "display": "7.5 (Toddler Boy) (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Toddler Boy) (Boys)"
    },
    {
      "id": "8.5B",
      "display": "8.5 (Toddler Boy) (Boys)"
    },
    {
      "id": "9B",
      "display": "9 (Toddler Boy) (Boys)"
    },
    {
      "id": "9.5B",
      "display": "9.5 (Toddler Boy) (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Toddler Boy) (Boys)"
    },
    {
      "id": "10.5B",
      "display": "10.5 (Toddler Boy) (Boys)"
    },
    {
      "id": "11B",
      "display": "11 (Toddler Boy) (Boys)"
    },
    {
      "id": "11.5B",
      "display": "11.5 (Toddler Boy) (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Toddler Boy) (Boys)"
    },
    {
      "id": "12.5B",
      "display": "12.5 (Little Boy) (Boys)"
    },
    {
      "id": "13B",
      "display": "13 (Little Boy) (Boys)"
    },
    {
      "id": "13.5B",
      "display": "13.5 (Little Boy) (Boys)"
    },
    {
      "id": "1B",
      "display": "1 (Little Boy) (Boys)"
    },
    {
      "id": "1.5B",
      "display": "1.5 (Little Boy) (Boys)"
    },
    {
      "id": "2B",
      "display": "2 (Little Boy) (Boys)"
    },
    {
      "id": "2.5B",
      "display": "2.5 (Little Boy) (Boys)"
    },
    {
      "id": "3B",
      "display": "3 (Little Boy) (Boys)"
    },
    {
      "id": "3.5B",
      "display": "3.5 (Big Boy) (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Big Boy) (Boys)"
    },
    {
      "id": "4.5B",
      "display": "4.5 (Big Boy) (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Big Boy) (Boys)"
    },
    {
      "id": "5.5B",
      "display": "5.5 (Big Boy) (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Big Boy) (Boys)"
    },
    {
      "id": "6.5B",
      "display": "6.5 (Big Boy) (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Big Boy) (Boys)"
    }
  ],
  "2d008c10d97b4e1245005764": [
    {
      "id": "Preemie",
      "display": "Preemie (Baby)"
    },
    {
      "id": "Newborn",
      "display": "Newborn (Baby)"
    },
    {
      "id": "0-3MB",
      "display": "0-3 Months (Baby)"
    },
    {
      "id": "3-6MB",
      "display": "3-6 Months (Baby)"
    },
    {
      "id": "6-9MB",
      "display": "6-9 Months (Baby)"
    },
    {
      "id": "9-12MB",
      "display": "9-12 Months (Baby)"
    },
    {
      "id": "12-18MB",
      "display": "12-18 Months (Baby)"
    },
    {
      "id": "18-24MB",
      "display": "18-24 Months (Baby)"
    },
    {
      "id": "3MB",
      "display": "3 Months (Baby)"
    },
    {
      "id": "6MB",
      "display": "6 Months (Baby)"
    },
    {
      "id": "9MB",
      "display": "9 Months (Baby)"
    },
    {
      "id": "12MB",
      "display": "12 Months (Baby)"
    },
    {
      "id": "18MB",
      "display": "18 Months (Baby)"
    },
    {
      "id": "24MB",
      "display": "24 Months (Baby)"
    },
    {
      "id": "2TG",
      "display": "2T (Girls)"
    },
    {
      "id": "3TG",
      "display": "3T (Girls)"
    },
    {
      "id": "4TG",
      "display": "4T (Girls)"
    },
    {
      "id": "5TG",
      "display": "5T (Girls)"
    },
    {
      "id": "4G",
      "display": "4 (Girls)"
    },
    {
      "id": "5G",
      "display": "5 (Girls)"
    },
    {
      "id": "6G",
      "display": "6 (Girls)"
    },
    {
      "id": "6XG",
      "display": "6X (Girls)"
    },
    {
      "id": "7G",
      "display": "7 (Girls)"
    },
    {
      "id": "8G",
      "display": "8 (Girls)"
    },
    {
      "id": "10G",
      "display": "10 (Girls)"
    },
    {
      "id": "12G",
      "display": "12 (Girls)"
    },
    {
      "id": "14G",
      "display": "14 (Girls)"
    },
    {
      "id": "16G",
      "display": "16 (Girls)"
    },
    {
      "id": "XSG",
      "display": "XS (Girls)"
    },
    {
      "id": "SG",
      "display": "S (Girls)"
    },
    {
      "id": "MG",
      "display": "M (Girls)"
    },
    {
      "id": "LG",
      "display": "L (Girls)"
    },
    {
      "id": "XLG",
      "display": "XL (Girls)"
    },
    {
      "id": "XXLG",
      "display": "XXL (Girls)"
    },
    {
      "id": "2TB",
      "display": "2T (Boys)"
    },
    {
      "id": "3TB",
      "display": "3T (Boys)"
    },
    {
      "id": "4TB",
      "display": "4T (Boys)"
    },
    {
      "id": "5TB",
      "display": "5T (Boys)"
    },
    {
      "id": "4B",
      "display": "4 (Boys)"
    },
    {
      "id": "5B",
      "display": "5 (Boys)"
    },
    {
      "id": "6B",
      "display": "6 (Boys)"
    },
    {
      "id": "7B",
      "display": "7 (Boys)"
    },
    {
      "id": "7XB",
      "display": "7X (Boys)"
    },
    {
      "id": "8B",
      "display": "8 (Boys)"
    },
    {
      "id": "10B",
      "display": "10 (Boys)"
    },
    {
      "id": "12B",
      "display": "12 (Boys)"
    },
    {
      "id": "14B",
      "display": "14 (Boys)"
    },
    {
      "id": "16B",
      "display": "16 (Boys)"
    },
    {
      "id": "18B",
      "display": "18 (Boys)"
    },
    {
      "id": "20B",
      "display": "20 (Boys)"
    },
    {
      "id": "XSB",
      "display": "XS (Boys)"
    },
    {
      "id": "SB",
      "display": "S (Boys)"
    },
    {
      "id": "MB",
      "display": "M (Boys)"
    },
    {
      "id": "LB",
      "display": "L (Boys)"
    },
    {
      "id": "XLB",
      "display": "XL (Boys)"
    },
    {
      "id": "XXLB",
      "display": "XXL (Boys)"
    }
  ],
  "30008c10d97b4e1245005764": [
    {
      "id": "OSBB",
      "display": "One Size (Baby)"
    },
    {
      "id": "OSB",
      "display": "One Size (Boys)"
    },
    {
      "id": "OSG",
      "display": "One Size (Girls)"
    }
  ],
  "727df9aaaabb083120f45ec2": [
    {
      "id": "OSBB",
      "display": "One Size (Baby)"
    },
    {
      "id": "OSB",
      "display": "One Size (Boys)"
    },
    {
      "id": "OSG",
      "display": "One Size (Girls)"
    }
  ],
  "737df9aaaabb083120f45ec2": [
    {
      "id": "OSBB",
      "display": "One Size (Baby)"
    },
    {
      "id": "OSB",
      "display": "One Size (Boys)"
    },
    {
      "id": "OSG",
      "display": "One Size (Girls)"
    }
  ],
  "31008c10d97b4e1245005764": [
    {
      "id": "OSG",
      "display": "One Size"
    }
  ],
  "5c3b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "c66f798f402403a7f0016033": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "5d3b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "5e3b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    },
    {
      "id": "TWIN",
      "display": "Twin"
    },
    {
      "id": "TWINXL",
      "display": "Twin XL"
    },
    {
      "id": "FULL",
      "display": "Full"
    },
    {
      "id": "QUEEN",
      "display": "Queen"
    },
    {
      "id": "KING",
      "display": "King"
    },
    {
      "id": "CALKING",
      "display": "Cal King"
    }
  ],
  "c76f798f402403a7f0016033": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "bc5eb22d0640fd1ab51c5d0b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "747df9aaaabb083120f45ec2": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "5f3b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "bb5eb22d0640fd1ab51c5d0b": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "603b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "613b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "623b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "633b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "a93b13d30640fd0aeb9c5cb6": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b008bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b108bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b208bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b308bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b408bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b508bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "b608bf914024037d7a7b5fad": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "428e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "438e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "448e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "478e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "498e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "4e8e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "468e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "508e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "488e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "518e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "4c8e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "4d8e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ],
  "548e4884402403bc7f6c6157": [
    {
      "id": "OS",
      "display": "One Size"
    }
  ]
};

// Maps our internal Condition to Poshmark condition values
export const POSHMARK_CONDITION_MAP: Record<string, string> = {
  NEW_WITH_TAGS:    "nwt",
  NEW_WITHOUT_TAGS: "like_new",
  VERY_GOOD:        "good",
  GOOD:             "good",
  SATISFACTORY:     "fair",
};

export const POSHMARK_CONDITION_OPTIONS = [
  { value: "nwt",      label: "New With Tags (NWT)" },
  { value: "like_new", label: "Like New" },
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
] as const;

export const POSHMARK_SHIPPING_DISCOUNTS = [
  { value: "no_discount",    label: "No Discount" },
  { value: "discounted_4_99", label: "Discounted Shipping ($4.99)" },
  { value: "free_shipping",  label: "Free Shipping" },
] as const;
