// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

/**
 * @title FlightInsurance
 * @dev CprE 5500 Project3 — Blockchain Enabled Flight Travel Insurance System
 * @notice Phase I + Phase II implementation
 *
 * ROLES:
 *   Insurance Provider = contract deployer (Account 1)
 *   Passenger          = any other account
 *
 * POLICY TERMS:
 *   Premium   = 0.01 ETH (10000000000000000 wei)
 *   Indemnity = 0.02 ETH (20000000000000000 wei)
 *   Coverage  = Hail and Flood weather events at departure city
 */
contract FlightInsurance {

    address payable public insuranceProvider;
    uint public constant PREMIUM   = 10000000000000000; // 0.01 ETH in wei
    uint public constant INDEMNITY = 20000000000000000; // 0.02 ETH in wei

    struct Policy {
        string  passengerName;
        address passengerAddress;
        string  flightNumber;
        string  flightDate;       // format: YYYY-MM-DD
        string  departureCity;
        string  destinationCity;
        string  status;           // "purchased" or "claimed"
        bool    exists;
    }

    // Storage: address -> Policy for O(1) lookup
    mapping(address => Policy) private policies;
    // Array of all policy holder addresses for iteration
    address[] private policyHolders;

    // ** Modifier: restrict function to insurance provider only  **
    modifier onlyProvider() {
        require(msg.sender == insuranceProvider, "Not authorized.");
        _;
    }

    // ** Constructor: deployer becomes the insurance provider **
    constructor() {
        insuranceProvider = payable(msg.sender);
    }

    // ════════════════════════════════════════════════════════════════════
    //  PHASE I — PASSENGER FUNCTIONS
    // ════════════════════════════════════════════════════════════════════

    /**
     * @notice Returns available policy terms as a string
     * @return Policy description including premium, indemnity, and coverage
     */
    function view_available_policy() public pure returns (string memory) {
        return "Premium: 0.01 ETH | Indemnity: 0.02 ETH | Coverage: Hail and Flood";
    }

    /**
     * @notice Purchase a flight insurance policy
     * @param _name Passenger full name
     * @param _flightNumber Flight identifier 
     * @param _flightDate Flight date in YYYY-MM-DD format
     * @param _departureCity City of departure
     * @param _destinationCity City of destination
     * @dev Must send exactly 0.01 ETH. One policy per address.
     */
    function purchase_policy(
        string memory _name,
        string memory _flightNumber,
        string memory _flightDate,
        string memory _departureCity,
        string memory _destinationCity
    ) public payable {
        require(msg.value == PREMIUM, "Must send exactly 0.01 ETH.");
        require(!policies[msg.sender].exists, "You already have a policy.");

        policies[msg.sender] = Policy({
            passengerName:    _name,
            passengerAddress: msg.sender,
            flightNumber:     _flightNumber,
            flightDate:       _flightDate,
            departureCity:    _departureCity,
            destinationCity:  _destinationCity,
            status:           "purchased",
            exists:           true
        });

        policyHolders.push(msg.sender);

        // Forward premium immediately to insurance provider
        insuranceProvider.transfer(msg.value);
    }

    /**
     * @notice View the caller's own insurance policy
     * @return All policy fields for msg.sender
     */
    function view_purchased_policy() public view returns (
        string memory passengerName,
        address passengerAddress,
        string memory flightNumber,
        string memory flightDate,
        string memory departureCity,
        string memory destinationCity,
        string memory status
    ) {
        require(policies[msg.sender].exists, "No policy found.");
        Policy memory p = policies[msg.sender];
        return (
            p.passengerName,
            p.passengerAddress,
            p.flightNumber,
            p.flightDate,
            p.departureCity,
            p.destinationCity,
            p.status
        );
    }

    // ════════════════════════════════════════════════════════════════════
    //  PHASE I — INSURANCE PROVIDER FUNCTIONS
    // ════════════════════════════════════════════════════════════════════

    /**
     * @notice View all purchased policies (provider only)
     * @return Seven parallel arrays with all policy fields
     */
    function view_all_policies() public view onlyProvider returns (
        string[]  memory names,
        address[] memory addresses,
        string[]  memory flightNumbers,
        string[]  memory flightDates,
        string[]  memory departureCities,
        string[]  memory destinationCities,
        string[]  memory statuses
    ) {
        uint len = policyHolders.length;

        names             = new string[](len);
        addresses         = new address[](len);
        flightNumbers     = new string[](len);
        flightDates       = new string[](len);
        departureCities   = new string[](len);
        destinationCities = new string[](len);
        statuses          = new string[](len);

        for (uint i = 0; i < len; i++) {
            Policy memory p      = policies[policyHolders[i]];
            names[i]             = p.passengerName;
            addresses[i]         = p.passengerAddress;
            flightNumbers[i]     = p.flightNumber;
            flightDates[i]       = p.flightDate;
            departureCities[i]   = p.departureCity;
            destinationCities[i] = p.destinationCity;
            statuses[i]          = p.status;
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  PHASE II — INDEMNITY AND BALANCE FUNCTIONS
    // ════════════════════════════════════════════════════════════════════

    /**
     * @notice Pay indemnity to a passenger whose flight was affected by weather
     * @param passenger Address of the passenger to compensate
     * @return true if payment was successful
     * @dev Must send exactly 0.02 ETH. Policy status updated to "claimed".
     */
    function pay_indemnity(address payable passenger) public payable onlyProvider returns (bool) {
        require(policies[passenger].exists, "No policy found.");
        require(keccak256(bytes(policies[passenger].status)) == keccak256(bytes("purchased")), "Already claimed or invalid.");
        require(msg.value == INDEMNITY, "Must send exactly 0.02 ETH.");

        policies[passenger].status = "claimed";
        passenger.transfer(INDEMNITY);
        return true;
    }

    /**
     * @notice View caller's current ETH balance
     * @return Balance in wei
     */
    function view_balance() public view returns (uint) {
        return msg.sender.balance;
    }

    /**
     * @dev Allows contract to receive ETH for funding indemnity payouts
     */
    receive() external payable {}
}
