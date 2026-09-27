# Search coverage

The shared location catalog supports Dhaka, Narayanganj, Narsingdi and Gazipur. It supplies landing autocomplete, full-map search and owner address matching. Coordinates are approximate search centers, not district boundaries or property addresses. The landing search starts at 5 km; users can adjust the full map/radius. Available results still require real, moderated listings.

Added 21 centers to the existing 13. English/Bangla names and common transliterations are searchable. Exact matches precede partial matches; full addresses prefer the longest whole location phrase. Short acronyms only match directly, avoiding DU matching Dubai or DUET.

## Coordinate provenance (checked September 27, 2026)

- [GeoNames Bangladesh places](https://www.geonames.org/advanced-search.html?country=BD&q=Dhaka): Dhaka, Paltan, Savar, Narayanganj, Sonargaon, Narsingdi, Gazipur/Joydebpur and Tongi.
- [RHD R110 road inventory](https://rhd.gov.bd/OnlineRoadNetwork/roadlrp.asp?RoadID=2059&RoadNo=R110): Jatrabari, Demra Staff Quarter, Sarulia Bazar, Shimrail and Siddhirganj Bridge.
- [RHD N3 road inventory](https://rhd.gov.bd/OnlineRoadNetwork/roadlrp.asp?RoadID=1999&RoadNo=N3): Khilkhet junction, Abdullahpur Bus Stand, Board Bazar and Gazipur Chowrasta/Jagroto Chouronggi.
- [RHD R301 road inventory](https://rhd.gov.bd/OnlineRoadNetwork/roadlrp.asp?RoadID=2106&RoadNo=R301): Kaliganj municipal entry, eastern end of Shaheed Moyez Uddin Bridge, and Panchdona junction (road end).
- [Madhabdi gazetteer](https://mapcarta.com/34910708): Madhabdi center, referencing GeoNames 11282515 and OpenStreetMap node 9167070760.

Run `npm run locationqa` for location-resolution regression checks. The landing browser check verifies regional request coordinates and map links alongside loading, empty, retry and stale-response states.
