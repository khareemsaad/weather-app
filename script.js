/* ==========================================================================
   COMPLETE WEATHER APP ENGINE (With Smart Descriptions & Tab Routing)
   ========================================================================== */

// Grab our HTML layout elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsBox = document.getElementById('suggestions-box');
const locationName = document.getElementById('location-name');

// Weather data indicators
const tempVal = document.getElementById('temp-val');
const feelVal = document.getElementById('feel-val');
const cloudVal = document.getElementById('cloud-val');
const uvVal = document.getElementById('uv-val');
const windVal = document.getElementById('wind-val');
const precipVal = document.getElementById('precip-val');

// Weather text description reference element
const weatherDesc = document.getElementById('weather-desc');

// Forecast container tracks
const hourlyContainer = document.getElementById('hourly-container');
const dailyContainer = document.getElementById('daily-container');

// --- 1. AUTOCOMPLETE LIBRARIES ENGINE ---
cityInput.addEventListener('input', async () => {
    const query = cityInput.value.trim();
    if (query.length < 2) {
        suggestionsBox.classList.add('suggestions-hidden');
        return;
    }

    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const res = await fetch(geoUrl);
        const data = await res.json();

        if (!data.results) {
            suggestionsBox.classList.add('suggestions-hidden');
            return;
        }

        suggestionsBox.innerHTML = '';
        suggestionsBox.classList.remove('suggestions-hidden');

        data.results.forEach(city => {
            const country = city.country ? `, ${city.country}` : '';
            const admin = city.admin1 ? `, ${city.admin1}` : '';
            
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${city.name}${admin}${country}`;
            
            item.addEventListener('click', () => {
                cityInput.value = `${city.name}${country}`;
                suggestionsBox.classList.add('suggestions-hidden');
                locationName.textContent = cityInput.value;
                getWeatherData(city.latitude, city.longitude);
            });
            
            suggestionsBox.appendChild(item);
        });
    } catch (err) {
        console.error("Error fetching city matching parameters: ", err);
    }
});

// Hide dropdown if clicking away from search boxes
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.add('suggestions-hidden');
    }
});

// Manual Button Trigger backup route fallback
searchBtn.addEventListener('click', async () => {
    const query = cityInput.value.trim();
    if (!query) return;
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const res = await fetch(geoUrl);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const city = data.results[0];
            const country = city.country ? `, ${city.country}` : '';
            locationName.textContent = `${city.name}${country}`;
            getWeatherData(city.latitude, city.longitude);
        } else {
            alert("Location not found.");
        }
    } catch (err) {
        console.error(err);
    }
});

// --- 2. MAIN WEATHER RETRIEVAL EXECUTION BLOCK ---
async function getWeatherData(lat, lon) {
    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index,weather_code&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,uv_index,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;

        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        // --- CURRENT CONDITIONS PANEL MATRIX ---
        const current = data.current;
        const windDirectionText = getWindDirection(current.wind_direction_10m);

        // Call the smart trend generator algorithm helper function
        weatherDesc.textContent = generateSmartDescription(current, data.hourly);

        tempVal.textContent = `🌡️ ${current.temperature_2m} °C`;
        feelVal.textContent = `🌡️ ${current.apparent_temperature} °C`;
        cloudVal.textContent = `☁️ ${current.cloud_cover} %`;
        uvVal.textContent = `☀️ ${current.uv_index}`;
        windVal.textContent = `💨 ${current.wind_speed_10m} km/h (${windDirectionText})`;
        precipVal.textContent = `🌧️ ${current.precipitation} mm`;

        // --- HOURLY TIMELINE SCROLL MATRICES ---
        hourlyContainer.innerHTML = ''; 
        const hourly = data.hourly;
        const currentTimestamp = new Date().getTime(); 
        let hoursAdded = 0;

        for (let i = 0; i < hourly.time.length; i++) {
            const hourTime = new Date(hourly.time[i]).getTime();
            
            if (hourTime >= currentTimestamp - (60 * 60 * 1000) && hoursAdded < 24) {
                const dateObj = new Date(hourly.time[i]);
                const hourString = dateObj.getHours().toString().padStart(2, '0') + ":00";
                const hourUv = hourly.uv_index[i];
                
                const card = document.createElement('div');
                card.className = 'hourly-card';
                card.innerHTML = `
                    <div class="hourly-time">${i === 0 ? 'Now' : hourString}</div>
                    <div class="hourly-item-temp">🌡️ ${hourly.temperature_2m[i]}°</div>
                    <div class="hourly-item-feel">Feels: ${hourly.apparent_temperature[i]}°</div>
                    <div class="hourly-item-uv">☀️ UV: ${hourUv}</div>
                    <div class="hourly-item-wind">💨 ${hourly.wind_speed_10m[i]} km/h</div>
                    <div class="hourly-item-drop" style="color: #3182ce;">💧 ${hourly.precipitation_probability[i]}%</div>
                `;
                hourlyContainer.appendChild(card);
                hoursAdded++;
            }
        }

        // --- 7-DAY EXTENDED MATRIX LIST ROWS ---
        dailyContainer.innerHTML = ''; 
        const daily = data.daily;

        for (let i = 0; i < daily.time.length; i++) {
            const dateObj = new Date(daily.time[i]);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            
            const maxUv = daily.uv_index_max[i];
            const maxWindSpeed = daily.wind_speed_10m_max[i];
            const dominantWindDirText = getWindDirection(daily.wind_direction_10m_dominant[i]);

            const row = document.createElement('div');
            row.className = 'daily-row';
            row.innerHTML = `
                <div class="daily-day">${i === 0 ? 'Today' : dayName}</div>
                <div class="daily-precip">💧 ${daily.precipitation_probability_max[i]}%</div>
                <div class="daily-temps">
                    <div>${daily.temperature_2m_min[i]}° / ${daily.temperature_2m_max[i]}°</div>
                    <div style="font-size: 11px; color: #718096; font-weight: normal; margin-top: 2px;">UV: ${maxUv}</div>
                    <div style="font-size: 11px; color: #718096; font-weight: normal; margin-top: 2px;">💨 ${maxWindSpeed} km/h (${dominantWindDirText})</div>
                </div>
            `;
            dailyContainer.appendChild(row);
        }

    } catch (error) {
        console.error(error);
        alert("Error mapping core array tracking variables.");
    }
}

// Wind degrees translator calculation map helper
function getWindDirection(degree) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degree / 45) % 8;
    return directions[index];
}

// --- 3. SMART METEOROLOGICAL FORECAST ENGINE ALGORITHM ---
function generateSmartDescription(current, hourly) {
    const currentCode = current.weather_code;
    const currentHourIndex = new Date().getHours();
    
    // Look ahead window bounds constraint parameter
    const lookAheadHours = 6;
    let upcomingRainChance = false;
    let willClearUp = false;
    let willGetCloudy = false;
    let willGetStormy = false;

    for (let i = 1; i <= lookAheadHours; i++) {
        const targetIndex = currentHourIndex + i;
        if (targetIndex >= hourly.time.length) break;

        const futureCode = hourly.weather_code[targetIndex];
        const futurePrecipProb = hourly.precipitation_probability[targetIndex];

        if (futurePrecipProb >= 40 || (futureCode >= 51 && futureCode <= 65) || (futureCode >= 80 && futureCode <= 82)) {
            upcomingRainChance = true;
        }
        if (futureCode >= 95) {
            willGetStormy = true;
        }
        if ((currentCode === 2 || currentCode === 3) && (futureCode === 0 || futureCode === 1)) {
            willClearUp = true;
        }
        if ((currentCode === 0 || currentCode === 1) && futureCode === 3) {
            willGetCloudy = true;
        }
    }

    // --- DICTIONARY PHRASE ASSEMBLY LOGIC ---
    if (currentCode === 0 || currentCode === 1) {
        if (willGetStormy) return "Sunny right now, but expect thunderstorms later ⚡";
        if (upcomingRainChance) return "Clear skies for now, but rain is developing later 🌧️";
        if (willGetCloudy) return "Mostly sunny, but it will become overcast later this afternoon ☁️";
        return "Beautiful clear skies stretching ahead ✨";
    }

    if (currentCode === 2) {
        if (willGetStormy) return "Partly cloudy, with severe thunderstorms rolling in later ⚡";
        if (upcomingRainChance) return "Partly cloudy, but grab an umbrella for rain later 🌧️";
        if (willClearUp) return "Partly cloudy with clearing skies heading your way ☀️";
        return "Mix of sun and clouds throughout the next few hours";
    }

    if (currentCode === 3) {
        if (willGetStormy) return "Thick clouds overhead, turning into storms shortly ⛈️";
        if (upcomingRainChance) return "Overcast and gloomy with rain arriving soon 🌧️";
        if (willClearUp) return "Cloudy right now, but it will clear up nicely later this afternoon 🌤️";
        return "Completely overcast with stable, thick cloud cover";
    }

    if ((currentCode >= 51 && currentCode <= 65) || (currentCode >= 80 && currentCode <= 82)) {
        if (willClearUp) return "Rainy weather right now, but skies will clear up later 🌤️";
        return "Steady rain falling; expected to continue over the next few hours ☔";
    }

    if (currentCode >= 95) {
        return "Active thunderstorms in your area—stay indoors! ⛈️";
    }

    return "Weather patterns are remaining steady";
}

// --- 4. NEW MOBILE TAB CONTAINER SWITCHING ROUTER ---
function switchMobileTab(tabId, clickedButton) {
    // Hide all view tracks
    const contents = document.querySelectorAll('.mobile-tab-content');
    contents.forEach(section => {
        section.classList.remove('active-tab');
    });

    // Remove text accent highlights from nav menu buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active-btn');
    });

    // Match targets and display them
    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) {
        targetSection.classList.add('active-tab');
    }

    // Highlight menu choice text indicators
    clickedButton.classList.add('active-btn');
    
    // Smooth scroll bounce window anchor back up safely
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// --- 5. THEME TOGGLE LISTENER SWITCH ENGINE ---
const themeToggleCheckbox = document.getElementById('checkbox');

themeToggleCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Apply the dark theme descriptor configuration tag to the document canvas
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-mode-label').textContent = "☀️ Light Mode";
    } else {
        // Remove the tag to fall back to our default clean light styling parameters
        document.documentElement.removeAttribute('data-theme');
        document.querySelector('.theme-mode-label').textContent = "🌙 Dark Mode";
    }
});