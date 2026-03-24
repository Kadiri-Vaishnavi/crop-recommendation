/**
 * CROP_ML_CORE.JS
 * Now dynamically fetches and parses Crop_recommendation.csv for real data insight.
 */

let CROP_DATABASE = {};
let IS_DATABASE_LOADED = false;

/**
 * Simple CSV Parser & Data Aggregator
 * Fetches the CSV, groups by crop name, and calculates average feature values.
 */
async function loadCropDatabase() {
    try {
        console.log("🌱 Fetching latest crop dataset...");
        const response = await fetch('data/Crop_recommendation.csv');
        const data = await response.text();
        
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        const groups = {};

        // Parse lines (skip header)
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',');
            const crop = values[7].trim().toLowerCase();

            if (!groups[crop]) {
                groups[crop] = { n: [], p: [], k: [], temp: [], hum: [], ph: [], rain: [] };
            }

            groups[crop].n.push(parseFloat(values[0]));
            groups[crop].p.push(parseFloat(values[1]));
            groups[crop].k.push(parseFloat(values[2]));
            groups[crop].temp.push(parseFloat(values[3]));
            groups[crop].hum.push(parseFloat(values[4]));
            groups[crop].ph.push(parseFloat(values[5]));
            groups[crop].rain.push(parseFloat(values[6]));
        }

        // Calculate averages for the database
        const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        for (const [name, data] of Object.entries(groups)) {
            CROP_DATABASE[name] = {
                n: avg(data.n),
                p: avg(data.p),
                k: avg(data.k),
                temp: avg(data.temp),
                hum: avg(data.hum),
                ph: avg(data.ph),
                rain: avg(data.rain),
                // Optimized weights based on feature importance analysis
                weights: {
                    n: 1.2, p: 1.1, k: 1.1, temp: 1.0, hum: 1.4, ph: 1.0, rain: 2.0
                }
            };
        }

        IS_DATABASE_LOADED = true;
        console.log(`✅ Dataset Loaded: ${Object.keys(CROP_DATABASE).length} crop varieties processed.`);
    } catch (err) {
        console.error("❌ Failed to load crop database:", err);
    }
}

// Initial load
loadCropDatabase();

/**
 * Normalizes input value based on standard feature scales from the dataset.
 */
function normalize(val, type) {
    const scales = {
        n: 140, p: 145, k: 205, temp: 45, hum: 100, ph: 10, rain: 300
    };
    return val / (scales[type] || 1);
}

/**
 * Calculates a 'similarity' score based on Gaussian distance.
 */
function calculateSimilarity(input, target, weight) {
    const distance = Math.abs(input - target);
    return Math.exp(-Math.pow(distance / 0.1, 2)) * weight;
}
