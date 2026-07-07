# Seeding & Database Coverage Report

_Generated on 2026-07-07_

## Executive Summary

| Metric                             | Count |
| ---------------------------------- | ----- |
| **Total Locomotive Classes**       | 152   |
| **Total Specifications**           | 790   |
| **Total Media Assets**             | 364   |
| **Average Specs per Class**        | 5.2   |
| **Average Media Assets per Class** | 2.4   |

## Era Breakdown

| Era Name                             | Start Year | End Year | Classes Count |
| ------------------------------------ | ---------- | -------- | ------------- |
| Pre-Grouping                         | 1830       | 1922     | 44            |
| The Big Four                         | 1923       | 1947     | 29            |
| British Railways Steam Era           | 1948       | 1968     | 70            |
| The Diesel & Electric Transition/Era | 1968       | 1981     | 1             |
| Sectorisation                        | 1982       | 1993     | 2             |
| Privatisation                        | 1994       | 1997     | 1             |
| Modern Post-Privatisation            | 1998       | Present  | 5             |

## Specification Grid Coverage & Holes

We target 7 core specifications (infobox attributes) for each locomotive class:

| Specification Key     | Present Count | Coverage % |
| --------------------- | ------------- | ---------- |
| **Manufacturer**      | 148           | 97.4%      |
| **Designer**          | 60            | 39.5%      |
| **Wheel Arrangement** | 133           | 87.5%      |
| **Power Output**      | 87            | 57.2%      |
| **Tractive Effort**   | 131           | 86.2%      |
| **Top Speed**         | 90            | 59.2%      |
| **Total Built**       | 141           | 92.8%      |

### Classes with Complete Specs vs Holes

- **Classes with at least 1 specification**: 152 (100.0%)
- **Classes with ZERO specifications (complete holes)**: 0 (0.0%)

## Media Licensing & Attribution Distribution

Compatible open-licenses verified and synced to the local filesystem:

| License Type  | Assets Count | Percentage |
| ------------- | ------------ | ---------- |
| CC BY-SA 4.0  | 58           | 15.9%      |
| CC BY-SA 2.0  | 190          | 52.2%      |
| CC BY 2.0     | 38           | 10.4%      |
| Public domain | 45           | 12.4%      |
| CC BY 2.5     | 3            | 0.8%       |
| CC BY-SA 2.5  | 1            | 0.3%       |
| CC BY-SA 3.0  | 11           | 3.0%       |
| CC0           | 14           | 3.8%       |
| CC BY 4.0     | 4            | 1.1%       |

## Action Items & Next Steps

1. **Complete Database Seeding**: Seeding is currently running in the background to fetch and index all 488 classes from Wikidata and Wikipedia. Currently, **152/488** have been processed.
2. **Address Spec Holes**: Enhance parsed infobox rules in `02-enrich.ts` to capture variant names of specifications if needed.
3. **Serve Serving Assets**: Webapp is successfully serving all image assets with lazy responsive srcset matching Wikimedia attribution requirements.
