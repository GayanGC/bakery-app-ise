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

// ── Shared Design Components ─────────────────────────────────────
const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #334155;
    background-color: #f8fafc;
    padding: 40px 20px;
`;

const containerStyles = `
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
`;

const headerStyles = (color) => `
    background-color: ${color};
    padding: 32px;
    text-align: center;
`;

const bodyStyles = `
    padding: 32px;
`;

const footerStyles = `
    padding: 24px 32px;
    background-color: #f1f5f9;
    text-align: center;
    font-size: 12px;
    color: #64748b;
`;

/**
 * Send an order confirmation email to the customer.
 */
async function sendOrderConfirmation(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return;

    const itemsHtml = order.orderItems.map(i =>
        `<tr>
            <td style="padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:14px;">
                <div style="font-weight:600; color:#1e293b;">${i.name}</div>
                <div style="font-size:12px; color:#64748b;">Qty: ${i.qty}</div>
            </td>
            <td style="padding:12px 0; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600; color:#1e293b; font-size:14px;">
                Rs. ${(i.price * i.qty).toLocaleString()}
            </td>
        </tr>`
    ).join('');

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#1e1b4b')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Order Confirmed</h1>
                <p style="color:#94a3b8; margin:8px 0 0; font-size:14px;">Thank you for your purchase!</p>
            </div>
            <div style="${bodyStyles}">
                <p style="margin:0 0 24px;">Hi <strong>${customerName}</strong>,</p>
                <p style="margin:0 0 24px; font-size:14px; color:#475569;">Your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has been successfully placed and is being processed.</p>
                
                <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
                    <thead>
                        <tr>
                            <th style="text-align:left; font-size:12px; text-transform:uppercase; color:#94a3b8; padding-bottom:8px; border-bottom:2px solid #f1f5f9;">Item</th>
                            <th style="text-align:right; font-size:12px; text-transform:uppercase; color:#94a3b8; padding-bottom:8px; border-bottom:2px solid #f1f5f9;">Price</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr>
                            <td style="padding:24px 0 8px; font-weight:700; color:#1e293b; font-size:16px;">Total Amount</td>
                            <td style="padding:24px 0 8px; text-align:right; font-weight:800; color:#1e1b4b; font-size:18px;">Rs. ${order.totalPrice.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="background:#f8fafc; border-radius:12px; padding:20px; border:1px solid #f1f5f9;">
                    <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:8px;">Delivery Details</div>
                    <div style="font-size:14px; color:#475569;">
                        ${order.deliveryAddress.street}<br/>
                        ${order.deliveryAddress.city}, ${order.deliveryAddress.postalCode}
                    </div>
                </div>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Bakery &bull; Innovative Baking Systems</p>
                <p style="margin:4px 0 0;">This is an automated receipt. No need to reply.</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Order Confirmed – #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for order confirmation:`, e.message);
    }
}

/**
 * Send a low-stock alert email.
 */
async function sendLowStockAlert(material) {
    const to = process.env.INVENTORY_ALERT_EMAIL;
    if (!process.env.EMAIL_USER || !to) return;

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#e11d48')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Low Stock Alert</h1>
                <p style="color:#fecdd3; margin:8px 0 0; font-size:14px;">Inventory replenishment required</p>
            </div>
            <div style="${bodyStyles}">
                <div style="text-align:center; margin-bottom:32px;">
                    <div style="font-size:48px; margin-bottom:8px;">⚠️</div>
                    <h2 style="margin:0; font-size:20px; color:#1e293b;">${material.name}</h2>
                    <p style="font-size:14px; color:#ef4444; font-weight:700; margin:4px 0;">Currently ${material.quantity} ${material.unit} remaining</p>
                </div>

                <div style="border-top:1px solid #f1f5f9; padding-top:24px;">
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tr><td style="padding:8px 0; color:#64748b;">Threshold Level</td><td style="padding:8px 0; text-align:right; color:#1e293b; font-weight:600;">${material.lowStockThreshold} ${material.unit}</td></tr>
                        <tr><td style="padding:8px 0; color:#64748b;">Supplier</td><td style="padding:8px 0; text-align:right; color:#1e293b; font-weight:600;">${material.supplier || 'Not Assigned'}</td></tr>
                    </table>
                </div>

                <div style="margin-top:32px; text-align:center;">
                    <p style="font-size:13px; color:#64748b; margin-bottom:20px;">Please initiate a purchase request via the inventory dashboard.</p>
                </div>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Inventory System</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights Monitoring" <${process.env.EMAIL_USER}>`,
            to,
            subject: `⚠️ Low Stock: ${material.name}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for low-stock alert:`, e.message);
    }
}

/**
 * Send a password-reset OTP email.
 */
