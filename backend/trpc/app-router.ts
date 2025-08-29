import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import profileRoute from "./routes/profile/get/route";
import getProfileByIdRoute, { getPublicProfileByIdProcedure } from "./routes/profile/get-by-id/route";
import updateProfileRoute from "./routes/profile/update/route";
import searchProfilesRoute, { searchPublicProfilesProcedure } from "./routes/profile/search/route";
import sendMessageRoute, { createConnectionProcedure, updateConnectionsForEventEndProcedure } from "./routes/messages/send/route";
import getMessagesRoute from "./routes/messages/get/route";
import markMessageAsReadRoute from "./routes/messages/mark-read/route";
import sendExternalProposalRoute, { 
  connectHostWithInvitationCodeProcedure, 
  findProposalByCodeProcedure
} from "./routes/proposals/send-external/route";
import sendReverseProposalRoute, {
  connectBusinessWithInvitationCodeProcedure as connectBusinessToReverseProposal,
  findReverseProposalByCodeProcedure as findReverseProposalByCode
} from "./routes/proposals/send-reverse/route";
import { submitW9Procedure, getW9Procedure, updateW9StatusProcedure, checkW9RequiredProcedure } from "./routes/tax/w9/route";
import { recordPaymentProcedure, getContractorPaymentsProcedure, getBusinessOwnerPaymentsProcedure } from "./routes/tax/payments/route";
import { generate1099Procedure, update1099StatusProcedure, getBusinessOwner1099sProcedure } from "./routes/tax/1099/route";
import { registerPushTokenProcedure, updateNotificationSettingsProcedure, getNotificationSettingsProcedure, sendPushNotificationProcedure } from "./routes/notifications/push/route";

