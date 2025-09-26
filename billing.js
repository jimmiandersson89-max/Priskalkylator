async function checkSubscription() {
  try {
    const dgs = await window.getDigitalGoodsService?.('https://play.google.com/billing');
    if (!dgs) return false;

    const purchases = await dgs.listPurchases();
    return purchases.some(p => p.sku === 'manad75' && p.purchaseState === 'PURCHASED');
  } catch (err) {
    console.error("Billing error:", err);
    return false;
  }
}

async function startSubscription() {
  try {
    const method = {
      supportedMethods: 'https://play.google.com/billing',
      data: { sku: 'manad75' }
    };

    const request = new PaymentRequest([method], {
      total: { label: 'Premium', amount: { currency: 'SEK', value: '79.00' } }
    });

    const resp = await request.show();
    await resp.complete('success');

    alert("Prenumeration startad!");
  } catch (err) {
    console.error("Köp misslyckades:", err);
  }
}
