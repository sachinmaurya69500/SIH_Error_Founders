/* =====================================================
   WEATHER MAP
===================================================== */

const bigMap = L.map("bigMap").setView(
    [22.5, 79],
    5
);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(bigMap);


/* =====================================================
   WEATHER ICON
===================================================== */

function weatherIcon(color, symbol) {

    return L.divIcon({

        className: "",

        html: `
            <div style="
                width:38px;
                height:38px;
                border-radius:50%;
                background:${color};
                border:3px solid white;
                box-shadow:0 0 20px ${color};
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:18px;
            ">
                ${symbol}
            </div>
        `,

        iconSize: [38,38],

        iconAnchor: [19,19]

    });

}


/* =====================================================
   WEATHER DATA
===================================================== */

const weatherData = [

    {
        type: "rain",

        city: "Ludhiana, Punjab",

        position: [30.90,75.85],

        temperature: "32°C",

        condition: "Heavy Rain Possible",

        humidity: "78%",

        wind: "18 km/h",

        color: "#3498db",

        icon: "🌧️"
    },


    {
        type: "storm",

        city: "Delhi",

        position: [28.61,77.20],

        temperature: "29°C",

        condition: "Thunderstorm Alert",

        humidity: "85%",

        wind: "22 km/h",

        color: "#9b59b6",

        icon: "⛈️"
    },


    {
        type: "rain",

        city: "Guwahati, Assam",

        position: [26.14,91.73],

        temperature: "27°C",

        condition: "Heavy Rain",

        humidity: "91%",

        wind: "15 km/h",

        color: "#3498db",

        icon: "🌧️"
    },


    {
        type: "hot",

        city: "Jaipur, Rajasthan",

        position: [26.91,75.78],

        temperature: "39°C",

        condition: "Heat Alert",

        humidity: "32%",

        wind: "12 km/h",

        color: "#e67e22",

        icon: "🌡️"
    },


    {
        type: "storm",

        city: "Mumbai, Maharashtra",

        position: [19.07,72.87],

        temperature: "28°C",

        condition: "Thunderstorm Possible",

        humidity: "82%",

        wind: "25 km/h",

        color: "#9b59b6",

        icon: "⛈️"
    },


    {
        type: "hot",

        city: "Ahmedabad, Gujarat",

        position: [23.02,72.57],

        temperature: "38°C",

        condition: "Hot Weather",

        humidity: "40%",

        wind: "14 km/h",

        color: "#e67e22",

        icon: "☀️"
    }

];


const weatherMarkers = [];


/* =====================================================
   ADD WEATHER MARKERS
===================================================== */

weatherData.forEach(weather => {

    const marker = L.marker(
        weather.position,
        {
            icon: weatherIcon(
                weather.color,
                weather.icon
            )
        }
    );


    marker.bindPopup(`

        <div style="
            min-width:210px;
            color:#111;
            font-family:Arial;
        ">

            <h3 style="margin-bottom:8px;">
                ${weather.city}
            </h3>

            <div style="font-size:25px;">
                ${weather.temperature}
            </div>

            <br>

            <b>Condition:</b>
            ${weather.condition}

            <br><br>

            <b>Humidity:</b>
            ${weather.humidity}

            <br>

            <b>Wind:</b>
            ${weather.wind}

            <br><br>

            <b>AI Risk:</b>
            ${getWeatherRisk(weather.type)}

        </div>

    `);


    marker.weatherType =
        weather.type;


    marker.addTo(bigMap);

    weatherMarkers.push(marker);

});


/* =====================================================
   AI WEATHER RISK
===================================================== */

function getWeatherRisk(type) {

    if (type === "storm") {
        return "HIGH";
    }

    if (type === "rain") {
        return "MODERATE";
    }

    if (type === "hot") {
        return "ELEVATED";
    }

    return "LOW";
}


/* =====================================================
   WEATHER FILTER
===================================================== */

function filterWeather(type, button) {

    document
        .querySelectorAll(".map-filter")
        .forEach(btn => {

            btn.classList.remove(
                "selected"
            );

        });


    button.classList.add(
        "selected"
    );


    let visible = 0;


    weatherMarkers.forEach(marker => {

        if (
            type === "all" ||
            marker.weatherType === type
        ) {

            marker.addTo(bigMap);

            visible++;

        } else {

            bigMap.removeLayer(marker);

        }

    });


    document
        .getElementById("weatherEvents")
        .textContent = visible;

}


/* =====================================================
   MAP TIME
===================================================== */

function updateMapTime() {

    const now = new Date();

    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Kolkata"
            }
        );

    document.getElementById(
        "mapTime"
    ).textContent = time + " IST";

}

updateMapTime();

setInterval(
    updateMapTime,
    1000
);