/**
 * SCRIPT.JS
 * UI Orchestration and Chart Initialization
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Page Loader Logic
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }, 1000);
    }

    // 3. Form Submission Handling
    const form = document.getElementById('recommendForm');
    const predictBtn = document.getElementById('predictBtn');
    const resultDiv = document.getElementById('result');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ensure database is loaded
        if (!IS_DATABASE_LOADED) {
            alert("🌱 Still loading agricultural dataset. Please wait a moment...");
            return;
        }

        // UI Loading State
        predictBtn.disabled = true;
        predictBtn.classList.add('loading');
        predictBtn.querySelector('.btn-text').textContent = 'Analyzing Soil Profiles...';
        resultDiv.style.display = 'none';

        // Extract values
        const input = {
            N: parseFloat(document.getElementById('n').value),
            P: parseFloat(document.getElementById('p').value),
            K: parseFloat(document.getElementById('k').value),
            temperature: parseFloat(document.getElementById('temp').value),
            humidity: parseFloat(document.getElementById('hum').value),
            ph: parseFloat(document.getElementById('ph').value),
            rainfall: parseFloat(document.getElementById('rain').value)
        };

        // Simulate Neural Network Latency
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Execute Ensemble Logic (from ml-algorithms.js)
        try {
            const prediction = ensemblePredict(input);
            // Update UI with results
            displayResult(prediction);
        } catch (err) {
            console.error(err);
            alert("❌ An error occurred while generating the prediction.");
        }

        // Reset Button
        predictBtn.disabled = false;
        predictBtn.classList.remove('loading');
        predictBtn.querySelector('.btn-text').textContent = 'Execute Ensemble Prediction';
    });
});

/**
 * Updates the UI with prediction results
 */
function displayResult(res) {
    const resultDiv = document.getElementById('result');
    const cropText = document.getElementById('cropResult');
    const confText = document.getElementById('confidenceText');
    const confFill = document.getElementById('confidenceFill');

    resultDiv.style.display = 'block';

    // Capitalize and format
    const formattedCrop = res.primary.charAt(0).toUpperCase() + res.primary.slice(1);
    cropText.textContent = formattedCrop;
    confText.textContent = `${res.confidence}%`;

    // Reset bar before animating
    confFill.style.width = '0%';

    // Smooth scroll to result with offset for header
    setTimeout(() => {
        confFill.style.width = `${res.confidence}%`;
        const yOffset = -150;
        const y = resultDiv.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }, 300);
}
