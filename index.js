// index.js

const functions = require('firebase-functions');
const { google } = require('googleapis');

// ** VIKTIGT: Ändra dessa två värden till DIN APPS ID:n! **
const PACKAGE_NAME = 'se.reklamgiganten.priskalkylator';
const SUBSCRIPTION_ID = 'manad79';

/**
* Kontrollerar prenumerationsstatusen säkert via Google Play Developer API.
* Denna funktion körs på din Firebase-server.
* * Data som skickas hit från din PWA (frontend) måste innehålla:
* - subscriptionToken (köpkvittot från Google Play)
*/
exports.checkSubscription = functions.https.onCall(async (data, context) => {
    // 1. Säkerhetskoll: Kontrollera att användaren är inloggad via Firebase Auth.
    // Vi rekommenderar att du implementerar inloggning i din PWA.
    if (!context.auth) {
        throw new new functions.https.HttpsError('unauthenticated', 'Endast inloggade användare får begära status.');
    }

    // 2. Autentisera mot Google Play Developer API
    // Vi använder det tjänstkonto du skapade (play-billing-access) som nu har 'Finans'-rollen.
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    const androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: auth
    });
