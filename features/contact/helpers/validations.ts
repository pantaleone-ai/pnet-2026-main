import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(100, { message: "Name must be at most 100 characters." }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .max(254, { message: "Email address is too long." }),
  message: z
    .string()
    .min(10, {
      message: "Message must be at least 10 characters.",
    })
    .max(5000, { message: "Message must be at most 5000 characters." }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
