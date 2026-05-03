import { createTransport } from "nodemailer";

export const transport = createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
    }
})

export async function sendMail(to: string, subject: string, html: string) {
    await transport.sendMail({
        from: `"Auth APP" <${process.env.EMAIL_USER}`,
        to,
        subject,
        html
    })
}