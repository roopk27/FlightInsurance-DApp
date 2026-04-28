(async () => {
    try {
        console.log("--*** Phase III: Fully Automated Flight Insurance System ***--");
        console.log("Using live weather.gov API for real-time weather verification");

        // ** CONTRACT ADDRESS **
        const contractAddress = '0xd9145CCE52D386f254917e481eB44e9943F39138';

        // ** City coordinates map for weather.gov API **
        const cityCoordinates = {
            "Denver":     { lat: 39.7392,   lon: -104.9903, state: "CO" },
            "Austin":     { lat: 30.2672,   lon: -97.7431,  state: "TX" },
            "Houston":    { lat: 29.7604,   lon: -95.3698,  state: "TX" },
            "Boston":     { lat: 42.3601,   lon: -71.0589,  state: "MA" },
            "Phoenix":    { lat: 33.4484,   lon: -112.0740, state: "AZ" },
            "Tampa":      { lat: 27.9506,   lon: -82.4572,  state: "FL" },
            "Miami":      { lat: 25.7617,   lon: -80.1918,  state: "FL" },
            "Tucson":     { lat: 32.2226,   lon: -110.9747, state: "AZ" },
            "Chicago":    { lat: 41.8781,   lon: -87.6298,  state: "IL" },
            "Des Moines": { lat: 41.5868,   lon: -93.6250,  state: "IA" },
            "New York":   { lat: 40.7128,   lon: -74.0060,  state: "NY" },
            "Jefferson":  { lat: 43.005558, lon: -88.807327, state: "WI" }
        };

        // Extreme weather keywords that trigger indemnity
        const extremeWeatherKeywords = [
            "Flood", "Flash Flood", "Hail", "Hurricane", "Tornado",
            "Severe Thunderstorm", "Blizzard", "Winter Storm",
            "Ice Storm", "High Wind", "Tropical Storm"
        ];

        // ** Load ABI and connect to contract **
        const artifactsPath = 'browser/artifacts/FlightInsurance.json';
        const metadata = JSON.parse(
            await remix.call('fileManager', 'getFile', artifactsPath)
        );

        const accounts       = await web3.eth.getAccounts();
        const providerAccount = accounts[0];
        console.log("Provider:", providerAccount);

        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        // ** STEP 1: Get all policies from blockchain **
        console.log("\n--- Reading policies from blockchain ---");
        const allPolicies = await contract.methods
            .view_all_policies()
            .call({ from: providerAccount });

        const names           = allPolicies[0];
        const addresses       = allPolicies[1];
        const flightNumbers   = allPolicies[2];
        const flightDates     = allPolicies[3];
        const departureCities = allPolicies[4];
        const statuses        = allPolicies[6];

        console.log("Total policies found:", names.length);

        // ── STEP 2: Check real weather API for each policy ────────────────
        console.log("\n--- Checking live weather.gov API ---");

        for (let i = 0; i < names.length; i++) {
            const name      = names[i];
            const address   = addresses[i];
            const flightNum = flightNumbers[i];
            const date      = flightDates[i];
            const city      = departureCities[i];
            const status    = statuses[i];

            console.log(`\nPolicy ${i+1}: ${name} | ${flightNum} | ${date} | ${city} | Status: ${status}`);

            if (status === "claimed") {
                console.log("  >> Already claimed. Skipping.");
                continue;
            }

            const coords = cityCoordinates[city];
            if (!coords) {
                console.log(`  >> No coordinates found for ${city}. Skipping.`);
                continue;
            }

            try {
                console.log(`  >> Calling weather.gov API for ${city} (${coords.lat}, ${coords.lon})...`);

                const alertUrl = `https://api.weather.gov/alerts/active?point=${coords.lat},${coords.lon}`;
                const response = await fetch(alertUrl, {
                    headers: { 'User-Agent': 'FlightInsuranceApp/1.0' }
                });

                if (!response.ok) {
                    console.log(`  >> API error: ${response.status}. Skipping.`);
                    continue;
                }

                const data   = await response.json();
                const alerts = data.features || [];
                console.log(`  >> Active weather alerts in ${city}: ${alerts.length}`);

                let extremeFound = false;
                let extremeType  = "";

                for (const alert of alerts) {
                    const event    = alert.properties.event    || "";
                    const headline = alert.properties.headline || "";
                    const severity = alert.properties.severity || "";

                    console.log(`     Alert: ${event} | Severity: ${severity}`);

                    for (const keyword of extremeWeatherKeywords) {
                        if (event.includes(keyword) || headline.includes(keyword)) {
                            extremeFound = true;
                            extremeType  = event;
                            break;
                        }
                    }

                    if (severity === "Extreme" || severity === "Severe") {
                        extremeFound = true;
                        extremeType  = event;
                    }

                    if (extremeFound) break;
                }

                if (extremeFound) {
                    console.log(`  >> EXTREME WEATHER DETECTED: ${extremeType}`);
                    console.log(`  >> AUTO-PAYING indemnity to ${name} (${address})`);

                    try {
                        const result = await contract.methods
                            .pay_indemnity(address)
                            .send({
                                from:  providerAccount,
                                value: '20000000000000000',
                                gas:   200000
                            });

                        console.log(`  >> SUCCESS! TX: ${result.transactionHash}`);
                        console.log(`  >> Status updated to: claimed`);

                    } catch (payErr) {
                        console.log(`  >> Payment error: ${payErr.message}`);
                    }

                } else {
                    console.log(`  >> No extreme weather alerts. No payout.`);
                }

            } catch (apiErr) {
                console.log(`  >> Weather API call failed: ${apiErr.message}`);
            }
        }

        // ** STEP 3: Final status report **
        console.log("\n--- Final Policy Statuses ---");
        const updated = await contract.methods
            .view_all_policies()
            .call({ from: providerAccount });

        for (let i = 0; i < updated[0].length; i++) {
            console.log(`${updated[0][i]} | ${updated[4][i]} | ${updated[3][i]} | Status: ${updated[6][i]}`);
        }

        console.log("\n=== Phase III Automated Verification Complete ===");

    } catch (err) {
        console.log("Error:", err.message);
    }
})();
