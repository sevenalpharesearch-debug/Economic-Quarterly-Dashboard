# KPI Metric Reference

This file lists the KPI names available in the dashboard and their metric/unit so you can update the website UI text from one place.

Primary source files:
- `frontend/src/data/industries.js`
- `frontend/src/data/summaryGrowthConfig.js`
- `backend/routes/uploadRoutes.js`
- `backend/config/summaryGrowthConfig.js`

## Macro Economy

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| GST Collections | `Rs.Billion` | `GST Collections (Rs.B)` |
| Retail Inflation (CPI) | `%` | `CPI Inflation (%)` |
| India Trade Balance | `Rs.Billion` | `Trade Balance (Rs.B)` |
| Composite PMI | `Index` | `Composite PMI` |
| India VIX | `Index` | `India VIX` |
| India Interest Rate | `%` | `Repo Rate (%)` |
| Dollar Rupee Exchange Rate | `Rs.` | `USD/INR` |
| DXY Index | `Index` | `DXY Index` |
| India Deposit Growth Rate | `%` | `India Deposit Growth Rate` |
| India Credit growth rate | `%` | `India Credit growth rate` |
| India Gold Reserve | `INR Cr` | `India Gold Reserve` |
| India FX Reserves (USD) | `$Million` | `India FX Reserves (USD)` |
| India Total FX Reserves | `Rs.Crore` | `India Total FX Reserves` |

## Industrial and Manufacturing

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Manufacturing PMI | `Index` | `Manufacturing PMI` |
| Steel Production | `Index` | `Steel Production` |
| Cement Production | `Index` | `Cement Production` |
| Electricity Production | `Index` | `Electricity (BU)` |
| Fertilizer Production | `Index` | `Fertilizer Production` |
| Petroleum Refinery Production | `Index` | `Petroleum Refinery Production` |
| Natural Gas Production | `Index` | `Natural Gas Production` |
| Crude Oil Production | `Index` | `Crude Oil Production` |
| Coal Production | `Index` | `Coal Production` |
| IIP Overall Growth | `%` | `IIP Overall Growth (%)` |
| IIP Capital Goods | `Index` | `IIP Capital Goods` |
| IIP Consumer Durables | `Index` | `IIP Consumer Durables` |
| Steel Production (1000 Metric Tons) | `Thousand Tons` | `Steel Production (Thousand Tons)` |

## Transportation and Automotive

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| 2W Registration | `units` | `2-Wheeler Registrations` |
| 3W Registration | `units` | `3-Wheeler Registrations` |
| PV Registration | `units` | `Passenger Vehicles` |
| CV Registration | `units` | `Commercial Vehicles` |
| Tractor Registration | `units` | `Tractor Sales` |
| Total Registered | `units` | `Total Registered` |

## Services and Exports

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Service PMI | `Index` | `Services PMI` |
| Service Exports | `$Million` | `Service Exports ($M)` |
| Merchandise Exports | `$Million` | `Merchandise Exports` |
| Electronics Goods | `$Million` | `Electronics Goods` |

## Banking and Finance

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Credit Deployed (Agri) | `Rs.Cr` | `Credit Deployed (Agri)` |
| Credit Deployed (Personal) | `Rs.Cr` | `Credit Deployed (Personal)` |
| Credit Deployed (Industries) | `Rs.Cr` | `Credit Deployed (Industries)` |
| Credit Deployed (Services) | `Rs.Cr` | `Credit Deployed (Services)` |
| Non-Food Credit | `Rs.Cr` | `Non-Food Credit` |
| Money Supply | `Rs.Cr` | `Money Supply M1` |
| Banking Liquidity | `Rs.Billion` | `Banking Liquidity` |
| Credit Card Outstanding | `Rs.Cr` | `Credit Card O/S` |
| Vehicle Loans | `Rs.Cr` | `Vehicle Loans` |
| Loan against gold jewellery | `Rs.Cr` | `Gold Loans` |
| Other Personal Loans | `Rs.Cr` | `Other Personal Loans` |

