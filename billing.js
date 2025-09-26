// billing.js
const SKU = 'manad75';

// Kolla om prenumeration finns
async function checkSubscription() {
  try {
    const dgs = await window.getDigitalGoodsService?.('https://play.google.com/billing');
    if (!dgs) return false;
    const purchases = await dgs.listPurchases();
    return purchases.some(p => p.sku === SKU && p.purchaseState === 'PURCHASED');
  } catch (err) {
    console.error('Billing error (check):', err);
    return false;
  }
}

// Hämta produktdetaljer (pris, valuta, titel)
async function getSkuDetail() {
  try {
    const dgs = await window.getDigitalGoodsService?.('https://play.google.com/billing');
    if (!dgs) return null;
    const [detail] = await dgs.getDetails([SKU]); // { price, priceCurrencyCode, priceAmountMicros, title, … }
    return detail || null;
  } catch (err) {
    console.error('Billing error (getDetails):', err);
    return null;
  }
}

// Starta köpflöde
async function startSubscription() {
  try {
    // Hämta riktig prisinfo
    const detail = await getSkuDetail();

    // Om Play-miljö saknas (t.ex. vanlig webbläsare) – förklara för användaren
    if (!detail) {
      alert('Köp fungerar bara i appen via Google Play (TWA). Installera från Play och prova igen.');
      return;
    }

    // Bygg PaymentRequest med rätt SKU och belopp från Play
    const method = [{
      supportedMethods: 'https://play.google.com/billing',
      data: { sku: SKU }
    }];

    // PaymentRequest behöver numeriskt belopp; räkna om från micros om möjligt
    const currency = detail.priceCurrencyCode || 'SEK';
    const value = (detail.priceAmountMicros != null)
      ? String(detail.priceAmountMicros / 1e6)
      : '79.00'; // fallback

    const request = new PaymentRequest(method, {
      total: { label: detail.title || 'Premium', amount: { currency, value } }
    });

    const resp = await request.show();
    await resp.complete('success');

    // (valfritt) markera lokalt så UI direkt låser upp
    localStorage.setItem('hasPremium', '1');
    alert('Prenumeration startad!');

  } catch (err) {
    console.error('Köp misslyckades:', err);
    alert('Köpet kunde inte genomföras.');
  }
}

// Exponera för index.html
window.checkSubscription = checkSubscription;
window.startSubscription = startSubscription;
window.getSkuDetail = getSkuDetail;
