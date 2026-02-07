import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOTPEmail(email: string, otp: string) {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Your OTP for SubHub Email Verification",
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
        html: `<p>Your OTP is <b>${otp}</b>. It will expire in 10 minutes.</p>`,
    };

    return transporter.sendMail(mailOptions);
}

export async function sendResetLinkEmail(email: string, link: string) {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Reset Your SubHub Password",
        text: `Click the link to reset your password: ${link}`,
        html: `<p>Click the link to reset your password: <a href="${link}">${link}</a></p>`,
    };

    return transporter.sendMail(mailOptions);
}
