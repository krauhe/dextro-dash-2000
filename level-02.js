/*
 * LEVEL-02.JS - data for prototypens anden bane.
 *
 * Banen introducerer den manuelle insulinpumpe tidligt og en automatisk
 * rygsæk-pumpe midtvejs. Flere madmonstre står under høje ruter, så spilleren
 * kan vælge mellem jordvejen og præcise tramp til insulin og genveje.
 */

const GLUCOSE_RUNNER_LEVEL_02 = {
    width: 4100,
    groundY: 154,
    finishX: 4028,

    platforms: [
        { x: 0,    y: 154, width: 540, height: 22 },
        { x: 600,  y: 154, width: 420, height: 22 },
        { x: 1090, y: 154, width: 420, height: 22 },
        { x: 1580, y: 154, width: 470, height: 22 },
        { x: 2120, y: 154, width: 440, height: 22 },
        { x: 2630, y: 154, width: 510, height: 22 },
        { x: 3210, y: 154, width: 490, height: 22 },
        { x: 3760, y: 154, width: 340, height: 22 },

        { x: 188,  y: 126, width: 72, height: 12 },
        { x: 336,  y: 100, width: 70, height: 12 },
        { x: 460,  y: 76,  width: 66, height: 12 },
        { x: 662,  y: 120, width: 76, height: 12 },
        { x: 818,  y: 94,  width: 72, height: 12 },
        { x: 948,  y: 68,  width: 68, height: 12 },
        { x: 1145, y: 124, width: 72, height: 12 },
        { x: 1300, y: 96,  width: 74, height: 12 },
        { x: 1438, y: 72,  width: 68, height: 12 },
        { x: 1640, y: 122, width: 74, height: 12 },
        { x: 1795, y: 94,  width: 72, height: 12 },
        { x: 1950, y: 70,  width: 84, height: 12 },
        { x: 2185, y: 120, width: 78, height: 12 },
        { x: 2370, y: 88,  width: 82, height: 12 },
        { x: 2682, y: 124, width: 70, height: 12 },
        { x: 2838, y: 98,  width: 74, height: 12 },
        { x: 3005, y: 72,  width: 78, height: 12 },
        { x: 3260, y: 120, width: 72, height: 12 },
        { x: 3435, y: 92,  width: 78, height: 12 },
        { x: 3595, y: 66,  width: 82, height: 12 },
        { x: 3810, y: 110, width: 72, height: 12 },
        { x: 3940, y: 82,  width: 72, height: 12 },
    ],

    items: [
        { type: 'pump',    x: 220,  y: 112 },
        { type: 'insulin', x: 370,  y: 86  },
        { type: 'insulin', x: 488,  y: 62  },
        { type: 'candy',   x: 690,  y: 106 },
        { type: 'insulin', x: 852,  y: 80  },
        { type: 'insulin', x: 982,  y: 54  },
        { type: 'candy',   x: 1180, y: 110 },
        { type: 'insulin', x: 1336, y: 82  },
        { type: 'insulin', x: 1472, y: 58  },
        { type: 'autoPump', x: 1680, y: 108 },
        { type: 'candy',   x: 1830, y: 80  },
        { type: 'insulin', x: 1990, y: 56  },
        { type: 'insulin', x: 2224, y: 106 },
        { type: 'insulin', x: 2410, y: 74  },
        { type: 'candy',   x: 2715, y: 110 },
        { type: 'insulin', x: 2875, y: 84  },
        { type: 'insulin', x: 3044, y: 58  },
        { type: 'insulin', x: 3295, y: 106 },
        { type: 'candy',   x: 3472, y: 78  },
        { type: 'insulin', x: 3636, y: 52  },
        { type: 'insulin', x: 3975, y: 68  },
    ],

    diamonds: [
        [92,132], [132,127], [205,100], [246,96], [350,72], [392,72], [478,48], [510,48],
        [625,130], [680,92], [724,92], [834,66], [872,66], [964,40], [1000,40],
        [1120,130], [1174,96], [1318,68], [1356,68], [1454,44], [1490,44],
        [1610,130], [1660,94], [1810,66], [1848,66], [1970,42], [2010,42],
        [2150,130], [2220,92], [2390,60], [2430,60], [2660,130], [2708,96],
        [2852,70], [2894,70], [3020,44], [3060,44], [3240,130], [3290,92],
        [3452,64], [3494,64], [3612,38], [3655,38], [3790,130], [3830,82], [3960,54],
    ],

    enemies: [
        { type: 'soda', x: 286,  y: 140, minX: 270,  maxX: 430,  speed: 28, carbs: 20 },
        { type: 'cake', x: 735,  y: 140, minX: 650,  maxX: 950,  speed: 30, carbs: 30 },
        { type: 'soda', x: 1225, y: 140, minX: 1130, maxX: 1450, speed: 31, carbs: 20 },
        { type: 'cake', x: 1718, y: 140, minX: 1630, maxX: 1970, speed: 32, carbs: 30 },
        { type: 'soda', x: 2290, y: 140, minX: 2180, maxX: 2500, speed: 33, carbs: 20 },
        { type: 'cake', x: 2780, y: 140, minX: 2680, maxX: 3060, speed: 34, carbs: 30 },
        { type: 'soda', x: 3350, y: 140, minX: 3270, maxX: 3600, speed: 35, carbs: 20 },
        { type: 'cake', x: 3850, y: 140, minX: 3800, maxX: 4000, speed: 36, carbs: 30 },
    ],
};
