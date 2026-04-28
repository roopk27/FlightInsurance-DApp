(async () => {
    try {
        console.log("=== Phase II: Flight Insurance Verify & Pay ===");

        //  ** CONTRACT ADDRESS **
        const contractAddress = '0xd9145CCE52D386f254917e481eB44e9943F39138';

        // ** Weather data from weather.txt **
       
        const weatherData = {
            "2023-04-15_Denver":  "Hail",
            "2023-04-15_Austin":  "Normal",
            "2023-04-16_Houston": "Rainfall",
            "2023-04-16_Boston":  "Rainfall",
            "2023-04-17_Phoenix": "Flood",
            "2023-04-18_Tampa":   "Hail",
            "2023-04-18_Miami":   "Flood",
            "2023-04-19_Tucson":  "Normal"
        };

        // Conditions that trigger indemnity payout
        const coveredConditions = ["Hail", "Flood"];

        // ** Load contract ABI **
        const artifactsPath = 'browser/artifacts/FlightInsurance.json';
        const metadata = JSON.parse(
            await remix.call('fileManager', 'getFile', artifactsPath)
        );

        // ** Get accounts **
        const accounts = await web3.eth.getAccounts();
        const providerAccount = accounts[0]; // Insurance Provider = Account 1
        console.log("Provider account:", providerAccount);

        // ** Connect to deployed contract **
        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        // ** STEP 1: Get all policies from blockchain **
        console.log("\n--- Reading all policies from blockchain ---");
        const allPolicies = await contract.methods.view_all_policies().call({
            from: providerAccount
        });

        const names             = allPolicies[0];
        const addresses         = allPolicies[1];
        const flightNumbers     = allPolicies[2];
        const flightDates       = allPolicies[3];
        const departureCities   = allPolicies[4];
        const destinationCities = allPolicies[5];
        const statuses          = allPolicies[6];

        console.log("Total policies found:", names.length);

        // ** STEP 2: Cross-reference with weather data **
        console.log("\n--- Verifying policies against weather data ---");

        for (let i = 0; i < names.length; i++) {
            const name        = names[i];
            const address     = addresses[i];
            const flightNum   = flightNumbers[i];
            const date        = flightDates[i];
            const departure   = departureCities[i];
            const destination = destinationCities[i];
            const status      = statuses[i];

            console.log(`\nPolicy ${i+1}: ${name} | ${flightNum} | ${date} | ${departure} -> ${destination} | Status: ${status}`);

            // Skip already claimed policies
            if (status === "claimed") {
                console.log(" >> Already claimed. Skipping.");
                continue;
            }

            // Look up weather for this city + date
            const weatherKey = `${date}_${departure}`;
            const condition  = weatherData[weatherKey] || "Unknown";
            console.log(`  >> Weather in ${departure} on ${date}: ${condition}`);

            // ── STEP 3: Pay indemnity if covered condition found ──────────
            if (coveredConditions.includes(condition)) {
                console.log(`  >> COVERED CONDITION FOUND! Paying indemnity to ${name} (${address})`);

                try {
                    const result = await contract.methods
                        .pay_indemnity(address)
                        .send({
                            from: providerAccount,
                            value: '20000000000000000', // 0.02 ETH in wei
                            gas: 200000
                        });

                    console.log(`  >> SUCCESS! Indemnity paid. TX hash: ${result.transactionHash}`);
                    console.log(`  >> Policy status updated to: claimed`);

                } catch (payError) {
                    console.log(`  >> ERROR paying indemnity: ${payError.message}`);
                }

            } else {
                console.log(`  >> No covered condition. No payout needed.`);
            }
        }

        // ** STEP 4: Show final policy statuses  **
        console.log("\n--- Final Policy Statuses ---");
        const updatedPolicies = await contract.methods.view_all_policies().call({
            from: providerAccount
        });

        for (let i = 0; i < updatedPolicies[0].length; i++) {
            console.log(`${updatedPolicies[0][i]} | ${updatedPolicies[4][i]} | ${updatedPolicies[3][i]} | Status: ${updatedPolicies[6][i]}`);
        }

        console.log("\n=== Verify & Pay Complete ===");

    } catch (err) {
        console.log("Error:", err.message);
    }
})();
