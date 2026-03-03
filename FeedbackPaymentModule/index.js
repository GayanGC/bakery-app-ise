// FeedbackPaymentModule/index.js  (SCRUM-6)
module.exports = [
    { path: '/api/feedback', router: require('./feedbackRoutes') },
    { path: '/api/payments', router: require('./paymentRoutes') }
];
