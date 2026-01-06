import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutMethod = 'mobile_money' | 'bank_transfer';

export interface PayoutRequest {
  id: string;
  vendorId: string;
  amount: number;
  method: PayoutMethod;
  accountDetails: {
    provider?: string; // MTN, Vodafone, AirtelTigo
    phoneNumber?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  status: PayoutStatus;
  reference?: string;
  fee: number;
  netAmount: number;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
}

export interface EarningsTransaction {
  id: string;
  vendorId: string;
  orderId: string;
  orderNumber: string;
  type: 'credit' | 'debit' | 'fee' | 'refund';
  amount: number;
  description: string;
  balance: number; // Balance after transaction
  createdAt: string;
}

interface PayoutsState {
  payoutRequests: PayoutRequest[];
  transactions: EarningsTransaction[];

  // Payout actions
  requestPayout: (
    vendorId: string,
    amount: number,
    method: PayoutMethod,
    accountDetails: PayoutRequest['accountDetails']
  ) => PayoutRequest;
  updatePayoutStatus: (payoutId: string, status: PayoutStatus, failureReason?: string) => void;
  cancelPayout: (payoutId: string) => void;
  getPayoutsByVendor: (vendorId: string) => PayoutRequest[];
  getPendingPayouts: (vendorId: string) => PayoutRequest[];

  // Transaction actions
  addTransaction: (transaction: Omit<EarningsTransaction, 'id' | 'createdAt' | 'balance'>) => EarningsTransaction;
  getTransactionsByVendor: (vendorId: string) => EarningsTransaction[];

