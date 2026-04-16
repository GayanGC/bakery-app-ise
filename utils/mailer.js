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

/**
 * Send a delivery confirmation email to the customer.
 * @param {string} toEmail
 * @param {{ _id, orderItems, totalPrice, deliveryAddress }} order
 * @param {string} customerName
 */
async function sendOrderDelivered(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return;

    const itemsHtml = order.orderItems.map(i =>
        `<tr>
            <td style="padding:6px 12px;">${i.name}</td>
            <td style="padding:6px 12px;text-align:center;">×${i.qty}</td>
            <td style="padding:6px 12px;text-align:right;">Rs. ${(i.price * i.qty).toLocaleString()}</td>
        </tr>`
    ).join('');

    const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;border:1px solid #d1fae5;border-radius:12px;overflow:hidden;">
      <div style="background:#065f46;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">🚀 Order Delivered!</h1>
      </div>
      <div style="padding:24px 32px;">
        <p style="color:#374151;">Hi <strong>${customerName}</strong>, your order has been delivered successfully!</p>
        <p style="color:#6b7280;font-size:13px;">Order ID: <code>#${String(order._id).slice(-8).toUpperCase()}</code></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <thead>
            <tr style="background:#d1fae5;">
              <th style="padding:8px 12px;text-align:left;">Item</th>
              <th style="padding:8px 12px;">Qty</th>
              <th style="padding:8px 12px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="border-top:2px solid #e5e7eb;">
              <td colspan="2" style="padding:8px 12px;font-weight:bold;">Total</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#065f46;">Rs. ${order.totalPrice.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Thank you for choosing 🍞 Sweet Delights! We hope you enjoy your order.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Your Order Has Been Delivered – #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
        console.log(`📧 Delivery confirmation sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for delivery confirmation:`, e.message);
    }
}

/**
 * Send an order cancellation email to the customer.
 * @param {string} toEmail
 * @param {{ _id, orderItems, totalPrice }} order
 * @param {string} customerName
 */
async function sendOrderCancelled(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #fca5a5;border-radius:12px;overflow:hidden;">
      <div style="background:#7f1d1d;padding:20px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">❌ Order Cancelled</h1>
      </div>
      <div style="padding:24px 28px;">
        <p style="color:#374151;">Hi <strong>${customerName}</strong>,</p>
        <p style="color:#6b7280;">Your order <code>#${String(order._id).slice(-8).toUpperCase()}</code> has been cancelled.</p>
        <p style="color:#6b7280;">If you paid online, a refund will be processed within 3–5 business days.</p>
        <p style="color:#6b7280;">Order total was: <strong>Rs. ${order.totalPrice.toLocaleString()}</strong></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;">If you did not request this cancellation, please contact us immediately.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Order Cancelled – #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
        console.log(`📧 Cancellation email sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for order cancellation:`, e.message);
    }
}

/**
 * Notify the Inventory Seller(s) that a stock purchase request has been raised.
 * @param {string} toEmail  — seller's email
 * @param {{ _id, quantity, unit, notes }} request
 * @param {string} materialName
 * @param {string} managerName
 */
async function sendStockRequestAlert(toEmail, request, materialName, managerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #fde68a;border-radius:12px;overflow:hidden;">
      <div style="background:#92400e;padding:20px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">📦 New Stock Request</h1>
      </div>
      <div style="padding:24px 28px;">
        <p style="color:#374151;">The Inventory Manager <strong>${managerName}</strong> has requested stock replenishment:</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:6px;color:#6b7280;">Material</td><td style="padding:6px;font-weight:bold;">${materialName}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Quantity Needed</td><td style="padding:6px;font-weight:bold;color:#92400e;">${request.quantity} ${request.unit}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Request ID</td><td style="padding:6px;"><code>#${String(request._id).slice(-8).toUpperCase()}</code></td></tr>
          ${request.notes ? `<tr><td style="padding:6px;color:#6b7280;">Notes</td><td style="padding:6px;font-style:italic;">${request.notes}</td></tr>` : ''}
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Please log in to the Inventory Portal and mark this request as Sent once dispatched.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights Inventory" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `📦 Stock Request: ${materialName} × ${request.quantity} ${request.unit}`,
            html,
        });
        console.log(`📧 Stock request alert sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for stock request alert:`, e.message);
    }
}

/**
 * Notify the Inventory Manager that the Seller has dispatched the requested items.
 * @param {string} toEmail  — manager's email
 * @param {{ _id, quantity, unit }} request
 * @param {string} materialName
 * @param {string} sellerName
 */
