// index.js

const functions = require('firebase-functions');
const { google } = require('googleapis');

// ** VIKTIGT: Ändra dessa två värden till DIN APPS ID:n! **
const PACKAGE_NAME = 'se.reklamgiganten.priskalkylator';
const SUBSCRIPTION_ID = 'manad79';

/**
 * Kontrollerar prenumerationsstatusen säkert via Google Play Developer API.
 * Denna funktion körs på din Firebase-server.
 */
exports.checkSubscription = functions.https.onCall(async (data, context) => {
    // 1. Säkerhetskoll (VIKTIGT): Kontrollera att användaren är inloggad via Firebase Auth.
    // Om du INTE använder Firebase Auth, KOMMENTERA BORT detta block.
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'Endast inloggade användare får begära status.');
    // }

    const subscriptionToken = data.token;

    if (!subscriptionToken) {
        // Om ingen token skickas, returnera false direkt.
        return { active: false, error: 'Token saknas' };
    }

    // 2. Autentisera mot Google Play Developer API
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    const androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: auth
    });

    // 3. Anropa Google Play Developer API för att verifiera prenumerationen
    try {
        const response = await androidPublisher.purchases.subscriptions.get({
            packageName: PACKAGE_NAME,
            subscriptionId: SUBSCRIPTION_ID,
            token: subscriptionToken
        });

        const sub = response.data;
        
        // Kritiska kontroller:
        // Expireringstiden måste vara i framtiden (statusen "subscriptionState" kan variera)
        const expiryTimeMs = parseInt(sub.expiryTimeMillis);
        const isActive = expiryTimeMs > Date.now();
        
        // Ytterligare check: Kontrollera om prenumerationen är aktiv/ej hållen (tilläggskontroll)
        const isNotHeld = sub.subscriptionState !== 2; // State 2 = On Hold
        
        // 4. Returnera slutgiltigt svar till appen
        return { 
            active: isActive && isNotHeld,
            expiryTime: sub.expiryTimeMillis,
            status: 'success'
        };

    } catch (error) {
        console.error("Fel vid API-anrop till Google Play:", error.message);

        // Om API-anropet misslyckas (t.ex. ogiltig token), returnera false.
        return { 
            active: false, 
            error: 'Verifiering misslyckades',
            message: error.message
        };
    }
});
