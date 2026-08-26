import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
  company_name: z.string().optional(),
  role: z
    .enum(["CEO/Founder", "VP/Director", "Manager", "Individual Contributor"], {
      message: "Please select a role.",
    })
    .optional(),
  budget_range: z
    .enum(["<5k", "5k-15k", "15k-50k", "50k+"], {
      message: "Please select a budget range.",
    })
    .optional(),
  timeline: z
    .enum(["ASAP", "1-3 months", "3-6 months", "just exploring"], {
      message: "Please select a timeline.",
    })
    .optional(),
  project_type: z
    .enum(["AI/automation", "web/app", "consulting", "other"], {
      message: "Please select a project type.",
    })
    .optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
