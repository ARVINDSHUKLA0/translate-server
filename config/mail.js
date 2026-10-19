// import nodemailer from 'nodemailer';

// export const sendOTP = async (email, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: 'Gmail',
//         auth: { user: 'manishkirthalya@gmail.com', pass: 'yuqm qetv ewix aznt' },
//     });

//     await transporter.sendMail({
//         from: 'manishkirthalya@gmail.com',
//         to: email,
//         subject: 'Your OTP Code',
//         text: `Your OTP is: ${otp}`,
//     });
// };






import nodemailer from "nodemailer";

export const sendOTP = async (email, otp) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Email service is not configured.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: user,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  });
};
