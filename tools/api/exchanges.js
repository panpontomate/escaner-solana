// Exchanges centralizados que tienen tokens de Solana: lo que cobra cada uno y lo que pide, revisado A MANO en su web
// oficial (13/11/2026) y el registro MiCA de la ESMA (CASPS.csv, actualizado el 31/08/2026; NCASP.csv para avisos).
// Los nombres son los de CoinGecko (market.name). Lo que no está aquí sale «sin clasificar».
//   fee    comisión al comprar al momento (taker), nivel normal, sin descuentos, en %   feeNote «hasta» si es un rango
//   id     identidad: «obligatoria» | «limite» (deja operar/retirar sin ella hasta lim) | «?» sin comprobar
//   src    página oficial donde se lee lo de la identidad
//   mica   [sociedad autorizada, autoridad, fecha, web para la UE]     aviso [autoridad, fecha, enlace] (sin licencia)
// Cambiar solo comprobándolo en la fuente. Revisar al menos una vez al mes.
export const REVISADO = "2026-11-13";
export const MICA_FUENTE = "https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica";
export const EXCHANGES = {
 "Binance": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.binance.com/en/support/faq/detail/360027287111"
 },
 "OKX": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.okx.com/en-eu/help/how-do-i-verify-an-individual-account",
  "mica": [
   "OKX Europe Limited",
   "MFSA (Malta)",
   "27/01/2025",
   "okx.com"
  ]
 },
 "Bybit": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.bybit.com/en/help-center/article/Individual-KYC-FAQ",
  "mica": [
   "Bybit EU GmbH",
   "FMA (Austria)",
   "28/05/2025",
   "bybit.eu"
  ]
 },
 "Gate": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.gate.com/help/guide/security/23118/about-identity-verification-kyc-procedures-on-app",
  "mica": [
   "Gate Technology Limited",
   "MFSA (Malta)",
   "29/09/2025",
   "gate.com/en-eu"
  ]
 },
 "MEXC": {
  "fee": 0.05,
  "feeNote": "hasta",
  "id": "obligatoria",
  "src": "https://www.mexc.com/en-GB/announcements/article/kyc-verification-required-for-platform-access-17827791535077",
  "aviso": [
   "AFM (Países Bajos)",
   "16/09/2025",
   "https://www.afm.nl/en/sector/actueel/2025/sep/pb-mexc"
  ]
 },
 "Bitget": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.bitget.com/events/kyc"
 },
 "BingX": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://bingx.com/en/support/articles/11257128284047",
  "mica": [
   "MEGE zweite GmbH (BingX EU)",
   "FMA (Austria)",
   "13/10/2026",
   "bingx.eu"
  ]
 },
 "HTX": {
  "fee": 0.2,
  "id": "obligatoria",
  "src": "https://www.htx.com/support/en-us/detail/54914267993996"
 },
 "Bitvavo": {
  "fee": 0.25,
  "id": "obligatoria",
  "src": "https://support.bitvavo.com/hc/en-us/articles/4405141992465-Why-is-it-necessary-to-verify-my-identity",
  "mica": [
   "Bitvavo B.V.",
   "AFM (Países Bajos)",
   "26/06/2025",
   "bitvavo.com"
  ]
 },
 "Crypto.com Exchange": {
  "fee": 0.5,
  "id": "obligatoria",
  "src": "https://help.crypto.com/en/articles/4669345-account-verification-update-for-existing-users",
  "mica": [
   "Foris DAX MT Limited",
   "MFSA (Malta)",
   "27/01/2025",
   "crypto.com"
  ]
 },
 "Kraken": {
  "fee": 0.8,
  "id": "obligatoria",
  "src": "https://support.kraken.com/articles/360001395743-verification-levels-explained",
  "mica": [
   "Payward Global Solutions Limited",
   "CBI (Irlanda)",
   "25/06/2025",
   "kraken.com"
  ]
 },
 "KuCoin": {
  "fee": 0.1,
  "id": "obligatoria",
  "src": "https://www.kucoin.com/support/360015102254",
  "mica": [
   "KuCoin EU Exchange GmbH",
   "FMA (Austria)",
   "27/11/2025",
   "kucoin.eu"
  ]
 },
 "Coinbase Exchange": {
  "id": "obligatoria",
  "src": "https://help.coinbase.com/en/coinbase/managing-my-account/verify-my-identity/eu-verification-levels-faq",
  "mica": [
   "Coinbase Luxembourg S.A.",
   "CSSF (Luxemburgo)",
   "20/06/2025",
   "coinbase.com"
  ]
 },
 "Bit2Me": {
  "id": "obligatoria",
  "src": "https://support.bit2me.com/en/support/solutions/articles/35000039390",
  "mica": [
   "Bitcoinforme S.L.",
   "CNMV (España)",
   "31/10/2025",
   "bit2me.com"
  ]
 },
 "WhiteBIT": {
  "id": "obligatoria",
  "src": "https://help.whitebit.com/hc/en-gb/articles/13648869290269-How-to-pass-the-identity-verification-KYC",
  "mica": [
   "WB-Shields Innovations GmbH (WhiteBIT EU)",
   "FMA (Austria)",
   "18/06/2026",
   "whitebit.eu"
  ]
 },
 "Phemex": {
  "id": "obligatoria",
  "lim": "sin identidad no deja retirar",
  "src": "https://phemex.com/help-center/phemex-identity-verification-kyc-guide"
 },
 "Pionex": {
  "fee": 0.05,
  "id": "obligatoria",
  "lim": "sin identidad no deja retirar",
  "src": "https://www.pionex.com/en/fees"
 },
 "Deepcoin": {
  "id": "obligatoria",
  "src": "https://www.deepcoin.com/past/en/support/articles/360048193911"
 },
 "Bitrue": {
  "id": "obligatoria",
  "lim": "para retirar",
  "src": "https://support.bitrue.com/hc/en-001/articles/43886794727833-Announcement-KYC-Optimization-and-Upgrade-Notice"
 },
 "Bitunix": {
  "fee": 0.1,
  "id": "obligatoria",
  "lim": "para retirar",
  "src": "https://www.bitunix.com/hub/helpcenter/article/kyc-tiers-and-benefits?id=126"
 },
 "BloFin": {
  "id": "limite",
  "lim": "20.000 USDT al día",
  "src": "https://blofin.com/en/support/FAQ/Deposit-and-Withdrawal/8178033787279-Is-There-A-Minimum-Withdrawal-Limit-Required-For-Each-Crypto"
 },
 "XT.COM": {
  "fee": 0.2,
  "id": "limite",
  "lim": "200.000 USDT al día",
  "src": "https://support.xt.com/hc/en-us/articles/41878045265561-Withdrawal-Limit-Guide"
 },
 "Toobit": {
  "id": "limite",
  "lim": "5 BTC al día",
  "src": "https://www.toobit.com/support/toobit-withdrawal-limit-guide"
 },
 "DigiFinex": {
  "fee": 0.2,
  "id": "limite",
  "lim": "10.000 USDT al día",
  "src": "https://support.digifinex.com/hc/en-us/articles/360000521962--Withdraw-How-to-Withdraw-in-Website"
 },
 "BYDFi": {
  "fee": 0.1,
  "id": "limite",
  "lim": "50.000 USDT al día",
  "src": "https://support.bydfi.com/hc/en-us/articles/6753382098447-Withdrawal-FAQs"
 },
 "Hotcoin": {
  "fee": 0.2,
  "id": "limite",
  "lim": "2 BTC al día",
  "src": "https://www.hotcoin.com/en_US/support/article/?id=28208668003667968&code=28208667995803648"
 },
 "FameEX": {
  "id": "limite",
  "lim": "10.000 USDT al día",
  "src": "https://www.fameex.com/en-US/support/crypto-deposit-withdrawal/what-is-your-withdrawal-limit"
 },
 "WEEX": {
  "fee": 0.1,
  "id": "limite",
  "lim": "10.000 USDT al día",
  "src": "https://www.weex.com/learn/articles/weex-vip-benefits-newly-upgraded-836"
 },
 "BitKan": {
  "id": "limite",
  "lim": "10.000 USDT al día",
  "src": "https://bitkan.com/"
 },
 "KCEX": {
  "fee": 0.0,
  "id": "limite",
  "lim": "30 BTC al día (según su blog)",
  "src": "https://blog.kcex.com/markets/how-to-trade-us-stock-futures-kcex-step-by-step/"
 },
 "BTCC": {
  "fee": 0.3,
  "id": "limite",
  "lim": "sin cifra publicada",
  "src": "https://www.btcc.com/en-CA/academy/btcc-guide/what-is-kyc-in-crypto-how-to-complete-kyc-on-btcc"
 },
 "Ourbit": {
  "fee": 0.0,
  "id": "?"
 },
 "Biconomy.com": {
  "id": "?"
 },
 "OrangeX": {
  "fee": 0.1,
  "feeNote": "hasta",
  "id": "?"
 },
 "Zoomex": {
  "id": "?"
 },
 "LBank": {
  "fee": 0.1,
  "id": "?"
 },
 "CoinW": {
  "fee": 0.1,
  "id": "?"
 },
 "Hibt": {
  "fee": 0.2,
  "id": "?"
 },
 "BitDelta": {
  "id": "?"
 },
 "Bitbaby": {
  "fee": 0.2,
  "id": "?"
 },
 "BVOX": {
  "id": "?"
 },
 "CoinUp.io": {
  "id": "?"
 }
};
// solo operan en su moneda local
export const LOCALES = {"BtcTurk | Kripto": "Turquía", "CoinTR": "Turquía", "Icrypex": "Turquía", "Bittime": "Indonesia", "KoinBX": "India"};
// CoinGecko mezcla algunos DEX de Solana con los exchanges: se quitan
export const NO_SON_EXCHANGES = ["Meteora", "Raydium", "Orca", "Jupiter", "PumpSwap", "Hadron", "Lifinity", "Phoenix", "GoonFi", "Byreal", "Saber", "Invariant", "Scorch", "ZeroFi", "Tessera", "SolFi", "Obric", "HumidiFi", "PancakeSwap"];
