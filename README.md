# Escáner de Wallets de Solana

**Pruébalo:** https://solflag.com/

Analiza el riesgo de los tokens de una wallet de Solana, o de un token suelto, y explica el motivo de cada aviso. Funciona entero en el navegador: no hay registro ni servidor, y lo que guardas se queda en tu navegador.

- **Cuatro semáforos por token:** control del creador, concentración real en personas, mercado y salida, y dependencia de un emisor o puente.
- **Detecta** liquidez inflada, copias de tokens famosos, autoridades de mint o freeze activas y extensiones Token-2022 de riesgo.
- **Busca ballenas:** separa personas de pools, bots y exchanges, agrupa wallets financiadas desde el mismo origen y muestra el historial del creador.
- **Confluencia:** tokens en común entre varias wallets, y wallets en común entre varios tokens.
- **Seguimiento:** lista de wallets y tokens, cambios desde la última revisión y resultado estimado (PnL).

El motor es la librería open-source [solana-risk-engine](https://github.com/panpontomate/solana-risk-engine) (npm: `solana-risk-engine`). Para recibir avisos en el móvil, usa el bot de Telegram [@panpontomate_escaner_bot](https://t.me/panpontomate_escaner_bot).

*Es una herramienta heurística, no un consejo financiero. "Riesgo bajo" significa que no se encontraron las señales que busca, no que el token sea seguro.*

---

**Solana wallet risk scanner (Spanish UI).** It explains the risk of every token in a wallet, entirely in the browser. It is powered by [solana-risk-engine](https://github.com/panpontomate/solana-risk-engine).

Licencia MIT.