async function sendStockDispatchedAlert(toEmail, request, materialName, sellerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #a7f3d0;border-radius:12px;overflow:hidden;">
      <div style="background:#065f46;padding:20px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">✅ Stock Dispatched!</h1>
      </div>
      <div style="padding:24px 28px;">
        <p style="color:#374151;">The Inventory Seller <strong>${sellerName}</strong> has dispatched the following items:</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:6px;color:#6b7280;">Material</td><td style="padding:6px;font-weight:bold;">${materialName}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Quantity Sent</td><td style="padding:6px;font-weight:bold;color:#065f46;">${request.quantity} ${request.unit}</td></tr>
          <tr><td style="padding:6px;color:#6b7280;">Request ID</td><td style="padding:6px;"><code>#${String(request._id).slice(-8).toUpperCase()}</code></td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;">The stock level for <strong>${materialName}</strong> has been automatically updated in the system.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Check your Inventory Dashboard to verify the updated stock levels.</p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights Inventory" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `✅ Stock Dispatched: ${materialName} × ${request.quantity} ${request.unit}`,
            html,
        });
        console.log(`📧 Stock dispatch alert sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for stock dispatch alert:`, e.message);
    }
}

/**
 * Send the monthly sales & revenue summary report to admin(s).
 * @param {string} toEmail
 * @param {{ month: string, totalOrders: number, totalRevenue: number, onlineRevenue: number, codRevenue: number, topProducts: Array }} report
 */
async function sendMonthlyReportEmail(toEmail, report) {
    if (!process.env.EMAIL_USER) return;

    const topProductsHtml = (report.topProducts || []).slice(0, 5).map((p, i) =>
        `<tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};">
            <td style="padding:8px 12px;">${i + 1}. ${p.name}</td>
            <td style="padding:8px 12px;text-align:center;">${p.unitsSold}</td>
            <td style="padding:8px 12px;text-align:right;">Rs. ${p.revenue.toLocaleString()}</td>
        </tr>`
    ).join('');

    const html = `
    <div style="font-family:sans-serif;max-width:620px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4B2C20,#C8730A);padding:28px 36px;">
        <h1 style="color:#fff;margin:0;font-size:24px;">📊 Monthly Report — ${report.month}</h1>
        <p style="color:#fde68a;margin:4px 0 0;font-size:14px;">Sweet Delights Bakery Management System</p>
      </div>
      <div style="padding:28px 36px;">
        <!-- KPI Grid -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
          <div style="background:#fef3c7;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:900;color:#92400e;">${report.totalOrders}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total Orders</p>
          </div>
          <div style="background:#d1fae5;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#065f46;">Rs. ${Math.round(report.totalRevenue).toLocaleString()}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total Revenue</p>
          </div>
          <div style="background:#ede9fe;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#5b21b6;">Rs. ${Math.round(report.onlineRevenue).toLocaleString()}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Online Revenue</p>
          </div>
        </div>
        <!-- Payment Split -->
        <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
          <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">💳 Payment Split</h3>
          <div style="display:flex;justify-content:space-between;font-size:14px;">
            <span style="color:#6b7280;">Cash on Delivery</span>
            <strong style="color:#374151;">Rs. ${Math.round(report.codRevenue).toLocaleString()}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:6px;">
            <span style="color:#6b7280;">Online Payment</span>
            <strong style="color:#374151;">Rs. ${Math.round(report.onlineRevenue).toLocaleString()}</strong>
          </div>
        </div>
        ${topProductsHtml ? `
        <!-- Top Products -->
        <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">🏆 Top Products This Month</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
          <thead>
            <tr style="background:#4B2C20;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Product</th>
              <th style="padding:8px 12px;">Units Sold</th>
              <th style="padding:8px 12px;text-align:right;">Revenue</th>
            </tr>
          </thead>
          <tbody>${topProductsHtml}</tbody>
        </table>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
          This is an automated monthly report generated by Sweet Delights Bakery Management System.<br/>
          Generated on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"🍞 Sweet Delights Reports" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `📊 Monthly Sales Report — ${report.month}`,
            html,
        });
        console.log(`📧 Monthly report sent → ${toEmail}`);
    } catch (e) {
        console.log(`⚠️ Mailer failed for monthly report:`, e.message);
    }
}

module.exports = {
    sendOrderConfirmation,
    sendLowStockAlert,
    sendPasswordResetOtp,
    sendOrderDelivered,
    sendOrderCancelled,
    sendStockRequestAlert,
    sendStockDispatchedAlert,
    sendMonthlyReportEmail
};