## Commodity Prices

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Silver | `Rs./Kilogram` | `Silver (Rs.)` |
| Gold | `Rs./10 grams` | `Gold (Rs./100g)` |
| Copper | `CNY/MT` | `Copper (Rs./MT)` |
| Iron | `$/MT` | `Iron Ore Price ($/MT)` |
| Aluminium | `CNY/MT` | `Aluminium (Rs./MT)` |
| Lithium | `CNY/MT` | `Lithium (Rs./MT)` |
| Steel | `Rs./MT` | `Steel (Rs./MT)` |
| Cement | `Rs./50Kg` | `Cement` |
| Cotton | `Rs./Quintal` | `Cotton` |
| Freight Rate | `index` | `Baltic Dry Index (Freight)` |
| Cobalt | `CNY/MT` | `Cobalt Price` |
| Antimony | `CNY/MT` | `Antimony` |
| Natural gas (US) | `USD/MMBtu` | `Natural gas (US)` |
| Tin | `CNY/MT` | `Tin Price` |
| Uranium | `USD/Pound` | `Uranium` |
| Zinc | `CNY/MT` | `Zinc Price (Rs./MT)` |
| Nickel | `CNY/MT` | `Nickel Price (Rs./MT)` |
| Chromium | `CNY/MT` | `Chromium` |
| Manganese | `CNY/MT` | `Manganese` |
| Ammonia | `USD/MT` | `Ammonia` |
| Sulphur | `PLN/MT` | `Sulphur` |
| Graphite | `CNY/MT` | `Graphite` |
| Rare Earth Elements(Neodymium, Praseodymium) | `CNY/MT` | `Rare Earth Elements(Neodymium, Praseodymium)` |
| Molybdenum | `CNY/MT` | `Molybdenum` |
| Vanadium | `CNY/MT` | `Vanadium` |
| Platinum | `USD/Ounce` | `Platinum Price` |
| Palladium | `USD/Ounce` | `Palladium Price` |
| Ferro-chrome | `UI` | `Ferro-chrome` |
| Lead | `unit not explicit in current UI` | `Lead` |
| Cadmium | `unit not explicit in current UI` | `Cadmium` |
| Natural gas (india) | `unit not explicit in current UI` | `Natural gas (india)` |

## Treasury Yield

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| US-10Y | `%` | `US 10Y (%)` |
| US-2Y | `%` | `US 2Y (%)` |
| India-10Y | `%` | `India 10Y (%)` |
| India-2Y | `%` | `India 2Y (%)` |
| China-10Y | `%` | `China 10Y (%)` |
| China-2Y | `%` | `China 2Y (%)` |
| Japan-10Y | `%` | `Japan 10Y (%)` |
| Japan-2Y | `%` | `Japan 2Y (%)` |
| US 10Y-2Y Spread | `%` | `US 10Y-2Y Spread` |
| India 10Y-2Y Spread | `%` | `India Yield Spread 10Y-2Y` |
| China 10Y-2Y Spread | `%` | `China Yield Spread 10Y-2Y` |
| Japan 10Y-2Y Spread | `%` | `Japan Yield Spread 10Y-2Y` |
| INR/USD | `Rs.` | `INR/USD` |
| Japanese Yen/USD | `Yen` | `Yen/USD Rate` |
| CNY/USD | `CNY` | `CNY/USD Rate` |
| INR/Euro | `Rs.` | `INR/Euro Rate` |

## Equity and Indices

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Nifty 50 | `pts` | `Nifty 50` |
| NSE 500 | `pts` | `NSE 500` |
| Nifty midcap 150 | `pts` | `Nifty Midcap 150` |
| Nifty midcap 100 | `pts` | `Nifty Midcap 100` |
| Nifty smallcap 250 | `pts` | `Nifty Smallcap 250` |
| Nifty smallcap 100 | `pts` | `Nifty Smallcap 100` |
| S&P 500 | `pts` | `S&P 500` |
| Nasdaq | `pts` | `Nasdaq` |
| Nikkei 225 | `pts` | `Nikkei 225` |
| TOPIX | `pts` | `TOPIX` |
| Shanghai Composite Index | `pts` | `Shanghai Composite` |
| STOXX Europe 600 | `pts` | `STOXX Europe 600` |
| CSI 300 | `pts` | `CSI 300` |
| EURO STOXX 50 | `pts` | `EURO STOXX 50` |

## Market Dashboard

| KPI Name | Metric / Unit | UI Label Example |
| --- | --- | --- |
| Nifty 50 P/E | `P/E Ratio` | `Nifty 50 P/E` |
| Midcap 100 P/E | `P/E Ratio` | `Midcap 100 P/E` |
| India Real GDP (YOY %) | `%` | `India Real GDP (YOY %)` |
| India Nominal GDP (YOY %) | `%` | `India Nominal GDP (YOY %)` |
| India Bank Credit growth | `%` | `India Bank Credit growth` |
| Monthly IPO Data | `Numbers` | `Monthly IPO Data` |
