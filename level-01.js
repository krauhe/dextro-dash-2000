/*
 * LEVEL-01.JS - data for prototypens eneste bane.
 *
 * Banen bruger det velkendte klassiske platformmønster med en sikker start,
 * lave forhindringer, korte huller og gradvist højere platforme. Geometri,
 * figurer og placeringer er originale og kopierer ikke en eksisterende bane.
 */

const GLUCOSE_RUNNER_LEVEL_01 = {
    width: 3560,
    groundY: 154,
    finishX: 3488,

    // Alle platforme er solide fra oversiden. De høje platforme skaber både
    // alternative hoplinjer og synlige steder til værdifulde pickups.
    platforms: [
        { x: 0,    y: 154, width: 610, height: 22 },
        { x: 662,  y: 154, width: 520, height: 22 },
        { x: 1240, y: 154, width: 610, height: 22 },
        { x: 1910, y: 154, width: 470, height: 22 },
        { x: 2440, y: 154, width: 480, height: 22 },
        { x: 2980, y: 154, width: 580, height: 22 },

        { x: 238,  y: 126, width: 64, height: 12 },
        { x: 368,  y: 108, width: 64, height: 12 },
        { x: 514,  y: 126, width: 54, height: 12 },
        { x: 742,  y: 118, width: 70, height: 12 },
        { x: 902,  y: 96,  width: 76, height: 12 },
        { x: 1070, y: 122, width: 62, height: 12 },
        { x: 1310, y: 118, width: 64, height: 12 },
        { x: 1465, y: 92,  width: 78, height: 12 },
        { x: 1640, y: 120, width: 68, height: 12 },
        { x: 1805, y: 104, width: 56, height: 12 },
        { x: 1990, y: 124, width: 70, height: 12 },
        { x: 2160, y: 98,  width: 76, height: 12 },
        { x: 2312, y: 125, width: 54, height: 12 },
        { x: 2510, y: 116, width: 68, height: 12 },
        { x: 2670, y: 90,  width: 82, height: 12 },
        { x: 2840, y: 120, width: 64, height: 12 },
        { x: 3060, y: 118, width: 72, height: 12 },
        { x: 3225, y: 96,  width: 74, height: 12 },
        { x: 3380, y: 120, width: 68, height: 12 },
    ],

    // Insulinpenne aktiveres straks ved berøring. De 12 penne giver tilsammen
    // 12 E: nok til flere spiste monstre, men ikke til tankeløst at spise alt.
    // Bolsjer lægges i lageret og bruges med Z, så spilleren stadig selv vælger
    // tidspunktet for hurtigt sukker.
    items: [
        { type: 'insulin', x: 274,  y: 112 },
        { type: 'candy',   x: 546,  y: 112 },
        { type: 'insulin', x: 777,  y: 104 },
        { type: 'insulin', x: 934,  y: 82  },
        { type: 'candy',   x: 1100, y: 108 },
        { type: 'insulin', x: 1342, y: 104 },
        { type: 'insulin', x: 1498, y: 78  },
        { type: 'insulin', x: 1674, y: 106 },
        { type: 'candy',   x: 1818, y: 90  },
        { type: 'insulin', x: 2025, y: 110 },
        { type: 'insulin', x: 2192, y: 84  },
        { type: 'insulin', x: 2544, y: 102 },
        { type: 'candy',   x: 2698, y: 76  },
        { type: 'insulin', x: 2872, y: 106 },
        { type: 'insulin', x: 3256, y: 82  },
        { type: 'insulin', x: 3414, y: 106 },
    ],

    // Diamanter samles til en særskilt bonus ved målstregen. De har ingen
    // fysiologisk betydning og påvirker hverken BG, COB eller IOB.
    diamonds: [
        [120, 132], [154, 128], [188, 124],
        [250, 93], [282, 91], [382, 78], [414, 78],
        [690, 126], [726, 118], [774, 88], [928, 66], [960, 66],
        [1270, 126], [1335, 88], [1480, 62], [1526, 62],
        [1680, 92], [1828, 76], [1950, 128], [2022, 94],
        [2174, 68], [2218, 68], [2472, 126], [2538, 84],
        [2688, 58], [2730, 58], [2862, 90], [3010, 128],
        [3082, 88], [3260, 66], [3296, 66], [3412, 90],
    ],

    enemies: [
        { type: 'cake', x: 438,  y: 140, minX: 420,  maxX: 548,  speed: 22, carbs: 30 },
        { type: 'soda', x: 820,  y: 140, minX: 700,  maxX: 878,  speed: 25, carbs: 20 },
        { type: 'cake', x: 1134, y: 140, minX: 1010, maxX: 1160, speed: 28, carbs: 30 },
        { type: 'soda', x: 1388, y: 140, minX: 1270, maxX: 1590, speed: 24, carbs: 20 },
        { type: 'cake', x: 1740, y: 140, minX: 1660, maxX: 1818, speed: 29, carbs: 30 },
        { type: 'soda', x: 2045, y: 140, minX: 1960, maxX: 2310, speed: 25, carbs: 20 },
        { type: 'cake', x: 2588, y: 140, minX: 2470, maxX: 2820, speed: 27, carbs: 30 },
        // Pizza Monsteret introduceres på en lang, sammenhængende jordstrækning,
        // så spilleren kan nå at se kasteoptrækket og reagere på ostebuen.
        { type: 'pizza', x: 2860, y: 140, minX: 2835, maxX: 2918, speed: 26, carbs: 32 },
        { type: 'soda', x: 3135, y: 140, minX: 3010, maxX: 3360, speed: 30, carbs: 20 },
    ],
};