  // Balance calculations
  getVendorBalance: (vendorId: string) => number;
  getVendorPendingPayout: (vendorId: string) => number;
  getAvailableBalance: (vendorId: string) => number;
  getVendorEarningsSummary: (vendorId: string) => {
    totalEarnings: number;
    totalWithdrawn: number;
    pendingPayout: number;
    availableBalance: number;
    fees: number;
  };
}

const PAYOUT_FEE_PERCENTAGE = 0.02; // 2% fee
const MINIMUM_PAYOUT = 50; // GHS 50 minimum

export const usePayoutsStore = create<PayoutsState>()(
  persist(
    (set, get) => ({
      payoutRequests: [],
      transactions: [],

      requestPayout: (vendorId, amount, method, accountDetails) => {
        const fee = amount * PAYOUT_FEE_PERCENTAGE;
        const netAmount = amount - fee;

        const newPayout: PayoutRequest = {
          id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          vendorId,
          amount,
          method,
          accountDetails,
          status: 'pending',
          fee,
          netAmount,
          requestedAt: new Date().toISOString(),
        };

        set((state) => ({
          payoutRequests: [...state.payoutRequests, newPayout],
        }));

        // Add debit transaction for the payout
        get().addTransaction({
          vendorId,
          orderId: newPayout.id,
          orderNumber: newPayout.id.slice(-8).toUpperCase(),
          type: 'debit',
          amount: -amount,
          description: `Payout request - ${method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}`,
        });

        return newPayout;
      },

      updatePayoutStatus: (payoutId, status, failureReason) => {
        set((state) => ({
          payoutRequests: state.payoutRequests.map((payout) => {
            if (payout.id !== payoutId) return payout;

            const updates: Partial<PayoutRequest> = { status };

            if (status === 'processing') {
              updates.processedAt = new Date().toISOString();
            } else if (status === 'completed') {
              updates.completedAt = new Date().toISOString();
              updates.reference = `TXN${Date.now()}`;
            } else if (status === 'failed') {
              updates.failureReason = failureReason;
              // Refund the amount back to vendor
              const vendor = get().payoutRequests.find((p) => p.id === payoutId);
              if (vendor) {
                get().addTransaction({
                  vendorId: vendor.vendorId,
                  orderId: payoutId,
                  orderNumber: payoutId.slice(-8).toUpperCase(),
                  type: 'credit',
                  amount: vendor.amount,
                  description: `Payout failed - Amount refunded`,
                });
              }
            }

            return { ...payout, ...updates };
          }),
        }));
      },

      cancelPayout: (payoutId) => {
        const payout = get().payoutRequests.find((p) => p.id === payoutId);
        if (!payout || payout.status !== 'pending') return;

        // Refund the amount
        get().addTransaction({
          vendorId: payout.vendorId,
          orderId: payoutId,
          orderNumber: payoutId.slice(-8).toUpperCase(),
          type: 'credit',
          amount: payout.amount,
          description: `Payout cancelled - Amount refunded`,
        });

        set((state) => ({
          payoutRequests: state.payoutRequests.map((p) =>
            p.id === payoutId ? { ...p, status: 'cancelled' as PayoutStatus } : p
          ),
        }));
      },

      getPayoutsByVendor: (vendorId) => {
        return get().payoutRequests
          .filter((p) => p.vendorId === vendorId)
          .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      },

      getPendingPayouts: (vendorId) => {
        return get().payoutRequests.filter(
          (p) => p.vendorId === vendorId && (p.status === 'pending' || p.status === 'processing')
        );
      },

      addTransaction: (transactionData) => {
        const vendorTransactions = get().getTransactionsByVendor(transactionData.vendorId);
        const lastBalance = vendorTransactions.length > 0 ? vendorTransactions[0].balance : 0;
        const newBalance = lastBalance + transactionData.amount;

        const newTransaction: EarningsTransaction = {
          ...transactionData,
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          balance: newBalance,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          transactions: [...state.transactions, newTransaction],
        }));

        return newTransaction;
      },

      getTransactionsByVendor: (vendorId) => {
        return get().transactions
          .filter((t) => t.vendorId === vendorId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getVendorBalance: (vendorId) => {
        const transactions = get().getTransactionsByVendor(vendorId);
        if (transactions.length === 0) return 0;
        return transactions[0].balance;
      },

      getVendorPendingPayout: (vendorId) => {
        const pendingPayouts = get().getPendingPayouts(vendorId);
        return pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
      },

      getAvailableBalance: (vendorId) => {
        const balance = get().getVendorBalance(vendorId);
        return Math.max(0, balance);
      },

      getVendorEarningsSummary: (vendorId) => {
        const transactions = get().getTransactionsByVendor(vendorId);
        const payouts = get().getPayoutsByVendor(vendorId);

        const totalEarnings = transactions
          .filter((t) => t.type === 'credit' && !t.description.includes('refunded'))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalWithdrawn = payouts
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + p.netAmount, 0);

        const pendingPayout = get().getVendorPendingPayout(vendorId);
        const availableBalance = get().getAvailableBalance(vendorId);

        const fees = payouts
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + p.fee, 0);

        return {
          totalEarnings,
          totalWithdrawn,
          pendingPayout,
          availableBalance,
          fees,
        };
      },
    }),
    {
      name: 'marketplace-payouts',
    }
  )
);

// Helper functions
export const PAYOUT_MINIMUM = MINIMUM_PAYOUT;
export const PAYOUT_FEE = PAYOUT_FEE_PERCENTAGE;

export const getMobileMoneyProviders = () => [
  { id: 'mtn', name: 'MTN Mobile Money', prefix: '024, 054, 055, 059' },
  { id: 'vodafone', name: 'Vodafone Cash', prefix: '020, 050' },
  { id: 'airteltigo', name: 'AirtelTigo Money', prefix: '027, 057, 026, 056' },
];

export const getBanks = () => [
  { id: 'gcb', name: 'GCB Bank' },
  { id: 'ecobank', name: 'Ecobank Ghana' },
  { id: 'stanbic', name: 'Stanbic Bank' },
  { id: 'absa', name: 'Absa Bank Ghana' },
  { id: 'calbank', name: 'CalBank' },
  { id: 'fidelity', name: 'Fidelity Bank' },
  { id: 'zenith', name: 'Zenith Bank' },
  { id: 'uba', name: 'UBA Ghana' },
];
