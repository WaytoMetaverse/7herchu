import { BillingType, EventType, PaymentStatus, PricingMode, RegRole } from '@prisma/client'

export function computeCharge(input: {
	event: {
		type: EventType
		pricingMode: PricingMode
		guestPriceCents?: number | null
		bodMemberPriceCents?: number | null
		bodGuestPriceCents?: number | null
		defaultPriceCents?: number | null
	}
	registrant: { role: RegRole; memberType?: 'FIXED' | 'SINGLE' }
}) {
	const e = input.event
	const r = input.registrant

	if (r.role === 'SPEAKER') return { billingType: BillingType.NONE, priceCents: 0, paymentStatus: PaymentStatus.UNPAID }

	if (e.type === 'DINNER' || e.pricingMode === 'MANUAL_PER_REG') {
		return { billingType: BillingType.MANUAL, priceCents: e.defaultPriceCents!, paymentStatus: PaymentStatus.UNPAID }
	}

	if (e.type === 'BOD') {
		if (r.role === 'MEMBER') return { billingType: BillingType.MANUAL, priceCents: e.bodMemberPriceCents!, paymentStatus: PaymentStatus.UNPAID }
		return { billingType: BillingType.MANUAL, priceCents: e.bodGuestPriceCents!, paymentStatus: PaymentStatus.UNPAID }
	}

	if (r.role === 'MEMBER') {
		if (r.memberType === 'FIXED' && (e.type === 'GENERAL' || e.type === 'JOINT'))
			return { billingType: BillingType.FIXED_MONTHLY, priceCents: 18000, paymentStatus: PaymentStatus.MONTHLY_BILL }
		if (r.memberType === 'SINGLE' && (e.type === 'GENERAL' || e.type === 'CLOSED' || e.type === 'JOINT'))
			return { billingType: BillingType.SINGLE_220, priceCents: 22000, paymentStatus: PaymentStatus.UNPAID }
	}

	if (r.role === 'GUEST') {
		return { billingType: BillingType.MANUAL, priceCents: e.guestPriceCents ?? 25000, paymentStatus: PaymentStatus.UNPAID }
	}

	return { billingType: BillingType.NONE, priceCents: 0, paymentStatus: PaymentStatus.UNPAID }
} 