async function sendPasswordResetOtp(toEmail, name, otp) {
    if (!process.env.EMAIL_USER) return;
    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#1e293b')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Password Reset</h1>
            </div>
            <div style="${bodyStyles}">
                <p style="margin:0 0 24px;">Hi <strong>${name}</strong>,</p>
                <p style="margin:0 0 32px; font-size:14px; color:#475569;">We received a request to reset your password. Use the following verification code to proceed. This code will expire in 15 minutes.</p>
                
                <div style="background:#f8fafc; border-radius:16px; padding:32px; text-align:center; border:2px dashed #e2e8f0;">
                    <div style="font-size:48px; font-weight:800; letter-spacing:12px; color:#1e1b4b; font-family:monospace;">${otp}</div>
                </div>

                <p style="margin:32px 0 0; font-size:12px; color:#94a3b8; text-align:center;">If you did not request this, you can safely ignore this email.</p>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Security Team</p>
            </div>
        </div>
    </div>`;
    try {
        await transporter.sendMail({
            from: `"Sweet Delights Accounts" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Security Verification Code: ${otp}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for password reset:`, e.message);
    }
}

/**
 * Send a delivery confirmation email to the customer.
 */
async function sendOrderDelivered(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#059669')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Order Delivered</h1>
                <p style="color:#a7f3d0; margin:8px 0 0; font-size:14px;">Success! Your treats have arrived.</p>
            </div>
            <div style="${bodyStyles}">
                <div style="text-align:center; margin-bottom:32px;">
                    <div style="font-size:48px; margin-bottom:16px;">✅</div>
                    <p style="margin:0;">Hi <strong>${customerName}</strong>, your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has been successfully delivered. We hope you enjoy every bite!</p>
                </div>

                <div style="background:#f0fdf4; border-radius:12px; padding:24px; border:1px solid #dcfce7; text-align:center;">
                    <p style="font-size:14px; color:#166534; margin:0;">Share your experience with us! Your feedback helps us improve.</p>
                </div>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Bakery &bull; Enjoy your meal!</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Delivered: #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for delivery confirmation:`, e.message);
    }
}

/**
 * Send an order cancellation email to the customer.
 */
async function sendOrderCancelled(toEmail, order, customerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#475569')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Order Cancelled</h1>
            </div>
            <div style="${bodyStyles}">
                <p style="margin:0 0 16px;">Hi <strong>${customerName}</strong>,</p>
                <p style="margin:0 0 16px; font-size:14px; color:#475569;">Your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has been cancelled.</p>
                <p style="margin:0 0 16px; font-size:14px; color:#475569;">If you paid online, a refund will be automatically processed back to your original payment method within 3–5 business days.</p>
                
                <div style="border-top:1px solid #f1f5f9; margin-top:24px; padding-top:24px;">
                    <p style="font-size:12px; color:#94a3b8;">If you believe this was an error, please contact our support team immediately.</p>
                </div>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Support</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights Support" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Order Cancelled: #${String(order._id).slice(-8).toUpperCase()}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for order cancellation:`, e.message);
    }
}

/**
 * Notify the Inventory Seller(s) that a stock purchase request has been raised.
 */
async function sendStockRequestAlert(toEmail, request, materialName, managerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#1e1b4b')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">New Stock Request</h1>
                <p style="color:#94a3b8; margin:8px 0 0; font-size:14px;">Action required from Inventory Seller</p>
            </div>
            <div style="${bodyStyles}">
                <p style="margin:0 0 24px; font-size:14px;">Inventory Manager <strong>${managerName}</strong> has submitted a new replenishment request.</p>
                
                <div style="background:#f8fafc; border-radius:12px; padding:24px; border:1px solid #f1f5f9;">
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tr><td style="padding:8px 0; color:#64748b;">Material</td><td style="padding:8px 0; text-align:right; color:#1e293b; font-weight:600;">${materialName}</td></tr>
                        <tr><td style="padding:8px 0; color:#64748b;">Quantity Needed</td><td style="padding:8px 0; text-align:right; color:#1e1b4b; font-weight:800;">${request.quantity} ${request.unit}</td></tr>
                        <tr><td style="padding:8px 0; color:#64748b;">Request ID</td><td style="padding:8px 0; text-align:right; font-family:monospace; color:#1e293b;">#${String(request._id).slice(-8).toUpperCase()}</td></tr>
                    </table>
                </div>

                ${request.notes ? `<div style="margin-top:24px; padding:16px; border-left:4px solid #1e1b4b; background:#f1f5f9; font-size:13px; font-style:italic;">"${request.notes}"</div>` : ''}
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Inventory Portal</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights Logistics" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Action Required: New Stock Request - ${materialName}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for stock request alert:`, e.message);
    }
}

/**
 * Notify the Inventory Manager that the Seller has dispatched the requested items.
 */
