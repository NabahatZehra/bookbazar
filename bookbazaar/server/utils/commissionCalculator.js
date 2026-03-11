/**
 * Calculates commission and payout amounts based on price and rate.
 * @param {number} price - The total price of the book.
 * @param {number} [rate=0.10] - The commission rate (default is 10%).
 * @returns {{ commissionAmount: number, sellerAmount: number, buyerPays: number }} The calculated amounts.
 */
export const calculateCommission = (price, rate = 0.10) => {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('Invalid price provided');
  }

  const commissionAmount = price * rate;
  const sellerAmount = price - commissionAmount;

  return {
    commissionAmount: Number(commissionAmount.toFixed(2)),
    sellerAmount: Number(sellerAmount.toFixed(2)),
    buyerPays: Number(price.toFixed(2)),
  };
};