import { getSubscriptionProcedure } from "./routes/subscription/get/route";
import { upgradeSubscriptionProcedure } from "./routes/subscription/upgrade/route";
import { recordEventUsageProcedure, checkAndRecordEventUsageProcedure } from "./routes/subscription/record-usage/route";
import { cancelSubscriptionProcedure } from "./routes/subscription/cancel/route";
import { getVerificationDiscountProcedure } from "./routes/subscription/verification-discount/route";
import { 
  createStripeCheckoutProcedure, 
  createSetupIntentProcedure, 
  getStripeSubscriptionStatusProcedure,
  createStripeProductsProcedure,
  linkExistingStripeSubscriptionProcedure,
  linkStripeByEmailProcedure,
  createBillingPortalSessionProcedure,
} from "./routes/subscription/stripe/route";
import walletRoutes from "./routes/wallet/router";
import { 
  createEventProcedure, 
  getEventsProcedure, 
  getEventByIdProcedure, 
  updateEventProcedure, 
  deleteEventProcedure, 
  getPublicListingsProcedure 
} from "./routes/events/crud/route";
import purchaseTableProcedure from "./routes/events/tables/route";
import {
  addVendorToEventProcedure,
  updateVendorCheckInProcedure,
  addVendorReviewProcedure,
  releaseVendorFundsProcedure,
  releaseVendorStipendProcedure,
  updateTableLabelProcedure,
} from "./routes/events/vendors/route";
import {
  submitContractorApplicationProcedure,
  selectContractorsProcedure,
  getContractorApplicationsProcedure,
} from "./routes/events/contractors/route";
import {
  getHostDashboardProcedure,
  confirmPaymentReceivedProcedure,
  confirmMaterialsReceivedProcedure,
  markInventoryCheckedProcedure,
  connectHostToEventProcedure,
  sendMaterialsProcedure,
  updateInventoryProcedure,
  reportInventoryDiscrepancyProcedure,
  resolveInventoryDiscrepancyProcedure,
} from "./routes/events/host/route";
import {
  setupEventEscrowProcedure,
  releaseEscrowFundsProcedure,
  getEventFinancialsProcedure,
  uploadEventFundsProcedure,
  approveEarlyReleaseProcedure,
  getEarlyReleaseRequestsProcedure,
} from "./routes/events/payments/route";
import {
  recordEventCreationProcedure,
  getEventUsageStatsProcedure,
  checkSubscriptionLimitsProcedure,
} from "./routes/events/subscription/route";
import {
  addBusinessToDirectoryProcedure,
  searchBusinessDirectoryProcedure,
  getBusinessDirectoryProcedure,
  searchBusinessesByDistanceProcedure,
} from "./routes/business-directory/crud/route";
import {
  sendReverseProposalProcedure,
  sendReverseProposalWithNotificationsProcedure,
  updateReverseProposalStatusProcedure,
  getHostReverseProposalsProcedure,
  getBusinessReverseProposalsProcedure,
  connectBusinessWithInvitationCodeProcedure,
  findReverseProposalByCodeProcedure,
} from "./routes/business-directory/proposals/route";
import {
  sendInvitationEmailProcedure,
  sendInvitationSMSProcedure,
} from "./routes/business-directory/notifications/route";
import { referralRouter } from "./routes/referral/router";
import {
  cancelEventProcedure,
  cancelContractorProcedure,
  reportNoShowProcedure,
  getCancellationStatsProcedure,
  submitAppealProcedure as submitCancellationAppealProcedure,
  checkSuspensionStatusProcedure,
} from "./routes/events/cancellation/route";
import {
  getAnalyticsProcedure,
  getUsersProcedure,
  suspendUserProcedure,
  unsuspendUserProcedure,
  getAppealsProcedure,
  reviewAppealProcedure,
  getActivityLogsProcedure,
  checkSuspensionProcedure,
  submitAppealProcedure as submitAdminAppealProcedure,
} from "./routes/admin/dashboard/route";
import placesAutocompleteProcedure from "./routes/maps/autocomplete/route";
import geocodeProcedure from "./routes/maps/geocode/route";
import { testConnectionProcedure, createSampleDataProcedure, querySampleDataProcedure } from "./routes/database/test/route";
import {
  sendSMSProcedure,
  sendVerificationCodeProcedure,
  sendEventNotificationProcedure,
  sendBookingConfirmationProcedure,
  sendPaymentReminderProcedure,
  sendProposalSMSProcedure,
  sendReverseProposalSMSProcedure,
  getSMSStatusProcedure
} from "./routes/sms/route";
import initiateVoiceCallProcedure from "./routes/voice/call/route";
import { createVerificationSessionProcedure } from "./routes/verification/create-session/route";
import { checkVerificationStatusProcedure } from "./routes/verification/check-status/route";
import { useDefaultVerificationSessionProcedure, getDefaultVerificationStatusProcedure } from "./routes/verification/use-default-session/route";
import { getContractorProStatus, subscribeToContractorPro, cancelContractorPro } from "./routes/contractor/pro-subscription/route";
import { applyToEvent, getMyApplications, getEventApplications, respondToApplication, withdrawApplication } from "./routes/contractor/applications/route";
import { getCreditsBalance, useCreditsForProposal, grantReferralCredits, purchaseCredits, expireCredits } from "./routes/host/credits/route";
import { ambassadorSignup, ambassadorLogin } from "./routes/ambassador/auth/route";
import { createReferral, getReferrals, getAmbassadorStats, generateReferralLink, trackReferralConversion } from "./routes/ambassador/referrals/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  profile: createTRPCRouter({
    get: profileRoute,
    getById: getProfileByIdRoute,
    getPublicById: getPublicProfileByIdProcedure,
    update: updateProfileRoute,
    search: searchProfilesRoute,
    searchPublic: searchPublicProfilesProcedure,
  }),
  messages: createTRPCRouter({
    send: sendMessageRoute,
    get: getMessagesRoute,
    markAsRead: markMessageAsReadRoute,
    createConnection: createConnectionProcedure,
    updateConnectionsForEventEnd: updateConnectionsForEventEndProcedure,
  }),
  proposals: createTRPCRouter({
    sendExternal: sendExternalProposalRoute,
    sendReverse: sendReverseProposalRoute,
    connectHost: connectHostWithInvitationCodeProcedure,
    connectBusiness: connectBusinessToReverseProposal,
    findByCode: findProposalByCodeProcedure,
    findReverseByCode: findReverseProposalByCode,
  }),
  tax: createTRPCRouter({
    w9: createTRPCRouter({
      submit: submitW9Procedure,
      get: getW9Procedure,
      updateStatus: updateW9StatusProcedure,
      checkRequired: checkW9RequiredProcedure,
    }),
    payments: createTRPCRouter({
      record: recordPaymentProcedure,
      getByContractor: getContractorPaymentsProcedure,
      getByBusinessOwner: getBusinessOwnerPaymentsProcedure,
    }),
    form1099: createTRPCRouter({
      generate: generate1099Procedure,
      updateStatus: update1099StatusProcedure,
      getByBusinessOwner: getBusinessOwner1099sProcedure,
    }),
  }),
  notifications: createTRPCRouter({
    registerToken: registerPushTokenProcedure,
    updateSettings: updateNotificationSettingsProcedure,
    getSettings: getNotificationSettingsProcedure,
    send: sendPushNotificationProcedure,

  }),
  subscription: createTRPCRouter({
    get: getSubscriptionProcedure,
    upgrade: upgradeSubscriptionProcedure,
    recordUsage: recordEventUsageProcedure,
    checkAndRecordUsage: checkAndRecordEventUsageProcedure,
    cancel: cancelSubscriptionProcedure,
    getVerificationDiscount: getVerificationDiscountProcedure,
    stripe: createTRPCRouter({
      createCheckout: createStripeCheckoutProcedure,
      createSetupIntent: createSetupIntentProcedure,
      getStatus: getStripeSubscriptionStatusProcedure,
      createProducts: createStripeProductsProcedure,
      linkExisting: linkExistingStripeSubscriptionProcedure,
      linkByEmail: linkStripeByEmailProcedure,
      createBillingPortalSession: createBillingPortalSessionProcedure,
    }),
  }),
  maps: createTRPCRouter({
    autocomplete: placesAutocompleteProcedure,
    geocode: geocodeProcedure,
  }),
  database: createTRPCRouter({
    testConnection: testConnectionProcedure,
    createSampleData: createSampleDataProcedure,
    querySampleData: querySampleDataProcedure,
  }),
  sms: createTRPCRouter({
    send: sendSMSProcedure,
    sendVerificationCode: sendVerificationCodeProcedure,
    sendEventNotification: sendEventNotificationProcedure,
    sendBookingConfirmation: sendBookingConfirmationProcedure,
    sendPaymentReminder: sendPaymentReminderProcedure,
    sendProposal: sendProposalSMSProcedure,
    sendReverseProposal: sendReverseProposalSMSProcedure,
    getStatus: getSMSStatusProcedure,
  }),
  wallet: walletRoutes,
  events: createTRPCRouter({
    create: createEventProcedure,
    getAll: getEventsProcedure,
    getById: getEventByIdProcedure,
    update: updateEventProcedure,
    delete: deleteEventProcedure,
    getPublicListings: getPublicListingsProcedure,
    vendors: createTRPCRouter({
      add: addVendorToEventProcedure,
      updateCheckIn: updateVendorCheckInProcedure,
      addReview: addVendorReviewProcedure,
      releaseFunds: releaseVendorFundsProcedure,
      releaseStipend: releaseVendorStipendProcedure,
      updateTableLabel: updateTableLabelProcedure,
    }),
    contractors: createTRPCRouter({
      submitApplication: submitContractorApplicationProcedure,
      selectContractors: selectContractorsProcedure,
      getApplications: getContractorApplicationsProcedure,
    }),
    host: createTRPCRouter({
      getDashboard: getHostDashboardProcedure,
      confirmPayment: confirmPaymentReceivedProcedure,
      confirmMaterials: confirmMaterialsReceivedProcedure,
      markInventoryChecked: markInventoryCheckedProcedure,
      connectToEvent: connectHostToEventProcedure,
      sendMaterials: sendMaterialsProcedure,
      updateInventory: updateInventoryProcedure,
      reportDiscrepancy: reportInventoryDiscrepancyProcedure,
      resolveDiscrepancy: resolveInventoryDiscrepancyProcedure,
    }),
    payments: createTRPCRouter({
      setupEscrow: setupEventEscrowProcedure,
      releaseEscrowFunds: releaseEscrowFundsProcedure,
      getFinancials: getEventFinancialsProcedure,
      uploadFunds: uploadEventFundsProcedure,
      approveEarlyRelease: approveEarlyReleaseProcedure,
      getEarlyReleaseRequests: getEarlyReleaseRequestsProcedure,
    }),
    tables: createTRPCRouter({
      purchase: purchaseTableProcedure,
    }),
    subscription: createTRPCRouter({
      recordCreation: recordEventCreationProcedure,
      getUsageStats: getEventUsageStatsProcedure,
      checkLimits: checkSubscriptionLimitsProcedure,
    }),
    cancellation: createTRPCRouter({
      cancel: cancelEventProcedure,
      cancelContractor: cancelContractorProcedure,
      reportNoShow: reportNoShowProcedure,
      getStats: getCancellationStatsProcedure,
      submitAppeal: submitCancellationAppealProcedure,
      checkSuspension: checkSuspensionStatusProcedure,
    }),
  }),
  businessDirectory: createTRPCRouter({
    add: addBusinessToDirectoryProcedure,
    search: searchBusinessDirectoryProcedure,
    searchByDistance: searchBusinessesByDistanceProcedure,
    getAll: getBusinessDirectoryProcedure,
    proposals: createTRPCRouter({
      send: sendReverseProposalProcedure,
      sendWithNotifications: sendReverseProposalWithNotificationsProcedure,
      updateStatus: updateReverseProposalStatusProcedure,
      getByHost: getHostReverseProposalsProcedure,
      getByBusiness: getBusinessReverseProposalsProcedure,
      connectBusiness: connectBusinessWithInvitationCodeProcedure,
      findByCode: findReverseProposalByCodeProcedure,
    }),
    notifications: createTRPCRouter({
      sendEmail: sendInvitationEmailProcedure,
      sendSMS: sendInvitationSMSProcedure,
    }),
  }),
  referral: referralRouter,
  admin: createTRPCRouter({
    getAnalytics: getAnalyticsProcedure,
    getUsers: getUsersProcedure,
    suspendUser: suspendUserProcedure,
    unsuspendUser: unsuspendUserProcedure,
    getAppeals: getAppealsProcedure,
    reviewAppeal: reviewAppealProcedure,
    getActivityLogs: getActivityLogsProcedure,
    checkSuspension: checkSuspensionProcedure,
    submitAppeal: submitAdminAppealProcedure,
  }),
  voice: createTRPCRouter({
    initiateCall: initiateVoiceCallProcedure,
  }),
  verification: createTRPCRouter({
    createSession: createVerificationSessionProcedure,
    checkStatus: checkVerificationStatusProcedure,
    useDefaultSession: useDefaultVerificationSessionProcedure,
    getDefaultStatus: getDefaultVerificationStatusProcedure,
  }),
  contractor: createTRPCRouter({
    pro: createTRPCRouter({
      getStatus: getContractorProStatus,
      subscribe: subscribeToContractorPro,
      cancel: cancelContractorPro,
    }),
    applications: createTRPCRouter({
      apply: applyToEvent,
      getMy: getMyApplications,
      getForEvent: getEventApplications,
      respond: respondToApplication,
      withdraw: withdrawApplication,
    }),
  }),
  host: createTRPCRouter({
    credits: createTRPCRouter({
      getBalance: getCreditsBalance,
      useForProposal: useCreditsForProposal,
      grantReferral: grantReferralCredits,
      purchase: purchaseCredits,
      expire: expireCredits,
    }),
  }),
  ambassador: createTRPCRouter({
    auth: createTRPCRouter({
      signup: ambassadorSignup,
      login: ambassadorLogin,
    }),
    referrals: createTRPCRouter({
      create: createReferral,
      getAll: getReferrals,
      getStats: getAmbassadorStats,
      generateLink: generateReferralLink,
      trackConversion: trackReferralConversion,
    }),
  }),
});

export type AppRouter = typeof appRouter;