async function sendStockDispatchedAlert(toEmail, request, materialName, sellerName) {
    if (!process.env.EMAIL_USER) return;

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}">
            <div style="${headerStyles('#059669')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.025em;">Stock Dispatched</h1>
                <p style="color:#a7f3d0; margin:8px 0 0; font-size:14px;">Items are on their way</p>
            </div>
            <div style="${bodyStyles}">
                <p style="margin:0 0 24px; font-size:14px;">Seller <strong>${sellerName}</strong> has dispatched your stock request.</p>
                
                <div style="background:#f0fdf4; border-radius:12px; padding:24px; border:1px solid #dcfce7;">
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tr><td style="padding:8px 0; color:#166534;">Material</td><td style="padding:8px 0; text-align:right; color:#166534; font-weight:600;">${materialName}</td></tr>
                        <tr><td style="padding:8px 0; color:#166534;">Quantity Sent</td><td style="padding:8px 0; text-align:right; color:#166534; font-weight:800;">${request.quantity} ${request.unit}</td></tr>
                    </table>
                </div>

                <p style="margin:24px 0 0; font-size:13px; color:#475569; text-align:center;">Stock levels have been updated in the system.</p>
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Inventory Portal</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights Logistics" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Stock Dispatched: ${materialName}`,
            html,
        });
    } catch (e) {
        console.log(`⚠️ Mailer failed for stock dispatch alert:`, e.message);
    }
}

/**
 * Send the monthly sales & revenue summary report to admin(s).
 */
async function sendMonthlyReportEmail(toEmail, report) {
    if (!process.env.EMAIL_USER) return;

    const topProductsHtml = (report.topProducts || []).slice(0, 5).map((p, i) =>
        `<tr>
            <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#334155;">${i + 1}. ${p.name}</td>
            <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:center; font-size:13px; color:#334155;">${p.unitsSold}</td>
            <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:right; font-size:13px; font-weight:600; color:#1e1b4b;">Rs. ${p.revenue.toLocaleString()}</td>
        </tr>`
    ).join('');

    const html = `
    <div style="${baseStyles}">
        <div style="${containerStyles}; max-width:680px;">
            <div style="${headerStyles('linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)')}">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:800;">Monthly Sales Report</h1>
                <p style="color:#94a3b8; margin:8px 0 0; font-size:14px; text-transform:uppercase; letter-spacing:1px;">${report.month}</p>
            </div>
            <div style="${bodyStyles}">
                
                <div style="display:flex; justify-content:space-between; margin-bottom:32px;">
                    <div style="flex:1; background:#f8fafc; padding:20px; border-radius:12px; text-align:center; margin-right:12px; border:1px solid #f1f5f9;">
                        <div style="font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:4px; font-weight:700;">Revenue</div>
                        <div style="font-size:20px; font-weight:800; color:#1e1b4b;">Rs. ${Math.round(report.totalRevenue).toLocaleString()}</div>
                    </div>
                    <div style="flex:1; background:#f8fafc; padding:20px; border-radius:12px; text-align:center; margin-left:12px; border:1px solid #f1f5f9;">
                        <div style="font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:4px; font-weight:700;">Orders</div>
                        <div style="font-size:20px; font-weight:800; color:#1e1b4b;">${report.totalOrders}</div>
                    </div>
                </div>

                <div style="margin-bottom:32px;">
                    <h3 style="font-size:13px; text-transform:uppercase; color:#94a3b8; margin-bottom:12px; letter-spacing:1px;">Payment Method Distribution</h3>
                    <div style="display:flex; border-radius:8px; overflow:hidden; height:8px; margin-bottom:12px;">
                        <div style="width:${(report.onlineRevenue/report.totalRevenue)*100}%; background:#1e1b4b;"></div>
                        <div style="flex:1; background:#94a3b8;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span style="color:#1e1b4b; font-weight:600;">Online: Rs. ${Math.round(report.onlineRevenue).toLocaleString()}</span>
                        <span style="color:#64748b;">COD: Rs. ${Math.round(report.codRevenue).toLocaleString()}</span>
                    </div>
                </div>

                ${topProductsHtml ? `
                <h3 style="font-size:13px; text-transform:uppercase; color:#94a3b8; margin-bottom:12px; letter-spacing:1px;">Top Performance Products</h3>
                <table style="width:100%; border-collapse:collapse; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #f1f5f9;">
                    <thead style="background:#f8fafc;">
                        <tr>
                            <th style="padding:12px 16px; text-align:left; font-size:11px; color:#64748b;">PRODUCT</th>
                            <th style="padding:12px 16px; font-size:11px; color:#64748b;">UNITS</th>
                            <th style="padding:12px 16px; text-align:right; font-size:11px; color:#64748b;">REVENUE</th>
                        </tr>
                    </thead>
                    <tbody>${topProductsHtml}</tbody>
                </table>` : ''}
            </div>
            <div style="${footerStyles}">
                <p style="margin:0;">Sweet Delights Analytics &bull; Confidence in every data point</p>
            </div>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"Sweet Delights Analytics" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `📊 Report: Monthly Sales Summary - ${report.month}`,
            html,
        });
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
