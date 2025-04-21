import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  cc?: string;
  bcc?: string;
}

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: any[],
  options?: EmailOptions
) => {
  const mailOptions = {
    from: `"חוגים צעירון" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments,
    cc: options?.cc,
    bcc: options?.bcc, 
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📨 Email with PDF sent");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
};

