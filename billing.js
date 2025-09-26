// billing.js — Google Play Billing via Digital Goods API (TWA)
// SKU måste matcha produkt-id i Play Console
const SKU = 'manad75';

/**
 * Hämtar produktdetaljer (pris, valuta, titel) för knappen/visning.
 * Returnerar t.ex. { price: "79,00 kr", priceCurrencyCode: "SEK", priceAmountMicros: 79000000, title: "...", ... }
 */
async function getSkuDetail() {
  try {
    const dgs = await window.getDigitalGoodsService?.('https://play.google.com/billing');
    if (!dgs) return null;
    const [detail] = await dgs.getDetails([SKU]);
    return detail || null;
  } catch (err) {
    console.error('Billing error (getDetails):', err);
    return null;
  }
}

/**
 * Kollar om användaren har en aktiv prenumeration på SKU.
 */
async function checkSubscription() {
  try {
    // snabb lokalfallback – låser upp UI direkt efter köp
    if (localStorage.getItem('hasPremium') === '1') return true;

    const dgs = await window.getDigitalGoodsService?.('https://play.google.com/billing');
    if (!dgs) return false;

    const purchases = await dgs.listPurchases();
    return purchases.some(p => p.sku === SKU && p.purchaseState === 'PURCHASED');
  } catch (err) {
    console.error('Billing error (check):', err);
    return false;
  }
}

/**
 * Startar köpflödet för prenumerationen. Hämtar först korrekt pris från Play.
 */
async function startSubscription() {
  try {
    const detail = await getSkuDetail();
    if (!detail) {
      alert('Köp fungerar bara i appen via Google Play. Installera från Play och prova igen.');
      return;
    }

    const method = [{
      supportedMethods: 'https://play.google.com/billing',
      data: { sku: SKU }
    }];

    // PaymentRequest vill ha numeriskt belopp: konvertera från micros om finns.
    const currency = detail.priceCurrencyCode || 'SEK';
    const value = (detail.priceAmountMicros != null)
      ? String(detail.priceAmountMicros / 1e6)
      : '79.00'; // fallback om getDetails inte gav micros

    const request = new PaymentRequest(method, {
      total: { label: detail.title || 'Premium', amount: { currency, value } }
    });

    const resp = await request.show();
    await resp.complete('success');

    // Markera lokalt så UI låser upp direkt – du kan byta mot servervalidering sen
    localStorage.setItem('hasPremium', '1');
    alert('Prenumeration startad!');
    // location.reload(); // om du vill uppdatera UI direkt efter köp
  } catch (err) {
    console.error('Köp misslyckades:', err);
    alert('Köpet kunde inte genomföras.');
  }
}

// Exponera för index.html
window.getSkuDetail = getSkuDetail;
window.checkSubscription = checkSubscription;
window.startSubscription = startSubscription;
