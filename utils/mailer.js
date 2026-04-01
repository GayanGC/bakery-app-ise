// utils/mailer.js
// Shared Nodemailer transporter — used by orderRoutes (confirmation) and inventoryRoutes (low-stock).
// Configure via .env:
//   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, INVENTORY_ALERT_EMAIL
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log('Nodemailer Connection Error:', error.message);
    } else {
        console.log('Server is ready to take our messages');
    }
});

/**
 * Send an order confirmation email to the customer.
 * @param {string} toEmail
 * @param {{ _id, orderItems, totalPrice, deliveryAddress }} order
 * @param {string} customerName
 */
async function sendOrderConfirmation(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return; // graceful no-op if not configured

    const itemsHtml = order.orderItems.map(i =>
        `<tr>
            <td style="padding:6px 12px;">${i.name}</td>
            <td style="padding:6px 12px;text-align:center;">×${i.qty}</td>
            <td style="padding:6px 12px;text-align:right;">Rs. ${(i.price * i.qty).toLocaleString()}</td>
        </tr>`
    ).join('');

    const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#4B2C20;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">🍞 Sweet Delights Order Confirmed!</h1>
      </div>
      <div style="padding:24px 32px;">
        <p style="color:#374151;">Hi <strong>${customerName}</strong>, your order has been placed successfully!</p>
        <p style="color:#6b7280;font-size:13px;">Order ID: <code>#${String(order._id).slice(-8).toUpperCase()}</code></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <thead>
            <tr style="background:#fef3c7;">
              <th style="padding:8px 12px;text-align:left;">Item</th>
              <th style="padding:8px 12px;">Qty</th>
              <th style="padding:8px 12px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="border-top:2px solid #e5e7eb;">
              <td colspan="2" style="padding:8px 12px;font-weight:bold;">Total</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#4B2C20;">Rs. ${order.totalPrice.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#6b7280;font-size:13px;">
          📍 Delivering to: ${order.deliveryAddress.street}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Thank you for choosing us! You can track your order in the app.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Order Confirmed – #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
        console.log(`📧 Order confirmation sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for order confirmation:`, e.message);
    }
}

/**
 * Send a low-stock alert email to the inventory alert address.
 * @param {{ name, quantity, unit, lowStockThreshold, supplier }} material
 */
async function sendLowStockAlert(material) {
    const to = process.env.INVENTORY_ALERT_EMAIL;
    if (!process.env.EMAIL_USER || !to) return; // graceful no-op

    const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #fca5a5;border-radius:12px;overflow:hidden;">
      <div style="background:#dc2626;padding:20px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Low Stock Alert</h1>
      </div>
      <div style="padding:20px 28px;">
        <p style="color:#374151;">The following raw material has fallen below its threshold:</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#6b7280;">Material</td><td style="padding:6px;font-weight:bold;">${material.name}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Current Stock</td><td style="padding:6px;color:#dc2626;font-weight:bold;">${material.quantity} ${material.unit}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Threshold</td><td style="padding:6px;">${material.lowStockThreshold} ${material.unit}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Supplier</td><td style="padding:6px;">${material.supplier || 'N/A'}</td></tr>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Please raise a purchase request to replenish this material.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights Inventory" <${process.env.EMAIL_USER}>`,
            to,
            subject: `⚠️ Low Stock: ${material.name} (${material.quantity} ${material.unit} left)`,
            html,
        });
        console.log(`📧 Low-stock alert sent for "${material.name}" → ${to}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for low-stock alert:`, e.message);
    }
}

/**
 * Send a password-reset OTP email.
 * @param {string} toEmail
 * @param {string} name
 * @param {string} otp  plain-text 6-digit code
 */
async function sendPasswordResetOtp(toEmail, name, otp) {
    if (!process.env.EMAIL_USER) return;
    const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#4B2C20;padding:20px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🔑 Password Reset</h1>
      </div>
      <div style="padding:24px 28px;">
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#6b7280;">Use the OTP below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="margin:24px auto;text-align:center;background:#fef3c7;border-radius:12px;padding:20px 0;">
          <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#4B2C20;">${otp}</span>
        </div>
        <p style="color:#9ca3af;font-size:12px;">If you did not request this, please ignore this email.</p>
      </div>
    </div>`;
    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delight" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Password Reset OTP: ${otp}`,
            html,
        });
        console.log(`📧 Password reset OTP sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for password reset:`, e.message);
    }
}

module.exports = { sendOrderConfirmation, sendLowStockAlert, sendPasswordResetOtp };
