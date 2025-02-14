# Krydderbot 3.0

Krydderbot er en levende legende, støpt av en krydderelskende gjeng og oppdratt av emoji misbrukere. En perfekt ekstra smakbit til en hver anledning.

I enklere ord er det en vits som har gått for langt. En discord bot med KI som kommenterer, hyller eller kritiserer alt den blir fortalt.

## Bruk

Krydderbot lytter til (og husker) alle meldinger men svarer bare når det er navnet på et krydder, ordet krydder (egentlig "krydd") eller om noen bruker `/krydder`

### Kommandoer

- `/krydder` - Når jernteppet faller over krydder kunnskapen og en ønsker å slippe med trigger ordene.

## Avhengigheter

Krydderbot er avhengig av:

###### oppmerksomhet    

### API'er
- [Discord](https://discord.com/developers/applications)
- [Google Gemini](https://aistudio.google.com/apikey)
### npm moduler
- [axios](https://www.npmjs.com/package/axios) ^1.0.0
- [discord.js](https://www.npmjs.com/package/discord.js) ^14.0.0
- [dotenv](https://www.npmjs.com/package/dotenv) ^16.0.0
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)

## Installasjon

5minutecraft av krydderbot:

1. Klon repositoriet:
    ```bash
    git clone https://github.com/t0m0t0w/krydderbot.git
    cd krydderbot
    ```

2. Installer nødvendige avhengigheter:
    ```bash
    npm install
    ```

3. Opprett en [.env]()-fil i rotmappen og legg til dine miljøvariabler:
    
    ```env
    CLIENT_ID=din discord bot client id
    BOT_TOKEN=din discord_bot token
    GEMINI_API_KEY=din gemini api key
    ```

4. Start boten:
    ```bash
    npm start
    ```
